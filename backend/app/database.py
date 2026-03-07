from pathlib import Path

from sqlmodel import SQLModel, Session, create_engine
from sqlalchemy import event, inspect, text

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


def migrate_fund_tags(engine):
    """迁移基金标签字段到数据库"""
    with engine.connect() as conn:
        inspector = inspect(engine)
        columns = [c['name'] for c in inspector.get_columns('funds')]

        if 'index_type' not in columns:
            conn.execute(text("ALTER TABLE funds ADD COLUMN index_type TEXT"))
            conn.commit()
        if 'region' not in columns:
            conn.execute(text("ALTER TABLE funds ADD COLUMN region TEXT"))
            conn.commit()


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
    migrate_fund_tags(engine)


def get_session():
    with Session(engine) as session:
        yield session
