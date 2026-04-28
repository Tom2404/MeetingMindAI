from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
import os

# Cấu hình kết nối CSDL (Đã chuyển sang SQLite Local File để không cần cài phần mềm thứ 3)
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./meetingmind.db")

# Đối với SQLite cần thêm check_same_thread=False
engine = create_engine(DATABASE_URL, echo=False, connect_args={"check_same_thread": False})

# SessionLocal dùng để thực hiện các query database trong request
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base model cho SQLAlchemy
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
