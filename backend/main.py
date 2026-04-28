from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from .database import engine, Base
from .routers import audio_router, websocket_router, summary_router, auth_router, health_router

# Đảm bảo thư mục uploads tồn tại để mount
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

# Khởi tạo bảng CSDL khi start server (tạo bảng mới nếu chưa có)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="MeetingMind AI API",
    description="Backend xử lý STT, WebSocket Audio Stream, LLM Summary và Xác thực người dùng",
    version="2.0.0"
)

# Phục vụ file tĩnh từ thư mục uploads
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Cấu hình CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Đăng ký các router (Module API)
app.include_router(auth_router.router)       # Đăng nhập / Đăng ký
app.include_router(audio_router.router)       # Upload & STT
app.include_router(websocket_router.router)   # WebSocket Stream
app.include_router(summary_router.router)     # LLM Summary & History
app.include_router(health_router.router)      # Kiểm tra trạng thái AI

from fastapi.responses import HTMLResponse, RedirectResponse

@app.get("/")
def read_root():
    # Khi user click lỗi vào link 8000 của Backend, tự động chuyển hướng họ sang Giao diện Frontend
    return RedirectResponse(url="http://localhost:5173")

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    from fastapi import Response
    return Response(status_code=204) # Không có nội dung nhưng không bị dính lỗi 404

# test startup cục bộ bằng biến __main__ nếu gọi trực tiếp (python backend/main.py)
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
