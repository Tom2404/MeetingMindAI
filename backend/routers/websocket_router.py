import asyncio
import time
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict
import uuid
import wave
import tempfile
import os
import numpy as np
from ..services.stt_service import transcribe_audio_buffer, transcribe_audio_with_gemini

router = APIRouter(prefix="/api/v1/meetings", tags=["meetings"])

# Quản lý connection ảo để lưu trạng thái kết nối và Queue bộ đệm
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        # Dùng in-memory queue thay cho Redis/RabbitMQ để tránh ghi ổ cứng
        self.audio_queues: Dict[str, asyncio.Queue] = {}
        # Bộ đệm lưu giữ ngôn ngữ đã nhận diện của phòng họp
        self.meeting_langs: Dict[str, str] = {}

    async def connect(self, websocket: WebSocket, meeting_id: str):
        await websocket.accept()
        self.active_connections[meeting_id] = websocket
        self.audio_queues[meeting_id] = asyncio.Queue()
        self.meeting_langs[meeting_id] = None
        print(f"Client connected ws to meeting: {meeting_id}")

    def disconnect(self, meeting_id: str):
        if meeting_id in self.active_connections:
            del self.active_connections[meeting_id]
        if meeting_id in self.audio_queues:
            del self.audio_queues[meeting_id]
        if meeting_id in self.meeting_langs:
            del self.meeting_langs[meeting_id]
        print(f"Client disconnected ws from meeting: {meeting_id}")

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
            print(f"[Worker {meeting_id}] Processing RAM chunk {chunk_count}: {len(audio_bytes)} bytes")
            
            # --- Tích hợp LLM/Whisper tại đây ---
            # Chạy bóc băng trong một thread riêng để không block event loop của FastAPI
            try:
                current_lang = manager.meeting_langs.get(meeting_id)
                text_result, detected_lang = await asyncio.to_thread(
                    transcribe_audio_buffer, audio_bytes, current_lang
                )
                
                # Cập nhật ngôn ngữ nếu chưa có
                if detected_lang and manager.meeting_langs.get(meeting_id) is None:
                    manager.meeting_langs[meeting_id] = detected_lang
                    
                if text_result.strip():
                    # Trả ngược kết quả text về giao diện frontend
                    await manager.send_personal_message(text_result, websocket)
            except Exception as e:
                import traceback
                print(f"[Worker {meeting_id}] STT Error: {e}")
                traceback.print_exc()
            
            # Báo hiệu queue đã xử lý xong task này
            queue.task_done()
    except asyncio.CancelledError:
        print(f"[Worker {meeting_id}] Stopped transcription process.")


@router.websocket("/{meeting_id}/stream")
async def websocket_endpoint(websocket: WebSocket, meeting_id: str):
    """
    Endpoint Websocket tiếp nhận audio stream từ frontend.
    Từng chunk sẽ được đẩy vào In-memory Queue để Worker xử lý song song.
    """
    await manager.connect(websocket, meeting_id)
    
    # Khởi động siêu tiến trình (worker) chuyên xử lý STT cho meeting này
    processor_task = asyncio.create_task(process_audio_queue(meeting_id, websocket))
    
    start_time = time.time()
    MAX_DURATION = 30 * 60 # 30 phút

    try:
        chunk_count = 0
        all_audio_bytes = bytearray()
        
        while True:
            # Kiểm tra thời gian phiên làm việc
            if time.time() - start_time > MAX_DURATION:
                print(f"[Meeting {meeting_id}] Exceeded 30 mins limit. Disconnecting.")
                await websocket.close(code=1008, reason="Time limit exceeded (30 mins)")
                break

            # Nhận data: Có thể là text lệnh (như "STOP") hoặc bytes audio
            message = await websocket.receive()
            
            if "text" in message:
                text_data = message["text"]
                if text_data == "STOP":
                    print(f"[Meeting {meeting_id}] Received STOP command. Generating Speaker Diarization...")
                    # 1. Chuyển toàn bộ bytes tích luỹ thành file WAV (16kHz, mono, int16)
                    audio_np = np.frombuffer(all_audio_bytes, dtype=np.float32)
                    audio_int16 = (audio_np * 32767).astype(np.int16)
                    
                    tmp_file = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
                    tmp_path = tmp_file.name
                    with wave.open(tmp_file, 'wb') as wav_file:
                        wav_file.setnchannels(1)
                        wav_file.setsampwidth(2)
                        wav_file.setframerate(16000)
                        wav_file.writeframes(audio_int16.tobytes())
                    
                    # 2. Gọi Gemini để phân tích toàn văn và nhận diện người nói (Diarization)
                    try:
                        final_result = await asyncio.to_thread(transcribe_audio_with_gemini, tmp_path)
                        # Gửi JSON về client
                        await websocket.send_json({
                            "type": "final",
                            "full_text": final_result["full_text"],
                            "chunks": final_result["chunks"]
                        })
                    except Exception as e:
                        import traceback
                        print(f"Gemini Diarization error: {e}")
                        traceback.print_exc()
                        await websocket.send_json({"type": "error", "message": "Lỗi phân tích người nói từ AI."})
                    finally:
                        os.remove(tmp_path)
                    
                    break # Thoát vòng lặp, tự động disconnect
                    
            elif "bytes" in message:
                audio_bytes = message["bytes"]
                chunk_count += 1
                all_audio_bytes.extend(audio_bytes)
                
                print(f"[Meeting {meeting_id}] Received audio chunk {chunk_count} -> Pushing to RAM Queue")
                await manager.audio_queues[meeting_id].put(audio_bytes)

    except WebSocketDisconnect:
        manager.disconnect(meeting_id)
        processor_task.cancel()
        print(f"Stream for {meeting_id} ended normally.")
    except Exception as e:
        manager.disconnect(meeting_id)
        processor_task.cancel()
        print(f"Socket error for meeting {meeting_id}: {str(e)}")
