import uvicorn
import os
import sys

# Thêm thư mục gốc vào đường dẫn hệ thống để package 'backend' hoạt động
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    print("🚀 Đang khởi động Server AI MeetingMind (Faster-Whisper & Llama)...")
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
