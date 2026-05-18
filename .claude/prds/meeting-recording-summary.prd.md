# Meeting Recording & Summary

## Problem
Người tham gia cuộc họp (quản lý dự án, thư ký, nhân viên) mất quá nhiều thời gian để ghi chép biên bản (meeting minutes) và dễ bỏ sót thông tin quan trọng do không thể vừa tập trung thảo luận vừa ghi chép đầy đủ. Việc nghe lại toàn bộ file ghi âm sau cuộc họp để gõ lại là một quá trình rất tốn thời gian.

## Evidence
- Assumption — needs validation via prototype. (Dựa trên sự thành công của các sản phẩm tương tự trên thị trường như Otter.ai, Fireflies.ai, Fathom).

## Users
- **Primary**: Quản lý dự án, Scrum Master, Thư ký, hoặc bất kỳ ai có nhiệm vụ tóm tắt, ghi chép và chia sẻ lại biên bản sau cuộc họp.
- **Not for**: Các cuộc họp có tính bảo mật tuyệt đối, không được phép ghi âm trên hệ thống.

## Hypothesis
We believe **tính năng ghi âm, bóc băng tự động bằng Faster-Whisper và tóm tắt bằng Google GenAI** will **giúp tiết kiệm 80% thời gian làm biên bản** for **những người điều hành/thư ký cuộc họp**.
We'll know we're right when **tính năng này được sử dụng thường xuyên trên hệ thống và người dùng có thể trích xuất biên bản ngay lập tức sau khi họp xong**.

## Success Metrics
| Metric | Target | How measured |
|---|---|---|
| Tỷ lệ lỗi nhận dạng từ (WER) | < 15% | Đánh giá thủ công trên các file test |
| Thời gian xử lý bóc băng | < 20% thời lượng file | System logs |
| Tỷ lệ chấp nhận bản tóm tắt | > 80% | Số lần người dùng lưu/chia sẻ tóm tắt mà ít phải chỉnh sửa |

## Scope
**MVP** — 
- Giao diện Frontend cho phép người dùng nhấn nút "Bắt đầu ghi âm" trên trình duyệt (có giới hạn tối đa 30 phút).
- Hệ thống gửi audio chunk qua WebSockets để hiển thị kết quả bóc băng theo thời gian thực (realtime streaming).
- Nút "Kết thúc", sau đó tải/kết thúc luồng file âm thanh lên backend FastAPI.
- Backend sử dụng `faster-whisper` để chuyển đổi giọng nói thành văn bản (Speech-to-Text).
- Backend sử dụng `google-genai` (Gemini) để tóm tắt đoạn văn bản vừa bóc băng và trích xuất Action Items.
- Giao diện hiển thị kết quả bao gồm văn bản chi tiết (transcript) và tóm tắt cuộc họp.

**Out of scope**
- Bot tự động tham gia các nền tảng họp trực tuyến như Zoom, Google Meet (đòi hỏi hạ tầng bot phức tạp).
- Dịch thuật trực tiếp (Real-time translation) khi đang nói.

## Delivery Milestones
<!-- Business outcomes, not engineering tasks. /plan turns each into a plan. -->
<!-- Status: pending | in-progress | complete -->

| # | Milestone | Outcome | Status | Plan |
|---|---|---|---|---|
| 1 | Audio Recording UI | Người dùng có thể ghi âm trực tiếp trên web và lưu/gửi file âm thanh. | pending | — |
| 2 | Speech-to-Text Streaming | Bóc băng thời gian thực qua WebSockets bằng `faster-whisper`. | in-progress | .claude/plans/meeting-recording-summary.plan.md |
| 3 | AI Summarization Endpoint | Hệ thống tạo bản tóm tắt và trích xuất Action Items từ text bằng `google-genai`. | pending | — |
| 4 | End-to-End Flow & UI Polish | Người dùng ghi âm, xem transcript, xem tóm tắt và có thể sao chép kết quả trên giao diện. | pending | — |

## Open Questions
- [x] ~~Chúng ta có cần hiển thị quá trình bóc băng theo thời gian thực (streaming) trên giao diện không, hay chỉ cần upload file sau khi ghi âm xong và đợi kết quả?~~ -> **Xác nhận: Cần hiển thị realtime streaming.**
- [x] ~~Kích thước file ghi âm tối đa hoặc thời lượng tối đa cho mỗi lần ghi âm là bao nhiêu để không làm quá tải RAM/VRAM của server?~~ -> **Xác nhận: Tối đa 30 phút/phiên ghi âm.**

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Bóc băng file dài mất nhiều thời gian dẫn đến timeout HTTP | High | High | Sử dụng WebSockets hoặc Background Tasks (với polling/Webhooks) để xử lý bất đồng bộ. |
| Microphone của thiết bị kém gây ảnh hưởng chất lượng STT | High | Medium | Bổ sung hướng dẫn người dùng sử dụng mic tốt hoặc có tính năng khử nhiễu cơ bản. |

---
*Status: IN PROGRESS — Milestone 2 is being planned and implemented.*
