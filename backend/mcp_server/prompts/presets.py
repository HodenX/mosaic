"""Preset prompts for common financial analysis scenarios."""


def weekly_review() -> str:
    """每周投资回顾 — 自动拉取组合走势和持仓变化，生成周报式分析。"""
    return (
        "请帮我做一次每周投资回顾。请按以下步骤操作：\n\n"
        "1. 先调用 get_portfolio_summary 获取组合总览\n"
        "2. 调用 get_portfolio_trend(days=7) 查看本周走势\n"
        "3. 调用 get_holdings 获取各持仓明细\n"
        "4. 调用 get_market_indices 获取本周市场行情\n\n"
        "然后基于以上数据，帮我生成一份结构化的周报，包含：\n"
        "- **本周概要**: 组合整体表现（市值变化、盈亏变动）\n"
        "- **个基表现**: 各基金本周涨跌排名\n"
        "- **市场环境**: 主要指数走势及与我的组合的关联分析\n"
        "- **关注点**: 需要特别关注的风险或机会\n"
        "- **下周展望**: 基于当前持仓和市场环境的简要建议\n"
    )


def risk_check() -> str:
    """风险体检 — 分析行业集中度、地域集中度、单基金占比，给出风险提示。"""
    return (
        "请帮我做一次组合风险体检。请按以下步骤操作：\n\n"
        "1. 调用 get_portfolio_summary 获取总览\n"
        "2. 调用 get_portfolio_allocation(dimension='asset_class') 查看资产类别配置\n"
        "3. 调用 get_portfolio_allocation(dimension='sector') 查看行业配置\n"
        "4. 调用 get_portfolio_allocation(dimension='geography') 查看地域配置\n"
        "5. 调用 get_position_status 查看仓位状态\n\n"
        "然后基于以上数据，帮我进行风险分析，包含：\n"
        "- **集中度风险**: 单一基金/行业/地域是否过度集中（>30% 为高集中度）\n"
        "- **资产配置评估**: 股债比例是否合理（结合我的仓位目标区间）\n"
        "- **相关性风险**: 是否存在多只基金实质上持有相同底层资产\n"
        "- **风险评分**: 给出 1-10 的风险评分和理由\n"
        "- **改善建议**: 具体的分散化建议\n"
    )


def rebalance_advice() -> str:
    """调仓建议 — 结合仓位状态、策略建议、市场指数，给出操作建议。"""
    return (
        "请帮我分析是否需要调仓。请按以下步骤操作：\n\n"
        "1. 调用 get_position_status 查看仓位管理状态\n"
        "2. 调用 get_strategy_suggestion 获取策略建议\n"
        "3. 调用 get_portfolio_allocation(dimension='asset_class') 查看当前配置\n"
        "4. 调用 get_market_indices 获取市场行情\n"
        "5. 调用 get_holdings 查看各持仓表现\n\n"
        "然后基于以上数据，给出调仓建议：\n"
        "- **仓位评估**: 当前仓位是否在目标区间内，是否需要加仓/减仓\n"
        "- **策略信号**: 当前策略给出的信号是什么\n"
        "- **市场判断**: 当前市场环境是否适合调仓\n"
        "- **具体建议**: 如果需要调仓，具体操作什么（买入/卖出哪只、金额多少）\n"
        "- **风险提示**: 调仓的潜在风险\n"
    )


def macro_briefing() -> str:
    """宏观速览 — 拉取最新宏观指标，结合组合配置做影响分析。"""
    return (
        "请帮我做一次宏观经济速览。请按以下步骤操作：\n\n"
        "1. 调用 get_macro_indicators(indicator='cpi') 获取CPI数据\n"
        "2. 调用 get_macro_indicators(indicator='pmi') 获取PMI数据\n"
        "3. 调用 get_macro_indicators(indicator='lpr') 获取LPR利率数据\n"
        "4. 调用 get_macro_indicators(indicator='money_supply') 获取M2数据\n"
        "5. 调用 get_market_indices 获取市场指数\n"
        "6. 调用 get_portfolio_allocation(dimension='asset_class') 查看我的配置\n\n"
        "然后基于以上数据，给出宏观分析：\n"
        "- **经济概况**: 当前经济运行状态（通胀、制造业景气、流动性）\n"
        "- **政策环境**: 货币政策取向（利率、M2 趋势）\n"
        "- **对我的影响**: 宏观环境对我当前持仓配置（股票/债券/现金比例、行业分布）的影响\n"
        "- **建议**: 基于宏观环境，我的组合是否需要做配置调整\n"
    )
