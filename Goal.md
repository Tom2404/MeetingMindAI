# CHỈ THỊ TRIỂN KHAI MÃ NGUỒN: MEETINGMIND AI
**Role:** Senior Full-Stack Developer & AI Engineer
**Project:** MeetingMind AI (Hệ thống Trợ lý Cuộc họp Thông minh)

## 1. MỤC TIÊU VÀ NGĂN XẾP CÔNG NGHỆ (TECH STACK)
Hãy viết mã nguồn tuân thủ nghiêm ngặt các công nghệ sau:
*   **Frontend:** ReactJS, AudioWorklet (để xử lý âm thanh), WebSocket Client, CSS/Tailwind (Giao diện).
*   **Backend:** Python (FastAPI), WebSocket Server, Celery (hoặc BackgroundTasks cho Queue).
*   **AI Models:** Whisper (Speech-to-Text), LLM (GPT/Llama/ViT5 cho Tóm tắt).
*   **Database & Storage:** PostgreSQL, MinIO/S3 (lưu file audio).

Hôm nay, bạn cần tập trung triển khai **2 nhóm chức năng ưu tiên** dựa trên User Story của dự án:

---

## 2. YÊU CẦU TRIỂN KHAI 1: NGHIỆP VỤ THU THẬP ÂM THANH (AUDIO INPUT)
*Tham chiếu Sprints: Sprint 1 & Sprint 2.*

### 2.1. Upload File có sẵn (AUD-001, AUD-002, AUD-011)
*   **Frontend (React):** Tạo Component kéo thả (Drag & Drop). 
    *   Chỉ chấp nhận định dạng: `.mp3`, `.wav`, `.m4a` [1, 2].
    *   Validate kích thước: Max 500MB. Nếu vượt quá, block và báo lỗi [1, 3].
    *   Hiển thị thanh tiến trình (Progress bar) với % tải lên và tốc độ [1, 3].
    *   Có nút "Hủy" (Cancel) để ngắt request giữa chừng [4].
*   **Backend (FastAPI):**
    *   Tạo endpoint `POST /api/v1/meetings/upload`.
    *   Nhận file, lưu tạm và đẩy thẳng vào Object Storage (MinIO/S3) [5].
    *   Chuyển đổi sample rate về chuẩn `16kHz, mono` bằng `ffmpeg` trước khi đẩy vào Queue STT [6].

### 2.2. Ghi âm trực tiếp & Real-time (AUD-003 -> AUD-008, STT-002)
*   **Frontend (React):** 
    *   Xin quyền Microphone. Nút: Bắt đầu, Tạm dừng, Tiếp tục, Dừng [3, 7].
    *   Hiển thị đồng hồ đếm giờ chuẩn `HH:MM:SS` update mỗi giây [7, 8].
    *   Vẽ sóng âm (Waveform) real-time để người dùng biết Mic đang hoạt động [9].
    *   **Logic quan trọng:** Tích hợp VAD (Voice Activity Detection) tại Client. Cắt luồng âm thanh thành các chunk nhỏ (3-5 giây) và gửi qua liên tục bằng `WebSocket` [8, 10].
*   **Backend (FastAPI):**
    *   Tạo WebSocket endpoint `ws /api/v1/meetings/{id}/stream`.
    *   Nhận audio chunks, đưa vào Queue để gọi model Whisper nhận diện tức thời (Real-time STT) và trả text về Client [8, 10].

---

## 3. YÊU CẦU TRIỂN KHAI 2: NGHIỆP VỤ TÓM TẮT & TRÍCH XUẤT BẰNG LLM
*Tham chiếu Sprints: Sprint 3.*
*Logic kích hoạt: Chạy tự động ngay sau khi quá trình STT (Bóc băng) của cuộc họp kết thúc.*

### 3.1. Thiết kế Prompt cho LLM (SUM-001 -> SUM-009)
Viết một module Python giao tiếp với LLM. Cần thiết kế System Prompt ép LLM trả về định dạng JSON nghiêm ngặt bao gồm các keys sau từ chuỗi Transcript thô:
1.  `summary`: Bản tóm tắt diễn giải ngắn gọn, tự nhiên nội dung toàn cuộc họp [11, 12].
2.  `decisions`: Mảng (Array) các quyết định quan trọng được chốt (dựa vào từ khóa "quyết định", "thống nhất") [12].
3.  `action_items`: Mảng (Array) các công việc cần làm (dựa vào từ khóa "cần", "phải", "sẽ") [11, 13]. 
    *   Mỗi action item phải trích xuất được `task_name` (tên công việc), `assignee` (người phụ trách - tìm sau các chữ "do", "bởi"), và `deadline` (hạn chót) [14].

### 3.2. Lưu trữ và Trả kết quả (STO-002, UI-009)
*   **Backend:** Lưu cục nhận diện này vào PostgreSQL. Bảng `meeting_summary` và lưu `action_items` dưới dạng JSONB có liên kết `meeting_id` [5].
*   **Frontend:**
    *   Hiển thị Tóm tắt ở thẻ (Tab) riêng biệt trong trang Chi tiết cuộc họp [11].
    *   Render danh sách `action_items` dưới dạng **Checklist** (có ô tick box để đánh dấu hoàn thành) [13, 15].

---

## 4. CÁC BƯỚC THỰC THI DÀNH CHO AI AGENT (ACTION PLAN)

Hãy thực hiện code theo đúng thứ tự sau, khi xong bước nào hãy báo cáo để tôi review trước khi sang bước tiếp theo:

*   **Bước 1:** Viết file `models.py` (SQLAlchemy) định nghĩa bảng `Meeting`, `Transcript`, `Summary`, `ActionItem`.
*   **Bước 2:** Viết Backend FastAPI cho luồng Upload File (Upload endpoint, lưu MinIO, gọi FFmpeg).
*   **Bước 3:** Viết Backend FastAPI thiết lập WebSocket Server nhận Audio Stream.
*   **Bước 4:** Viết React Frontend cho Giao diện Ghi âm (Waveform, Timer, MediaRecorder, WebSocket Client gửi chunk 3s).
*   **Bước 5:** Viết file `llm_service.py` chứa logic gọi LLM chạy từ Local (Llama) kèm bộ System Prompt chuẩn JSON để trích xuất Tóm tắt và Action Items.
*   **Bước 6:** Viết React Frontend hiển thị kết quả Tóm tắt và render Checklist Action Items.

**Yêu cầu chất lượng Code (DoD):**
- Có comment giải thích các block code phức tạp (bằng tiếng Việt).
- Có bọc `try/catch` và ghi log lỗi đầy đủ cho Backend [16, 17].
- Clean code, tách biệt rạch ròi Controller (Router) và Service.
