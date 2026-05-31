import requests
import os
import threading
import json
from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel
from ..services.llm_service import get_active_ollama_model, set_active_ollama_model

router = APIRouter(prefix="/api/v1", tags=["health"])

# URL kiểm tra Ollama — endpoint /api/tags trả danh sách model đã cài
OLLAMA_BASE_URL = "http://localhost:11434"

# Danh sách mô hình đề xuất
RECOMMENDED_MODELS = [
    {
        "name": "qwen2.5:7b-instruct",
        "description": "Qwen 2.5 7B - Model tốt nhất cho tiếng Việt và tóm tắt cuộc họp.",
        "size_display": "4.7 GB"
    },
    {
        "name": "qwen2.5:3b-instruct",
        "description": "Qwen 2.5 3B - Bản rút gọn nhẹ nhàng, xử lý tiếng Việt rất tốt.",
        "size_display": "1.9 GB"
    },
    {
        "name": "llama3.2:latest",
        "description": "Llama 3.2 Latest - Phiên bản phổ biến mặc định của dòng Llama 3.2.",
        "size_display": "2.0 GB"
    },
    {
        "name": "llama3.2:3b",
        "description": "Llama 3.2 3B - Siêu nhẹ, siêu nhanh, tối ưu cho máy cấu hình thấp.",
        "size_display": "2.0 GB"
    },
    {
        "name": "gemma2:2b",
        "description": "Gemma 2 2B - Mô hình siêu nhẹ từ Google, hỗ trợ tiếng Việt ổn định.",
        "size_display": "1.6 GB"
    },
    {
        "name": "gemma2:9b",
        "description": "Gemma 2 9B - Mô hình mạnh mẽ từ Google, chất lượng tóm tắt vượt trội.",
        "size_display": "5.5 GB"
    }
]

# Trạng thái tải mô hình ngầm
OLLAMA_PULL_STATUS = {}
OLLAMA_PULL_LOCK = threading.Lock()
CURRENTLY_PULLING_MODEL = None

class SelectModelRequest(BaseModel):
    model: str

class PullModelRequest(BaseModel):
    model: str


