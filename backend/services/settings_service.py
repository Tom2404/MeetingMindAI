from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy.orm import Session

from ..models import SystemSetting


def get_setting_str(db: Session, key: str, default: str) -> str:
    row = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    return row.value if row else default


def get_setting_int(
    db: Session,
    key: str,
    default: int,
    minimum: Optional[int] = None,
    maximum: Optional[int] = None,
) -> int:
    raw = get_setting_str(db, key, str(default))
    try:
        value = int(str(raw).strip())
    except Exception:
        value = default

    if minimum is not None and value < minimum:
        return minimum
    if maximum is not None and value > maximum:
        return maximum
    return value


def set_setting(db: Session, key: str, value: Any, updated_by_user_id: Optional[int] = None) -> SystemSetting:
    row = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if row is None:
        row = SystemSetting(key=key, value=str(value), updated_by_user_id=updated_by_user_id)
        db.add(row)
    else:
        row.value = str(value)
        row.updated_by_user_id = updated_by_user_id
        row.updated_at = datetime.now(timezone.utc)
    return row


LIMIT_KEYS = {
    "max_upload_mb": {"default": 500, "min": 1, "max": 2048},
    "max_transcript_chars": {"default": 200_000, "min": 1000, "max": 2_000_000},
    "ai_max_concurrent_jobs": {"default": 2, "min": 1, "max": 32},
}


def get_limits(db: Session) -> dict:
    result = {}
    for key, cfg in LIMIT_KEYS.items():
        result[key] = get_setting_int(db, key, cfg["default"], cfg["min"], cfg["max"])
    return result
