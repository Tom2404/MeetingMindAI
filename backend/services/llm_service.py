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
# Biến chứa model Ollama đang hoạt động (có thể thay đổi động bằng API)
ACTIVE_OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:7b-instruct")

def get_active_ollama_model() -> str:
    global ACTIVE_OLLAMA_MODEL
    return ACTIVE_OLLAMA_MODEL

def set_active_ollama_model(model_name: str):
    global ACTIVE_OLLAMA_MODEL
    ACTIVE_OLLAMA_MODEL = model_name

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

SUPPORTED_TARGET_LANGUAGES = {
    "vi": "Vietnamese",
    "en": "English",
    "ja": "Japanese",
    "ko": "Korean",
    "zh": "Chinese (Simplified)",
    "th": "Thai",
}


def translate_summary_payload(payload: dict, *, target_language: str, provider: str = "ollama") -> dict:
    """Translate a meeting summary payload (summary_text, key_topics, decisions, action_items).

    Uses a single model call to translate JSON while preserving structure.
    """
    lang = (target_language or "").strip().lower()
    if not lang:
        return payload
    if lang not in SUPPORTED_TARGET_LANGUAGES:
        raise ValueError(f"Unsupported target_language: {lang}")

    if not isinstance(payload, dict):
        raise ValueError("payload must be a dict")

    # Only send core fields for translation
    core = {
        "summary_text": payload.get("summary_text", ""),
        "key_topics": payload.get("key_topics", []),
        "decisions": payload.get("decisions", []),
        "action_items": payload.get("action_items", []),
    }

    if provider == "gemini":
        translated = _translate_payload_with_gemini(core, lang)
    else:
        translated = _translate_payload_with_ollama(core, lang)

    # Merge translated core back into original payload (keep metadata)
    merged = {
        **payload,
        **translated,
    }

    # Some models may leave short phrases unchanged inside arrays.
    # Post-process key_topics to make translation consistent.
    topics = merged.get("key_topics")
    if isinstance(topics, list) and topics:
        translated_topics = []
        for t in topics[:10]:
            if not isinstance(t, str) or not t.strip():
                continue
            translated_topics.append(translate_text(t, target_language=lang, provider=provider))
        if translated_topics:
            merged["key_topics"] = translated_topics
    return merged


def _build_translation_json_system_prompt(target_language: str) -> str:
    language_name = SUPPORTED_TARGET_LANGUAGES.get(target_language, target_language)
    return (
        "You are a professional translator. "
        f"Translate the JSON content to {language_name}. "
        "Preserve the JSON structure and keys exactly. "
        "Translate ALL string values at any depth (including strings inside arrays like key_topics). "
        "Do not add or remove fields. "
        "Do not change array/object shapes. "
        "IMPORTANT: Do NOT translate person names in 'assignee' if they look like names; keep them as-is. "
        "Return ONLY a valid JSON object and nothing else."
    )


def _translate_payload_with_gemini(core_payload: dict, target_language: str) -> dict:
    if not GEMINI_API_KEY:
        raise RuntimeError("Chưa cấu hình GEMINI_API_KEY trong hệ thống.")

    system_prompt = _build_translation_json_system_prompt(target_language)
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"

    input_json = json.dumps(core_payload, ensure_ascii=False)
    prompt = f"{system_prompt}\n\nINPUT_JSON:\n{input_json}"

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 4096,
        },
    }

    response = requests.post(url, json=payload, timeout=60)
    if response.status_code != 200:
        response.raise_for_status()

    data = response.json()
    raw_output = data["candidates"][0]["content"]["parts"][0]["text"]
    cleaned = _strip_markdown_json(raw_output)
    parsed = json.loads(cleaned)

    return {
        "summary_text": parsed.get("summary_text", core_payload.get("summary_text", "")),
        "key_topics": parsed.get("key_topics", core_payload.get("key_topics", [])),
        "decisions": _normalize_decisions(parsed.get("decisions", core_payload.get("decisions", []))),
        "action_items": _normalize_action_items(parsed.get("action_items", core_payload.get("action_items", []))),
    }


