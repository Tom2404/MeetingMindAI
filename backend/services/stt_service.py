import os
import time
import re
import json
import requests
import subprocess
import concurrent.futures
import glob
from faster_whisper import WhisperModel
from google import genai
from google.genai import types
from pathlib import Path
from dotenv import load_dotenv

# Tìm đường dẫn đến thư mục root (thư mục chứa file này là services/, cha là backend/, ông là root)
root_dir = Path(__file__).resolve().parent.parent.parent
env_path = root_dir / ".env"

# Load file .env chính xác theo đường dẫn tuyệt đối
load_dotenv(dotenv_path=env_path)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_STT_MODEL = os.getenv("GEMINI_STT_MODEL", "gemini-2.5-flash")

# ==============================================================================
# CẤU HÌNH STT — Ưu tiên độ chính xác cao nhất
# ==============================================================================
# Model size: large-v3 là model chính xác nhất của Whisper
#   - base:    ~74MB  — Nhanh, độ chính xác thấp (~60-70% tiếng Việt)
#   - medium:  ~1.5GB — Cân bằng tốc độ/chất lượng
#   - large-v2:~3GB  — Rất tốt
#   - large-v3:~3GB  — TỐT NHẤT, chính xác nhất cho tiếng Việt (khuyến nghị)
# Model size: 'base' là model nhanh nhất, phù hợp cho máy cấu hình yếu
MODEL_SIZE = "tiny"

# Để None để AI tự động nhận diện ngôn ngữ (Tiếng Việt hoặc Tiếng Anh)
LANGUAGE = None

# Không sử dụng câu mồi (Initial Prompt) để tránh model bị thiên kiến ngôn ngữ
# và hỗ trợ bóc băng đa ngôn ngữ (Tiếng Anh, Tiếng Việt đan xen) một cách tự nhiên.
INITIAL_PROMPT = None

# Khởi tạo instance Whisper toàn cục, lazy-load khi cần
_model = None

def get_model():
    global _model
    if _model is None:
        print(f"[STT-LOCAL] Loading Faster Whisper model '{MODEL_SIZE}'...")
        print(f"[STT-LOCAL] Warning: Model '{MODEL_SIZE}' needs ~3GB RAM. Please wait for first load...")
        # Tự động phát hiện GPU (NVIDIA CUDA) để tăng tốc 10-15 lần
        device = "cuda" if os.getenv("USE_GPU", "false").lower() == "true" else "cpu"
        # Nếu chạy CPU: dùng int8 để nhanh hơn. Nếu GPU: dùng float16.
        compute_type = "float16" if device == "cuda" else "int8"
        
        print(f"[STT-LOCAL] Device: {device.upper()}, Compute: {compute_type}")
        
        _model = WhisperModel(
            MODEL_SIZE, 
            device=device, 
            compute_type=compute_type,
            cpu_threads=4,    # Số luồng CPU sử dụng
            num_workers=2     # Số lượng worker xử lý song song
        )
        print(f"[STT-LOCAL] Success: Model '{MODEL_SIZE}' is ready.")
    return _model

