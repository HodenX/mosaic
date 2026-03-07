# Twitter Thread — 知合 Mosaic 发布推文

依次发布以下 5 条推文，第 1 条附 Dashboard 亮色截图，第 5 条附暗色截图。

---

## 1/5

我有 10 只基金分散在 5 个平台，每次想看看整体配置，就得打开支付宝、天天基金、招行 app，拿计算器一个个加。

受够了。所以写了「知合 Mosaic」，今天开源。

github.com/HodenX/mosaic

📎 附图：docs/screenshots/dashboard-full.png

---

## 2/5

核心理念是「四笔钱」框架：

💧 活钱 — 货基、活期，随取随用
🏛️ 稳钱 — 定期、银行理财，到期提醒
📈 长钱 — 基金组合，净值追踪 + 配置穿透
🛡️ 保障 — 保险保单，续费追踪

一屏看清家庭资产全貌。

---

## 3/5

基金管理是最深的部分：

→ 跨平台汇总持仓，自动拉取净值
→ 按资产类别 / 地域 / 行业三维度穿透分析
→ 内置仓位管理 + 可插拔策略引擎
→ 权益/债券/黄金配置目标追踪

数据来自 akshare，每日 20:00 自动更新。

📎 附图：docs/screenshots/growth-overview.png

---

## 4/5

还内置了 MCP Server，可以直接让 AI 助手读取你的持仓数据做分析——周度回顾、风险检查、再平衡建议、宏观简报，都是预置 prompt。

完全本地运行，SQLite 存储，数据不出你的电脑。

---

## 5/5

技术栈：React 19 + FastAPI + SQLite + akshare + FastMCP

设计上花了不少心思：Jade & Gold 主题、衬线数字排版、完整深色模式。

欢迎 Star ⭐ 和反馈。

github.com/HodenX/mosaic

#开源 #OpenSource #个人理财 #基金投资 #React #Python #FastAPI #MCP

📎 附图：docs/screenshots/dashboard-dark.png