def _translate_payload_with_ollama(core_payload: dict, target_language: str) -> dict:
    system_prompt = _build_translation_json_system_prompt(target_language)
    input_json = json.dumps(core_payload, ensure_ascii=False)

    payload = {
        "model": get_active_ollama_model(),
        "system": system_prompt,
        "prompt": input_json,
        "stream": False,
        "format": "json",
        "options": {
            "temperature": 0.1,
            "num_predict": 2048,
        },
    }

    response = requests.post(OLLAMA_API_URL, json=payload, timeout=180)
    if response.status_code != 200:
        response.raise_for_status()

    data = response.json()
    raw_output = data.get("response", "")
    cleaned = _strip_markdown_json(raw_output)
    parsed = json.loads(cleaned)

    return {
        "summary_text": parsed.get("summary_text", core_payload.get("summary_text", "")),
        "key_topics": parsed.get("key_topics", core_payload.get("key_topics", [])),
        "decisions": _normalize_decisions(parsed.get("decisions", core_payload.get("decisions", []))),
        "action_items": _normalize_action_items(parsed.get("action_items", core_payload.get("action_items", []))),
    }


def translate_text(text: str, *, target_language: str, provider: str = "ollama") -> str:
    """Translate plain text to a target language.

    This is intentionally used only for `summary_text` (not decisions/action_items).
    If `target_language` is falsy, returns the original text.
    """
    if not text:
        return text

    lang = (target_language or "").strip().lower()
    if not lang:
        return text

    if lang not in SUPPORTED_TARGET_LANGUAGES:
        raise ValueError(f"Unsupported target_language: {lang}")

    if provider == "gemini":
        return _translate_with_gemini(text, lang)
    return _translate_with_ollama(text, lang)


def _build_translation_system_prompt(target_language: str) -> str:
    language_name = SUPPORTED_TARGET_LANGUAGES.get(target_language, target_language)
    return (
        "You are a professional translator. "
        f"Translate the user's text into {language_name}. "
        "Preserve meaning and intent. Keep proper nouns as-is when appropriate. "
        "Return ONLY the translated text. Do not add quotes, explanations, or formatting."
    )


def _translate_with_gemini(text: str, target_language: str) -> str:
    if not GEMINI_API_KEY:
        raise RuntimeError("Chưa cấu hình GEMINI_API_KEY trong hệ thống.")

    system_prompt = _build_translation_system_prompt(target_language)
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"

    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": f"{system_prompt}\n\nTEXT:\n{text}",
                    }
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 2048,
        },
    }

    response = requests.post(url, json=payload, timeout=60)
    if response.status_code != 200:
        response.raise_for_status()

    data = response.json()
    raw_output = data["candidates"][0]["content"]["parts"][0]["text"]
    translated = _strip_markdown_json(raw_output).strip()
    return translated


def _translate_with_ollama(text: str, target_language: str) -> str:
    system_prompt = _build_translation_system_prompt(target_language)
    payload = {
        "model": get_active_ollama_model(),
        "system": system_prompt,
        "prompt": text,
        "stream": False,
        "options": {
            "temperature": 0.2,
            "num_predict": 1024,
        },
    }

    response = requests.post(OLLAMA_API_URL, json=payload, timeout=120)
    if response.status_code != 200:
        response.raise_for_status()

    data = response.json()
    raw_output = data.get("response", "")
    translated = _strip_markdown_json(raw_output).strip()
    return translated

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

def generate_meeting_summary(
    transcript_text: str,
    max_retries: int = 2,
    provider: str = "ollama",
    custom_prompt: str = None,
    meeting_title: str = None
) -> dict:
    """
    Phân tích transcript cuộc họp. Hỗ trợ Local (Ollama) và Cloud (Gemini).
    Trả về dict chuẩn hoá với: summary_text, key_topics, decisions, action_items, metadata.
    Tự động chuyển đổi sang Ollama Local AI nếu gặp lỗi API hoặc rate limit của Gemini.

    Args:
        transcript_text: Toàn văn bản bóc băng.
        max_retries: Số lần thử lại khi parse JSON thất bại (default 2).
        provider: "ollama" hoặc "gemini".
        custom_prompt: Chỉ thị tóm tắt riêng từ người dùng (nếu có).
        meeting_title: Tiêu đề cuộc họp (nếu có) để làm giàu ngữ cảnh.

    Raises:
        RuntimeError: Khi offline hoặc JSON không hợp lệ.
    """
    if not transcript_text or len(transcript_text.strip()) < 10:
        raise ValueError("Transcript quá ngắn để phân tích.")

    if provider == "gemini":
        try:
            return _generate_with_gemini(transcript_text, max_retries, custom_prompt, meeting_title)
        except Exception as e:
            print(f"[LLM] Gemini Cloud API failed ({repr(e)}). Automatically falling back to Ollama Local AI (high accuracy)...")
            return _generate_with_ollama(transcript_text, max_retries, custom_prompt, meeting_title)
    else:
        return _generate_with_ollama(transcript_text, max_retries, custom_prompt, meeting_title)