def semantically_diarize_whisper_chunks(chunks: list, host: str = None, participants: str = None) -> list:
    """
    Sử dụng LLM (Gemini hoặc Ollama) để gán nhãn người nói (Speaker Diarization)
    cho các đoạn thoại thô từ Whisper dựa trên ngữ cảnh đối thoại.
    """
    if not chunks:
        return []
        
    print("[STT-LOCAL] Aligning speaker labels semantically using LLM...")
    
    formatted_dialogue = []
    for idx, chunk in enumerate(chunks[:200]):  # Xử lý tối đa 200 câu thoại
        formatted_dialogue.append(f"[{idx + 1}] Unknown: {chunk['text']}")
        
    dialogue_str = "\n".join(formatted_dialogue)
    
    speaker_context = ""
    if host or participants:
        speaker_context = "\nThông tin người tham gia thực tế cuộc họp:\n"
        if host:
            speaker_context += f"- Người chủ trì (Host): {host}\n"
        if participants:
            speaker_context += f"- Danh sách người tham gia khác: {participants}\n"
            
    prompt = f"""Bạn là chuyên gia phân tích hội thoại cấp cao.
    Dưới đây là văn bản bóc băng từ cuộc họp, nhưng nhãn người nói chưa được phân biệt (đang để là Unknown).
    {speaker_context}
    Nhiệm vụ của bạn:
    1. Đọc kỹ ngữ cảnh đàm thoại, các đại từ xưng hô, vai trò và luồng đối thoại để suy luận người nói chính xác nhất cho từng câu thoại.
    2. Gán nhãn tên thật nếu xác định được chắc chắn, hoặc dùng [Người nói A], [Người nói B],... một cách nhất quán.
    3. Trả về kết quả duy nhất dưới dạng MỘT mảng JSON chứa các đối tượng có cấu trúc chính xác sau:
       [
         {{"index": 1, "speaker": "Tên người nói"}},
         {{"index": 2, "speaker": "Tên người nói"}},
         ...
       ]
    LƯU Ý QUAN TRỌNG:
    - Không được thêm lời dẫn, lời giải thích hay ký tự nào ngoài JSON.
    - Giữ nguyên văn nội dung câu nói của người dùng, chỉ gán nhãn người nói.
    
    HỘI THOẠI CẦN XỬ LÝ:
    {dialogue_str}
    """
    
    result_json = ""
    
    # Thử bằng Gemini trước nếu có API Key
    if GEMINI_API_KEY:
        client = genai.Client(api_key=GEMINI_API_KEY)
        gemini_diarize_fallbacks = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-flash-lite"]
        if GEMINI_STT_MODEL not in gemini_diarize_fallbacks:
            gemini_diarize_fallbacks.insert(0, GEMINI_STT_MODEL)
            
        model_to_use = gemini_diarize_fallbacks[0]
        
        for attempt in range(len(gemini_diarize_fallbacks)):
            try:
                print(f"[STT-LOCAL] Call Gemini ({model_to_use}) to diarize speakers semantically...")
                config = types.GenerateContentConfig(
                    temperature=0.0,
                    system_instruction="Bạn là chuyên gia phân tích hội thoại cấp cao. Hãy luôn định danh người nói chính xác và trả về mảng JSON theo đúng định dạng được yêu cầu."
                )
                response = client.models.generate_content(
                    model=model_to_use,
                    contents=[prompt],
                    config=config
                )
                raw_output = response.text.strip()
                match = re.search(r"```(?:json)?\s*([\s\S]+?)```", raw_output, re.IGNORECASE)
                result_json = match.group(1).strip() if match else raw_output
                break
            except Exception as e:
                current_idx = gemini_diarize_fallbacks.index(model_to_use)
                if current_idx < len(gemini_diarize_fallbacks) - 1:
                    next_model = gemini_diarize_fallbacks[current_idx + 1]
                    print(f"[STT-LOCAL] Model {model_to_use} failed ({repr(e)}). Switching to backup model {next_model} for diarization...")
                    model_to_use = next_model
                    time.sleep(1)
                    continue
                print(f"[STT-LOCAL] Gemini speaker diarization failed with {model_to_use}: {repr(e)}")
                result_json = ""
            
    # Thử bằng Ollama nếu Gemini không hoạt động hoặc không có key
    if not result_json:
        try:
            print("[STT-LOCAL] Call Ollama to diarize speakers semantically...")
            from .llm_service import get_active_ollama_model
            active_model = get_active_ollama_model()
            
            payload = {
                "model": active_model,
                "prompt": prompt,
                "stream": False,
                "format": "json"
            }
            
            response = requests.post("http://localhost:11434/api/generate", json=payload, timeout=60)
            if response.status_code == 200:
                data = response.json()
                raw_output = data.get("response", "")
                match = re.search(r"```(?:json)?\s*([\s\S]+?)```", raw_output, re.IGNORECASE)
                result_json = match.group(1).strip() if match else raw_output
        except Exception as e:
            print(f"[STT-LOCAL] Ollama speaker diarization failed ({repr(e)}).")
            
    if result_json:
        try:
            parsed_labels = json.loads(result_json)
            label_map = {item["index"]: item["speaker"] for item in parsed_labels if "index" in item and "speaker" in item}
            
            for idx, chunk in enumerate(chunks):
                chunk_index = idx + 1
                if chunk_index in label_map:
                    chunk["speaker"] = label_map[chunk_index]
            print("[STT-LOCAL] Speaker labels successfully aligned.")
        except Exception as parse_e:
            print(f"[STT-LOCAL] Failed to parse LLM diarization response: {repr(parse_e)}")
            
    return chunks


