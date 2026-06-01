from fastapi import APIRouter, HTTPException, Depends, Header, Request
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy.orm import Session
from typing import Optional

from ..database import get_db
from ..models import User
from ..services.auth_service import hash_password, verify_password, create_access_token, decode_access_token

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


# ==============================================================================
# PYDANTIC SCHEMAS — Validate dữ liệu đầu vào
# ==============================================================================
class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    full_name: Optional[str] = None

    @field_validator('username')
    @classmethod
    def validate_username(cls, v):
        if len(v.strip()) < 3:
            raise ValueError("Tên tài khoản phải có ít nhất 3 ký tự")
        if len(v.strip()) > 50:
            raise ValueError("Tên tài khoản không được vượt quá 50 ký tự")
        return v.strip()

    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError("Mật khẩu phải có ít nhất 6 ký tự")
        return v

    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        if "@" not in v or "." not in v:
            raise ValueError("Email không hợp lệ")
        return v.strip().lower()


class LoginRequest(BaseModel):
    username: str
    password: str


# ==============================================================================
# DEPENDENCY — Lấy current user từ JWT token trong request header
# ==============================================================================
def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """
    Dependency dùng cho các endpoint cần xác thực.
    Đọc JWT token từ header "Authorization: Bearer <token>".
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Chưa đăng nhập. Vui lòng cung cấp token.")

    # Tách Bearer prefix
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="Token không đúng định dạng. Sử dụng: Bearer <token>")

    try:
        payload = decode_access_token(token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user:
        raise HTTPException(status_code=401, detail="Người dùng không tồn tại.")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Tài khoản đã bị vô hiệu hóa.")

    return user


def require_admin_user(current_user: User = Depends(get_current_user)):
    """Dependency dùng cho các endpoint chỉ dành cho admin."""
    if (current_user.role or "user") != "admin":
        raise HTTPException(status_code=403, detail="Chỉ admin mới có quyền truy cập.")
    return current_user


def get_optional_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """
    Dependency mềm: Trả về User nếu có token hợp lệ, trả None nếu không có.
    Dùng cho các endpoint cho phép cả guest lẫn user đã đăng nhập.
    """
    if not authorization:
        return None
    
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return None

    try:
        payload = decode_access_token(token)
        user = db.query(User).filter(User.id == payload["sub"]).first()
        return user if user and user.is_active else None
    except Exception:
        return None


# ==============================================================================
# ENDPOINTS
# ==============================================================================
@router.post("/register")
def register_user(request: RegisterRequest, db: Session = Depends(get_db)):
    """
    Đăng ký tài khoản mới.
    Kiểm tra trùng username/email trước khi tạo.
    """
    # Kiểm tra username đã tồn tại
    existing_user = db.query(User).filter(User.username == request.username).first()
    if existing_user:
        raise HTTPException(status_code=409, detail="Tên tài khoản đã được sử dụng.")

    # Kiểm tra email đã tồn tại
    existing_email = db.query(User).filter(User.email == request.email).first()
    if existing_email:
        raise HTTPException(status_code=409, detail="Email đã được đăng ký.")

    # Tạo user mới với mật khẩu đã mã hóa
    new_user = User(
        username=request.username,
        email=request.email,
        password_hash=hash_password(request.password),
        full_name=request.full_name
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Tạo token ngay để user không cần đăng nhập lại sau khi đăng ký
    token = create_access_token(new_user.id, new_user.username)

    return {
        "message": "Đăng ký thành công!",
        "token": token,
        "user": {
            "id": new_user.id,
            "username": new_user.username,
            "email": new_user.email,
            "full_name": new_user.full_name,
            "avatar_url": None,
            "role": new_user.role
        }
    }


@router.post("/login")
def login_user(request: LoginRequest, db: Session = Depends(get_db)):
    """
    Đăng nhập bằng username + password.
    Trả về JWT token nếu thành công.
    """
    user = db.query(User).filter(User.username == request.username).first()
    if not user:
        raise HTTPException(status_code=401, detail="Tên tài khoản hoặc mật khẩu không đúng.")

    if not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Tên tài khoản hoặc mật khẩu không đúng.")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Tài khoản đã bị vô hiệu hóa.")

    token = create_access_token(user.id, user.username)

    return {
        "message": "Đăng nhập thành công!",
        "token": token,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "avatar_url": user.avatar_url,
            "role": user.role
        }
    }


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    """
    Lấy thông tin profile của user đang đăng nhập (dùng để verify token từ Frontend).
    """
    return {
        "user": {
            "id": current_user.id,
            "username": current_user.username,
            "email": current_user.email,
            "full_name": current_user.full_name,
            "avatar_url": current_user.avatar_url,
            "role": current_user.role,
            "created_at": str(current_user.created_at)
        }
    }


# ==============================================================================
# PROFILE & SETTINGS
# ==============================================================================

class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        if v and ("@" not in v or "." not in v):
            raise ValueError("Email không hợp lệ")
        return v.strip().lower() if v else None


class SettingsUpdateRequest(BaseModel):
    default_language: Optional[str] = None
    custom_prompt: Optional[str] = None
    theme: Optional[str] = None


class PasswordUpdateRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator('new_password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError("Mật khẩu mới phải có ít nhất 6 ký tự")
        return v


@router.put("/profile")
def update_profile(request: ProfileUpdateRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if request.email and request.email != current_user.email:
        # Check email exists
        existing_email = db.query(User).filter(User.email == request.email).first()
        if existing_email:
            raise HTTPException(status_code=409, detail="Email đã được sử dụng.")
        current_user.email = request.email
        
    if request.full_name is not None:
        current_user.full_name = request.full_name
        
    db.commit()
    return {"message": "Cập nhật hồ sơ thành công", "full_name": current_user.full_name, "email": current_user.email, "avatar_url": current_user.avatar_url}


import os
import shutil
from fastapi import UploadFile, File

@router.post("/avatar")
def upload_avatar(request: Request, file: UploadFile = File(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Đảm bảo thư mục uploads/avatars tồn tại
    avatar_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "avatars")
    os.makedirs(avatar_dir, exist_ok=True)

    # Lưu file
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "png"
    filename = f"avatar_{current_user.id}.{file_ext}"
    file_path = os.path.join(avatar_dir, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Public URL động theo request domain/ip
    base_url = str(request.base_url).rstrip("/")
    avatar_url = f"{base_url}/uploads/avatars/{filename}"
    current_user.avatar_url = avatar_url
    db.commit()

    return {"message": "Cập nhật ảnh đại diện thành công", "avatar_url": avatar_url}


@router.put("/password")
def change_password(request: PasswordUpdateRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(request.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Mật khẩu hiện tại không đúng.")
    
    current_user.password_hash = hash_password(request.new_password)
    db.commit()
    return {"message": "Đổi mật khẩu thành công!"}


@router.get("/settings")
def get_settings(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from ..models import UserSettings
    settings = current_user.settings
    if not settings:
        settings = UserSettings(user_id=current_user.id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
        
    return {
        "default_language": settings.default_language,
        "custom_prompt": settings.custom_prompt,
        "theme": settings.theme
    }

@router.put("/settings")
def update_settings(request: SettingsUpdateRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from ..models import UserSettings
    settings = current_user.settings
    if not settings:
        settings = UserSettings(user_id=current_user.id)
        db.add(settings)
    
    if request.default_language is not None:
        settings.default_language = request.default_language
    if request.custom_prompt is not None:
        settings.custom_prompt = request.custom_prompt
    if request.theme is not None:
        settings.theme = request.theme
        
    db.commit()
    return {"message": "Cập nhật cấu hình thành công"}

