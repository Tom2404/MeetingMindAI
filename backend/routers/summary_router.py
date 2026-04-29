from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from ..database import get_db
from ..models import Meeting, Summary, User
from ..services.llm_service import generate_meeting_summary
from .auth_router import get_current_user, get_optional_user

router = APIRouter(prefix="/api/v1/meetings", tags=["summary"])


class SummaryRequest(BaseModel):
    transcript: str
    meeting_id: Optional[int] = None  # Liên kết summary với meeting cụ thể (nếu có)


@router.post("/summarize")
def summarize_meeting(
    request: SummaryRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Endpoint tiếp nhận toàn văn (Transcript) từ quá trình bóc băng, 
    đẩy vào mô hình LLM để trích xuất Tóm tắt, Quyết định và Công việc.
    Nếu có meeting_id, kết quả sẽ được tự động lưu vào Database.
    """
    if not request.transcript or len(request.transcript.strip()) < 10:
        raise HTTPException(status_code=400, detail="Văn bản bóc băng quá ngắn hoặc trống rỗng.")

    try:
        # Gọi trực tiếp qua service Ollama
        result_payload = generate_meeting_summary(request.transcript)

        # Lưu kết quả vào Database nếu có meeting_id
        saved_id = None
        if request.meeting_id:
            meeting = db.query(Meeting).filter(Meeting.id == request.meeting_id).first()
            if meeting:
                # Xóa summary cũ nếu có (upsert)
                existing_summary = db.query(Summary).filter(Summary.meeting_id == meeting.id).first()
                if existing_summary:
                    db.delete(existing_summary)
                    db.flush()

                new_summary = Summary(
                    meeting_id=meeting.id,
                    summary_text=result_payload["summary_text"],
                    decisions=result_payload["decisions"],
                    action_items=result_payload["action_items"]
                )
                db.add(new_summary)
                db.commit()
                db.refresh(new_summary)
                saved_id = new_summary.id
                print(f"[LLM] Success: Summary saved to DB for meeting_id={meeting.id}")

        return {
            "message": "Trích xuất bằng Trí Tuệ Nhân Tạo Llama 3.2 thành công.",
            "data": result_payload,
            "saved_id": saved_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi Server nội bộ khi chạy LLM: {str(e)}")


@router.get("/history")
def get_meeting_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lấy danh sách tất cả cuộc họp của user đã đăng nhập, kèm trạng thái Summary.
    Sắp xếp từ mới nhất đến cũ nhất.
    """
    meetings = (
        db.query(Meeting)
        .filter(Meeting.user_id == current_user.id)
        .order_by(Meeting.created_at.desc())
        .all()
    )

    result = []
    for m in meetings:
        result.append({
            "id": m.id,
            "title": m.title,
            "status": m.status.value if m.status else None,
            "has_summary": m.summary is not None,
            "created_at": str(m.created_at),
            "duration_seconds": m.duration_seconds
        })

    return {"meetings": result, "total": len(result)}


@router.get("/{meeting_id}/summary")
def get_meeting_summary(
    meeting_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Lấy bản tóm tắt đã lưu của một cuộc họp cụ thể.
    """
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Không tìm thấy cuộc họp.")

    summary = db.query(Summary).filter(Summary.meeting_id == meeting_id).first()
    if not summary:
        raise HTTPException(status_code=404, detail="Cuộc họp này chưa có bản tóm tắt.")

    return {
        "meeting": {
            "id": meeting.id,
            "title": meeting.title,
            "status": meeting.status.value if meeting.status else None,
            "created_at": str(meeting.created_at)
        },
        "summary": {
            "id": summary.id,
            "summary_text": summary.summary_text,
            "decisions": summary.decisions or [],
            "action_items": summary.action_items or [],
            "created_at": str(summary.created_at)
        }
    }