def transcribe_audio_local(audio_path: str, host: str = None, participants: str = None) -> dict:
    """
    Bóc băng audio → văn bản với độ chính xác cao nhất sử dụng mô hình local Faster-Whisper.
    Sau đó tự động gán nhãn người nói (Speaker Diarization) bằng AI ngữ nghĩa.
    """
    if not os.path.exists(audio_path):
        raise FileNotFoundError(f"Không tìm thấy file audio: {audio_path}")

    model = get_model()

    print(f"[STT-LOCAL] Starting transcription: {audio_path}")

    segments, info = model.transcribe(
        audio_path,
        language=LANGUAGE,            # Để None để tự động nhận diện Anh/Việt
        initial_prompt=INITIAL_PROMPT,
        beam_size=5,                  # Tăng lên 5 (chuẩn) để cho độ chính xác cao nhất
        best_of=5,                    # Chọn kết quả tốt nhất trong 5 nhánh
        temperature=[0.0, 0.2, 0.4, 0.6, 0.8, 1.0], # Dải nhiệt độ dự phòng nếu model bị lặp
        vad_filter=True,               # Lọc khoảng im lặng/tiếng ồn nền
        vad_parameters=dict(
            min_silence_duration_ms=300,   
            speech_pad_ms=200,             
        ),
        condition_on_previous_text=False,  # TẮT: Rất quan trọng để tránh lặp từ (Hallucination Loop)
        word_timestamps=True,              
        no_speech_threshold=0.6,           
        compression_ratio_threshold=2.4,   # Ngưỡng phát hiện vòng lặp (vd: lặp từ 100 lần)
    )

    print(f"[STT-LOCAL] Language detected: '{info.language}' (confidence: {info.language_probability:.2%})")

    # Gom văn bản từ các segment hợp lệ
    valid_segments = []
    skipped = 0
    for segment in segments:
        # Bỏ qua các segment nhiễu (xác suất im lặng quá cao)
        if segment.no_speech_prob > 0.8:
            skipped += 1
            continue
        valid_segments.append(segment.text.strip())

    if skipped > 0:
        print(f"[STT-LOCAL] Removed {skipped} noise/silence segments")

    final_text = " ".join(valid_segments)
    print(f"[STT-LOCAL] Total characters transcribed: {len(final_text)}")

    chunks = [{"speaker": "Unknown", "text": t, "start": None, "end": None} for t in valid_segments]

    # Thực hiện gán nhãn người nói bằng ngữ nghĩa (Semantic Diarization)
    try:
        chunks = semantically_diarize_whisper_chunks(chunks, host, participants)
    except Exception as e:
        print(f"[STT-LOCAL] Semantic diarization failed: {repr(e)}. Keeping default speaker labels.")

    # Trả về định dạng dict đồng nhất
    return {
        "full_text": final_text,
        "chunks": chunks
    }

