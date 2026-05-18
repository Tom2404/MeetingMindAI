# Plan: Meeting Recording & Summary - STT Streaming

**Source PRD**: .claude/prds/meeting-recording-summary.prd.md
**Selected Milestone**: Milestone 2 (Speech-to-Text Streaming)
**Complexity**: Medium

## Summary
Triển khai tính năng bóc băng giọng nói theo thời gian thực (realtime streaming) thông qua WebSockets. Hệ thống sẽ giới hạn thời lượng ghi âm là 30 phút, nhận từng đoạn (chunk) âm thanh từ Frontend, đưa vào hàng đợi in-memory và sử dụng mô hình `faster-whisper` để bóc băng (STT), sau đó gửi trả ngay kết quả văn bản về giao diện.

## Patterns to Mirror
| Category | Source | Pattern |
|---|---|---|
| Naming & WebSockets | `backend/routers/websocket_router.py:67` | Sử dụng APIRouter, WebSocketEndpoint, in-memory Queue và Background Tasks. |
| STT Configuration | `backend/services/stt_service.py:42` | Khởi tạo mô hình Faster-Whisper thông qua pattern singleton, tái sử dụng model trên luồng (worker). |
| Error Handling | `backend/routers/websocket_router.py` | Try/except WebSocketDisconnect và ngắt kết nối an toàn. |

## Files to Change
| File | Action | Why |
|---|---|---|
| `backend/routers/websocket_router.py` | UPDATE | Thay đổi mock STT (ở hàm `process_audio_queue`) thành xử lý buffer âm thanh thực và truyền vào STT service. |
| `backend/services/stt_service.py` | UPDATE | Thêm hàm `transcribe_audio_buffer` nhận mảng bytes thay vì file path để phục vụ xử lý realtime, giảm thiểu IO đĩa. |
| `frontend/src/components/AudioRecorder.jsx` | CREATE | Giao diện Component thực hiện ghi âm từ Web Audio API, kết nối WebSocket và đếm giới hạn 30 phút. |
| `frontend/src/App.jsx` | UPDATE | Tích hợp giao diện `AudioRecorder` vào ứng dụng chính. |

## Tasks
### Task 1: Phát triển Backend Realtime STT Logic
- **Action**: Mở rộng `stt_service.py` để bổ sung khả năng xử lý audio trên bộ nhớ (bytes buffer) thông qua lib `av` hoặc `soundfile` + numpy rồi đưa thẳng vào hàm `.transcribe()`. Trong `websocket_router.py`, cập nhật `process_audio_queue` để tích lũy chunk trong 3-5 giây (buffer window) rồi gửi vào Whisper thay vì mô phỏng delay như hiện tại.
- **Mirror**: Logic worker trong `websocket_router.py`.
- **Validate**: Chạy unit test hoặc test script WebSocket đơn giản gửi file audio dummy và log được text trả về.

### Task 2: Implement quy định giới hạn 30 phút
- **Action**: Trên WebSocket router, duy trì một bộ đếm số lượng chunk hoặc timestamps. Ước tính số byte/giây dựa theo chuẩn thu âm (VD: 16kHz, mono, 16-bit = 32KB/s), nếu dung lượng/timeượt quá 30 phút thì tự động gửi cảnh báo và disconnect.
- **Mirror**: Cơ chế `manager.disconnect()` hiện có.
- **Validate**: Kiểm tra disconnect với cấu hình test (giả định 10 giây sẽ hết hạn).

### Task 3: Phát triển Giao diện Frontend (AudioRecorder)
- **Action**: Tạo file `AudioRecorder.jsx` trong frontend. Sử dụng API `MediaRecorder` để thu âm, thiết lập timeslice khoảng 1-2 giây để đẩy chunk data nhị phân (`Blob.arrayBuffer`) vào WebSocket kết nối tới `/api/v1/meetings/{id}/stream`. Cập nhật state text liên tục khi WebSocket trả về message.
- **Mirror**: React conventions (hooks `useState`, `useEffect`, `useRef`).
- **Validate**: Bấm "Record" trên UI, nói vào mic và nhìn thấy văn bản chạy ra trên màn hình. Giao diện tự động ngắt nếu thời gian đếm trên UI đạt 30 phút.

## Validation
```bash
npm start
# Mở trình duyệt, vào trang chủ Frontend, bấm ghi âm và kiểm tra kết quả trực tiếp từ console và UI.
```

## Risks
| Risk | Likelihood | Mitigation |
|---|---|---|
| STT Model không theo kịp realtime do cấu hình máy | High | Đẩy nhanh quá trình bằng cách chỉnh `compute_type="int8"` hoặc dùng model `tiny`/`base` cho quá trình streaming, file toàn văn xử lý lại bằng `large-v3` sau. Tích lũy buffer 3-5 giây rồi xử lý một cục thay vì xử lý quá nhiều chunk nhỏ. |
| Xung đột buffer âm thanh bị cắt đứt giữa các từ | Medium | Whisper có param `condition_on_previous_text` và tuỳ chọn `vad_filter`, tận dụng để không dịch khi đang giữa chừng chữ. Cân nhắc dùng vad silences cắt chunk. |

## Acceptance
- [ ] Backend xử lý chunk audio từ WebSocket thành text.
- [ ] Giao diện Web thu âm và hiển thị chữ được cập nhật trực tiếp.
- [ ] Giới hạn 30 phút được tuân thủ đúng ở cả client và server.
- [ ] Các patterns hiện hành (ConnectionManager, STT model singleton) được tôn trọng.
