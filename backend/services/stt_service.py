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

def transcribe_audio_with_gemini(audio_path: str) -> dict:
    """
    Bóc băng audio → văn bản sử dụng Gemini 1.5 Flash.
    Hỗ trợ phân biệt người nói (Speaker Diarization) qua prompt.
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
    
    prompt = """Hãy nghe đoạn ghi âm này và bóc băng hội thoại chính xác từng từ  
    NHIỆM VỤ QUAN TRỌNG: 
    1. Hãy phân biệt các người nói khác nhau.
    2. Gắn nhãn họ là [Speaker 1], [Speaker 2], [Speaker 3], v.v. dựa trên giọng nói.
    3. Trả về nội dung theo định dạng chính xác như sau:
       [Speaker 1]: Nội dung người thứ nhất nói...
       [Speaker 2]: Nội dung người thứ hai nói...
       [Speaker 1]: Nội dung người thứ nhất nói tiếp...
    
    Chỉ trả về phần hội thoại đã được gán nhãn, không thêm lời chào, giải thích hay bình luận nào khác."""
    
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
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
            
    # Parse text thành các chunks hội thoại
    chunks = []
    # Regex tìm các đoạn [Speaker X]: Nội dung
    pattern = r"\[Speaker (\d+)\]:\s*(.*?)(?=\[Speaker \d+\]:|$)"
    matches = re.finditer(pattern, result_text, re.DOTALL)
    
    for match in matches:
        speaker_id = f"Người nói {match.group(1)}"
        text = match.group(2).strip()
        if text:
            chunks.append({
                "speaker": speaker_id,
                "text": text,
                "start": None,
                "end": None
            })

    # Nếu không parse được theo định dạng trên (Gemini trả về text thuần), bọc cả cục vào 1 chunk
    if not chunks:
        chunks = [{"speaker": "Người nói 1", "text": result_text, "start": None, "end": None}]

    print(f"[STT-GEMINI] Total characters: {len(result_text)}, Total chunks: {len(chunks)}")
    return {
        "full_text": result_text,
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