def clean_gemini_transcript(result_text: str) -> str:
    """
    Làm sạch kết quả thô của Gemini để lấy ra phần bóc băng hội thoại thực tế,
    loại bỏ phần Bước 1 (hồ sơ đặc trưng) và Bước 2 (ánh xạ tên).
    """
    dialogue_text = result_text

    # 1. Thử tách bằng các biến thể của "Bước 3"
    split_patterns = [
        r"B[ướu]c\s*3",
        r"B[ướu]c\s*III",
        r"Buoc\s*3",
        r"Buoc\s*III",
        r"Ph[ầâ]n\s*3",
        r"Phan\s*3",
        r"Step\s*3"
    ]
    for sp in split_patterns:
        parts = re.split(sp, result_text, flags=re.IGNORECASE)
        if len(parts) > 1:
            dialogue_text = parts[-1]
            # Loại bỏ dấu hai chấm, dấu sao hoặc khoảng trắng ở đầu phần bóc băng
            dialogue_text = re.sub(r"^[\s\:\*\-\=\#\.\(\)]+", "", dialogue_text).strip()
            return dialogue_text

    # 2. Nếu không tìm thấy "Bước 3" rõ ràng, ta lọc từng dòng để bỏ bớt phần Bước 1 và Bước 2
    lines = result_text.split("\n")
    cleaned_lines = []
    in_dialogue = False
    
    for line in lines:
        stripped = line.strip()
        
        # Gặp tiêu đề Bước 3 thì chuyển sang chế độ hội thoại
        if any(re.search(sp, stripped, re.IGNORECASE) for sp in split_patterns):
            in_dialogue = True
            continue
            
        # Gặp tiêu đề Bước 1 hoặc Bước 2 thì bỏ qua
        if any(x in stripped.lower() for x in ["bước 1", "bước 2", "buoc 1", "buoc 2", "hồ sơ đặc trưng", "biomarker", "ánh xạ"]):
            continue
            
        # Nếu chưa vào hội thoại nhưng dòng có cấu trúc giống câu thoại và không có các đặc trưng của Bước 1
        if not in_dialogue:
            if re.match(r"^(\s*-\s*)?(?:\[[^\]]+\]|\*\*[^*:]+\*\*|[a-zA-Z0-9À-ỹ\s]{2,30})\s*:", stripped):
                if not any(kwd in stripped.lower() for kwd in ["giọng nữ", "giọng nam", "miền nam", "miền bắc", "nói nhanh", "nói chậm"]):
                    in_dialogue = True
        
        if in_dialogue:
            cleaned_lines.append(line)
            
    if cleaned_lines:
        return "\n".join(cleaned_lines).strip()
        
    return dialogue_text


def split_audio_file(audio_path: str, segment_length_seconds: int = 300) -> list[str]:
    """
    Cắt tệp âm thanh tại audio_path thành các phân đoạn dài segment_length_seconds (mặc định 5 phút).
    Sử dụng FFmpeg với cơ chế `-c copy` cực nhanh (không re-encode).
    Trả về danh sách đường dẫn các tệp phân đoạn.
    """
    if not os.path.exists(audio_path):
        raise FileNotFoundError(f"Không tìm thấy file audio: {audio_path}")
        
    dir_name = os.path.dirname(audio_path)
    base_name = os.path.basename(audio_path)
    name_no_ext, ext = os.path.splitext(base_name)
    
    # Template tên file đầu ra, dùng chỉ số %03d để sắp xếp đúng thứ tự
    output_template = os.path.join(dir_name, f"{name_no_ext}_chunk_%03d{ext}")
    
    command = [
        "ffmpeg",
        "-y",
        "-i", audio_path,
        "-f", "segment",
        "-segment_time", str(segment_length_seconds),
        "-c", "copy",
        output_template
    ]
    
    print(f"[STT-GEMINI] Splitting audio file {audio_path} into chunks of {segment_length_seconds}s...")
    try:
        subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    except subprocess.CalledProcessError as e:
        print(f"[STT-GEMINI] Error splitting audio with ffmpeg: {str(e)}")
        return []
        
    # Lấy danh sách các file chunk tạo ra
    chunks = sorted(glob.glob(os.path.join(dir_name, f"{name_no_ext}_chunk_*[0-9]{ext}")))
    return chunks


