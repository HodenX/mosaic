"""MCP Server entry point — registers all tools, resources, and prompts for the finance assistant."""

import sys
from pathlib import Path

# Ensure the backend directory is on sys.path so `app.*` imports work
_backend_dir = Path(__file__).resolve().parent.parent
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

from fastmcp import FastMCP  # noqa: E402

# Initialize database tables (same as FastAPI startup)
from app.database import create_db_and_tables  # noqa: E402

create_db_and_tables()

# Import tools
from mcp_server.tools.portfolio import (  # noqa: E402
    get_holdings,
    get_platform_breakdown,
    get_portfolio_allocation,
    get_portfolio_summary,
    get_portfolio_trend,
)
from mcp_server.tools.fund import get_fund_detail, get_fund_nav_history  # noqa: E402
from mcp_server.tools.position import get_position_status, get_strategy_suggestion  # noqa: E402
from mcp_server.tools.market import (  # noqa: E402
    get_fund_realtime_nav,
    get_macro_indicators,
    get_market_indices,
)
from mcp_server.tools.buckets import (  # noqa: E402
    get_liquid_assets,
    get_stable_assets,
    get_insurance_policies,
    get_family_asset_summary,
)

# Import resources
from mcp_server.resources.overview import get_portfolio_overview  # noqa: E402

# Import prompts
from mcp_server.prompts.presets import (  # noqa: E402
    family_overview,
    macro_briefing,
    rebalance_advice,
    risk_check,
    weekly_review,
)

# ---------------------------------------------------------------------------
# Create FastMCP server
# ---------------------------------------------------------------------------

mcp = FastMCP(
    name="FolioPal 聚宝",
    instructions=(
        "你是一个个人理财助理。用户在「FolioPal 聚宝」应用中管理着自己的家庭财务，\n"
        "采用四桶规划体系：活钱（短期流动资金）、稳钱（中期保值）、长钱（长期增值基金组合）、保险（风险保障）。\n\n"
        "你可以查询的数据范围：\n"
        "- 长钱桶：基金持仓、组合配置、历史走势、单基金详情\n"
        "- 活钱桶：活期存款、货币基金等流动资产（get_liquid_assets）\n"
        "- 稳钱桶：定期存款、银行理财等中期资产（get_stable_assets）\n"
        "- 保险桶：家庭保单及续费信息（get_insurance_policies）\n"
        "- 全局总览：四桶汇总数据（get_family_asset_summary）\n"
        "- 市场行情与宏观经济指标\n\n"
        "基于这些数据，你可以帮用户做资产配置分析、风险评估、调仓建议和保障规划。\n\n"
        "注意事项：\n"
        "- 你只有只读权限，不能修改用户的持仓或预算\n"
        "- 所有投资建议仅供参考，用户需自行判断和操作\n"
        "- 回答使用中文，金额使用人民币（¥）\n"
        "- 先查数据再给建议，不要凭空猜测用户的持仓情况"
    ),
)

# ---------------------------------------------------------------------------
# Register tools
# ---------------------------------------------------------------------------

# Group 1: Portfolio (组合总览)
mcp.tool(get_portfolio_summary)
mcp.tool(get_holdings)
mcp.tool(get_platform_breakdown)
mcp.tool(get_portfolio_allocation)
mcp.tool(get_portfolio_trend)

# Group 2: Fund (单基金查询)
mcp.tool(get_fund_detail)
mcp.tool(get_fund_nav_history)

# Group 3: Position (仓位与策略)
mcp.tool(get_position_status)
mcp.tool(get_strategy_suggestion)

# Group 4: Market & Macro (市场与宏观)
mcp.tool(get_market_indices)
mcp.tool(get_fund_realtime_nav)
mcp.tool(get_macro_indicators)

# Group 5: Buckets (四桶资产)
mcp.tool(get_liquid_assets)
mcp.tool(get_stable_assets)
mcp.tool(get_insurance_policies)
mcp.tool(get_family_asset_summary)

# ---------------------------------------------------------------------------
# Register resources
# ---------------------------------------------------------------------------

@mcp.resource("finance://portfolio/overview", name="家庭资产概况", description="家庭资产四桶总览及基金组合详情，包含活钱、稳钱、长钱持仓、保险保障和待办提醒")
def portfolio_overview_resource() -> str:
    return get_portfolio_overview()

# ---------------------------------------------------------------------------
# Register prompts
# ---------------------------------------------------------------------------

mcp.prompt(weekly_review, name="weekly_review", description="每周投资回顾")
mcp.prompt(risk_check, name="risk_check", description="组合风险体检")
mcp.prompt(rebalance_advice, name="rebalance_advice", description="调仓建议分析")
mcp.prompt(macro_briefing, name="macro_briefing", description="宏观经济速览")
mcp.prompt(family_overview, name="family_overview", description="家庭资产全面检视")

# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    mcp.run()
