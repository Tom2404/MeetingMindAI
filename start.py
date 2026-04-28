import subprocess
import os
import sys

def main():
    print("===========================================")
    print("       HỆ THỐNG MEETINGMIND AI (LOCAL)     ")
    print("===========================================")
    print("\nĐang khởi động Backend (FastAPI) và Frontend (React Vite)...")
    print("Trạng thái tải trang sẽ phụ thuộc vào vite, trình duyệt sẽ sớm tự động mở.")
    print("LUY Ý: Vui lòng KHÔNG đóng cửa sổ Terminal này trong suốt quá trình sử dụng hệ thống.\n")
    
    try:
        # Sử dụng shell=True trên Windows để npm có thể nhận diện đúng
        use_shell = True if sys.platform == 'win32' else False
        
        # Chạy lệnh npm start đã được cấu hình concurrently trong package.json
        subprocess.run(['npm', 'start'], shell=use_shell, check=True)
        
    except KeyboardInterrupt:
        print("\n[Hệ thống] Đang tiến hành đóng máy chủ...")
    except Exception as e:
        print(f"\n[Lỗi] Có lỗi xảy ra trong quá trình khởi động: {e}")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        pass
