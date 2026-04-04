"""SQLAlchemy 引擎与会话。"""

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import get_settings


class Base(DeclarativeBase):
    pass


def _engine_url() -> str:
    url = get_settings().database_url
    if url.startswith("sqlite"):
        return url
    return url


engine = create_engine(
    _engine_url(),
    connect_args={"check_same_thread": False} if _engine_url().startswith("sqlite") else {},
    pool_pre_ping=True,
    pool_recycle=3600,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
