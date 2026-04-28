import os
from faster_whisper import WhisperModel

# ==============================================================================
# CẤU HÌNH STT — Ưu tiên độ chính xác cao nhất
# ==============================================================================
# Model size: large-v3 là model chính xác nhất của Whisper
#   - base:    ~74MB  — Nhanh, độ chính xác thấp (~60-70% tiếng Việt)
#   - medium:  ~1.5GB — Cân bằng tốc độ/chất lượng
#   - large-v2:~3GB  — Rất tốt
#   - large-v3:~3GB  — TỐT NHẤT, chính xác nhất cho tiếng Việt (khuyến nghị)
MODEL_SIZE = "large-v3"

# Ngôn ngữ chính — Khai báo tường minh để tránh model nhận diện sai
# "vi" = Tiếng Việt | "en" = English | None = auto-detect (kém chính xác hơn)
LANGUAGE = "vi"

# Ngữ cảnh gợi ý cho Whisper — Giúp model nhận diện thuật ngữ cuộc họp tốt hơn
INITIAL_PROMPT = (
    "Đây là bản ghi âm cuộc họp. Nội dung thảo luận về "
    "tiến độ dự án, phân công công việc, kết quả báo cáo, kế hoạch kinh doanh. "
    "Các từ chuyên ngành: deadline, sprint, KPI, OKR, feedback, review."
)

# Khởi tạo instance Whisper toàn cục, lazy-load khi cần
_model = None

def get_model():
    global _model
    if _model is None:
        print(f"[STT-LOCAL] Đang tải model Faster Whisper '{MODEL_SIZE}'...")
        print(f"[STT-LOCAL] ⚠️  Model '{MODEL_SIZE}' cần ~3GB RAM. Vui lòng chờ lần đầu tải...")
        # int8: lượng tử hóa 8-bit → giảm RAM 50%, tốc độ nhanh hơn trên CPU
        # Nếu có GPU NVIDIA CUDA: đổi device="cuda", compute_type="float16" để nhanh hơn 10-15x
        _model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")
        print(f"[STT-LOCAL] ✅ Model '{MODEL_SIZE}' đã sẵn sàng.")
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

    print(f"[STT-LOCAL] Bắt đầu bóc băng: {audio_path}")

    segments, info = model.transcribe(
        audio_path,
        language=LANGUAGE,
        initial_prompt=INITIAL_PROMPT,
        beam_size=10,                  # Tăng từ 5 → 10: tìm kiếm rộng hơn, chính xác hơn
        best_of=5,                     # Lấy kết quả tốt nhất trong 5 lần thử (cho sampling)
        temperature=0.0,               # Dùng decoding xác định (không random) → ổn định nhất
        vad_filter=True,               # Lọc khoảng im lặng/tiếng ồn nền
        vad_parameters=dict(
            min_silence_duration_ms=300,   # Khoảng im lặng tối thiểu để cắt segment
            speech_pad_ms=200,             # Thêm biên đệm để không cắt đứt câu
        ),
        condition_on_previous_text=True,   # Dùng context đoạn trước → liên kết câu tốt hơn
        word_timestamps=True,              # Bật timestamps từng chữ (hữu ích cho debug)
        log_prob_threshold=-1.0,           # Chấp nhận segment có log prob thấp (không bỏ sót)
        no_speech_threshold=0.6,           # Ngưỡng: segment nào >60% khả năng là "tiếng ồn" → bỏ qua
    )

    print(f"[STT-LOCAL] ✅ Nhận diện ngôn ngữ: '{info.language}' (độ tin cậy: {info.language_probability:.2%})")

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
        print(f"[STT-LOCAL] 🔕 Đã loại bỏ {skipped} segment nhiễu/im lặng")

    final_text = " ".join(valid_segments)
    print(f"[STT-LOCAL] 📝 Tổng số ký tự bóc được: {len(final_text)}")

    return final_text