def transcribe_single_gemini_chunk(client, audio_path: str, chunk_index: int, total_chunks: int, host: str = None, participants: str = None) -> dict:
    """
    Bóc băng một phân đoạn audio duy nhất sử dụng Gemini.
    """
    print(f"[STT-GEMINI] [Chunk {chunk_index + 1}/{total_chunks}] Uploading audio chunk: {audio_path}")
    audio_file = client.files.upload(file=audio_path)
    
    print(f"[STT-GEMINI] [Chunk {chunk_index + 1}/{total_chunks}] Upload complete: {audio_file.name}. Waiting for processing...")
    
    try:
        # Chờ file được xử lý xong trên máy chủ Google
        while audio_file.state.name == "PROCESSING":
            time.sleep(2)
            audio_file = client.files.get(name=audio_file.name)
            
        if audio_file.state.name == "FAILED":
            raise ValueError(f"Gemini failed to process chunk {chunk_index + 1}.")
            
        print(f"[STT-GEMINI] [Chunk {chunk_index + 1}/{total_chunks}] File ready. Generating transcription with Speaker Diarization...")
        
        # Xây dựng ngữ cảnh người tham gia để truyền định danh cho AI
        speaker_context = ""
        if host or participants:
            speaker_context = "\nThông tin danh sách người tham gia thực tế cuộc họp:\n"
            if host:
                speaker_context += f"- Người chủ trì (Host): {host}\n"
            if participants:
                speaker_context += f"- Danh sách người tham gia khác: {participants}\n"
     
        prompt = f"""Bạn là chuyên gia bóc băng hội thoại và định danh người nói cấp cao.
        Đây là PHẦN {chunk_index + 1}/{total_chunks} của một tệp âm thanh cuộc họp dài được chia nhỏ.
        Hãy nghe kỹ tệp âm thanh này và thực hiện nhiệm vụ theo đúng cấu trúc 3 Bước sau (đặc biệt sử dụng phương pháp suy luận Chain-of-Thought để hiệu chỉnh nhãn người nói):
     
        Bước 1: Lập hồ sơ đặc trưng giọng nói (Speaker Biomarkers) của phần này.
        Hãy phân tích và liệt kê các giọng nói khác nhau xuất hiện trong phần file audio này. Với mỗi giọng nói, hãy ghi chú các đặc điểm nhận diện vật lý (Nam/Nữ, trầm/cao, giọng miền Bắc/Trung/Nam, nói nhanh/chậm) và cách xưng hô đặc trưng.
     
        Bước 2: Ánh xạ tên thực tế (Speaker Name Mapping) của phần này.{speaker_context}
        Hãy đối chiếu các hồ sơ giọng nói vừa mô tả ở Bước 1 với danh sách người tham gia thực tế để gán tên thật chính xác nhất.
        (Ví dụ: Speaker A có giọng nam trầm miền Nam, hay được các thành viên khác gọi là chủ trì -> Ánh xạ thành tên thật của người chủ trì).
        Nếu giọng nói không thuộc danh sách trên, hãy gán nhãn mô tả như [Người nói ngoài DS 1], v.v.
     
        Bước 3: Bóc băng chi tiết theo tên đã ánh xạ của phần này.
        Tiến hành bóc băng chính xác từng từ theo mốc thời gian hội thoại, sử dụng các tên đã được ánh xạ ở Bước 2 làm nhãn người nói.
        Định dạng đầu ra bắt buộc của Bước 3:
        [Tên người nói đã ánh xạ]: Nội dung câu nói...
        [Tên người nói khác đã ánh xạ]: Nội dung câu nói...
     
        LƯU Ý QUAN TRỌNG:
        - Phải giữ sự nhất quán tuyệt đối về nhãn người nói từ đầu đến cuối phần này. Không được lẫn lộn nhãn tên cho cùng một giọng nói.
        - Chỉ trả về kết quả theo cấu trúc 3 Bước trên, không thêm bất kỳ lời chào, lời giải thích hay ký tự thừa nào khác.
        """
        
        max_retries = 3
        retry_delay = 5
        result_text = ""
        gemini_stt_fallbacks = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-flash-lite"]
        if GEMINI_STT_MODEL not in gemini_stt_fallbacks:
            gemini_stt_fallbacks.insert(0, GEMINI_STT_MODEL)
            
        model_to_use = gemini_stt_fallbacks[0]
        
        for attempt in range(max_retries):
            try:
                print(f"[STT-GEMINI] [Chunk {chunk_index + 1}/{total_chunks}] Call Gemini ({model_to_use}) to transcribe...")
                config = types.GenerateContentConfig(
                    temperature=0.0,
                    system_instruction="Bạn là chuyên gia bóc băng hội thoại và định danh người nói cấp cao. Hãy luôn tuân thủ nghiêm ngặt các yêu cầu về định dạng, cấu trúc và ánh xạ tên người nói dựa trên ngữ cảnh được cung cấp."
                )
                response = client.models.generate_content(
                    model=model_to_use,
                    contents=[audio_file, prompt],
                    config=config
                )
                result_text = response.text.strip()
                break
            except Exception as e:
                current_idx = gemini_stt_fallbacks.index(model_to_use)
                if current_idx < len(gemini_stt_fallbacks) - 1:
                    next_model = gemini_stt_fallbacks[current_idx + 1]
                    print(f"[STT-GEMINI] [Chunk {chunk_index + 1}/{total_chunks}] Error calling {model_to_use} ({repr(e)}). Switching to backup model {next_model}...")
                    model_to_use = next_model
                    time.sleep(2)
                    continue
                    
                if attempt < max_retries - 1:
                    print(f"[STT-GEMINI] [Chunk {chunk_index + 1}/{total_chunks}] Rate limited or failed. Retrying in {retry_delay}s... (Attempt {attempt + 1}/{max_retries})")
                    time.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff
                    continue
                raise RuntimeError(f"Error calling Gemini in chunk {chunk_index + 1}: {str(e)}")
    finally:
        # Dọn dẹp file trên server của Google sau khi dùng xong
        print(f"[STT-GEMINI] [Chunk {chunk_index + 1}/{total_chunks}] Deleting file from Google server...")
        try:
            client.files.delete(name=audio_file.name)
        except Exception as e:
            print(f"[STT-GEMINI] [Chunk {chunk_index + 1}/{total_chunks}] Warning: Error deleting file: {repr(e)}")
            
    # Làm sạch tệp transcript (loại bỏ Bước 1 & Bước 2)
    dialogue_text = clean_gemini_transcript(result_text)
    
    # Parse text thành các chunks hội thoại bằng giải thuật quét dòng cực kỳ mạnh mẽ, khử mốc thời gian và định dạng khác nhau
    chunks = []
    lines = dialogue_text.split("\n")
    for line in lines:
        if not line.strip():
            continue
            
        # Clean up leading bullet points, spaces, stars
        cleaned_raw = re.sub(r'^\s*[-•*]\s*', '', line).strip()
        
        # Tìm dấu phân cách ':' không phải là một phần của mốc thời gian kiểu hh:mm hay mm:ss
        match_sep = re.search(r'(?<!\d):(?!\d)', cleaned_raw)
        if match_sep:
            idx = match_sep.start()
            speaker_part = cleaned_raw[:idx].strip()
            text_part = cleaned_raw[idx+1:].strip()
            
            # Làm sạch phần speaker_part:
            # - Loại bỏ các mốc thời gian như [00:12], (00:12), 00:12, [01:23:45]
            speaker_part = re.sub(r'\b\d{1,2}:\d{2}(?::\d{2})?\b', '', speaker_part)
            # - Loại bỏ ngoặc vuông, ngoặc đơn, dấu sao, gạch ngang, dấu nháy
            speaker_part = re.sub(r'[\[\]\(\)*\-–—\'\"]', '', speaker_part)
            # - Làm sạch khoảng trắng thừa
            speaker_part = re.sub(r'\s+', ' ', speaker_part).strip()
            
            if not speaker_part:
                speaker_part = "Người nói"
                
            chunks.append({"speaker": speaker_part, "text": text_part, "start": None, "end": None})
        else:
            # Fallback: nếu dòng không khớp định dạng nào, cộng dồn vào chunk trước đó
            if chunks:
                chunks[-1]["text"] += "\n" + cleaned_raw
            else:
                chunks.append({"speaker": "Người nói", "text": cleaned_raw, "start": None, "end": None})
            
    return {
        "full_text": dialogue_text,
        "chunks": chunks
    }


