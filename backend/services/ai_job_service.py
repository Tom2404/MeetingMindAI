from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from ..models import AIJob


JOB_STATUS_QUEUED = "queued"
JOB_STATUS_RUNNING = "running"
JOB_STATUS_SUCCESS = "success"
JOB_STATUS_FAILED = "failed"


def create_job(
    db: Session,
    *,
    job_type: str,
    status: str = JOB_STATUS_QUEUED,
    user_id: Optional[int] = None,
    meeting_id: Optional[int] = None,
    input_size: int = 0,
) -> AIJob:
    job = AIJob(
        job_type=job_type,
        status=status,
        user_id=user_id,
        meeting_id=meeting_id,
        input_size=input_size,
        queued_at=datetime.now(timezone.utc),
    )
    db.add(job)
    db.flush()
    return job


def mark_job_running(db: Session, job: AIJob) -> None:
    job.status = JOB_STATUS_RUNNING
    job.started_at = datetime.now(timezone.utc)


def mark_job_success(db: Session, job: AIJob) -> None:
    job.status = JOB_STATUS_SUCCESS
    job.finished_at = datetime.now(timezone.utc)


def mark_job_failed(db: Session, job: AIJob, *, error: str) -> None:
    job.status = JOB_STATUS_FAILED
    job.error = error
    job.finished_at = datetime.now(timezone.utc)


def count_running_jobs(db: Session, *, job_type: Optional[str] = None) -> int:
    q = db.query(AIJob).filter(AIJob.status == JOB_STATUS_RUNNING)
    if job_type:
        q = q.filter(AIJob.job_type == job_type)
    return q.count()


def count_active_jobs(db: Session, *, job_type: Optional[str] = None) -> int:
    q = db.query(AIJob).filter(AIJob.status.in_([JOB_STATUS_QUEUED, JOB_STATUS_RUNNING]))
    if job_type:
        q = q.filter(AIJob.job_type == job_type)
    return q.count()
