import datetime
import logging
import re
import threading
import time

import akshare as ak
from sqlmodel import Session, select

from app.models import Fund, FundAllocation, FundNavHistory, FundTopHolding

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# TTL cache for ak.fund_name_em() — the full fund list rarely changes,
# so we cache it in memory and refresh every 4 hours at most.
# ---------------------------------------------------------------------------
_fund_list_cache_lock = threading.Lock()
_fund_list_cache: dict = {"df": None, "ts": 0.0}
_FUND_LIST_TTL = 4 * 3600  # 4 hours


def _get_fund_list():
    """Return the cached fund list DataFrame, refreshing if stale."""
    now = time.monotonic()
    with _fund_list_cache_lock:
        if _fund_list_cache["df"] is not None and now - _fund_list_cache["ts"] < _FUND_LIST_TTL:
            return _fund_list_cache["df"]

    # Fetch outside the lock to avoid blocking other threads
    df = ak.fund_name_em()
    with _fund_list_cache_lock:
        _fund_list_cache["df"] = df
        _fund_list_cache["ts"] = time.monotonic()
    return df


_QDII_GEOGRAPHY_KEYWORDS: list[tuple[list[str], str]] = [
    (["美国", "美股", "纳斯达克", "标普"], "美国"),
    (["港股", "恒生", "香港"], "中国香港"),
    (["日本", "日经", "东证"], "日本"),
    (["德国", "欧洲"], "欧洲"),
    (["全球", "MSCI"], "全球"),
]

# Approximate sector weights for major indices (based on public data, 2024-Q4).
# Used as fallback when eastmoney API has no industry data for QDII/index funds.
_INDEX_SECTOR_WEIGHTS: dict[str, list[tuple[str, float]]] = {
    "标普500": [
        ("信息技术", 32.4),
        ("金融", 13.5),
        ("医疗保健", 11.5),
        ("非必需消费品", 10.6),
        ("通信服务", 9.2),
        ("工业", 8.2),
        ("必需消费品", 5.8),
        ("能源", 3.3),
        ("公用事业", 2.5),
        ("房地产", 2.1),
        ("原材料", 1.9),
    ],
    "纳斯达克100": [
        ("信息技术", 49.5),
        ("通信服务", 15.8),
        ("非必需消费品", 14.2),
        ("医疗保健", 6.8),
        ("必需消费品", 4.5),
        ("工业", 4.3),
        ("公用事业", 1.2),
        ("能源", 0.5),
        ("金融", 0.4),
    ],
    "恒生指数": [
        ("金融", 35.8),
        ("信息技术", 27.5),
        ("非必需消费品", 10.2),
        ("房地产", 6.5),
        ("工业", 5.8),
        ("通信服务", 4.8),
        ("医疗保健", 3.5),
        ("能源", 3.2),
        ("公用事业", 1.8),
        ("必需消费品", 0.9),
    ],
    "日经225": [
        ("工业", 23.5),
        ("信息技术", 20.8),
        ("非必需消费品", 18.2),
        ("医疗保健", 9.8),
        ("通信服务", 7.5),
        ("原材料", 6.2),
        ("金融", 5.8),
        ("必需消费品", 4.5),
        ("房地产", 2.0),
        ("能源", 1.0),
        ("公用事业", 0.7),
    ],
    "中证主要消费": [
        ("食品饮料", 65.0),
        ("农林牧渔", 15.0),
        ("家用电器", 10.0),
        ("商贸零售", 5.0),
        ("纺织服饰", 3.0),
        ("其他", 2.0),
    ],
}

# Map fund name keywords to the index name in _INDEX_SECTOR_WEIGHTS
_FUND_NAME_TO_INDEX: list[tuple[list[str], str]] = [
    (["标普500", "标普 500", "S&P500", "S&P 500"], "标普500"),
    (["纳斯达克100", "纳斯达克 100", "纳指100", "NASDAQ100", "NASDAQ 100"], "纳斯达克100"),
    (["恒生指数", "恒生ETF", "恒指"], "恒生指数"),
    (["日经225", "日经 225", "日经指数"], "日经225"),
    (["中证主要消费"], "中证主要消费"),
]


def _infer_geography(fund_type: str, fund_name: str) -> str:
    """Infer geography from fund_type and fund_name (single-region fallback)."""
    is_overseas = (
        fund_type.startswith("QDII")
        or "海外" in fund_type
        or "QDII" in fund_name
    )
    if not fund_type or not is_overseas:
        return "中国"
    for keywords, geo in _QDII_GEOGRAPHY_KEYWORDS:
        for kw in keywords:
            if kw in fund_name:
                return geo
    return "海外（其他）"


# Keywords in benchmark components that map to a geography.
# Order matters: first match wins per component.
_BENCHMARK_GEO_KEYWORDS: list[tuple[list[str], str]] = [
    (["标普", "纳斯达克", "纳指", "罗素", "道琼斯", "S&P", "NASDAQ"], "美国"),
    (["恒生", "香港", "港股", "中证香港"], "中国香港"),
    (["日经", "东证", "TOPIX"], "日本"),
    (["DAX", "德国", "欧洲", "STOXX", "富时"], "欧洲"),
    (["MSCI全球", "全球"], "全球"),
    (["沪深", "中证", "上证", "深证", "创业板", "科创", "国证"], "中国"),
]

