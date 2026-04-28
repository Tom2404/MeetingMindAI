import json
import requests
from requests.exceptions import RequestException

OLLAMA_API_URL = "http://localhost:11434/api/generate"
# Mặc định sử dụng model llama3.2 (bạn có thể đổi thành 'qwen2', 'phi3' hoặc 'vit5' tùy bạn cài)
OLLAMA_MODEL = "llama3.2" 

SYSTEM_PROMPT = """You are a highly efficient assistant specializing in professional meeting analysis and summarization.

### CORE TASK:
Analyze the provided meeting transcript and extract information into a VALID JSON format. Use the SAME LANGUAGE as the input transcript for the content of the fields.

### JSON STRUCTURE REQUIREMENTS:
Your response must be a single JSON object with EXACTLY these 3 keys:
1. "summary": (string) A concise, natural prose summary of the overall meeting.
2. "decisions": (array of strings) Key decisions reached during the meeting. Return [] if none.
3. "action_items": (array of objects) List of specific tasks. Each object must have:
   - "task_name": (string) Name of the task to be done.
   - "assignee": (string) Person assigned (extract from text context, or "Unknown").
   - "deadline": (string or null) Mentioned deadline, otherwise null.

### CRITICAL RULES:
- DO NOT invent information. Only use facts from the transcript.
- DO NOT return any text outside of the JSON block.
- DO NOT use the example data provided in the instructions below.
- IF the transcript is in English, the JSON values MUST be in English.
- IF the transcript is in Vietnamese, the JSON values MUST be in Vietnamese.

### SCHEMA TEMPLATE:
{
  "summary": "...",
  "decisions": ["...", "..."],
  "action_items": [
    {"task_name": "...", "assignee": "...", "deadline": "..."}
  ]
}
"""

def generate_meeting_summary(transcript_text: str) -> dict:
    """
    Gọi Local Ollama API để phân tích transcript.
    Trả về Dict/JSON chứa summary, decisions, action_items.
    """
    # Tách riêng System Prompt và User Prompt để LLM hiểu vai trò tốt hơn
    user_prompt = f"Nội dung cuộc họp:\n{transcript_text}"

    payload = {
        "model": OLLAMA_MODEL,
        "system": SYSTEM_PROMPT,   # System prompt riêng biệt (vai trò + format)
        "prompt": user_prompt,     # User prompt chỉ chứa nội dung transcript
        "stream": False,
        "format": "json"           # Ép chuẩn JSON sinh ra từ LLM
    }

    try:
        response = requests.post(OLLAMA_API_URL, json=payload, timeout=120)
        response.raise_for_status()

        data = response.json()
        llm_output_str = data.get("response", "")

        # Chuyển chuỗi JSON text thành Dict
        parsed_json = json.loads(llm_output_str)

        # Đảm bảo cấu trúc bảo mật không bị thiếu key gây lỗi React (FE)
        result = {
            "summary_text": parsed_json.get("summary", "Không có tóm tắt."),
            "decisions": parsed_json.get("decisions", []),
            "action_items": parsed_json.get("action_items", [])
        }
        
        return result

    except RequestException as e:
        print(f"[Ollama Error] Không thể kết nối tới mô hình chạy local. {e}")
        raise RuntimeError("LLM Service đang gặp lỗi tắt hoặc chưa bật Ollama.")
    except json.JSONDecodeError as e:
        print(f"[LLM JSON Error] Trả về định dạng lỗi: {str(e)}")
        raise RuntimeError("LLM không trả đúng định dạng JSON.")
    except Exception as e:
        print(f"[Unknown Error] {e}")
        raise
