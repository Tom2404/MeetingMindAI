import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict
import uuid

router = APIRouter(prefix="/api/v1/meetings", tags=["meetings"])

# Quản lý connection ảo để lưu trạng thái kết nối và Queue bộ đệm
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        # Dùng in-memory queue thay cho Redis/RabbitMQ để tránh ghi ổ cứng
        self.audio_queues: Dict[str, asyncio.Queue] = {}

    async def connect(self, websocket: WebSocket, meeting_id: str):
        await websocket.accept()
        self.active_connections[meeting_id] = websocket
        self.audio_queues[meeting_id] = asyncio.Queue()
        print(f"Client đã kết nối ws tới cuộc họp: {meeting_id}")

    def disconnect(self, meeting_id: str):
        if meeting_id in self.active_connections:
            del self.active_connections[meeting_id]
        if meeting_id in self.audio_queues:
            del self.audio_queues[meeting_id]
        print(f"Client đã ngắt kết nối ws với cuộc họp: {meeting_id}")

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

manager = ConnectionManager()


async def process_audio_queue(meeting_id: str, websocket: WebSocket):
    """
    Background Task lắng nghe queue in-memory để bóc băng (STT Worker Simulation).
    Worker này sẽ lấy chunk từ RAM và xử lý (giả lập Whisper).
    """
    queue = manager.audio_queues.get(meeting_id)
    if not queue:
        return

    chunk_count = 0
    try:
        while True:
            # Lấy chunk nhị phân từ RAM ra (không chạm ổ cứng)
            audio_bytes = await queue.get()
            chunk_count += 1
            
            # TODO: Đưa `audio_bytes` vào buffer hoặc chuyển thẳng vào mô hình STT (Whisper)
            print(f"[Worker {meeting_id}] Đang xử lý trên RAM chunk {chunk_count}: {len(audio_bytes)} bytes")
            
            # --- Tích hợp LLM/Whisper tại đây ---
            # Giả lập model STT
            await asyncio.sleep(0.1) # Giả lập delay của mô hình
            mock_stt_result = f"Tôi đã nhận dạng xong đoạn tín hiệu thứ {chunk_count} của bạn."
            
            # Trả ngược kết quả text về giao diện frontend
            await manager.send_personal_message(mock_stt_result, websocket)
            
            # Báo hiệu queue đã xử lý xong task này
            queue.task_done()
    except asyncio.CancelledError:
        print(f"[Worker {meeting_id}] Đã dừng tiến trình bóc băng.")


@router.websocket("/{meeting_id}/stream")
async def websocket_endpoint(websocket: WebSocket, meeting_id: str):
    """
    Endpoint Websocket tiếp nhận audio stream từ frontend.
    Từng chunk sẽ được đẩy vào In-memory Queue để Worker xử lý song song.
    """
    await manager.connect(websocket, meeting_id)
    
    # Khởi động siêu tiến trình (worker) chuyên xử lý STT cho meeting này
    processor_task = asyncio.create_task(process_audio_queue(meeting_id, websocket))
    
    try:
        chunk_count = 0
        while True:
            # Nhận dòng audio dưới dạng binary bytes
            audio_bytes = await websocket.receive_bytes()
            chunk_count += 1
            
            print(f"[Meeting {meeting_id}] Nhận luồng âm thanh {chunk_count} -> Đẩy vào RAM Queue")
            
            # Bắn thẳng raw_bytes vào asyncio.Queue thay vì lưu xuống /tmp/
            await manager.audio_queues[meeting_id].put(audio_bytes)

    except WebSocketDisconnect:
        manager.disconnect(meeting_id)
        processor_task.cancel()
        print(f"Cuộc stream cho {meeting_id} đã kết thúc bình thường.")
    except Exception as e:
        manager.disconnect(meeting_id)
        processor_task.cancel()
        print(f"Lỗi kết nối Socket cho meeting {meeting_id}: {str(e)}")
