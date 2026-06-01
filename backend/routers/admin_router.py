from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import AdminAuditLog, AIJob, IncidentLog, User
from ..services.ai_job_service import (
    JOB_STATUS_FAILED,
    JOB_STATUS_QUEUED,
    JOB_STATUS_RUNNING,
    JOB_STATUS_SUCCESS,
)
from ..services.settings_service import LIMIT_KEYS, get_limits, set_setting
from .auth_router import require_admin_user


router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


class LimitsUpdateRequest(BaseModel):
    max_upload_mb: Optional[int] = None
    max_transcript_chars: Optional[int] = None
    ai_max_concurrent_jobs: Optional[int] = None


class UserLockRequest(BaseModel):
    reason: Optional[str] = None


@router.get("/users")
def list_users(
    search: Optional[str] = None,
    include_inactive: bool = True,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin_user),
):
    from sqlalchemy import func
    from ..models import Meeting

    q = db.query(User)
    if not include_inactive:
        q = q.filter(User.is_active == True)  # noqa: E712
    if search and search.strip():
        s = f"%{search.strip()}%"
        q = q.filter((User.username.ilike(s)) | (User.email.ilike(s)) | (User.full_name.ilike(s)))

    total = q.count()
    rows = q.order_by(User.created_at.desc()).offset(max(offset, 0)).limit(min(max(limit, 1), 200)).all()

    # Calculate global totals to determine the usage ratio
    global_duration = db.query(func.sum(Meeting.duration_seconds)).scalar() or 0

    users_list = []
    for u in rows:
        # Sum of durations for this specific user
        user_duration = db.query(func.sum(Meeting.duration_seconds)).filter(Meeting.user_id == u.id).scalar() or 0
        meeting_count = db.query(Meeting).filter(Meeting.user_id == u.id).count()
        
        # System usage ratio
        ratio = round((user_duration / global_duration) * 100, 2) if global_duration > 0 else 0.0

        users_list.append({
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "is_active": bool(u.is_active),
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "meeting_count": meeting_count,
            "total_duration_seconds": user_duration,
            "usage_ratio": ratio
        })

    return {
        "total": total,
        "users": users_list,
    }



def _write_audit_log(
    db: Session,
    *,
    actor_user_id: Optional[int],
    action: str,
    target_user_id: Optional[int] = None,
    ip: Optional[str] = None,
    metadata: Optional[dict] = None,
) -> None:
    db.add(
        AdminAuditLog(
            actor_user_id=actor_user_id,
            action=action,
            target_user_id=target_user_id,
            ip=ip,
            metadata=metadata,
        )
    )


@router.post("/users/{user_id}/lock")
def lock_user(
    user_id: int,
    body: UserLockRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin_user),
):
    if user_id == current_admin.id:
        raise HTTPException(status_code=400, detail="Không thể tự khóa tài khoản admin đang đăng nhập.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy user")

    user.is_active = False

    _write_audit_log(
        db,
        actor_user_id=current_admin.id,
        action="user.lock",
        target_user_id=user.id,
        ip=request.client.host if request.client else None,
        metadata={"reason": body.reason} if body.reason else None,
    )

    db.commit()
    return {"message": "Đã khóa tài khoản", "user_id": user.id, "is_active": bool(user.is_active)}


@router.post("/users/{user_id}/unlock")
def unlock_user(
    user_id: int,
    body: UserLockRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy user")

    user.is_active = True

    _write_audit_log(
        db,
        actor_user_id=current_admin.id,
        action="user.unlock",
        target_user_id=user.id,
        ip=request.client.host if request.client else None,
        metadata={"reason": body.reason} if body.reason else None,
    )

    db.commit()
    return {"message": "Đã mở khóa tài khoản", "user_id": user.id, "is_active": bool(user.is_active)}


@router.get("/audit")
def list_audit_logs(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin_user),
):
    q = db.query(AdminAuditLog).order_by(AdminAuditLog.created_at.desc())
    total = q.count()
    rows = q.offset(max(offset, 0)).limit(min(max(limit, 1), 200)).all()

    return {
        "total": total,
        "logs": [
            {
                "id": r.id,
                "actor_user_id": r.actor_user_id,
                "action": r.action,
                "target_user_id": r.target_user_id,
                "ip": r.ip,
                    "metadata": r.metadata_json,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ],
    }


@router.get("/incidents")
def list_incidents(
    level: Optional[str] = None,
    status_code_min: Optional[int] = None,
    since_minutes: int = 24 * 60,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin_user),
):
    since_minutes = min(max(since_minutes, 1), 7 * 24 * 60)
    since_ts = datetime.now(timezone.utc) - timedelta(minutes=since_minutes)

    q = db.query(IncidentLog).filter(IncidentLog.created_at >= since_ts)
    if level:
        q = q.filter(IncidentLog.level == level)
    if status_code_min is not None:
        q = q.filter(IncidentLog.status_code >= int(status_code_min))

    total = q.count()
    rows = q.order_by(IncidentLog.created_at.desc()).offset(max(offset, 0)).limit(min(max(limit, 1), 200)).all()

    return {
        "total": total,
        "incidents": [
            {
                "id": r.id,
                "level": r.level,
                "message": r.message,
                "details": r.details,
                "user_id": r.user_id,
                "request_id": r.request_id,
                "path": r.path,
                "method": r.method,
                "status_code": r.status_code,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ],
    }


@router.get("/settings/limits")
def get_limit_settings(
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin_user),
):
    return {"limits": get_limits(db)}


