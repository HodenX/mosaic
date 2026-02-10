import datetime

import akshare as ak
from sqlmodel import Session, select

from app.models import Fund, FundNavHistory


def fetch_fund_info(fund_code: str, session: Session) -> Fund:
    """Fetch fund metadata from akshare and update database."""
    fund = session.get(Fund, fund_code)
    if not fund:
        fund = Fund(fund_code=fund_code)

    try:
        df = ak.fund_name_em()
        row = df[df["基金代码"] == fund_code]
        if not row.empty:
            fund.fund_name = str(row.iloc[0]["基金简称"])
            fund.fund_type = str(row.iloc[0]["基金类型"])
    except Exception:
        pass

    fund.last_updated = datetime.datetime.now()
    session.add(fund)
    session.commit()
    session.refresh(fund)
    return fund


def fetch_fund_nav(fund_code: str, session: Session) -> None:
    """Fetch historical NAV data and store in database."""
    try:
        df = ak.fund_open_fund_info_em(symbol=fund_code, indicator="单位净值走势")
        for _, row in df.iterrows():
            nav_date = row["净值日期"]
            if isinstance(nav_date, str):
                nav_date = datetime.date.fromisoformat(nav_date)
            elif hasattr(nav_date, "date"):
                nav_date = nav_date.date()

            existing = session.get(FundNavHistory, (fund_code, nav_date))
            if not existing:
                record = FundNavHistory(
                    fund_code=fund_code,
                    date=nav_date,
                    nav=float(row["单位净值"]),
                )
                session.add(record)
        session.commit()
    except Exception:
        session.rollback()
