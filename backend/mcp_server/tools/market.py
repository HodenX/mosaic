"""Market & macro MCP tools — real-time market data and macroeconomic indicators via akshare."""

import akshare as ak


def get_market_indices() -> str:
    """获取主要股票指数的最新行情（上证指数、深证成指、沪深300、创业板指、恒生指数、纳斯达克等）。"""
    try:
        # Chinese A-share indices
        df = ak.stock_zh_index_spot_em()
        target_indices = {
            "上证指数": None,
            "深证成指": None,
            "沪深300": None,
            "创业板指": None,
            "中证500": None,
            "科创50": None,
        }
        for _, row in df.iterrows():
            name = str(row.get("名称", ""))
            if name in target_indices:
                target_indices[name] = row

        lines = [
            "## 主要市场指数\n",
            "| 指数 | 最新点位 | 涨跌幅 | 涨跌额 |",
            "|------|---------|--------|--------|",
        ]

        for name, row in target_indices.items():
            if row is not None:
                price = float(row.get("最新价", 0))
                change_pct = float(row.get("涨跌幅", 0))
                change_amt = float(row.get("涨跌额", 0))
                sign = "+" if change_pct > 0 else ""
                lines.append(f"| {name} | {price:,.2f} | {sign}{change_pct:.2f}% | {sign}{change_amt:.2f} |")

        # Try to add HK and US indices
        try:
            df_global = ak.index_us_stock_sina()
            global_targets = {"恒生指数": None, "纳斯达克": None, "道琼斯": None, "标普500": None}
            for _, row in df_global.iterrows():
                name = str(row.get("名称", ""))
                for key in global_targets:
                    if key in name and global_targets[key] is None:
                        global_targets[key] = row
                        break

            for name, row in global_targets.items():
                if row is not None:
                    price = float(row.get("最新价", 0))
                    change_pct = float(row.get("涨跌幅", 0))
                    sign = "+" if change_pct > 0 else ""
                    lines.append(f"| {name} | {price:,.2f} | {sign}{change_pct:.2f}% | — |")
        except Exception:
            lines.append("\n*注: 海外指数数据获取失败*")

        return "\n".join(lines)
    except Exception as e:
        return f"获取市场指数数据失败: {e}"


def get_fund_realtime_nav(fund_code: str) -> str:
    """查询任意基金的最新净值估算（不限于已持有的基金）。

    Args:
        fund_code: 基金代码，如 "012414"
    """
    try:
        df = ak.fund_open_fund_info_em(symbol=fund_code, indicator="单位净值走势")
        if df.empty:
            return f"基金「{fund_code}」没有净值数据。"

        latest = df.iloc[-1]
        nav = float(latest["单位净值"])
        nav_date = str(latest["净值日期"])

        # Calculate recent performance
        lines = [f"## 基金 {fund_code} 最新净值\n"]
        lines.append(f"- **最新净值**: {nav:.4f} ({nav_date})")

        if len(df) >= 2:
            prev = df.iloc[-2]
            prev_nav = float(prev["单位净值"])
            day_change = (nav - prev_nav) / prev_nav * 100
            sign = "+" if day_change > 0 else ""
            lines.append(f"- **日涨幅**: {sign}{day_change:.2f}%")

        # Recent periods
        for label, n_days in [("近一周", 5), ("近一月", 22), ("近三月", 66)]:
            if len(df) > n_days:
                past_nav = float(df.iloc[-(n_days + 1)]["单位净值"])
                change = (nav - past_nav) / past_nav * 100
                sign = "+" if change > 0 else ""
                lines.append(f"- **{label}**: {sign}{change:.2f}%")

        return "\n".join(lines)
    except Exception as e:
        return f"获取基金「{fund_code}」净值数据失败: {e}"


