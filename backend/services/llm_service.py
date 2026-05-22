import json
import re
import time
import requests
from requests.exceptions import RequestException
from datetime import datetime, timezone
import os

# ==============================================================================
# CẤU HÌNH LLM — Dùng biến môi trường để dễ đổi model
# ==============================================================================
OLLAMA_API_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:7b-instruct")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# ==============================================================================
# SYSTEM PROMPT — Phase 1: Structured Decisions + Priority + Key Topics
# ==============================================================================
SYSTEM_PROMPT = """You are a highly efficient assistant specializing in professional meeting analysis, structural extraction, and summarization.

### CORE TASK:
Analyze the provided meeting transcript and extract information into a VALID JSON format.
Use the SAME LANGUAGE as the input transcript for all content fields (if the transcript is in Vietnamese, all values must be in Vietnamese; if in English, all values must be in English).

### JSON STRUCTURE — Your response must be a single JSON object with EXACTLY these 4 keys:

1. "summary": (string) A concise, high-quality, natural prose summary of the overall meeting. 3–5 sentences max.

2. "key_topics": (array of strings) 2–5 main topics discussed. Keep each topic short and professional (2–4 words).
   Example: ["Project timeline", "Budget review", "Team assignments"] / ["Tiến độ dự án", "Đánh giá ngân sách", "Phân công công việc"]

3. "decisions": (array of objects) ONLY include decisions that meet ALL of the following criteria:
   - Clearly agreed upon by the participants (there is clear consensus, approval, or final sign-off).
   - Is a FINAL conclusion or resolution, NOT a suggestion, idea, proposal, or topic still under active discussion.
   - Must contain a clear subject (who or what is affected), action (what was decided or agreed), and outcome (result, effect, or goal of the decision).
   Each object must have:
     - "subject": (string) Who or what the decision is about.
     - "action": (string) What was decided or agreed upon.
     - "outcome": (string) The intended result, goal, or consequence of this decision.
   Return [] if no decisions qualify. Do NOT guess or infer.

4. "action_items": (array of objects) Specific, concrete, and actionable tasks assigned to individuals.
   - ONLY include tasks that have a clear, actionable verb and an active assignment.
   - DO NOT include vague next steps (e.g., "discuss further", "look into it later") or generic plans unless someone is explicitly assigned.
   Each object must have:
     - "task_name": (string) Clear description of what needs to be done. Start with a strong action verb.
     - "assignee": (string) The person assigned to do the task. Extract the name from text, or use "Unknown" if no one is explicitly assigned.
     - "deadline": (string or null) Mentioned deadline (e.g., "before Friday", "22/05", "next week"), otherwise null.
     - "priority": (string) Must be one of: "high", "medium", "low".
       - "high"   → urgent, critical path, blocking, or explicitly stated as high priority.
       - "medium" → standard task, standard features, or tasks with a normal deadline.
       - "low"    → nice-to-have, research tasks with no immediate impact or strict deadline.
   Return [] if no concrete tasks qualify.

### FEW-SHOT EXAMPLES (To guide decision & action item extraction):

#### VIETNAMESE EXAMPLES:
- Transcript snippet: "Nam đề xuất sử dụng MySQL làm DB, nhưng sau một lúc thảo luận, cả nhóm đồng ý chốt dùng PostgreSQL vì nó hỗ trợ JSON tốt hơn. Thêm nữa, Nam nhớ tạo bảng thiết kế Database này trước thứ Sáu nhé."
  - Decisions:
    - Subject: "Cơ sở dữ liệu chính"
    - Action: "Thống nhất sử dụng PostgreSQL thay vì MySQL"
    - Outcome: "Tận dụng khả năng hỗ trợ kiểu dữ liệu JSON tốt hơn"
  - Action Items:
    - Task Name: "Tạo bảng thiết kế Database mới"
    - Assignee: "Nam"
    - Deadline: "Trước thứ Sáu"
    - Priority: "high"

- Transcript snippet: "Chúng ta cũng có nói qua về việc đổi màu logo nhưng chưa chốt vì sếp chưa tham gia. Có lẽ ai đó nên tìm vài mẫu thiết kế logo mới gửi sếp xem sau."
  - Decisions: [] (Vì đây mới chỉ là thảo luận chưa chốt)
  - Action Items: [] (Vì nhiệm vụ "tìm vài mẫu logo" là mơ hồ, không có người được chỉ định cụ thể)

#### ENGLISH EXAMPLES:
- Transcript snippet: "Alice suggested we move to a bi-weekly sync, and everyone agreed that it's a great idea to save time. Bob, please update the Google Calendar invitations for us by tomorrow."
  - Decisions:
    - Subject: "Meeting frequency"
    - Action: "Agreed to change meeting schedule to bi-weekly"
    - Outcome: "Save team meeting time"
  - Action Items:
    - Task Name: "Update Google Calendar invitations"
    - Assignee: "Bob"
    - Deadline: "By tomorrow"
    - Priority: "medium"

- Transcript snippet: "Maybe we can launch the marketing campaign next month, but we should double check with the PR lead first."
  - Decisions: [] (Still a proposal, no agreement reached)
  - Action Items: [] (No active verb or specific person assigned)

### CRITICAL RULES:
- DO NOT invent, assume, or infer any information. Use ONLY facts directly stated in the transcript.
- DO NOT return any text, explanation, or conversational formatting outside the JSON object.
- DO NOT wrap the JSON in markdown codeblocks (no ```json ... ```).
- Respond with a single raw JSON object and nothing else.
- If transcript is in English -> all JSON values MUST be in English.
- If transcript is in Vietnamese -> all JSON values MUST be in Vietnamese.
"""


