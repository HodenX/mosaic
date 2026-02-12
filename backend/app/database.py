from pathlib import Path

from sqlmodel import SQLModel, Session, create_engine

from app import models  # noqa: F401

_project_root = Path(__file__).resolve().parent.parent.parent
_db_path = _project_root / "data" / "finance.db"
_db_path.parent.mkdir(parents=True, exist_ok=True)

DATABASE_URL = f"sqlite:///{_db_path}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
