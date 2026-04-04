from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import get_settings


class Base(DeclarativeBase):
    pass


def make_engine():
    return create_engine(
        get_settings().database_url,
        pool_pre_ping=True,
        pool_recycle=3600,
        echo=False,
    )


engine = make_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