@router.put("/settings/limits")
def update_limit_settings(
    body: LimitsUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin_user),
):
    updates = {}
    for key in ["max_upload_mb", "max_transcript_chars", "ai_max_concurrent_jobs"]:
        val = getattr(body, key)
        if val is None:
            continue
        cfg = LIMIT_KEYS[key]
        val_int = int(val)
        if val_int < cfg["min"] or val_int > cfg["max"]:
            raise HTTPException(
                status_code=400,
                detail=f"{key} phải nằm trong [{cfg['min']}, {cfg['max']}]",
            )
        updates[key] = val_int

    if not updates:
        return {"message": "Không có thay đổi", "limits": get_limits(db)}

    for k, v in updates.items():
        set_setting(db, k, v, updated_by_user_id=current_admin.id)

    _write_audit_log(
        db,
        actor_user_id=current_admin.id,
        action="settings.limits.update",
        ip=request.client.host if request.client else None,
        metadata=updates,
    )

    db.commit()
    return {"message": "Đã cập nhật limit", "limits": get_limits(db)}


@router.get("/ai/jobs")
def list_ai_jobs(
    job_type: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin_user),
):
    q = db.query(AIJob)
    if job_type:
        q = q.filter(AIJob.job_type == job_type)
    if status:
        q = q.filter(AIJob.status == status)

    total = q.count()
    rows = q.order_by(AIJob.queued_at.desc()).offset(max(offset, 0)).limit(min(max(limit, 1), 200)).all()

    def _duration_ms(j: AIJob) -> Optional[int]:
        if not j.started_at:
            return None
        end = j.finished_at or datetime.now(timezone.utc)
        return int((end - j.started_at).total_seconds() * 1000)

    return {
        "total": total,
        "jobs": [
            {
                "id": j.id,
                "job_type": j.job_type,
                "status": j.status,
                "meeting_id": j.meeting_id,
                "user_id": j.user_id,
                "queued_at": j.queued_at.isoformat() if j.queued_at else None,
                "started_at": j.started_at.isoformat() if j.started_at else None,
                "finished_at": j.finished_at.isoformat() if j.finished_at else None,
                "duration_ms": _duration_ms(j),
                "input_size": j.input_size,
                "error": j.error,
            }
            for j in rows
        ],
    }


@router.get("/ai/queue/metrics")
def get_queue_metrics(
    window_seconds: int = 300,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin_user),
):
    window_seconds = min(max(window_seconds, 30), 3600)
    since_ts = datetime.now(timezone.utc) - timedelta(seconds=window_seconds)

    running = db.query(AIJob).filter(AIJob.status == JOB_STATUS_RUNNING).count()
    queued = db.query(AIJob).filter(AIJob.status == JOB_STATUS_QUEUED).count()
    success = db.query(AIJob).filter(AIJob.status == JOB_STATUS_SUCCESS).count()
    failed = db.query(AIJob).filter(AIJob.status == JOB_STATUS_FAILED).count()

    recent_total = db.query(AIJob).filter(AIJob.queued_at >= since_ts).count()
    recent_running = db.query(AIJob).filter(AIJob.status == JOB_STATUS_RUNNING, AIJob.queued_at >= since_ts).count()

    return {
        "window_seconds": window_seconds,
        "counts": {
            "running": running,
            "queued": queued,
            "success": success,
            "failed": failed,
        },
        "recent": {
            "total": recent_total,
            "running": recent_running,
        },
    }


@router.post("/ai/jobs/{job_id}/abort")
def abort_ai_job(
    job_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin_user),
):
    job = db.query(AIJob).filter(AIJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Không tìm thấy tác vụ AI")
    
    if job.status not in ["queued", "running"]:
        raise HTTPException(status_code=400, detail="Chỉ có thể hủy tác vụ đang chạy hoặc đang chờ")

    job.status = "failed"
    job.error = "Bị hủy bởi quản trị viên."
    job.finished_at = datetime.now(timezone.utc)

    # Nếu có meeting liên quan, cập nhật trạng thái meeting nếu nó đang bị treo ở processing
    if job.meeting_id:
        from ..models import Meeting, MeetingStatus
        meeting = db.query(Meeting).filter(Meeting.id == job.meeting_id).first()
        if meeting and meeting.status == MeetingStatus.PROCESSING:
            meeting.status = MeetingStatus.FAILED

    _write_audit_log(
        db,
        actor_user_id=current_admin.id,
        action="ai.job.abort",
        target_user_id=job.user_id,
        ip=request.client.host if request.client else None,
        metadata={"job_id": job.id, "job_type": job.job_type}
    )

    db.commit()
    return {"message": "Đã hủy tác vụ AI thành công", "job_id": job.id}
