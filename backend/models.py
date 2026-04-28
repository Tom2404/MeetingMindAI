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
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Quan hệ 1-N: 1 User có nhiều Meeting
    meetings = relationship("Meeting", back_populates="owner", cascade="all, delete-orphan")


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
