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
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# ==============================================================================
# SYSTEM PROMPT — Phase 1: Structured Decisions + Priority + Key Topics
# ==============================================================================
SYSTEM_PROMPT = """You are a highly efficient assistant specializing in professional meeting analysis and summarization.

### CORE TASK:
Analyze the provided meeting transcript and extract information into a VALID JSON format.
Use the SAME LANGUAGE as the input transcript for all content fields.

### JSON STRUCTURE — Your response must be a single JSON object with EXACTLY these 4 keys:

1. "summary": (string) A concise, natural prose summary of the overall meeting. 3–5 sentences max.

2. "key_topics": (array of strings) 2–5 main topics discussed. Keep each topic short (2–4 words).
   Example: ["Project timeline", "Budget review", "Team assignments"]
   Return [] if the transcript is too short.

3. "decisions": (array of objects) ONLY include decisions that meet ALL conditions:
   - Clearly agreed upon by participants (not a suggestion or proposal)
   - Is a FINAL conclusion, not under discussion
   - Must contain a clear subject (who/what), action (what was decided), and outcome (result/effect)
   Each object must have:
     - "subject": (string) Who or what the decision is about
     - "action": (string) What was decided or agreed upon
     - "outcome": (string) The result, goal, or effect of this decision
   Return [] if no decisions qualify. Do NOT guess or infer decisions.

4. "action_items": (array of objects) Specific, concrete tasks assigned or mentioned.
   Avoid vague tasks (e.g., "discuss further"). Only extract if there is a clear action verb.
   Each object must have:
     - "task_name": (string) Clear description of what needs to be done
     - "assignee": (string) Person assigned (extract from text, or "Unknown")
     - "deadline": (string or null) Mentioned deadline, otherwise null
     - "priority": (string) One of: "high", "medium", "low"
       - "high"   → urgent, blocking, or explicitly prioritized
       - "medium" → standard task with a deadline
       - "low"    → nice-to-have, no urgent deadline
   Return [] if no concrete tasks are found.

### CRITICAL RULES:
- DO NOT invent or infer information. Use ONLY facts from the transcript.
- DO NOT return any text, explanation, or formatting outside the JSON object.
- DO NOT wrap the JSON in markdown codeblocks (no ```json ... ```).
- Respond with a single raw JSON object and nothing else.
- IF the transcript is in English → all JSON values MUST be in English.
- IF the transcript is in Vietnamese → all JSON values MUST be in Vietnamese.

### SCHEMA TEMPLATE (do NOT use these example values):
{
  "summary": "...",
  "key_topics": ["...", "..."],
  "decisions": [
    {"subject": "...", "action": "...", "outcome": "..."}
  ],
  "action_items": [
    {"task_name": "...", "assignee": "...", "deadline": "...", "priority": "high"}
  ]
}
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
