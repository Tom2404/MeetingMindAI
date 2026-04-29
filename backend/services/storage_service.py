import os
import subprocess
import uuid

# Thư mục lưu trữ local thay cho S3
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")

# Đảm bảo thư mục tồn tại
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

def process_local_audio(audio_path: str, filename: str) -> str:
    """
    Xử lý:
    1. Dùng FFmpeg convert file audio thành chuẩn 16kHz, mono để Whisper đọc tốt nhất.
    2. Lưu file sau convert vào thư mục local 'backend/uploads/'.
    3. Trả về đường dẫn file local dạng chuỗi.
    """
    # Khởi tạo đường dẫn output chuẩn wav trên ổ cứng
    safe_filename = filename.replace(" ", "_").replace("/", "")
    final_filename = f"{uuid.uuid4().hex[:8]}_{safe_filename}.wav"
    processed_filepath = os.path.join(UPLOAD_DIR, final_filename)

    try:
        # Lệnh FFmpeg nâng cao: chuẩn hóa âm thanh cho STT chất lượng cao
        # - highpass=f=100: cắt tần số thấp (ồn phòng, tiếng quạt)
        # - lowpass=f=8000: giữ lại dải tần giọng nói (100Hz-8kHz)
        # - afftdn=nf=-20: khử nhiễu nền tự động (Adaptive FFT Denoiser)
        # - loudnorm: chuẩn hóa âm lượng theo tiêu chuẩn EBU R128 (tránh quá to/nhỏ)
        audio_filter = "highpass=f=100,lowpass=f=8000,afftdn=nf=-20,loudnorm=I=-16:TP=-1.5:LRA=11"
        command = [
            "ffmpeg",
            "-y",                          # Overwrite output files
            "-i", audio_path,
            "-af", audio_filter,           # Áp dụng bộ lọc âm thanh
            "-ar", "16000",                # 16kHz — tần số lý tưởng cho Whisper
            "-ac", "1",                    # Mono stream
            "-c:a", "pcm_s16le",           # Codec Audio: PCM signed 16-bit little-endian
            processed_filepath
        ]
        
        # Chạy lệnh
        subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)

        # Xóa file upload thô/tmp sau khi convert thành công (chỉ xóa khi FFmpeg OK)
        if os.path.exists(audio_path):
            os.remove(audio_path)

        # Trả về đường dẫn local trực tiếp (để fake URL)
        local_url = f"/uploads/{final_filename}"
        return local_url

    except subprocess.CalledProcessError as e:
        print(f"FFmpeg conversion error: {e.stderr}")
        raise RuntimeError("Không thể xử lý định dạng file âm thanh.")
    except Exception as e:
        print(f"Filesystem error: {str(e)}")
        raise RuntimeError("Không thể lưu file trên máy chủ.")

