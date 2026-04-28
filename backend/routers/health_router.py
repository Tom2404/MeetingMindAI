import requests
from fastapi import APIRouter

router = APIRouter(prefix="/api/v1", tags=["health"])

# URL kiểm tra Ollama — endpoint /api/tags trả danh sách model đã cài
OLLAMA_BASE_URL = "http://localhost:11434"
OLLAMA_MODEL = "llama3.2"


def _check_ollama() -> dict:
    """
    Kiểm tra Ollama service có đang chạy không, và model có được cài đặt không.
    Trả về dict: { ok: bool, model_found: bool, message: str, models: list }
    """
    try:
        response = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=3)
        if response.status_code != 200:
            return {
                "ok": False,
                "model_found": False,
                "message": f"Ollama phản hồi lỗi (HTTP {response.status_code})",
                "models": []
            }

        data = response.json()
        installed_models = [m.get("name", "") for m in data.get("models", [])]

        # Kiểm tra model mặc định có được cài không
        model_found = any(OLLAMA_MODEL in m for m in installed_models)

        if not installed_models:
            return {
                "ok": True,
                "model_found": False,
                "message": "Ollama đang chạy nhưng chưa có model nào được cài. Hãy chạy: ollama pull llama3.2",
                "models": []
            }

        if not model_found:
            return {
                "ok": True,
                "model_found": False,
                "message": f"Ollama đang chạy nhưng model '{OLLAMA_MODEL}' chưa được cài. Hãy chạy: ollama pull {OLLAMA_MODEL}",
                "models": installed_models
            }

        return {
            "ok": True,
            "model_found": True,
            "message": f"Ollama OK — Model '{OLLAMA_MODEL}' sẵn sàng",
            "models": installed_models
        }

    except requests.exceptions.ConnectionError:
        return {
            "ok": False,
            "model_found": False,
            "message": "Không thể kết nối tới Ollama. Hãy đảm bảo Ollama đang chạy (lệnh: ollama serve)",
            "models": []
        }
    except requests.exceptions.Timeout:
        return {
            "ok": False,
            "model_found": False,
            "message": "Ollama phản hồi quá chậm (timeout 3s). Có thể đang bận xử lý.",
            "models": []
        }
    except Exception as e:
        return {
            "ok": False,
            "model_found": False,
            "message": f"Lỗi không xác định khi kiểm tra Ollama: {str(e)}",
            "models": []
        }


def _check_whisper() -> dict:
    """
    Kiểm tra thư viện Faster-Whisper có cài đặt không, và model có sẵn trong cache không.
    Không tải model thực sự (tốn RAM), chỉ kiểm tra file cache tồn tại.
    """
    try:
        import faster_whisper  # noqa — chỉ kiểm tra import được không
        from ..services.stt_service import MODEL_SIZE, _model

        # Kiểm tra xem model đã được load vào RAM chưa
        if _model is not None:
            return {
                "ok": True,
                "model_loaded": True,
                "model_size": MODEL_SIZE,
                "message": f"Faster-Whisper OK — Model '{MODEL_SIZE}' đã load sẵn trong RAM"
            }

        # Kiểm tra file cache model trong HuggingFace cache
        import os
        from pathlib import Path

        hf_cache = os.getenv(
            "HF_HOME",
            os.path.join(Path.home(), ".cache", "huggingface")
        )
        # Faster-whisper lưu model dưới dạng "Systran/faster-whisper-{size}"
        model_cache_dir = os.path.join(hf_cache, "hub")
        model_key = f"faster-whisper-{MODEL_SIZE}".lower()

        cache_found = False
        if os.path.exists(model_cache_dir):
            for folder in os.listdir(model_cache_dir):
                if model_key in folder.lower():
                    cache_found = True
                    break

        if cache_found:
            return {
                "ok": True,
                "model_loaded": False,
                "model_size": MODEL_SIZE,
                "message": f"Faster-Whisper OK — Model '{MODEL_SIZE}' có trong cache, sẽ load khi dùng lần đầu"
            }
        else:
            return {
                "ok": True,
                "model_loaded": False,
                "model_size": MODEL_SIZE,
                "message": (
                    f"Faster-Whisper OK nhưng model '{MODEL_SIZE}' chưa download. "
                    "Sẽ tự tải (~3GB) khi upload file audio lần đầu."
                )
            }

    except ImportError:
        return {
            "ok": False,
            "model_loaded": False,
            "model_size": None,
            "message": "Thư viện faster-whisper chưa được cài. Chạy: pip install faster-whisper"
        }
    except Exception as e:
        return {
            "ok": False,
            "model_loaded": False,
            "model_size": None,
            "message": f"Lỗi kiểm tra Whisper: {str(e)}"
        }


@router.get("/health")
def health_check():
    """
    Kiểm tra trạng thái hoạt động của toàn bộ AI pipeline:
    - Ollama LLM (Llama 3.2): Đang chạy không? Model có cài không?
    - Faster-Whisper STT: Thư viện đã cài? Model có trong cache?
    Endpoint này không cần xác thực và được gọi từ Frontend để hiển thị status bar.
    """
    llm_status = _check_ollama()
    stt_status = _check_whisper()

    # Hệ thống "OK" khi cả LLM và STT đều hoạt động bình thường
    overall_ok = llm_status["ok"] and llm_status.get("model_found", False) and stt_status["ok"]

    return {
        "overall_ok": overall_ok,
        "llm": llm_status,
        "stt": stt_status
    }