# Benchmark components matching these keywords are non-equity (cash/bond)
# and should be excluded from geography inference.
_BENCHMARK_SKIP_KEYWORDS = [
    "存款", "利率", "中债", "国债", "债券", "票据", "货币", "现金",
]


def _parse_benchmark_geography(benchmark: str) -> list[tuple[str, float]] | None:
    """Parse benchmark string into [(geography, weight), ...].

    Returns None if parsing fails or no equity components are found.
    Example input: "沪深300指数收益率*50%+中证香港300指数收益率*30%+中债总指数收益率*20%"
    Example output: [("中国", 62.5), ("中国香港", 37.5)]  (re-normalized after dropping bond)
    """
    if not benchmark:
        return None

    # Split on '+' or '＋' (fullwidth)
    parts = re.split(r"[+＋]", benchmark)

    geo_weights: list[tuple[str, float]] = []
    for part in parts:
        part = part.strip()
        if not part:
            continue

        # Skip non-equity components (cash, bonds)
        if any(kw in part for kw in _BENCHMARK_SKIP_KEYWORDS):
            continue

        # Extract percentage: look for *NN% or ×NN% or NN%
        m = re.search(r"[*×]\s*(\d+(?:\.\d+)?)\s*%", part)
        if not m:
            m = re.search(r"(\d+(?:\.\d+)?)\s*%", part)
        if not m:
            continue
        weight = float(m.group(1))

        # Match geography
        matched_geo = None
        for keywords, geo in _BENCHMARK_GEO_KEYWORDS:
            for kw in keywords:
                if kw in part:
                    matched_geo = geo
                    break
            if matched_geo:
                break
        if not matched_geo:
            continue

        geo_weights.append((matched_geo, weight))

    if not geo_weights:
        return None

    # Merge duplicate geographies
    merged: dict[str, float] = {}
    for geo, w in geo_weights:
        merged[geo] = merged.get(geo, 0.0) + w

    # Re-normalize to 100%
    total = sum(merged.values())
    if total <= 0:
        return None
    result = [(geo, round(w / total * 100, 2)) for geo, w in merged.items()]
    result.sort(key=lambda x: -x[1])
    return result


def fetch_fund_info(fund_code: str, session: Session, *, force: bool = False) -> Fund:
    """Fetch fund metadata from akshare and update database.

    If the fund already has a name in the DB, skip the remote call unless
    *force* is True.
    """
    fund = session.get(Fund, fund_code)
    if not fund:
        fund = Fund(fund_code=fund_code)

    # Skip expensive remote call when we already have the name
    if not force and fund.fund_name and fund.fund_type:
        return fund

    try:
        df = _get_fund_list()
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


def _match_index_name(fund_name: str) -> str | None:
    """Return the index key if the fund name matches a known index, else None."""
    for keywords, index_name in _FUND_NAME_TO_INDEX:
        for kw in keywords:
            if kw in fund_name:
                return index_name
    return None


def _apply_index_sector_fallback(fund_code: str, index_name: str, session: Session) -> None:
    """Write pre-defined index sector weights as fallback allocation data."""
    weights = _INDEX_SECTOR_WEIGHTS.get(index_name)
    if not weights:
        return

    # Clear old auto records for sector
    old = session.exec(
        select(FundAllocation)
        .where(FundAllocation.fund_code == fund_code)
        .where(FundAllocation.dimension == "sector")
        .where(FundAllocation.source == "auto")
    ).all()
    for o in old:
        session.delete(o)

    for category, percentage in weights:
        session.add(FundAllocation(
            fund_code=fund_code,
            dimension="sector",
            category=category,
            percentage=percentage,
            source="auto",
        ))


def _fetch_sector_allocation(fund_code: str, session: Session) -> None:
    """Fetch sector/industry allocation."""
    current_year = str(datetime.date.today().year)
    prev_year = str(datetime.date.today().year - 1)
    fetched = False
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
                    fetched = True
                    break
            except Exception:
                continue
    except Exception:
        pass

    # Fallback: use pre-defined index sector weights for known QDII/index funds
    if not fetched:
        fund = session.get(Fund, fund_code)
        if fund and fund.fund_name:
            index_name = _match_index_name(fund.fund_name)
            if index_name:
                _apply_index_sector_fallback(fund_code, index_name, session)


def _fetch_geography_allocation(fund_code: str, session: Session) -> None:
    """Infer geography allocation from benchmark or fund metadata."""
    fund = session.get(Fund, fund_code)
    if not fund:
        return

    # Clear old auto records for geography
    old = session.exec(
        select(FundAllocation)
        .where(FundAllocation.fund_code == fund_code)
        .where(FundAllocation.dimension == "geography")
        .where(FundAllocation.source == "auto")
    ).all()
    for o in old:
        session.delete(o)

    # Try parsing benchmark from akshare first
    geo_splits = None
    try:
        df = ak.fund_overview_em(symbol=fund_code)
        if not df.empty:
            benchmark = str(df.iloc[0].get("业绩比较基准", ""))
            geo_splits = _parse_benchmark_geography(benchmark)
    except Exception:
        pass

    if geo_splits:
        for geo, pct in geo_splits:
            session.add(FundAllocation(
                fund_code=fund_code,
                dimension="geography",
                category=geo,
                percentage=pct,
                source="auto",
            ))
    else:
        # Fallback: single-region inference from fund type/name
        geography = _infer_geography(fund.fund_type or "", fund.fund_name or "")
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
