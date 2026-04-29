import json
import requests
from requests.exceptions import RequestException

OLLAMA_API_URL = "http://localhost:11434/api/generate"
# Default using llama3.2
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
    Call local Ollama API to analyze transcript.
    Returns dict with summary, decisions, action_items.
    """
    user_prompt = f"Meeting transcript:\n{transcript_text}"

    payload = {
        "model": OLLAMA_MODEL,
        "system": SYSTEM_PROMPT,
        "prompt": user_prompt,
        "stream": False,
        "format": "json"
    }

    try:
        print(f"[LLM] Sending summary request to Ollama ({OLLAMA_MODEL})...")
        # Timeout 300s for weak hardware
        response = requests.post(OLLAMA_API_URL, json=payload, timeout=300)
        
        if response.status_code != 200:
            print(f"[Ollama Error] HTTP Status: {response.status_code}")
            response.raise_for_status()

        data = response.json()
        llm_output_str = data.get("response", "")

        # Parse JSON string from LLM
        parsed_json = json.loads(llm_output_str)

        # Ensure correct structure for Frontend
        result = {
            "summary_text": parsed_json.get("summary", "No summary available."),
            "decisions": parsed_json.get("decisions", []),
            "action_items": parsed_json.get("action_items", [])
        }
        
        return result

    except RequestException as e:
        print(f"[Ollama Error] Connection failed: {str(e)}")
        raise RuntimeError("LLM Service error: Ollama might be offline.")
    except json.JSONDecodeError as e:
        print(f"[LLM JSON Error] Invalid JSON: {str(e)}")
        raise RuntimeError("LLM did not return valid JSON.")
    except Exception as e:
        print(f"[LLM Error] Unexpected error: {str(e)}")
        raise
