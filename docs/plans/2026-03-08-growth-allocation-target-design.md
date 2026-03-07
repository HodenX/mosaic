# 长钱资产配置详细目标设计文档

**日期**: 2026-03-08
**状态**: 设计完成，待实现

## 背景

当前系统在 Dashboard 页面的资产配置目标对话框中，只能设置活钱/稳钱/长钱三桶的比例。用户希望在长钱页面中，能够详细配置长钱内部的资产分配目标，包括资产类别（权益/债券/黄金）和权益内部细分（美股/A股港股）的预期占比和浮动范围。

## 需求

### 功能需求

1. **资产类别配置**：设置权益/债券/黄金的预期占比和浮动比例
2. **权益内部配置**：设置美股和A股/港股各指数的预期占比和浮动比例
3. **层级校验**：各层级占比合计必须等于 100%
4. **默认值**：首次打开时提供合理的默认配置

### 默认配置值

**资产类别：**
| 类别 | 目标占比 | 浮动比例 |
|------|---------|---------|
| 权益 | 70% | ±5% |
| 债券 | 10% | ±2% |
| 黄金 | 20% | ±4% |

**权益内部：**
| 子类别 | 目标占比 | 浮动比例 |
|--------|---------|---------|
| 标普500 | 30% | ±5% |
| 纳斯达克 | 15% | ±5% |
| 沪深300 | 15% | ±5% |
| 中证红利 | 10% | ±5% |
| 恒生科技 | 10% | ±5% |

## 设计方案

### 数据模型

新增 `GrowthAllocationTarget` 表：

```python
class GrowthAllocationTarget(SQLModel, table=True):
    __tablename__ = "growth_allocation_targets"

    id: int | None = Field(default=None, primary_key=True)
    # 层级类型
    level: str  # "asset_class" | "equity_sub"
    # 资产类别代码
    code: str  # asset_class: equity/bond/gold; equity_sub: spx/nasdaq/csi300/dividend/hkt
    # 父类别（仅 equity_sub 层级使用）
    parent_code: str | None = None  # "equity"
    # 预期占比 (%)
    target_ratio: float = 0.0
    # 浮动比例 (%)
    float_ratio: float = 5.0
    # 更新时间
    updated_at: datetime.datetime = Field(default_factory=datetime.datetime.now)
```

### API 接口

**新增接口：**

```
GET  /api/growth/allocation-targets
  - 获取长钱详细配置
  - 响应: {
      asset_class: [
        {code: "equity", target_ratio: 70, float_ratio: 5},
        {code: "bond", target_ratio: 10, float_ratio: 2},
        {code: "gold", target_ratio: 20, float_ratio: 4}
      ],
      equity_sub: [
        {code: "spx", target_ratio: 30, float_ratio: 5},
        {code: "nasdaq", target_ratio: 15, float_ratio: 5},
        {code: "csi300", target_ratio: 15, float_ratio: 5},
        {code: "dividend", target_ratio: 10, float_ratio: 5},
        {code: "hkt", target_ratio: 10, float_ratio: 5}
      ]
    }

PUT  /api/growth/allocation-targets
  - 更新长钱详细配置
  - 请求体: 同上格式
  - 校验: asset_class 合计=100%, equity_sub 合计=100%
```

### 前端组件

**修改文件：**
- `frontend/src/pages/OverviewPage.tsx` - 在资产配置目标卡片添加"编辑"按钮
- `frontend/src/components/GrowthAllocationDialog.tsx` - 新建配置对话框组件

**对话框 UI 布局：**

```
┌─────────────────────────────────────┐
│ 长钱资产配置目标                      │
├─────────────────────────────────────┤
│ ▼ 资产类别配置                        │
│ 权益   目标[70]% 浮动[±5]%           │
│ 债券   目标[10]% 浮动[±2]%           │
│ 黄金   目标[20]% 浮动[±4]%           │
│       合计 100% ✓                    │
├─────────────────────────────────────┤
│ ▶ 权益内部配置                        │
│ 美股                                │
│   标普500    目标[30]% 浮动[±5]%     │
│   纳斯达克   目标[15]% 浮动[±5]%     │
│ A股/港股                            │
│   沪深300    目标[15]% 浮动[±5]%     │
│   中证红利   目标[10]% 浮动[±5]%     │
│   恒生科技   目标[10]% 浮动[±5]%     │
│       合计 100% ✓                    │
├─────────────────────────────────────┤
│                           [保存]    │
└─────────────────────────────────────┘
```

**交互逻辑：**
- 使用 Collapsible 组件实现折叠面板
- 权益内部配置默认折叠，点击展开
- 实时校验各层级合计是否等于 100%
- 保存按钮仅在所有校验通过时可用

### 与现有系统的关系

1. **与 AssetAllocationTarget 组件的关系**
   - 现有组件继续用于显示当前配置状态
   - 新增编辑入口，点击后打开配置对话框

2. **与 asset_rebalance 策略的关系**
   - 详细配置存储在独立的表中
   - asset_rebalance 策略可读取此配置作为默认值
   - 两者数据独立，互不影响

## 实现步骤

1. 后端：创建数据模型和数据库迁移
2. 后端：实现 API 接口
3. 前端：创建配置对话框组件
4. 前端：集成到 OverviewPage
5. 测试：验证功能完整性