def transcribe_audio_with_gemini(audio_path: str, host: str = None, participants: str = None) -> dict:
    """
    Bóc băng audio → văn bản sử dụng Gemini Flagship (Hybrid Diarization Pipeline).
    Áp dụng kỹ thuật Chain-of-Thought (CoT) kết hợp Parallel Audio Chunking để tăng tốc gấp 5-8 lần.
    Tự động chuyển đổi sang Faster-Whisper cục bộ nếu gặp lỗi API hoặc rate limit.
    """
    if not GEMINI_API_KEY:
        print("[STT-GEMINI] Warning: GEMINI_API_KEY not configured. Falling back to local Faster-Whisper (high accuracy)...")
        return transcribe_audio_local(audio_path, host, participants)
        
    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        
        # 1. Đo lường thời lượng tệp âm thanh
        from .storage_service import get_audio_duration
        duration = get_audio_duration(audio_path)
        print(f"[STT-GEMINI] Original audio duration: {duration} seconds.")
        
        # Kích thước phân đoạn lý tưởng: 5 phút (300 giây)
        segment_length = 300
        
        # Nếu file ngắn hơn hoặc bằng 5 phút, hoặc không lấy được thời lượng, xử lý dạng đơn chunk như cũ
        if duration <= segment_length:
            print(f"[STT-GEMINI] Audio duration is short ({duration}s <= {segment_length}s). Processing as single chunk.")
            return transcribe_single_gemini_chunk(client, audio_path, 0, 1, host, participants)
            
        # 2. Thực hiện chia nhỏ file bằng FFmpeg
        segment_files = []
        try:
            segment_files = split_audio_file(audio_path, segment_length)
        except Exception as e:
            print(f"[STT-GEMINI] Warning: Audio split failed ({repr(e)}). Falling back to single chunk.")
            return transcribe_single_gemini_chunk(client, audio_path, 0, 1, host, participants)
            
        if not segment_files:
            print("[STT-GEMINI] Warning: No segment files generated. Falling back to single chunk.")
            return transcribe_single_gemini_chunk(client, audio_path, 0, 1, host, participants)
            
        total_chunks = len(segment_files)
        print(f"[STT-GEMINI] Starting parallel transcription of {total_chunks} chunks...")
        
        # 3. Chạy song song các chunk sử dụng ThreadPoolExecutor
        chunk_results = [None] * total_chunks
        try:
            with concurrent.futures.ThreadPoolExecutor(max_workers=total_chunks) as executor:
                future_to_index = {
                    executor.submit(
                        transcribe_single_gemini_chunk,
                        client,
                        file_path,
                        idx,
                        total_chunks,
                        host,
                        participants
                    ): idx
                    for idx, file_path in enumerate(segment_files)
                }
                
                for future in concurrent.futures.as_completed(future_to_index):
                    idx = future_to_index[future]
                    try:
                        res = future.result()
                        chunk_results[idx] = res
                    except Exception as exc:
                        print(f"[STT-GEMINI] Chunk {idx + 1} generated an exception: {exc}")
                        raise exc
        except Exception as e:
            print(f"[STT-GEMINI] Error during parallel processing: {repr(e)}. Falling back to single chunk...")
            return transcribe_single_gemini_chunk(client, audio_path, 0, 1, host, participants)
            
        # Dọn dẹp các tệp phân đoạn tạm thời trên đĩa cứng local sau khi xử lý xong
        for f in segment_files:
            try:
                if os.path.exists(f):
                    os.remove(f)
            except Exception as err:
                print(f"[STT-GEMINI] Warning: Failed to delete temp segment file {f}: {err}")
                
        # 4. Hợp nhất kết quả của các chunk một cách mạch lạc
        print("[STT-GEMINI] All chunks transcribed successfully. Merging results...")
        
        merged_full_text_list = []
        merged_chunks = []
        
        for idx, res in enumerate(chunk_results):
            if res:
                merged_full_text_list.append(f"[Phần {idx + 1}]:\n{res['full_text']}")
                merged_chunks.extend(res["chunks"])
                
        merged_full_text = "\n\n".join(merged_full_text_list)
        print(f"[STT-GEMINI] Completed merge. Total characters: {len(merged_full_text)}, Total chunks: {len(merged_chunks)}")
        
        return {
            "full_text": merged_full_text,
            "chunks": merged_chunks
        }
    except Exception as outer_e:
        print(f"[STT-GEMINI] Critical Error: {repr(outer_e)}. Automatically falling back to local Faster-Whisper (high accuracy)...")
        # Khôi phục dọn dẹp các phân đoạn nếu có
        if 'segment_files' in locals() and segment_files:
            for f in segment_files:
                try:
                    if os.path.exists(f):
                        os.remove(f)
                except Exception:
                    pass
        return transcribe_audio_local(audio_path, host, participants)

