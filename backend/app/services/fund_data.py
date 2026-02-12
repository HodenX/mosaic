import datetime

import akshare as ak
from sqlmodel import Session, select

from app.models import Fund, FundAllocation, FundNavHistory, FundTopHolding


_QDII_GEOGRAPHY_KEYWORDS: list[tuple[list[str], str]] = [
    (["美国", "美股", "纳斯达克", "标普"], "美国"),
    (["港股", "恒生", "香港"], "中国香港"),
    (["日本", "日经", "东证"], "日本"),
    (["德国", "欧洲"], "欧洲"),
    (["全球", "MSCI"], "全球"),
]


def _infer_geography(fund_type: str, fund_name: str) -> str:
    """Infer geography from fund_type and fund_name."""
    if not fund_type or not fund_type.startswith("QDII"):
        return "中国"
    for keywords, geo in _QDII_GEOGRAPHY_KEYWORDS:
        for kw in keywords:
            if kw in fund_name:
                return geo
    return "海外（其他）"


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


def fetch_fund_allocation(fund_code: str, session: Session) -> None:
    """Fetch asset allocation and top holdings from akshare."""
    _fetch_asset_class_allocation(fund_code, session)
    _fetch_sector_allocation(fund_code, session)
    _fetch_geography_allocation(fund_code, session)
    _fetch_top_holdings(fund_code, session)
    session.commit()


def _recent_quarter_dates() -> list[str]:
    """Return recent quarter-end dates as strings like '20241231'."""
    today = datetime.date.today()
    quarters = []
    year = today.year
    for q_month, q_day in [(12, 31), (9, 30), (6, 30), (3, 31)]:
        d = datetime.date(year, q_month, q_day)
        if d <= today:
            quarters.append(d.strftime("%Y%m%d"))
    for q_month, q_day in [(12, 31), (9, 30), (6, 30), (3, 31)]:
        quarters.append(datetime.date(year - 1, q_month, q_day).strftime("%Y%m%d"))
    return quarters


def _fetch_asset_class_allocation(fund_code: str, session: Session) -> None:
    """Fetch asset class allocation (股票/债券/现金/其他) from xueqiu."""
    try:
        df = ak.fund_individual_detail_hold_xq(symbol=fund_code)
        if df.empty:
            return

        # Clear old auto records for asset_class
        old = session.exec(
            select(FundAllocation)
            .where(FundAllocation.fund_code == fund_code)
            .where(FundAllocation.dimension == "asset_class")
            .where(FundAllocation.source == "auto")
        ).all()
        for o in old:
            session.delete(o)

        for _, row in df.iterrows():
            session.add(FundAllocation(
                fund_code=fund_code,
                dimension="asset_class",
                category=str(row["资产类型"]),
                percentage=float(row["仓位占比"]),
                source="auto",
            ))
    except Exception:
        pass


def _fetch_sector_allocation(fund_code: str, session: Session) -> None:
    """Fetch sector/industry allocation."""
    current_year = str(datetime.date.today().year)
    prev_year = str(datetime.date.today().year - 1)
    try:
        for year in [current_year, prev_year]:
            try:
                df = ak.fund_portfolio_industry_allocation_em(symbol=fund_code, date=year)
                if not df.empty:
                    # Clear old auto records
                    old = session.exec(
                        select(FundAllocation)
                        .where(FundAllocation.fund_code == fund_code)
                        .where(FundAllocation.dimension == "sector")
                        .where(FundAllocation.source == "auto")
                    ).all()
                    for o in old:
                        session.delete(o)

                    # Only keep the latest quarter's data (df is sorted by date descending)
                    latest_date = df.iloc[0]["截止时间"] if "截止时间" in df.columns else None
                    if latest_date is not None:
                        recent = df[df["截止时间"] == latest_date]
                    else:
                        recent = df

                    for _, row in recent.iterrows():
                        report_date_str = str(row.get("截止时间", ""))
                        report_date_val = None
                        if report_date_str:
                            try:
                                report_date_val = datetime.date.fromisoformat(report_date_str)
                            except ValueError:
                                pass
                        session.add(FundAllocation(
                            fund_code=fund_code,
                            dimension="sector",
                            category=str(row["行业类别"]),
                            percentage=float(row["占净值比例"]),
                            source="auto",
                            report_date=report_date_val,
                        ))
                    break
            except Exception:
                continue
    except Exception:
        pass


def _fetch_geography_allocation(fund_code: str, session: Session) -> None:
    """Infer geography allocation from fund metadata and store it."""
    fund = session.get(Fund, fund_code)
    if not fund:
        return

    geography = _infer_geography(fund.fund_type or "", fund.fund_name or "")

    # Clear old auto records for geography
    old = session.exec(
        select(FundAllocation)
        .where(FundAllocation.fund_code == fund_code)
        .where(FundAllocation.dimension == "geography")
        .where(FundAllocation.source == "auto")
    ).all()
    for o in old:
        session.delete(o)

    session.add(FundAllocation(
        fund_code=fund_code,
        dimension="geography",
        category=geography,
        percentage=100.0,
        source="auto",
    ))


def _fetch_top_holdings(fund_code: str, session: Session) -> None:
    """Fetch top stock holdings."""
    current_year = str(datetime.date.today().year)
    prev_year = str(datetime.date.today().year - 1)
    try:
        for year in [current_year, prev_year]:
            try:
                df = ak.fund_portfolio_hold_em(symbol=fund_code, date=year)
                if not df.empty:
                    # Clear old records
                    old = session.exec(
                        select(FundTopHolding).where(FundTopHolding.fund_code == fund_code)
                    ).all()
                    for o in old:
                        session.delete(o)

                    # Only save top 10 from the most recent quarter
                    latest_quarter = df.iloc[0]["季度"] if "季度" in df.columns else ""
                    recent = df[df["季度"] == latest_quarter].head(10) if latest_quarter else df.head(10)

                    for _, row in recent.iterrows():
                        session.add(FundTopHolding(
                            fund_code=fund_code,
                            stock_code=str(row["股票代码"]),
                            stock_name=str(row["股票名称"]),
                            percentage=float(row["占净值比例"]),
                        ))
                    break
            except Exception:
                continue
    except Exception:
        pass
