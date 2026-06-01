from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from dotenv import load_dotenv

# Load file .env ở thư mục gốc của dự án (MeetingMindAI)
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(root_dir, ".env")
if os.path.exists(env_path):
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

from .database import engine, Base
from .database import SessionLocal
from .routers import audio_router, websocket_router, summary_router, auth_router, health_router, admin_router

from .models import IncidentLog, User
from .services.auth_service import decode_access_token, hash_password

# Đảm bảo thư mục uploads tồn tại để mount
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

# Khởi tạo bảng CSDL khi start server (tạo bảng mới nếu chưa có)
Base.metadata.create_all(bind=engine)

# Thực hiện migrate bổ sung cột cho SQLite nếu chưa tồn tại
from sqlalchemy import text
with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE meetings ADD COLUMN host VARCHAR(255)"))
        conn.commit()
        print("[DB-Migration] Added column 'host' to 'meetings' table.")
    except Exception:
        pass
    try:
        conn.execute(text("ALTER TABLE meetings ADD COLUMN participants TEXT"))
        conn.commit()
        print("[DB-Migration] Added column 'participants' to 'meetings' table.")
    except Exception:
        pass

    # RBAC: thêm cột role vào users (SQLite không hỗ trợ ALTER COLUMN nên chỉ ADD nếu thiếu)
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user'"))
        conn.commit()
        print("[DB-Migration] Added column 'role' to 'users' table.")
    except Exception:
        pass


def _seed_admin_account() -> None:
    """Seed admin account từ env. Không hardcode password."""
    admin_username = os.getenv("ADMIN_USERNAME")
    admin_password = os.getenv("ADMIN_PASSWORD")
    if not admin_username or not admin_password:
        print("[Admin] Seed skipped (set ADMIN_USERNAME & ADMIN_PASSWORD in .env to enable admin login).")
        return

    admin_username = admin_username.strip()
    admin_email = os.getenv("ADMIN_EMAIL", f"{admin_username}@local").strip()
    admin_full_name = os.getenv("ADMIN_FULL_NAME", "Administrator")
    force_reset = os.getenv("ADMIN_FORCE_RESET", "false").lower() == "true"

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == admin_username).first()
        if not user:
            user = User(
                username=admin_username,
                email=admin_email,
                password_hash=hash_password(admin_password),
                full_name=admin_full_name,
                is_active=True,
                role="admin",
            )
            db.add(user)
            db.commit()
            print(f"[Admin] Seeded admin user '{admin_username}'.")
            return

        changed = False
        if (user.role or "user") != "admin":
            user.role = "admin"
            changed = True
        if not user.is_active:
            user.is_active = True
            changed = True
        if user.email != admin_email and admin_email:
            user.email = admin_email
            changed = True
        if admin_full_name and user.full_name != admin_full_name:
            user.full_name = admin_full_name
            changed = True
        if force_reset:
            user.password_hash = hash_password(admin_password)
            changed = True

        if changed:
            db.commit()
            print(f"[Admin] Updated admin user '{admin_username}'.")
        else:
            print(f"[Admin] Admin user '{admin_username}' already configured.")
    finally:
        db.close()


_seed_admin_account()

app = FastAPI(
    title="MeetingMind AI API",
    description="Backend xử lý STT, WebSocket Audio Stream, LLM Summary và Xác thực người dùng",
    version="2.0.0"
)


@app.middleware("http")
async def incident_logging_middleware(request, call_next):
    """Ghi log sự cố tối thiểu vào DB (5xx và overload 429)."""
    import time
    import uuid

    request_id = str(uuid.uuid4())
    start = time.time()
    user_id = None

    auth = request.headers.get("authorization")
    if auth:
        scheme, _, token = auth.partition(" ")
        if scheme.lower() == "bearer" and token:
            try:
                payload = decode_access_token(token)
                user_id = payload.get("sub")
            except Exception:
                user_id = None

    try:
        response = await call_next(request)
    except Exception as exc:
        duration_ms = int((time.time() - start) * 1000)
        db = SessionLocal()
        try:
            db.add(
                IncidentLog(
                    level="error",
                    message=str(exc) or "Unhandled exception",
                    details={"duration_ms": duration_ms},
                    user_id=user_id,
                    request_id=request_id,
                    path=str(request.url.path),
                    method=request.method,
                    status_code=500,
                )
            )
            db.commit()
        finally:
            db.close()
        raise

    # log 5xx và overload
    if response.status_code >= 500 or response.status_code == 429:
        duration_ms = int((time.time() - start) * 1000)
        db = SessionLocal()
        try:
            db.add(
                IncidentLog(
                    level="error" if response.status_code >= 500 else "warning",
                    message=f"HTTP {response.status_code}",
                    details={"duration_ms": duration_ms},
                    user_id=user_id,
                    request_id=request_id,
                    path=str(request.url.path),
                    method=request.method,
                    status_code=response.status_code,
                )
            )
            db.commit()
        finally:
            db.close()

    response.headers["X-Request-Id"] = request_id
    return response

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
app.include_router(admin_router.router)       # Quản trị hệ thống (admin)

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