# ==============================================================================
# HELPERS
# ==============================================================================

def _strip_markdown_json(raw: str) -> str:
    """
    Strip markdown codeblock wrapper nếu LLM trả dạng ```json ... ```.
    Một số model (llama, mistral) hay bọc JSON trong markdown dù đã dặn không làm vậy.
    """
    # Thử match ```json ... ``` hoặc ``` ... ```
    match = re.search(r"```(?:json)?\s*([\s\S]+?)```", raw, re.IGNORECASE)
    if match:
        return match.group(1).strip()
    return raw.strip()


def _normalize_action_items(items: list) -> list:
    """
    Chuẩn hoá action_items: đảm bảo mỗi item có đủ 4 field,
    priority hợp lệ, completed mặc định False.
    """
    valid_priorities = {"high", "medium", "low"}
    result = []
    for item in items:
        if not isinstance(item, dict):
            continue
        priority = str(item.get("priority", "medium")).lower()
        if priority not in valid_priorities:
            priority = "medium"
        result.append({
            "task_name": item.get("task_name", ""),
            "assignee":  item.get("assignee", "Unknown"),
            "deadline":  item.get("deadline", None),
            "priority":  priority,
            "completed": False,
        })
    return result


def _normalize_decisions(decisions: list) -> list:
    """
    Chuẩn hoá decisions: hỗ trợ cả format cũ (string) và mới (object).
    String cũ → convert sang object với subject/action/outcome tách từ text.
    """
    result = []
    for d in decisions:
        if isinstance(d, str):
            # Backward compatible: nếu AI trả chuỗi thay vì object
            result.append({"subject": "", "action": d, "outcome": ""})
        elif isinstance(d, dict):
            result.append({
                "subject": d.get("subject", ""),
                "action":  d.get("action", ""),
                "outcome": d.get("outcome", ""),
            })
    return result


# ==============================================================================
# MAIN FUNCTION — với retry logic
# ==============================================================================

def generate_meeting_summary(transcript_text: str, max_retries: int = 2, provider: str = "ollama") -> dict:
    """
    Phân tích transcript cuộc họp. Hỗ trợ Local (Ollama) và Cloud (Gemini).
    Trả về dict chuẩn hoá với: summary_text, key_topics, decisions, action_items, metadata.

    Args:
        transcript_text: Toàn văn bản bóc băng.
        max_retries: Số lần thử lại khi parse JSON thất bại (default 2).
        provider: "ollama" hoặc "gemini".

    Raises:
        RuntimeError: Khi offline hoặc JSON không hợp lệ.
    """
    if not transcript_text or len(transcript_text.strip()) < 10:
        raise ValueError("Transcript quá ngắn để phân tích.")

    if provider == "gemini":
        return _generate_with_gemini(transcript_text, max_retries)
    else:
        return _generate_with_ollama(transcript_text, max_retries)

