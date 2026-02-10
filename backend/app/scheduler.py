from apscheduler.schedulers.background import BackgroundScheduler
from sqlmodel import Session, select

from app.database import engine
from app.models import Holding
from app.services.fund_data import fetch_fund_nav
from app.services.snapshot import take_portfolio_snapshot


def _daily_update():
    with Session(engine) as session:
        holdings = session.exec(select(Holding)).all()
        fund_codes = set(h.fund_code for h in holdings)

        for code in fund_codes:
            try:
                fetch_fund_nav(code, session)
            except Exception:
                pass

        take_portfolio_snapshot(session)


scheduler = BackgroundScheduler()
scheduler.add_job(_daily_update, "cron", hour=20, minute=0)
