import os
import secrets
import string
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import AIQuality, Meeting, MeetingProfile, MeetingStatus, Summary, Transcript, User
from .auth_router import get_current_user

router = APIRouter(prefix="/api/v1/meetings", tags=["meeting-setup"])

FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173").rstrip("/")
ALLOWED_CREATOR_ROLES = {"admin", "host"}


def _generate_public_meeting_id() -> str:
    alphabet = string.ascii_uppercase + string.digits
    return f"MM-{''.join(secrets.choice(alphabet) for _ in range(8))}"


def _generate_token() -> str:
    return secrets.token_urlsafe(24)


def _create_unique_public_id(db: Session) -> str:
    public_id = _generate_public_meeting_id()
    while db.query(MeetingProfile).filter(MeetingProfile.public_meeting_id == public_id).first():
        public_id = _generate_public_meeting_id()
    return public_id


def _create_unique_viewer_token(db: Session) -> str:
    viewer_token = _generate_token()
    while db.query(MeetingProfile).filter(MeetingProfile.viewer_token == viewer_token).first():
        viewer_token = _generate_token()
    return viewer_token


class MeetingSetupRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    scheduled_at: datetime
    description: Optional[str] = Field(default=None, max_length=4000)
    tags: List[str] = Field(default_factory=list)
    ai_quality: AIQuality = AIQuality.BALANCED
    creator_role: str = "host"

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        title = value.strip()
        if len(title) < 3:
            raise ValueError("Tiêu đề phải có tối thiểu 3 ký tự.")
        return title

    @field_validator("creator_role")
    @classmethod
    def validate_creator_role(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in ALLOWED_CREATOR_ROLES:
            raise ValueError("Vai trò phải là 'admin' hoặc 'host'.")
        return normalized

    @field_validator("tags")
    @classmethod
    def normalize_tags(cls, value: List[str]) -> List[str]:
        clean_tags: List[str] = []
        for tag in value:
            normalized = tag.strip().lower()
            if not normalized:
                continue
            if normalized not in clean_tags:
                clean_tags.append(normalized)
        return clean_tags[:10]


@router.post("/setup")
def setup_meeting(
    request: MeetingSetupRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1) Tạo meeting (owner = current_user)
    meeting = Meeting(
        title=request.title,
        status=MeetingStatus.RECORDING,
        user_id=current_user.id
    )
    db.add(meeting)
    db.flush()

    # 2) Sinh Meeting ID public + token viewer-only
    public_id = _create_unique_public_id(db)
    viewer_token = _create_unique_viewer_token(db)

    viewer_link = f"{FRONTEND_BASE_URL}/join/{public_id}?token={viewer_token}"
    profile = MeetingProfile(
        meeting_id=meeting.id,
        public_meeting_id=public_id,
        scheduled_at=request.scheduled_at,
        description=(request.description or "").strip() or None,
        tags=request.tags,
        ai_quality=request.ai_quality,
        viewer_token=viewer_token,
        viewer_link=viewer_link,
        invited_emails=[]
    )
    db.add(profile)
    db.commit()
    db.refresh(meeting)
    db.refresh(profile)

    return {
        "message": "Khởi tạo cuộc họp thành công.",
        "meeting": {
            "id": meeting.id,
            "meeting_id": profile.public_meeting_id,
            "title": meeting.title,
            "scheduled_at": str(profile.scheduled_at),
            "description": profile.description,
            "tags": profile.tags or [],
            "ai_quality": profile.ai_quality.value,
            "creator_role": request.creator_role
        },
        "viewer": {
            "token": profile.viewer_token,
            "link": profile.viewer_link
        }
    }


@router.post("/{meeting_id}/share-link")
def create_or_get_share_link(
    meeting_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Không tìm thấy cuộc họp.")
    if meeting.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Bạn không có quyền chia sẻ cuộc họp này.")

    profile = db.query(MeetingProfile).filter(MeetingProfile.meeting_id == meeting.id).first()
    if not profile:
        public_id = _create_unique_public_id(db)
        viewer_token = _create_unique_viewer_token(db)
        viewer_link = f"{FRONTEND_BASE_URL}/join/{public_id}?token={viewer_token}"
        profile = MeetingProfile(
            meeting_id=meeting.id,
            public_meeting_id=public_id,
            scheduled_at=meeting.created_at,
            description=None,
            tags=[],
            ai_quality=AIQuality.BALANCED,
            viewer_token=viewer_token,
            viewer_link=viewer_link,
            invited_emails=[]
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)

    return {
        "meeting_id": meeting.id,
        "meeting_code": profile.public_meeting_id,
        "viewer_link": profile.viewer_link
    }


@router.get("/public/{public_meeting_id}/summary")
def viewer_get_summary(
    public_meeting_id: str,
    token: str = Query(..., min_length=10),
    db: Session = Depends(get_db)
):
    """
    Viewer-only endpoint: chỉ cần public_meeting_id + token hợp lệ.
    - Không cho upload/ghi âm
    - Chỉ xem transcript/summary sau khi xử lý
    """
    profile = db.query(MeetingProfile).filter(MeetingProfile.public_meeting_id == public_meeting_id).first()
    if not profile or profile.viewer_token != token:
        raise HTTPException(status_code=401, detail="Link mời không hợp lệ hoặc đã hết hiệu lực.")

    meeting = db.query(Meeting).filter(Meeting.id == profile.meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Không tìm thấy cuộc họp.")

    if meeting.status == MeetingStatus.FAILED:
        return {
            "meeting": {"id": meeting.id, "title": meeting.title, "status": meeting.status.value},
            "status": "failed",
            "summary": None,
            "transcript": None
        }

    if meeting.status != MeetingStatus.COMPLETED:
        return {
            "meeting": {"id": meeting.id, "title": meeting.title, "status": meeting.status.value},
            "status": "processing",
            "summary": None,
            "transcript": None
        }

    transcript = db.query(Transcript).filter(Transcript.meeting_id == meeting.id).first()
    summary = db.query(Summary).filter(Summary.meeting_id == meeting.id).first()

    summary_data = None
    if summary:
        summary_data = {
            "id": summary.id,
            "summary_text": summary.summary_text,
            "decisions": summary.decisions or [],
            "action_items": summary.action_items or [],
            "created_at": str(summary.created_at)
        }

    return {
        "meeting": {
            "id": meeting.id,
            "title": meeting.title,
            "status": meeting.status.value,
            "created_at": str(meeting.created_at)
        },
        "profile": {
            "meeting_id": profile.public_meeting_id,
            "scheduled_at": str(profile.scheduled_at),
            "description": profile.description,
            "tags": profile.tags or [],
            "ai_quality": profile.ai_quality.value
        },
        "status": "completed",
        "summary": summary_data,
        "transcript": transcript.full_text if transcript else None
    }

