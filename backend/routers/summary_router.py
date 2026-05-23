from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from ..database import get_db
from ..models import Meeting, Summary, User, UserSettings
from ..services.llm_service import generate_meeting_summary
from .auth_router import get_current_user, get_optional_user

router = APIRouter(prefix="/api/v1/meetings", tags=["summary"])


class SummaryRequest(BaseModel):
    transcript: str
    meeting_id: Optional[int] = None  # Liên kết summary với meeting cụ thể (nếu có)
    ai_provider: Optional[str] = "ollama"  # "ollama" hoặc "gemini"


class SummaryUpdateRequest(BaseModel):
    summary_text: Optional[str] = None
    decisions: Optional[list] = None
    action_items: Optional[list] = None



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
        # 1. Truy vấn custom_prompt từ User Settings của user hiện tại (nếu có đăng nhập)
        custom_prompt = None
        if current_user:
            settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
            if settings and settings.custom_prompt:
                custom_prompt = settings.custom_prompt

        # 2. Truy vấn tiêu đề cuộc họp từ database (nếu có meeting_id)
        meeting_title = None
        meeting = None
        if request.meeting_id:
            meeting = db.query(Meeting).filter(Meeting.id == request.meeting_id).first()
            if meeting:
                meeting_title = meeting.title

        # Gọi trực tiếp qua service LLM (truyền thêm custom_prompt và meeting_title)
        result_payload = generate_meeting_summary(
            transcript_text=request.transcript,
            provider=request.ai_provider,
            custom_prompt=custom_prompt,
            meeting_title=meeting_title
        )

        # Lưu kết quả vào Database nếu có meeting_id
        saved_id = None
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
    
    # Nếu chưa có summary thì trả về mảng rỗng cho các field AI, vẫn cho phép xem transcript
    summary_data = {
        "id": summary.id if summary else None,
        "summary_text": summary.summary_text if summary else "Cuộc họp này chưa được tóm tắt.",
        "decisions": summary.decisions if summary else [],
        "action_items": summary.action_items if summary else [],
        "created_at": str(summary.created_at) if summary else None
    }

    return {
        "meeting": {
            "id": meeting.id,
            "title": meeting.title,
            "status": meeting.status.value if meeting.status else None,
            "created_at": str(meeting.created_at)
        },
        "summary": summary_data,
        "transcript": meeting.transcript.full_text if meeting.transcript else None
    }


@router.put("/{meeting_id}/summary")
def update_meeting_summary(
    meeting_id: int,
    request: SummaryUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Cập nhật chỉnh sửa tóm tắt, quyết định, action items
    """
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.user_id == current_user.id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Không có quyền truy cập.")
        
    summary = db.query(Summary).filter(Summary.meeting_id == meeting_id).first()
    if not summary:
        raise HTTPException(status_code=404, detail="Không tìm thấy tóm tắt.")
        
    if request.summary_text is not None:
        summary.summary_text = request.summary_text
    if request.decisions is not None:
        summary.decisions = request.decisions
    if request.action_items is not None:
        summary.action_items = request.action_items
        
    db.commit()
    return {"message": "Đã cập nhật thành công"}


@router.get("/action-items")
def get_all_action_items(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lấy danh sách tất cả Action Items từ mọi cuộc họp của người dùng.
    """
    meetings = db.query(Meeting).filter(Meeting.user_id == current_user.id).all()
    meeting_ids = [m.id for m in meetings]
    
    if not meeting_ids:
        return {"action_items": []}
        
    summaries = db.query(Summary).filter(Summary.meeting_id.in_(meeting_ids)).all()
    
    all_action_items = []
    for s in summaries:
        if s.action_items:
            m = next((m for m in meetings if m.id == s.meeting_id), None)
            for idx, item in enumerate(s.action_items):
                # Ensure the item is a dictionary
                if isinstance(item, dict):
                    all_action_items.append({
                        "meeting_id": s.meeting_id,
                        "meeting_title": m.title if m else "Không xác định",
                        "item_index": idx,
                        **item
                    })
                
    return {"action_items": all_action_items}


@router.put("/{meeting_id}/action-items/{item_index}/status")
def update_action_item_status(
    meeting_id: int,
    item_index: int,
    request: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Cập nhật trạng thái hoàn thành của một Action Item từ Kanban.
    """
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.user_id == current_user.id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Không có quyền.")
        
    summary = db.query(Summary).filter(Summary.meeting_id == meeting_id).first()
    if not summary or not summary.action_items:
        raise HTTPException(status_code=404, detail="Không tìm thấy.")
    
    action_items = list(summary.action_items)
    if item_index < 0 or item_index >= len(action_items):
        raise HTTPException(status_code=404, detail="Index không hợp lệ.")
        
    action_items[item_index]["completed"] = request.get("completed", False)
    
    summary.action_items = action_items
    db.commit()
    
    return {"message": "Đã cập nhật trạng thái công việc."}
