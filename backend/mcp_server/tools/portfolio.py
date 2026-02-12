"""Portfolio-level MCP tools — read-only queries on the user's fund portfolio."""

import datetime

from sqlmodel import Session, select

from app.database import engine
from app.models import Fund, FundNavHistory, Holding, PortfolioSnapshot
from app.services.allocation import get_weighted_allocation


def _fmt_money(v: float) -> str:
    return f"¥{v:,.2f}"


def _fmt_pct(v: float) -> str:
    sign = "+" if v > 0 else ""
    return f"{sign}{v:.2f}%"


def _get_latest_nav(fund_code: str, session: Session) -> tuple[float | None, datetime.date | None]:
    record = session.exec(
        select(FundNavHistory)
        .where(FundNavHistory.fund_code == fund_code)
        .order_by(FundNavHistory.date.desc())
        .limit(1)
    ).first()
    if record:
        return record.nav, record.date
    return None, None


def get_portfolio_summary() -> str:
    """获取基金组合总览：总市值、总成本、总盈亏、盈亏比例。"""
    with Session(engine) as session:
        holdings = session.exec(select(Holding)).all()
        if not holdings:
            return "当前没有任何持仓记录。"

        total_value = 0.0
        total_cost = 0.0
        for h in holdings:
            total_cost += h.shares * h.cost_price
            nav, _ = _get_latest_nav(h.fund_code, session)
            if nav:
                total_value += h.shares * nav

        total_pnl = total_value - total_cost
        pnl_pct = (total_pnl / total_cost * 100) if total_cost else 0

        fund_count = len(set(h.fund_code for h in holdings))
        platform_count = len(set(h.platform for h in holdings))

        return (
            f"## 基金组合总览\n\n"
            f"| 指标 | 数值 |\n"
            f"|------|------|\n"
            f"| 总市值 | {_fmt_money(total_value)} |\n"
            f"| 总成本 | {_fmt_money(total_cost)} |\n"
            f"| 总盈亏 | {_fmt_money(total_pnl)} ({_fmt_pct(pnl_pct)}) |\n"
            f"| 持有基金数 | {fund_count} 只 |\n"
            f"| 平台数 | {platform_count} 个 |\n"
        )


def get_holdings(platform: str | None = None) -> str:
    """获取全部持仓明细，含最新净值和盈亏。可按平台筛选。

    Args:
        platform: 可选，按平台名称筛选（如"天天基金"、"蚂蚁财富"）
    """
    with Session(engine) as session:
        query = select(Holding)
        if platform:
            query = query.where(Holding.platform == platform)
        holdings = session.exec(query).all()

        if not holdings:
            msg = f"平台「{platform}」上没有持仓记录。" if platform else "当前没有任何持仓记录。"
            return msg

        lines = ["## 持仓明细\n"]
        if platform:
            lines.append(f"筛选平台: {platform}\n")
        lines.append("| 基金代码 | 基金名称 | 平台 | 份额 | 成本价 | 最新净值 | 市值 | 盈亏 | 盈亏% | 购买日期 |")
        lines.append("|---------|---------|------|------|-------|---------|------|------|------|---------|")

        total_value = 0.0
        total_cost = 0.0

        for h in holdings:
            fund = session.get(Fund, h.fund_code)
            fund_name = fund.fund_name if fund else h.fund_code
            nav, nav_date = _get_latest_nav(h.fund_code, session)
            cost = h.shares * h.cost_price
            total_cost += cost

            if nav:
                mv = h.shares * nav
                total_value += mv
                pnl = mv - cost
                pnl_pct = (pnl / cost * 100) if cost else 0
                lines.append(
                    f"| {h.fund_code} | {fund_name} | {h.platform} | "
                    f"{h.shares:.2f} | {h.cost_price:.4f} | {nav:.4f} | "
                    f"{_fmt_money(mv)} | {_fmt_money(pnl)} | {_fmt_pct(pnl_pct)} | {h.purchase_date} |"
                )
            else:
                lines.append(
                    f"| {h.fund_code} | {fund_name} | {h.platform} | "
                    f"{h.shares:.2f} | {h.cost_price:.4f} | N/A | "
                    f"N/A | N/A | N/A | {h.purchase_date} |"
                )

        total_pnl = total_value - total_cost
        pnl_pct = (total_pnl / total_cost * 100) if total_cost else 0
        lines.append(f"\n**合计**: 市值 {_fmt_money(total_value)} | 成本 {_fmt_money(total_cost)} | 盈亏 {_fmt_money(total_pnl)} ({_fmt_pct(pnl_pct)})")

        return "\n".join(lines)