# Mapping of indicator names to akshare functions and parameters
_MACRO_FETCHERS = {
    "cpi": ("CPI 居民消费价格指数", "_fetch_cpi"),
    "pmi": ("PMI 采购经理指数", "_fetch_pmi"),
    "lpr": ("LPR 贷款市场报价利率", "_fetch_lpr"),
    "social_finance": ("社会融资规模", "_fetch_social_finance"),
    "money_supply": ("货币供应量 M2", "_fetch_money_supply"),
}


def _fetch_cpi() -> str:
    df = ak.macro_china_cpi_monthly()
    if df.empty:
        return "CPI 数据为空"
    recent = df.tail(6).iloc[::-1]
    lines = [
        "## CPI 居民消费价格指数（月度同比）\n",
        "| 月份 | CPI 同比 |",
        "|------|---------|",
    ]
    for _, row in recent.iterrows():
        lines.append(f"| {row.iloc[0]} | {row.iloc[1]}% |")
    return "\n".join(lines)


def _fetch_pmi() -> str:
    df = ak.macro_china_pmi()
    if df.empty:
        return "PMI 数据为空"
    recent = df.tail(6).iloc[::-1]
    lines = [
        "## PMI 采购经理指数\n",
        "| 月份 | 制造业PMI |",
        "|------|----------|",
    ]
    for _, row in recent.iterrows():
        lines.append(f"| {row.iloc[0]} | {row.iloc[1]} |")
    return "\n".join(lines)


def _fetch_lpr() -> str:
    df = ak.macro_china_lpr()
    if df.empty:
        return "LPR 数据为空"
    recent = df.tail(6).iloc[::-1]
    cols = df.columns.tolist()
    lines = [
        "## LPR 贷款市场报价利率\n",
        f"| 日期 | {cols[1] if len(cols) > 1 else '1年期'} | {cols[2] if len(cols) > 2 else '5年期'} |",
        "|------|--------|--------|",
    ]
    for _, row in recent.iterrows():
        lines.append(f"| {row.iloc[0]} | {row.iloc[1]}% | {row.iloc[2] if len(row) > 2 else 'N/A'}% |")
    return "\n".join(lines)


def _fetch_social_finance() -> str:
    df = ak.macro_china_shrzgm()
    if df.empty:
        return "社融数据为空"
    recent = df.tail(6).iloc[::-1]
    lines = [
        "## 社会融资规模（月度增量）\n",
        "| 月份 | 社融增量（亿元） |",
        "|------|----------------|",
    ]
    for _, row in recent.iterrows():
        lines.append(f"| {row.iloc[0]} | {row.iloc[1]} |")
    return "\n".join(lines)


def _fetch_money_supply() -> str:
    df = ak.macro_china_money_supply()
    if df.empty:
        return "M2 数据为空"
    recent = df.tail(6).iloc[::-1]
    lines = [
        "## 货币供应量\n",
        "| 月份 | M2同比(%) |",
        "|------|----------|",
    ]
    for _, row in recent.iterrows():
        # M2 同比 is typically the 2nd or 3rd column
        m2_yoy = row.iloc[2] if len(row) > 2 else row.iloc[1]
        lines.append(f"| {row.iloc[0]} | {m2_yoy}% |")
    return "\n".join(lines)


def get_macro_indicators(indicator: str = "cpi") -> str:
    """获取中国宏观经济指标数据。

    Args:
        indicator: 指标类型，可选值：cpi（消费者价格指数）、pmi（采购经理指数）、lpr（贷款利率）、social_finance（社融）、money_supply（M2货币供应量）
    """
    if indicator not in _MACRO_FETCHERS:
        available = ", ".join(f"{k}（{v[0]}）" for k, v in _MACRO_FETCHERS.items())
        return f"未知指标「{indicator}」，可选: {available}"

    name, func_name = _MACRO_FETCHERS[indicator]
    fetcher = globals()[func_name]
    try:
        return fetcher()
    except Exception as e:
        return f"获取{name}数据失败: {e}"
