import os
import hashlib
import hmac
import json
import base64
import time
from datetime import datetime, timezone

# ==============================================================================
# CẤU HÌNH BẢO MẬT
# ==============================================================================
# Secret key dùng để ký JWT token — Trong production nên đặt qua biến môi trường
SECRET_KEY = os.getenv("SECRET_KEY", "meetingmind-ai-secret-key-2026-change-in-production")
# Thời gian sống của token (giây): 24 giờ
TOKEN_EXPIRE_SECONDS = 24 * 60 * 60


# ==============================================================================
# MÃ HÓA MẬT KHẨU — Sử dụng PBKDF2 có sẵn trong Python (không cần thư viện ngoài)
# ==============================================================================
def hash_password(password: str) -> str:
    """
    Băm mật khẩu bằng PBKDF2-HMAC-SHA256 với salt ngẫu nhiên.
    Trả về chuỗi: "salt$hashed" để lưu vào database.
    """
    salt = os.urandom(16).hex()
    # 100000 iterations theo khuyến nghị OWASP
    dk = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
    return f"{salt}${dk.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    """
    Xác minh mật khẩu nhập vào với hash đã lưu trong database.
    """
    try:
        salt, hashed = stored_hash.split("$", 1)
        dk = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
        return hmac.compare_digest(dk.hex(), hashed)
    except Exception:
        return False


# ==============================================================================
# JWT TOKEN — Triển khai đơn giản không cần thư viện ngoài (PyJWT)
# Cấu trúc: Header.Payload.Signature (base64url encoded)
# ==============================================================================
def _base64url_encode(data: bytes) -> str:
    """Base64 URL-safe encode không padding."""
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _base64url_decode(data: str) -> bytes:
    """Base64 URL-safe decode có bù padding."""
    padding = 4 - len(data) % 4
    if padding != 4:
        data += "=" * padding
    return base64.urlsafe_b64decode(data)


def create_access_token(user_id: int, username: str) -> str:
    """
    Tạo JWT access token chứa user_id và username.
    Token có hạn sử dụng TOKEN_EXPIRE_SECONDS (mặc định 24h).
    """
    header = {"alg": "HS256", "typ": "JWT"}
    
    now = int(time.time())
    payload = {
        "sub": user_id,            # Subject: ID người dùng
        "username": username,
        "iat": now,                # Issued At: Thời điểm tạo
        "exp": now + TOKEN_EXPIRE_SECONDS  # Expiration: Hết hạn
    }

    # Encode header và payload
    header_b64 = _base64url_encode(json.dumps(header, separators=(",", ":")).encode())
    payload_b64 = _base64url_encode(json.dumps(payload, separators=(",", ":")).encode())
    
    # Tạo chữ ký HMAC-SHA256
    message = f"{header_b64}.{payload_b64}"
    signature = hmac.new(SECRET_KEY.encode(), message.encode(), hashlib.sha256).digest()
    signature_b64 = _base64url_encode(signature)

    return f"{header_b64}.{payload_b64}.{signature_b64}"


def decode_access_token(token: str) -> dict:
    """
    Giải mã và xác thực JWT token.
    Trả về payload dict nếu hợp lệ, raise Exception nếu sai/hết hạn.
    """
    try:
        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError("Token không hợp lệ")

        header_b64, payload_b64, signature_b64 = parts

        # Xác minh chữ ký
        message = f"{header_b64}.{payload_b64}"
        expected_sig = hmac.new(SECRET_KEY.encode(), message.encode(), hashlib.sha256).digest()
        actual_sig = _base64url_decode(signature_b64)

        if not hmac.compare_digest(expected_sig, actual_sig):
            raise ValueError("Chữ ký token không hợp lệ")

        # Decode payload
        payload = json.loads(_base64url_decode(payload_b64))

        # Kiểm tra hết hạn
        if payload.get("exp", 0) < int(time.time()):
            raise ValueError("Token đã hết hạn")

        return payload

    except Exception as e:
        raise ValueError(f"Lỗi xác thực token: {str(e)}")
