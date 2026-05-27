export const DEFAULT_TEMPLATES = [
  {
    id: 'weekly-sync',
    name: 'Sync tuần (Weekly Sync)',
    category: 'Quản lý dự án',
    desc: 'Tối ưu cho họp giao ban, cập nhật tiến độ tuần, rào cản hiện tại và kế hoạch tiếp theo.',
    prompt: `Hãy đóng vai trò là thư ký chuyên nghiệp. Phân tích văn bản bóc băng cuộc họp Sync Tuần và trích xuất:
1. TIẾN ĐỘ THỰC TẾ: Các hạng mục đã hoàn thành trong tuần qua của từng người.
2. KHÓ KHĂN & RÀO CẢN: Vấn đề được nêu ra và cách giải quyết được thống nhất.
3. KẾ HOẠCH TUẦN TỚI: Action Items cụ thể cùng người chịu trách nhiệm và deadline rõ ràng.`
  },
  {
    id: 'brainstorming',
    name: 'Động não & Ý tưởng (Brainstorming)',
    category: 'Sáng tạo',
    desc: 'Tập trung ghi nhận toàn bộ ý tưởng sáng tạo độc đáo, thảo luận giải pháp và các bước triển khai thử nghiệm.',
    prompt: `Hãy đóng vai trò là chuyên gia phân tích sáng tạo. Phân tích văn bản bóc băng cuộc họp Brainstorming và trích xuất:
1. CHỦ ĐỀ CHÍNH: Vấn đề đang cần tìm ý tưởng giải quyết.
2. CÁC Ý TƯỞNG ĐÃ ĐỀ XUẤT: Danh sách các ý tưởng nổi bật kèm theo người đề xuất.
3. Ý TƯỞNG ĐƯỢC CHỌN THỬ NGHIỆM: Các ý tưởng khả thi nhất kèm lý do chọn.
4. BƯỚC ĐI TIẾP THEO: Phân công nghiên cứu sâu hoặc làm sản phẩm mẫu.`
  },
  {
    id: 'tech-design',
    name: 'Họp Kỹ thuật & Kiến trúc (Tech Design)',
    category: 'Kỹ thuật',
    desc: 'Trích xuất các quyết định cấu trúc, sơ đồ công nghệ, lựa chọn thư viện và kế hoạch refactor mã nguồn.',
    prompt: `Hãy đóng vai trò là Kiến trúc sư phần mềm trưởng. Phân tích văn bản bóc băng cuộc họp Kỹ thuật và trích xuất:
1. BỐI CẢNH & VẤN ĐỀ KỸ THUẬT: Những lỗi, điểm nghẽn hệ thống hoặc tính năng mới cần thiết kế.
2. CÁC PHƯƠNG ÁN ĐÃ THẢO LUẬN: Đánh giá ưu nhược điểm của từng phương án kiến trúc.
3. QUYẾT ĐỊNH CUỐI CÙNG: Phương án kỹ thuật được chốt, công nghệ/thư viện sử dụng.
4. KẾ HOẠCH TRIỂN KHAI: Từng bước coding, kiểm thử và phân chia module.`
  },
  {
    id: 'recruitment',
    name: 'Phỏng vấn Tuyển dụng (Interview)',
    category: 'Nhân sự',
    desc: 'Đánh giá kỹ năng ứng viên, điểm mạnh/yếu, câu hỏi thảo luận chính và ý kiến kết luận của hội đồng.',
    prompt: `Hãy đóng vai trò là Chuyên viên Nhân sự cấp cao. Phân tích văn bản bóc băng cuộc phỏng vấn tuyển dụng và trích xuất:
1. THÔNG TIN ỨNG VIÊN & VỊ TRÍ: Tên ứng viên, vị trí ứng tuyển.
2. ĐIỂM MẠNH NỔI BẬT: Kích thức kỹ thuật, kinh nghiệm thực tế, soft skills thể hiện tốt.
3. ĐIỂM CẦN LƯU Ý/YẾU: Các điểm ứng viên trả lời chưa tốt hoặc thiếu kinh nghiệm.
4. ĐÁNH GIÁ VĂN HÓA & THÁI ĐỘ: Sự phù hợp với môi trường làm việc của công ty.
5. ĐỀ XUẤT CUỐI CÙNG: Pass/Fail hoặc chuyển tiếp vòng sau.`
  },
  {
    id: 'sales-client',
    name: 'Tư vấn & Gặp gỡ Khách hàng (Sales Pitch)',
    category: 'Kinh doanh',
    desc: 'Trích xuất nhu cầu cụ thể của đối tác, các tính năng họ mong muốn, mức ngân sách thảo luận và các cam kết hỗ trợ.',
    prompt: `Hãy đóng vai trò là Giám đốc phát triển kinh doanh. Phân tích văn bản bóc băng cuộc họp với khách hàng và trích xuất:
1. NHU CẦU & NỖI ĐAU CỦA KHÁCH HÀNG: Vấn đề họ đang gặp phải trong kinh doanh hoặc vận hành.
2. GIẢI PHÁP ĐỀ XUẤT: Các tính năng và dịch vụ mà MeetingMind AI giới thiệu thuyết phục họ.
3. PHẢN HỒI CỦA KHÁCH HÀNG: Những e ngại về giá cả, thời gian triển khai hoặc yêu cầu đặc biệt.
4. HÀNH ĐỘNG SAU HỌP: Gửi báo giá chi tiết, demo kỹ thuật cùng thời gian cam kết.`
  }
];
