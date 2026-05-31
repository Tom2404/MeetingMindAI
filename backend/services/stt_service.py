import os
import time
import re
from faster_whisper import WhisperModel
from google import genai
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

def transcribe_audio_local(audio_path: str) -> str:
    """
    Bóc băng audio → văn bản với độ chính xác cao nhất.

    Các tối ưu đã áp dụng:
    - Model large-v3: chính xác nhất cho tiếng Việt
    - language="vi": tránh auto-detect nhận sai ngôn ngữ
    - beam_size=10: tìm kiếm rộng hơn → chính xác hơn (mặc định = 5)
    - vad_filter=True: lọc khoảng lặng/tiếng ồn, giảm ảo giác văn bản
    - condition_on_previous_text=True: dùng ngữ cảnh đoạn trước để đoán tiếp
    - initial_prompt: cung cấp context cuộc họp để model nhận diện thuật ngữ tốt hơn
    - no_speech_prob threshold: bỏ qua segment bị nhận diện sai (tiếng ồn)
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

    # Trả về định dạng dict đồng nhất
    return {
        "full_text": final_text,
        "chunks": [{"speaker": "Unknown", "text": t, "start": None, "end": None} for t in valid_segments]
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


def transcribe_audio_with_gemini(audio_path: str, host: str = None, participants: str = None) -> dict:
    """
    Bóc băng audio → văn bản sử dụng Gemini Flagship (Hybrid Diarization Pipeline).
    Áp dụng kỹ thuật Chain-of-Thought (CoT) để thiết lập Biomarkers & Mapped Names trước khi bóc băng,
    giúp nâng độ chính xác định danh người nói lên tối đa.
    """
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY not configured in the system.")
        
    client = genai.Client(api_key=GEMINI_API_KEY)
    
    print(f"[STT-GEMINI] Uploading audio file: {audio_path}")
    audio_file = client.files.upload(file=audio_path)
    
    print(f"[STT-GEMINI] Upload complete: {audio_file.name}. Waiting for processing...")
    
    # Wait for the file to be processed
    while audio_file.state.name == "PROCESSING":
        time.sleep(2)
        audio_file = client.files.get(name=audio_file.name)
        
    if audio_file.state.name == "FAILED":
        raise ValueError("Gemini failed to process the audio file.")
        
    print("[STT-GEMINI] File ready. Generating transcription with Speaker Diarization...")
    
    # Xây dựng bối cảnh cuộc họp thực tế
    speaker_context = ""
    if host or participants:
        speaker_context = "\nThông tin danh sách người tham gia thực tế cuộc họp:\n"
        if host:
            speaker_context += f"- Người chủ trì (Host): {host}\n"
        if participants:
            speaker_context += f"- Danh sách người tham gia khác: {participants}\n"
 
    prompt = f"""Bạn là chuyên gia bóc băng hội thoại và định danh người nói cấp cao.
    Hãy nghe kỹ tệp âm thanh này và thực hiện nhiệm vụ theo đúng cấu trúc 3 Bước sau (đặc biệt sử dụng phương pháp suy luận Chain-of-Thought để hiệu chỉnh nhãn người nói):
 
    Bước 1: Lập hồ sơ đặc trưng giọng nói (Speaker Biomarkers)
    Hãy phân tích và liệt kê các giọng nói khác nhau xuất hiện trong toàn bộ file audio. Với mỗi giọng nói, hãy ghi chú các đặc điểm nhận diện vật lý (Nam/Nữ, trầm/cao, giọng miền Bắc/Trung/Nam, nói nhanh/chậm) và cách xưng hô đặc trưng.
 
    Bước 2: Ánh xạ tên thực tế (Speaker Name Mapping){speaker_context}
    Hãy đối chiếu các hồ sơ giọng nói vừa mô tả ở Bước 1 với danh sách người tham gia thực tế để gán tên thật chính xác nhất.
    (Ví dụ: Speaker A có giọng nam trầm miền Nam, hay được các thành viên khác gọi là chủ trì -> Ánh xạ thành tên thật của người chủ trì).
    Nếu giọng nói không thuộc danh sách trên, hãy gán nhãn mô tả như [Người nói ngoài DS 1], v.v.
 
    Bước 3: Bóc băng chi tiết theo tên đã ánh xạ
    Tiến hành bóc băng chính xác từng từ theo mốc thời gian hội thoại, sử dụng các tên đã được ánh xạ ở Bước 2 làm nhãn người nói.
    Định dạng đầu ra bắt buộc của Bước 3:
    [Tên người nói đã ánh xạ]: Nội dung câu nói...
    [Tên người nói khác đã ánh xạ]: Nội dung câu nói...
 
    LƯU Ý QUAN TRỌNG:
    - Phải giữ sự nhất quán tuyệt đối về nhãn người nói từ đầu đến cuối audio. Không được lẫn lộn nhãn tên cho cùng một giọng nói.
    - Chỉ trả về kết quả theo cấu trúc 3 Bước trên, không thêm bất kỳ lời chào, lời giải thích hay ký tự thừa nào khác.
    """
    
    try:
        response = client.models.generate_content(
            model=GEMINI_STT_MODEL,
            contents=[audio_file, prompt]
        )
        result_text = response.text.strip()
    except Exception as e:
        raise RuntimeError(f"Error calling Gemini: {str(e)}")
    finally:
        # Dọn dẹp file trên server của Google sau khi dùng xong
        print(f"[STT-GEMINI] Deleting file from Google server...")
        try:
            client.files.delete(name=audio_file.name)
        except Exception as e:
            print(f"[STT-GEMINI] Warning: Error deleting file: {repr(e)}")
            
    # Làm sạch tệp transcript (loại bỏ Bước 1 & Bước 2)
    dialogue_text = clean_gemini_transcript(result_text)
 
    # Parse text thành các chunks hội thoại bằng giải thuật quét dòng có khử mốc thời gian
    chunks = []
    lines = dialogue_text.split("\n")
    for line in lines:
        if not line.strip():
            continue
            
        # 1. Loại bỏ mốc thời gian (timestamp) ở đầu dòng nếu có
        # Ví dụ: 00:06, [00:15], - 00:06, v.v.
        clean_line = re.sub(
            r"^\s*(?:-\s*)?(?:\[?\d{1,2}:\d{2}(?::\d{2})?\]?|(?:\d{1,2}:\d{2}(?::\d{2})?))\s*[-–—]?\s*",
            "",
            line
        )
        
        # 2. Thử khớp các định dạng người nói
        # Định dạng 1: [Tên]: Nội dung
        match1 = re.match(r"^\[([^\]]+)\]\s*:\s*(.*)$", clean_line)
        if match1:
            speaker = match1.group(1).replace("*", "").replace("[", "").replace("]", "").strip()
            text = match1.group(2).strip()
            chunks.append({"speaker": speaker, "text": text, "start": None, "end": None})
            continue
            
        # Định dạng 2: **Tên**: Nội dung
        match2 = re.match(r"^\*\*([^*:]+)\*\*\s*:\s*(.*)$", clean_line)
        if match2:
            speaker = match2.group(1).strip()
            text = match2.group(2).strip()
            chunks.append({"speaker": speaker, "text": text, "start": None, "end": None})
            continue
            
        # Định dạng 3: Tên: Nội dung
        match3 = re.match(r"^([^:]+)\s*:\s*(.*)$", clean_line)
        if match3 and "[" not in match3.group(1):
            speaker = match3.group(1).replace("*", "").replace("[", "").replace("]", "").strip()
            text = match3.group(2).strip()
            chunks.append({"speaker": speaker, "text": text, "start": None, "end": None})
            continue
            
        # Fallback: nếu dòng không khớp định dạng nào, cộng dồn vào chunk trước đó
        if chunks:
            chunks[-1]["text"] += "\n" + clean_line.strip()
        else:
            chunks.append({"speaker": "Người nói", "text": clean_line.strip(), "start": None, "end": None})
 
    print(f"[STT-GEMINI] Total characters: {len(result_text)}, Total chunks: {len(chunks)}")
    return {
        "full_text": dialogue_text,
        "chunks": chunks
    }

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