import numpy as np

def transcribe_audio_buffer(audio_bytes: bytes, current_lang: str = None) -> tuple:
    """
    Bóc băng audio trực tiếp từ memory buffer (raw PCM float32 16kHz) phục vụ WebSockets realtime.
    Trả về tuple (văn_bản_nhận_diện, ngôn_ngữ_đã_phát_hiện).
    """
    model = get_model()
    
    # Chuyển đổi raw bytes (từ Float32Array của trình duyệt) thành numpy array
    audio_np = np.frombuffer(audio_bytes, dtype=np.float32)
    
    # Nhận diện tự động ngôn ngữ và bóc băng cho chunk này
    # Tắt condition_on_previous_text để đảm bảo chunk mới hoàn toàn độc lập, không bị lây nhiễm chéo.
    segments, info = model.transcribe(
        audio_np,
        language=None, # Tự động phát hiện lại ngôn ngữ cho MỖI chunk để hỗ trợ nói đan xen Anh/Việt
        initial_prompt=INITIAL_PROMPT,
        beam_size=5,
        best_of=5,
        temperature=[0.0, 0.2, 0.4, 0.6, 0.8],  # Fallback nhiệt độ để tự thoát vòng lặp
        vad_filter=True,
        condition_on_previous_text=False,  # KIÊN QUYẾT TẮT để tránh lây nhiễm vòng lặp giữa các chunk
        no_speech_threshold=0.6,
        compression_ratio_threshold=2.4,   # Chống lặp từ vô tận
    )
    
    current_lang = info.language
    
    valid_segments = []
    for segment in segments:
        if segment.no_speech_prob > 0.8:
            continue
            
        text = segment.text.strip()
        # Regex loại bỏ các từ lấp chỗ trống rác phổ biến (uhm, uhh, ahh, ừm, ờm)
        text = re.sub(r'\b(uhm+|uh+|ah+|ừm+|ờm+)\b', '', text, flags=re.IGNORECASE)
        # Loại bỏ dấu câu thừa hoặc khoảng trắng thừa do xóa chữ
        text = re.sub(r'\s+', ' ', text).strip()
        text = re.sub(r'^[.,\s]+', '', text)
        
        if text:
            valid_segments.append(text)
            
    return " ".join(valid_segments), current_lang