def _update_env_ollama_model(model_name: str) -> bool:
    """Cập nhật biến OLLAMA_MODEL trong file .env ở thư mục gốc"""
    root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    env_path = os.path.join(root_dir, ".env")
    if not os.path.exists(env_path):
        return False
    try:
        with open(env_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
        
        updated = False
        new_lines = []
        for line in lines:
            if line.strip().startswith("OLLAMA_MODEL="):
                new_lines.append(f"OLLAMA_MODEL={model_name}\n")
                updated = True
            else:
                new_lines.append(line)
        
        if not updated:
            new_lines.append(f"OLLAMA_MODEL={model_name}\n")
            
        with open(env_path, "w", encoding="utf-8") as f:
            f.writelines(new_lines)
        return True
    except Exception as e:
        print(f"[Ollama Config] Error writing to .env: {e}")
        return False


def _pull_model_thread_task(model_name: str):
    global OLLAMA_PULL_STATUS, CURRENTLY_PULLING_MODEL
    
    with OLLAMA_PULL_LOCK:
        CURRENTLY_PULLING_MODEL = model_name
        
    OLLAMA_PULL_STATUS[model_name] = {
        "status": "starting",
        "progress": 0.0,
        "completed": False,
        "error": None
    }
    
    try:
        url = f"{OLLAMA_BASE_URL}/api/pull"
        response = requests.post(url, json={"name": model_name}, stream=True, timeout=300)
        
        if response.status_code != 200:
            OLLAMA_PULL_STATUS[model_name] = {
                "status": "failed",
                "progress": 0.0,
                "completed": False,
                "error": f"Ollama phản hồi HTTP {response.status_code}"
            }
            with OLLAMA_PULL_LOCK:
                if CURRENTLY_PULLING_MODEL == model_name:
                    CURRENTLY_PULLING_MODEL = None
            return

        for chunk in response.iter_lines():
            if chunk:
                data = json.loads(chunk.decode('utf-8'))
                status = data.get("status", "")
                completed = data.get("completed", 0)
                total = data.get("total", 0)
                
                progress = 0.0
                if total > 0:
                    progress = round((completed / total) * 100, 1)
                
                if status == "success":
                    OLLAMA_PULL_STATUS[model_name] = {
                        "status": "success",
                        "progress": 100.0,
                        "completed": True,
                        "error": None
                    }
                    with OLLAMA_PULL_LOCK:
                        if CURRENTLY_PULLING_MODEL == model_name:
                            CURRENTLY_PULLING_MODEL = None
                    return
                
                OLLAMA_PULL_STATUS[model_name] = {
                    "status": status,
                    "progress": progress,
                    "completed": False,
                    "error": None
                }
                
    except Exception as e:
        OLLAMA_PULL_STATUS[model_name] = {
            "status": "failed",
            "progress": 0.0,
            "completed": False,
            "error": str(e)
        }
    finally:
        with OLLAMA_PULL_LOCK:
            if CURRENTLY_PULLING_MODEL == model_name:
                CURRENTLY_PULLING_MODEL = None


def _check_ollama() -> dict:
    """
    Kiểm tra Ollama service có đang chạy không, và model có được cài đặt không.
    Trả về dict: { ok: bool, model_found: bool, message: str, models: list }
    """
    active_model = get_active_ollama_model()
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

        # Kiểm tra model hiện tại có được cài không
        model_found = any(active_model in m or m in active_model for m in installed_models)

        if not installed_models:
            return {
                "ok": True,
                "model_found": False,
                "message": f"Ollama đang chạy nhưng chưa có model nào được cài. Hãy cài: ollama pull {active_model}",
                "models": []
            }

        if not model_found:
            return {
                "ok": True,
                "model_found": False,
                "message": f"Ollama đang chạy nhưng model '{active_model}' chưa được cài. Hãy tải xuống mô hình này.",
                "models": installed_models
            }

        return {
            "ok": True,
            "model_found": True,
            "message": f"Ollama OK — Model '{active_model}' sẵn sàng",
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
    - Ollama LLM: Đang chạy không? Model có cài không?
    - Faster-Whisper STT: Thư viện đã cài? Model có trong cache?
    """
    llm_status = _check_ollama()
    stt_status = _check_whisper()

    overall_ok = llm_status["ok"] and llm_status.get("model_found", False) and stt_status["ok"]

    return {
        "overall_ok": overall_ok,
        "llm": llm_status,
        "stt": stt_status
    }


# ==============================================================================
# ENDPOINTS QUẢN LÝ MÔ HÌNH OLLAMA
# ==============================================================================

@router.get("/health/ollama/models")
def list_ollama_models():
    """Liệt kê danh sách mô hình Ollama đề xuất & cài đặt thực tế"""
    installed_names = []
    active_model = get_active_ollama_model()
    
    try:
        response = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=2)
        if response.status_code == 200:
            data = response.json()
            installed_names = [m.get("name", "") for m in data.get("models", [])]
    except Exception:
        pass
        
    merged_models = []
    
    # 1. Thêm các recommended models
    for rec in RECOMMENDED_MODELS:
        name = rec["name"]
        # Một model được coi là installed nếu có tag trùng khớp hoặc chứa tên
        installed = any(name in inst or inst in name for inst in installed_names)
        
        # So sánh active model chính xác (hỗ trợ tự động chuẩn hóa bỏ tag ':latest')
        name_norm = name.replace(":latest", "")
        active_model_norm = active_model.replace(":latest", "")
        active = (name == active_model or name_norm == active_model_norm)
            
        merged_models.append({
            "name": name,
            "description": rec["description"],
            "size_display": rec["size_display"],
            "installed": installed,
            "active": active
        })
        
    # 2. Thêm bất cứ model nào đã cài đặt thực tế mà không nằm trong recommended
    recommended_names = [r["name"] for r in RECOMMENDED_MODELS]
    for inst in installed_names:
        inst_clean = inst.split(":")[0] if ":" in inst else inst
        
        is_rec = False
        for rec_name in recommended_names:
            if rec_name == inst or rec_name.split(":")[0] == inst_clean:
                is_rec = True
                break
                
        if not is_rec:
            merged_models.append({
                "name": inst,
                "description": "Mô hình tùy chỉnh được cài đặt trực tiếp từ thư viện Ollama.",
                "size_display": "Đã tải",
                "installed": True,
                "active": (inst == active_model)
            })
            
    return {
        "active_model": active_model,
        "ollama_online": len(installed_names) > 0 or _ping_ollama(),
        "models": merged_models
    }


def _ping_ollama() -> bool:
    try:
        res = requests.get(OLLAMA_BASE_URL, timeout=1)
        return res.status_code == 200
    except Exception:
        return False


@router.post("/health/ollama/select")
def select_ollama_model(request: SelectModelRequest):
    """Thay đổi mô hình active hiện tại và cập nhật .env"""
    model_name = request.model
    if not model_name:
        raise HTTPException(status_code=400, detail="Tên mô hình không được để trống")
        
    # Thay đổi trong RAM lập tức
    set_active_ollama_model(model_name)
    
    # Ghi đè file .env để lưu vĩnh viễn
    env_updated = _update_env_ollama_model(model_name)
    
    return {
        "message": f"Đã chuyển sang sử dụng mô hình '{model_name}' thành công.",
        "active_model": model_name,
        "env_updated": env_updated
    }


@router.post("/health/ollama/pull")
def pull_ollama_model(request: PullModelRequest, background_tasks: BackgroundTasks):
    """Bắt đầu tải một mô hình ngầm bất đồng bộ (Global Lock: 1 model tại 1 thời điểm)"""
    global CURRENTLY_PULLING_MODEL
    model_name = request.model
    if not model_name:
        raise HTTPException(status_code=400, detail="Tên mô hình không được để trống")
        
    with OLLAMA_PULL_LOCK:
        if CURRENTLY_PULLING_MODEL is not None:
            raise HTTPException(
                status_code=400, 
                detail=f"Hệ thống đang bận tải mô hình '{CURRENTLY_PULLING_MODEL}'. Vui lòng đợi cho đến khi hoàn thành."
            )
        CURRENTLY_PULLING_MODEL = model_name
        
    # Thêm tác vụ kéo model vào background task
    background_tasks.add_task(_pull_model_thread_task, model_name)
    
    return {
        "message": f"Bắt đầu tải mô hình '{model_name}' ngầm. Bạn có thể theo dõi tiến trình trên giao diện.",
        "model": model_name,
        "status": "started"
    }


@router.get("/health/ollama/pull/status")
def get_ollama_pull_status(model: str):
    """Truy vấn tiến trình tải hiện tại của mô hình"""
    global OLLAMA_PULL_STATUS
    if not model:
        raise HTTPException(status_code=400, detail="Tham số model không được để trống")
        
    status_info = OLLAMA_PULL_STATUS.get(model)
    if not status_info:
        return {
            "status": "not_started",
            "progress": 0.0,
            "completed": False,
            "error": None
        }
        
    return status_info
