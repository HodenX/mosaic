"""Fund-level MCP tools — query individual fund details and NAV history."""

import datetime

from sqlmodel import Session, select

from app.database import engine
from app.models import Fund, FundAllocation, FundNavHistory, FundTopHolding


def get_fund_detail(fund_code: str) -> str:
    """获取单只基金的详细信息，包含基本信息、资产配置、重仓股，一次性返回。

    Args:
        fund_code: 基金代码，如 "012414"
    """
    with Session(engine) as session:
        fund = session.get(Fund, fund_code)
        if not fund:
            return f"未找到基金代码「{fund_code}」的记录。请确认代码是否正确，或该基金是否已添加到持仓中。"

        # Latest NAV
        nav_record = session.exec(
            select(FundNavHistory)
            .where(FundNavHistory.fund_code == fund_code)
            .order_by(FundNavHistory.date.desc())
            .limit(1)
        ).first()

        lines = [
            f"## {fund.fund_name} ({fund.fund_code})\n",
            f"| 字段 | 信息 |",
            f"|------|------|",
            f"| 基金代码 | {fund.fund_code} |",
            f"| 基金名称 | {fund.fund_name} |",
            f"| 基金类型 | {fund.fund_type} |",
            f"| 管理公司 | {fund.management_company} |",
            f"| 最后更新 | {fund.last_updated or 'N/A'} |",
        ]
        if nav_record:
            lines.append(f"| 最新净值 | {nav_record.nav:.4f} ({nav_record.date}) |")

        # Allocations
        for dim, dim_label in [("asset_class", "资产类别"), ("sector", "行业"), ("geography", "地域")]:
            allocs = session.exec(
                select(FundAllocation)
                .where(FundAllocation.fund_code == fund_code)
                .where(FundAllocation.dimension == dim)
                .order_by(FundAllocation.percentage.desc())
            ).all()
            if allocs:
                # Use latest report_date only
                latest_date = max((a.report_date for a in allocs if a.report_date), default=None)
                if latest_date:
                    allocs = [a for a in allocs if a.report_date == latest_date]
                lines.append(f"\n### {dim_label}配置")
                lines.append(f"| {dim_label} | 占比 |")
                lines.append(f"|--------|------|")
                for a in sorted(allocs, key=lambda x: -x.percentage):
                    lines.append(f"| {a.category} | {a.percentage:.1f}% |")

        # Top holdings
        top = session.exec(
            select(FundTopHolding)
            .where(FundTopHolding.fund_code == fund_code)
            .order_by(FundTopHolding.percentage.desc())
        ).all()
        if top:
            lines.append(f"\n### 重仓股（前{len(top)}名）")
            lines.append("| 股票代码 | 股票名称 | 占比 |")
            lines.append("|---------|---------|------|")
            for t in top:
                lines.append(f"| {t.stock_code} | {t.stock_name} | {t.percentage:.2f}% |")

        return "\n".join(lines)


def get_fund_nav_history(fund_code: str, days: int = 90) -> str:
    """获取基金净值历史序列。

    Args:
        fund_code: 基金代码，如 "012414"
        days: 查看最近多少天的净值，默认90天
    """
    start_date = datetime.date.today() - datetime.timedelta(days=days)

    with Session(engine) as session:
        fund = session.get(Fund, fund_code)
        fund_name = fund.fund_name if fund else fund_code

        records = session.exec(
            select(FundNavHistory)
            .where(FundNavHistory.fund_code == fund_code)
            .where(FundNavHistory.date >= start_date)
            .order_by(FundNavHistory.date)
        ).all()

    if not records:
        return f"基金「{fund_name}」最近 {days} 天没有净值数据。"

    lines = [
        f"## {fund_name} ({fund_code}) 净值走势（最近 {days} 天）\n",
        "| 日期 | 净值 |",
        "|------|------|",
    ]
    for r in records:
        lines.append(f"| {r.date} | {r.nav:.4f} |")

    if len(records) >= 2:
        first, last = records[0], records[-1]
        change_pct = (last.nav - first.nav) / first.nav * 100
        sign = "+" if change_pct > 0 else ""
        lines.append(
            f"\n**区间涨幅**: {sign}{change_pct:.2f}% "
            f"({first.nav:.4f} → {last.nav:.4f})"
        )

    return "\n".join(lines)