def get_platform_breakdown() -> str:
    """获取按平台汇总的持仓数据：每个平台的市值、成本、盈亏、基金数量。"""
    with Session(engine) as session:
        holdings = session.exec(select(Holding)).all()
        if not holdings:
            return "当前没有任何持仓记录。"

        platforms: dict[str, dict] = {}
        for h in holdings:
            nav, _ = _get_latest_nav(h.fund_code, session)
            mv = h.shares * nav if nav else 0
            cost = h.shares * h.cost_price
            if h.platform not in platforms:
                platforms[h.platform] = {"market_value": 0.0, "cost": 0.0, "count": 0}
            platforms[h.platform]["market_value"] += mv
            platforms[h.platform]["cost"] += cost
            platforms[h.platform]["count"] += 1

        lines = [
            "## 平台持仓分布\n",
            "| 平台 | 市值 | 成本 | 盈亏 | 基金数 |",
            "|------|------|------|------|--------|",
        ]
        for name, data in sorted(platforms.items(), key=lambda x: -x[1]["market_value"]):
            pnl = data["market_value"] - data["cost"]
            lines.append(
                f"| {name} | {_fmt_money(data['market_value'])} | "
                f"{_fmt_money(data['cost'])} | {_fmt_money(pnl)} | {data['count']} |"
            )

        return "\n".join(lines)


def get_portfolio_allocation(dimension: str = "asset_class") -> str:
    """获取组合加权资产配置，支持按资产类别、行业、地域三个维度查看。

    Args:
        dimension: 配置维度，可选值：asset_class（资产类别）、sector（行业）、geography（地域）
    """
    valid = {"asset_class", "sector", "geography"}
    if dimension not in valid:
        return f"无效维度「{dimension}」，可选值: {', '.join(valid)}"

    dim_labels = {"asset_class": "资产类别", "sector": "行业", "geography": "地域"}
    label = dim_labels[dimension]

    with Session(engine) as session:
        result = get_weighted_allocation(dimension, session)

    items = result["items"]
    coverage = result["coverage"]

    if not items:
        return f"没有{label}配置数据。"

    lines = [
        f"## 组合{label}配置\n",
        f"| {label} | 占比 | 贡献基金 |",
        f"|--------|------|---------|",
    ]
    for item in items:
        funds_str = ", ".join(f"{f['fund_name']}({f['percentage']:.1f}%)" for f in item.get("funds", [])[:3])
        lines.append(f"| {item['category']} | {item['percentage']:.1f}% | {funds_str} |")

    cov = coverage
    lines.append(
        f"\n**覆盖率**: {cov['covered_funds']}/{cov['total_funds']} 只基金 "
        f"({cov['covered_percent']:.1f}% 市值)"
    )
    if cov.get("missing_funds"):
        lines.append(f"**缺少数据**: {', '.join(cov['missing_funds'])}")

    return "\n".join(lines)


def get_portfolio_trend(days: int = 90) -> str:
    """获取组合历史走势（每日快照），包含总市值、总成本和盈亏。

    Args:
        days: 查看最近多少天的走势，默认90天
    """
    start_date = datetime.date.today() - datetime.timedelta(days=days)

    with Session(engine) as session:
        records = session.exec(
            select(PortfolioSnapshot)
            .where(PortfolioSnapshot.date >= start_date)
            .order_by(PortfolioSnapshot.date)
        ).all()

    if not records:
        return f"最近 {days} 天没有组合快照数据。"

    lines = [
        f"## 组合走势（最近 {days} 天）\n",
        "| 日期 | 总市值 | 总成本 | 盈亏 |",
        "|------|--------|--------|------|",
    ]

    for r in records:
        lines.append(
            f"| {r.date} | {_fmt_money(r.total_value)} | "
            f"{_fmt_money(r.total_cost)} | {_fmt_money(r.total_pnl)} |"
        )

    # Summary
    if len(records) >= 2:
        first, last = records[0], records[-1]
        change = last.total_value - first.total_value
        change_pct = (change / first.total_value * 100) if first.total_value else 0
        lines.append(
            f"\n**区间变化**: {_fmt_money(change)} ({_fmt_pct(change_pct)}) "
            f"| 从 {first.date} 到 {last.date}"
        )

    return "\n".join(lines)
