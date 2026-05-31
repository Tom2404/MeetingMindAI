from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum, JSON, Boolean
from sqlalchemy.orm import relationship
import enum
from datetime import datetime, timezone
from .database import Base


# ==============================================================================
# ENUM Trạng thái cuộc họp
# ==============================================================================
class MeetingStatus(enum.Enum):
    RECORDING = "recording"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


# ==============================================================================
# BẢNG USER — Quản lý tài khoản người dùng (Đăng ký / Đăng nhập)
# ==============================================================================
class User(Base):
    """
    Bảng User lưu trữ thông tin tài khoản người dùng.
    Mỗi user có thể sở hữu nhiều cuộc họp (Meeting).
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    avatar_url = Column(String(512), nullable=True)
    is_active = Column(Boolean, default=True)
    # Role-based access control (RBAC): 'user' | 'admin'
    role = Column(String(20), nullable=False, default="user", index=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Quan hệ 1-N: 1 User có nhiều Meeting
    meetings = relationship("Meeting", back_populates="owner", cascade="all, delete-orphan")
    # Quan hệ 1-1: User và Cấu hình của họ
    settings = relationship("UserSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")


# ==============================================================================
# BẢNG SYSTEM SETTINGS — Cấu hình hệ thống (limit, queue, ...)
# ==============================================================================
class SystemSetting(Base):
    __tablename__ = "system_settings"

    key = Column(String(100), primary_key=True)
    value = Column(String(500), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    updated_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)


# ==============================================================================
# BẢNG INCIDENT LOGS — Log sự cố hệ thống (5xx, overload, ...)
# ==============================================================================
class IncidentLog(Base):
    __tablename__ = "incident_logs"

    id = Column(Integer, primary_key=True, index=True)
    level = Column(String(20), nullable=False, default="error", index=True)
    message = Column(Text, nullable=False)
    details = Column(JSON, nullable=True)

    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    request_id = Column(String(64), nullable=True, index=True)
    path = Column(String(512), nullable=True, index=True)
    method = Column(String(16), nullable=True)
    status_code = Column(Integer, nullable=True, index=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)


# ==============================================================================
# BẢNG ADMIN AUDIT LOG — Log hành động quản trị
# ==============================================================================
class AdminAuditLog(Base):
    __tablename__ = "admin_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    actor_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(100), nullable=False, index=True)
    target_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    ip = Column(String(64), nullable=True)
    metadata_json = Column("metadata", JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)


# ==============================================================================
# BẢNG AI JOBS — Theo dõi tải hàng đợi xử lý AI (STT/LLM)
# ==============================================================================
class AIJob(Base):
    __tablename__ = "ai_jobs"

    id = Column(Integer, primary_key=True, index=True)
    job_type = Column(String(50), nullable=False, index=True)  # 'stt' | 'summarize'
    status = Column(String(20), nullable=False, index=True)    # 'queued'|'running'|'success'|'failed'

    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="SET NULL"), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    queued_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)
    input_size = Column(Integer, default=0)
    error = Column(Text, nullable=True)



# ==============================================================================
# BẢNG USER SETTINGS — Cấu hình cá nhân
# ==============================================================================
class UserSettings(Base):
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    
    # Cấu hình AI mặc định
    default_language = Column(String(50), default="vi")
    custom_prompt = Column(Text, nullable=True)
    
    # Giao diện
    theme = Column(String(20), default="system")

    user = relationship("User", back_populates="settings")


# ==============================================================================
# BẢNG MEETING — Thông tin cuộc họp
# ==============================================================================
class Meeting(Base):
    """
    Bảng Meeting chứa thông tin chung của cuộc họp.
    Liên kết tới User (chủ sở hữu) qua user_id.
    """
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=True)
    duration_seconds = Column(Integer, default=0)
    audio_s3_url = Column(String(512), nullable=True)
    status = Column(Enum(MeetingStatus), default=MeetingStatus.RECORDING)
    host = Column(String(255), nullable=True)
    participants = Column(Text, nullable=True)

    # FK liên kết tới User (nullable để không break flow cũ khi chưa đăng nhập)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Quan hệ ngược lại tới User
    owner = relationship("User", back_populates="meetings")

    # Quan hệ 1-1 hoặc 1-N tới Transcript và Summary (Sử dụng uselist=False cho 1-1)
    transcript = relationship("Transcript", back_populates="meeting", uselist=False, cascade="all, delete-orphan")
    summary = relationship("Summary", back_populates="meeting", uselist=False, cascade="all, delete-orphan")


# ==============================================================================
# BẢNG TRANSCRIPT — Văn bản bóc băng từ Whisper (STT)
# ==============================================================================
class Transcript(Base):
    """
    Bảng Transcript lưu trữ toàn bộ văn bản (bóc băng) từ Whisper (STT).
    Có thể mở rộng để lưu các chunk text real-time vào JSONB.
    """
    __tablename__ = "transcripts"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), unique=True)
    full_text = Column(Text, nullable=False)
    
    # Dùng JSONB lưu trữ danh sách các đoạn hội thoại có phân rã mốc thời gian 
    # Ví dụ: [{"start": 0, "end": 3.5, "speaker": "A", "text": "Xin chào"}]
    chunks = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    meeting = relationship("Meeting", back_populates="transcript")


# ==============================================================================
# BẢNG SUMMARY — Kết quả tóm tắt từ LLM
# ==============================================================================
class Summary(Base):
    """
    Bảng Summary lưu trữ toàn bộ thông tin tóm tắt và bóc tách do LLM trả ra từ Transcript.
    Bao gồm nội dung tóm tắt, quyết định và danh sách hành động (Action Items).
    """
    __tablename__ = "summaries"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), unique=True)
    
    # 1. Đoạn text tóm tắt hội thoại
    summary_text = Column(Text, nullable=False)
    
    # 2. Danh sách các quyết định (Decisions) - Model trả Array, mình lưu kiểu JSONB
    decisions = Column(JSON, nullable=True)

    # 3. Action Items - Lưu mảng JSON để tiện cho React hiển thị Checklist (nếu không tách bảng riêng)
    # Cấu trúc: [{"task_name": "Review code", "assignee": "A", "deadline": "2023-12-01", "completed": false}]
    action_items = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    meeting = relationship("Meeting", back_populates="summary")