def _generate_with_gemini(transcript_text: str, max_retries: int) -> dict:
    if not GEMINI_API_KEY:
        raise RuntimeError("Chưa cấu hình GEMINI_API_KEY trong hệ thống.")

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
    # Gộp System Prompt và User Prompt thành một nội dung duy nhất cho bản v1
    full_prompt = f"{SYSTEM_PROMPT}\n\nMeeting transcript:\n{transcript_text}"
    
    payload = {
        "contents": [{
            "parts": [{"text": full_prompt}]
        }],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 2048
        }
    }

    last_error = None
    for attempt in range(max_retries + 1):
        try:
            print(f"[LLM] Sending summary request to Gemini API"
                  f"{f' — attempt {attempt+1}/{max_retries+1}' if attempt > 0 else ''}...")

            response = requests.post(url, json=payload, timeout=60)
            
            if response.status_code != 200:
                print(f"[Gemini Error] HTTP {response.status_code}: {response.text}")
                response.raise_for_status()

            data = response.json()
            raw_output = data["candidates"][0]["content"]["parts"][0]["text"]
            
            cleaned = _strip_markdown_json(raw_output)
            parsed = json.loads(cleaned)

            result = {
                "summary_text":  parsed.get("summary", "Không có nội dung tóm tắt."),
                "key_topics":    parsed.get("key_topics", []),
                "decisions":     _normalize_decisions(parsed.get("decisions", [])),
                "action_items":  _normalize_action_items(parsed.get("action_items", [])),
                "processing_metadata": {
                    "model_used":        "gemini-2.5-flash",
                    "transcript_length": len(transcript_text),
                    "timestamp":         datetime.now(timezone.utc).isoformat(),
                    "attempt":           attempt + 1,
                }
            }
            print(f"[LLM] [OK] Gemini Success")
            return result

        except json.JSONDecodeError as e:
            last_error = e
            print(f"[LLM JSON Error] Gemini Attempt {attempt+1}: Invalid JSON — {str(e)}")
            if attempt < max_retries:
                time.sleep(2)
                continue
            raise RuntimeError(f"Gemini không trả về JSON hợp lệ: {str(last_error)}")
        except Exception as e:
            print(f"[LLM Error] Gemini attempt {attempt+1}: {str(e)}")
            raise

def _generate_with_ollama(transcript_text: str, max_retries: int) -> dict:
    user_prompt = f"Meeting transcript:\n{transcript_text}"

    payload = {
        "model": OLLAMA_MODEL,
        "system": SYSTEM_PROMPT,
        "prompt": user_prompt,
        "stream": False,
        "format": "json",
        "options": {
            "temperature": 0.1,   # Giảm randomness → output ổn định hơn
            "num_predict": 2048,  # Giới hạn output để không bị cắt giữa chừng
        }
    }

    last_error = None

    for attempt in range(max_retries + 1):
        try:
            print(f"[LLM] Sending summary request to Ollama ({OLLAMA_MODEL})"
                  f"{f' — attempt {attempt+1}/{max_retries+1}' if attempt > 0 else ''}...")

            response = requests.post(OLLAMA_API_URL, json=payload, timeout=300)

            if response.status_code != 200:
                print(f"[Ollama Error] HTTP {response.status_code}")
                response.raise_for_status()

            data = response.json()
            raw_output = data.get("response", "")

            # ── Strip markdown codeblock nếu có ──
            cleaned = _strip_markdown_json(raw_output)

            # ── Parse JSON ──
            parsed = json.loads(cleaned)

            # ── Normalise & build result ──
            result = {
                "summary_text":  parsed.get("summary", "Không có nội dung tóm tắt."),
                "key_topics":    parsed.get("key_topics", []),
                "decisions":     _normalize_decisions(parsed.get("decisions", [])),
                "action_items":  _normalize_action_items(parsed.get("action_items", [])),
                "processing_metadata": {
                    "model_used":        OLLAMA_MODEL,
                    "transcript_length": len(transcript_text),
                    "timestamp":         datetime.now(timezone.utc).isoformat(),
                    "attempt":           attempt + 1,
                }
            }

            print(f"[LLM] [OK] Success — "
                  f"{len(result['decisions'])} decisions, "
                  f"{len(result['action_items'])} action items, "
                  f"{len(result['key_topics'])} key topics.")

            return result

        except json.JSONDecodeError as e:
            last_error = e
            print(f"[LLM JSON Error] Attempt {attempt+1}: Invalid JSON — {str(e)}")
            if attempt < max_retries:
                wait = 2 * (attempt + 1)  # Exponential backoff: 2s, 4s
                print(f"[LLM] Retrying in {wait}s...")
                time.sleep(wait)
                continue
            raise RuntimeError(
                f"LLM không trả về JSON hợp lệ sau {max_retries + 1} lần thử. "
                f"Lỗi cuối: {str(last_error)}"
            )

        except RequestException as e:
            print(f"[Ollama Error] Connection failed: {str(e)}")
            raise RuntimeError(
                "Không kết nối được Ollama. Hãy đảm bảo Ollama đang chạy (ollama serve)."
            )

        except Exception as e:
            print(f"[LLM Error] Unexpected error on attempt {attempt+1}: {str(e)}")
            raise