def _generate_with_gemini(transcript_text: str, max_retries: int, custom_prompt: str = None, meeting_title: str = None) -> dict:
    if not GEMINI_API_KEY:
        raise RuntimeError("Chưa cấu hình GEMINI_API_KEY trong hệ thống.")

    # Các mô hình đám mây của Gemini xếp theo thứ tự ưu tiên giảm dần
    gemini_models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-pro", "gemini-2.0-flash-lite"]
    
    # Thiết lập System Prompt và ghép thêm chỉ thị custom nếu có
    system_prompt = SYSTEM_PROMPT
    if custom_prompt and len(custom_prompt.strip()) > 0:
        system_prompt += f"\n\n### USER'S ADDITIONAL CUSTOM INSTRUCTIONS (YOU MUST STRICTLY FOLLOW THESE):\n{custom_prompt}\n"

    # Xây dựng nội dung đầu vào kèm tiêu đề cuộc họp
    input_text = ""
    if meeting_title and len(meeting_title.strip()) > 0:
        input_text += f"Meeting Title: {meeting_title}\n\n"
    input_text += f"Meeting transcript:\n{transcript_text}"

    full_prompt = f"{system_prompt}\n\n{input_text}"
    
    payload = {
        "contents": [{
            "parts": [{"text": full_prompt}]
        }],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 8192
        }
    }

    last_error = None

    for model_name in gemini_models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={GEMINI_API_KEY}"
        
        print(f"[LLM] Trying Gemini model: {model_name}...")
        
        for attempt in range(max_retries + 1):
            try:
                print(f"[LLM] Sending summary request to Gemini ({model_name})"
                      f"{f' — attempt {attempt+1}/{max_retries+1}' if attempt > 0 else ''}...")

                response = requests.post(url, json=payload, timeout=60)
                
                if response.status_code != 200:
                    print(f"[Gemini Error] HTTP {response.status_code} on {model_name}: {response.text}")
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
                        "model_used":        model_name,
                        "transcript_length": len(transcript_text),
                        "timestamp":         datetime.now(timezone.utc).isoformat(),
                        "attempt":           attempt + 1,
                    }
                }
                print(f"[LLM] [OK] Gemini {model_name} Success")
                return result

            except json.JSONDecodeError as e:
                last_error = e
                print(f"[LLM JSON Error] Gemini ({model_name}) Attempt {attempt+1}: Invalid JSON — {str(e)}")
                if attempt < max_retries:
                    time.sleep(2)
                    continue
                break
                
            except Exception as e:
                last_error = e
                print(f"[LLM Error] Gemini ({model_name}) attempt {attempt+1} failed: {str(e)}")
                if attempt < max_retries:
                    time.sleep(2)
                    continue
                break
                
    # Nếu chạy hết danh sách model mà vẫn lỗi
    raise RuntimeError(f"Tất cả các model Gemini đều thất bại. Lỗi cuối cùng: {repr(last_error)}")


def _generate_with_ollama(transcript_text: str, max_retries: int, custom_prompt: str = None, meeting_title: str = None) -> dict:
    # Thiết lập System Prompt và ghép thêm chỉ thị custom nếu có
    system_prompt = SYSTEM_PROMPT
    if custom_prompt and len(custom_prompt.strip()) > 0:
        system_prompt += f"\n\n### USER'S ADDITIONAL CUSTOM INSTRUCTIONS (YOU MUST STRICTLY FOLLOW THESE):\n{custom_prompt}\n"

    # Xây dựng nội dung đầu vào kèm tiêu đề cuộc họp
    user_prompt = ""
    if meeting_title and len(meeting_title.strip()) > 0:
        user_prompt += f"Meeting Title: {meeting_title}\n\n"
    user_prompt += f"Meeting transcript:\n{transcript_text}"

    payload = {
        "model": get_active_ollama_model(),
        "system": system_prompt,
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
            print(f"[LLM] Sending summary request to Ollama ({get_active_ollama_model()})"
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
                    "model_used":        get_active_ollama_model(),
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
