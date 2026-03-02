from pathlib import Path

from sqlmodel import SQLModel, Session, create_engine
from sqlalchemy import event, text

from app import models  # noqa: F401

_project_root = Path(__file__).resolve().parent.parent.parent
_db_path = _project_root / "data" / "finance.db"
_db_path.parent.mkdir(parents=True, exist_ok=True)

DATABASE_URL = f"sqlite:///{_db_path}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False, "timeout": 30},
)


@event.listens_for(engine, "connect")
def _set_wal_mode(dbapi_conn, _):
    dbapi_conn.execute("PRAGMA journal_mode=WAL")


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
