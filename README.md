# MeetingMind AI - Hệ Thống Trợ Lý Cuộc Họp Thông Minh

## 📖 Tổng Quan Dự Án (Project Overview)

**MeetingMind AI** là một giải pháp tổng thể (Full-Stack) nhằm tự động hóa quy trình ghi chép và trích xuất thông tin từ các cuộc họp. Thông qua sự kết hợp giữa **Trí tuệ Nhân tạo (AI)**, **Mô hình Ngôn ngữ Lớn (LLM)** và kiến trúc truyền phát luồng (Stream) thời gian thực, ứng dụng giúp người dùng thu âm, đọc hiểu giọng nói và tự động chuyển hóa thành các văn bản hành động (Action Items) có hệ thống.

**Tính năng cốt lõi:**
1. **Thu thập giọng nói (Real-time & Upload):** Hỗ trợ kéo & thả các file ghi âm có sẵn (m4a, mp3, wav) hoặc ghi âm trực tiếp tại trình duyệt. Quá trình xử lý âm thanh sử dụng giao thức WebSocket kết hợp kỹ thuật cắt chunk logic tự động cắt 3s/lần, cho phép nhận diện ngay khi đang nói mà không làm tắc nghẽn băng thông.
2. **Nhận diện giọng nói siêu tốc (Whisper STT):** Tiền xử lý tự động với thư viện FFmpeg ngầm đưa luồng âm thanh về mức tối ưu `16kHz, mono`, đảm bảo độ chính xác cực cao trước khi đưa vào mô hình STT (Speech-To-Text).
3. **Phân tích bóc tách bằng AI Local (LLM Ollama):** Chạy nội bộ trên local để bảo mật dữ liệu cuộc họp. Dùng mô hình LLaMA lập luận chặt chẽ để rút trích thành các bộ chuẩn định dạng JSON cho: **Tóm tắt nội dung**, **Các quyết định chính** và **Danh sách Việc Cần Làm (Checklist tasks)**.

---

## 💻 Tech Stack (Bộ Công Nghệ Sử Dụng)

- **Frontend:** ReactJS, Vite, Web Audio API (Vẽ sóng Waveform đồ thị giọng nói).
- **Backend:** Python (FastAPI), SQLAlchemy (Quản lý Schema), WebSockets.
- **Database & Storage Cơ Sở:** PostgreSQL, S3/MinIO.
- **AI / Cơ chế Core Logic:** FFmpeg, LLaMA Model (thông qua cổng Ollama), Whisper.

---

## ⚙️ Hướng Dẫn Cài Đặt (Installation Details)

Hệ thống được tách riêng biệt giữa Client (React) và Server (FastAPI). Để cài đặt nhanh chóng, hãy tiến hành đủ 3 bước chính sau đây:

### Yêu Cầu Thiết Yếu Bắt Buộc:
- Hệ thống cần được cài đặt sẵn [Python (3.10+)](https://www.python.org/downloads/) và [Node.js (LTS 18+)](https://nodejs.org/).
- Cần cài đặt engine [FFmpeg](https://ffmpeg.org/download.html) và đảm bảo đã set đường dẫn vào biến môi trường Path của hệ điều hành.

### Bước 1: Setup Công Cụ Suy Luận AI (Ollama)
Hệ thống sử dụng port `11434` của ứng dụng Ollama trên localhost để lấy bộ tóm tắt tự động.
1. Download và chạy file Setup Ollama tại: [https://ollama.com/](https://ollama.com/)
2. Mở trình gõ lệnh (CMD/Terminal) và kéo model về (Chỉ cần làm 1 lần khoảng ~2GB tải).
   ```bash
   ollama run llama3.2
   ```

### Bước 2: Setup Môi Trường Backend & Cài Đặt (Chỉ làm 1 lần đầu)
Mở Terminal tại thư mục chính (gốc) của dự án, chạy 2 lệnh sau để cài đặt các thư viện cần thiết cho cả Frontend và Backend.

**Cài Frontend:**
```bash
cd frontend
npm install
cd ..
```

**Cài Backend:**
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

### Bước 3: Khởi Động Nhanh Cả Hệ Thống (Bằng 1 Lệnh NPM)
Để loại bỏ sự phiền phức của Windows script (`.bat`), hệ thống đã được đồng bộ hóa thành một Monorepo với công cụ trợ lý `concurrently`.

Từ thư mục gốc dự án (nơi có chứa file `package.json` mới nhất), bạn chỉ cần gõ đúng một lệnh:
```bash
npm start
```

*(Lưu ý: Nếu mới tải dự án lần đầu, hãy gõ `npm run install:all` để tự động kích hoạt CSDL và thư viện rồi hãy gõ `npm start`)*.

Lệnh trên sẽ tự động hợp nhất log hiển thị của cả Backend FastAPI và Frontend ReactJS vào cùng một cửa sổ Console cực kỳ chuyên nghiệp. 

Bây giờ bạn truy cập đường link **`http://localhost:5173`** là sẽ tới thẳng màn hình Dashboard thu âm cực nhạy và giao diện List công việc trực quan! Thử tận hưởng sức mạnh của MeetingMind AI nhé.
