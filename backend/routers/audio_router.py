import os
import shutil
import tempfile
from fastapi import APIRouter, File, UploadFile, HTTPException, Depends, BackgroundTasks, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from ..database import get_db, SessionLocal
from ..models import Meeting, MeetingStatus, Transcript, Summary, User
from .auth_router import get_optional_user

# Import hàm xử lý file cục bộ
from ..services.storage_service import process_local_audio, UPLOAD_DIR
from ..services.stt_service import transcribe_audio_local, transcribe_audio_with_gemini

router = APIRouter(prefix="/api/v1/meetings", tags=["meetings"])

MAX_FILE_SIZE = 500 * 1024 * 1024  # 500 MB
ALLOWED_EXTENSIONS = [".mp3", ".wav", ".m4a"]

class TranscriptSaveRequest(BaseModel):
    title: str
    transcript: str
    chunks: list = []

@router.post("/save-transcript")
def save_transcript(
    request: TranscriptSaveRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Lưu bản bóc băng Realtime vào Database (Tránh mất dữ liệu)"""
    meeting = Meeting(
        title=request.title,
        status=MeetingStatus.COMPLETED,
        user_id=current_user.id if current_user else None
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    
    transcript = Transcript(
        meeting_id=meeting.id,
        full_text=request.transcript,
        chunks=request.chunks
    )
    db.add(transcript)
    db.commit()
    
    return {"meeting_id": meeting.id, "message": "Đã lưu bản bóc băng"}


def run_stt_pipeline_task(meeting_id: int):
    """
    Background Task: Faster-Whisper sẽ đọc file từ ổ cứng local.
    Sau khi STT xong, tự động gọi LLM để tóm tắt và lưu vào Database.
    """
    print(f"[Queue] Processing STT for meeting_id: {meeting_id}")
    db = SessionLocal()
    try:
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting or not meeting.audio_s3_url:
            print("[Queue] Warning: Meeting or file link not found.")
            return

        # Đường dẫn tuyệt đối tới file wav trên máy — Sử dụng os.path.join thay vì nối chuỗi
        # audio_s3_url lưu dạng "/uploads/xxx.wav" → lấy tên file cuối
        filename_only = os.path.basename(meeting.audio_s3_url)
        file_disk_path = os.path.join(UPLOAD_DIR, filename_only)
        
        try:
            # 1. Chạy AI Gemini 1.5 Flash (Bóc băng + Phân biệt người nói)
            # Sử dụng Gemini làm mặc định để có tốc độ nhanh và tính năng Speaker Diarization
            stt_result = transcribe_audio_with_gemini(file_disk_path)
            recognized_text = stt_result["full_text"]
            chunks = stt_result["chunks"]
            
            # 2. Lưu Transcript vào Database (bao gồm cả full_text và chunks)
            new_transcript = Transcript(
                meeting_id=meeting.id, 
                full_text=recognized_text,
                chunks=chunks
            )
            db.add(new_transcript)

            # 3. Chờ người dùng xác nhận tóm tắt từ UI thay vì tự động tóm tắt
            # Đã bỏ phần auto-summarize theo yêu cầu của phương án 3


            meeting.status = MeetingStatus.COMPLETED
            db.commit()
            print(f"[Queue] STT completed for meeting {meeting_id}")
            
        except Exception as e:
            print(f"[Queue] STT Error: {repr(e)}")
            meeting.status = MeetingStatus.FAILED
            db.commit()
            
    finally:
        db.close()


@router.get("/{meeting_id}/transcript")
def get_transcript(meeting_id: int, db: Session = Depends(get_db)):
    """
    Dành cho Frontend Polling quá trình STT.
    Kèm theo trả summary nếu đã có (auto-summarize server-side).
    """
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Không tìm thấy Meeting")
        
    if meeting.status == MeetingStatus.FAILED:
        return {"status": "failed", "text": None, "summary": None}
    elif meeting.status == MeetingStatus.COMPLETED:
        transcript = db.query(Transcript).filter(Transcript.meeting_id == meeting_id).first()
        summary = db.query(Summary).filter(Summary.meeting_id == meeting_id).first()
        
        summary_data = None
        if summary:
            summary_data = {
                "summary_text": summary.summary_text,
                "decisions": summary.decisions or [],
                "action_items": summary.action_items or []
            }
        
        if transcript:
             return {
                 "status": "completed", 
                 "text": transcript.full_text,
                 "chunks": transcript.chunks or [],
                 "summary": summary_data
             }
             
    # Còn đang RECORDING hoặc PROCESSING
    return {"status": "processing", "text": None, "summary": None}


@router.post("/upload")
async def upload_audio_local(
    background_tasks: BackgroundTasks, 
    file: UploadFile = File(...), 
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Upload file âm thanh trực tiếp (Local Storage Mode):
    1. Tiếp nhận file qua network HTTP.
    2. Lưu tạm xuống thư mục temp của OS (tương thích Windows/Linux). 
    3. Convert qua FFmpeg và ném vào thư mục /uploads của dự án.
    4. Cập nhật record 'Meeting' trong database.
    5. Đưa vào Queue xử lý bóc băng Bằng Lõi Faster Whisper.
    """
    filename, ext = os.path.splitext(file.filename)
    if ext.lower() not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ file: .mp3, .wav, .m4a")

    # 1. Tạo bản ghi Meeting tạm thời báo đang ghi nhận, gắn user nếu đã đăng nhập
    new_meeting = Meeting(
        title=f"Cuộc họp {filename}", 
        status=MeetingStatus.RECORDING,
        user_id=current_user.id if current_user else None
    )
    db.add(new_meeting)
    db.commit()
    db.refresh(new_meeting)

    try:
        # Sử dụng tempfile.gettempdir() để tương thích Windows/Linux/Mac
        temp_dir = tempfile.gettempdir()
        temp_path = os.path.join(temp_dir, f"upload_local_{new_meeting.id}{ext}")
        
        # Ghi file và validate size theo từng chunk (tránh DoS)
        total_written = 0
        chunk_size = 1024 * 1024  # 1MB per chunk
        with open(temp_path, "wb") as buffer:
            while True:
                chunk = await file.read(chunk_size)
                if not chunk:
                    break
                total_written += len(chunk)
                if total_written > MAX_FILE_SIZE:
                    buffer.close()
                    os.remove(temp_path)
                    raise HTTPException(status_code=400, detail="File quá lớn (> 500 MB).")
                buffer.write(chunk)

        # Gọi FFmpeg Converter
        local_url_path = process_local_audio(temp_path, filename)

        # Cập nhật DB trạng thái đang bóc băng STT ...
        new_meeting.audio_s3_url = local_url_path
        new_meeting.status = MeetingStatus.PROCESSING
        db.commit()

        # Đẩy việc Cốt lõi AI Bóc băng vào ngầm
        background_tasks.add_task(run_stt_pipeline_task, new_meeting.id)

        return {
            "message": "Upload & Xử lý FFmpeg thành công. Hệ thống đang tiến hành bóc băng ngầm bằng AI Whisper.",
            "meeting_id": new_meeting.id,
            "status": new_meeting.status.value,
            "local_url": local_url_path
        }

    except HTTPException:
        # Re-raise HTTP exceptions (như file quá lớn) mà không xóa meeting
        raise
    except Exception as e:
        db.delete(new_meeting)
        db.commit()
        print(f"System error during local upload: {str(e)}")
        raise HTTPException(status_code=500, detail="Đã xảy ra lỗi trong quá trình xử lý file trên máy chủ.")
