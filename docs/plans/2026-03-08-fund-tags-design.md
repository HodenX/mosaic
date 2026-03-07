# 基金资产标签功能设计文档

**日期：** 2026-03-08
**作者：** 贾维斯

## 概述

为基金资产添加手动打标功能，支持指数类型和地域两个维度的标签，便于在仓位管理中更好地分类和跟踪资产。

## 需求

### 功能需求

1. **标签绑定对象**：绑定到基金本身（`Fund` 模型），而非具体持仓
2. **标签维度**：多维度标签系统，分为两个独立维度：
   - 指数类型
   - 地域
3. **标签选择方式**：每个维度单选
4. **标签选项**：固定预定义列表

### 预定义选项

| 维度 | 可选值 | 说明 |
|------|--------|------|
| 指数类型 | csi300 | 沪深300 |
| | sp500 | 标普500 |
| | nasdaq100 | 纳斯达克100 |
| | csi500 | 中证500 |
| | hsi | 恒生指数 |
| 地域 | china | 中国 |
| | usa | 美国 |
| | hongkong | 香港 |
| | japan | 日本 |
| | europe | 欧洲 |
| | global | 全球 |

## 技术设计

### 数据库设计

在 `Fund` 模型中添加两个新字段：

```python
class Fund(SQLModel, table=True):
    __tablename__ = "funds"

    fund_code: str = Field(primary_key=True)
    fund_name: str = ""
    fund_type: str = ""
    management_company: str = ""
    # 新增字段
    index_type: str | None = Field(default=None, description="指数类型标签")
    region: str | None = Field(default=None, description="地域标签")
    last_updated: datetime.datetime | None = None
```

### API 设计

#### 更新基金标签

```
PUT /api/funds/{fund_code}/tags

Request Body:
{
  "index_type": "csi300" | null,
  "region": "china" | null
}

Response:
{
  "fund_code": "012414",
  "fund_name": "基金名称",
  "index_type": "csi300",
  "region": "china"
}
```

#### 获取基金详情（扩展现有接口）

在现有的 `GET /api/funds/{fund_code}` 响应中添加 `index_type` 和 `region` 字段。

### 前端设计

#### UI 位置

基金详情滑出面板（`FundDetailContext` 管理的面板）

#### 组件设计

```tsx
// 标签选择组件
<Card>
  <CardHeader>
    <CardTitle className="text-sm">资产标签</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    <div>
      <Label>指数类型</Label>
      <Select value={fund.index_type} onValueChange={handleIndexTypeChange}>
        <SelectTrigger>
          <SelectValue placeholder="选择指数类型" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="csi300">沪深300</SelectItem>
          <SelectItem value="sp500">标普500</SelectItem>
          <SelectItem value="nasdaq100">纳斯达克100</SelectItem>
          <SelectItem value="csi500">中证500</SelectItem>
          <SelectItem value="hsi">恒生指数</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div>
      <Label>地域</Label>
      <Select value={fund.region} onValueChange={handleRegionChange}>
        <SelectTrigger>
          <SelectValue placeholder="选择地域" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="china">中国</SelectItem>
          <SelectItem value="usa">美国</SelectItem>
          <SelectItem value="hongkong">香港</SelectItem>
          <SelectItem value="japan">日本</SelectItem>
          <SelectItem value="europe">欧洲</SelectItem>
          <SelectItem value="global">全球</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </CardContent>
</Card>
```

#### 类型定义更新

```typescript
// frontend/src/types/index.ts
export interface Fund {
  // ... 现有字段
  index_type?: string;
  region?: string;
}
```

### 数据迁移

在 `backend/app/database.py` 的 `init_db()` 函数中添加迁移逻辑：

```python
def migrate_fund_tags(engine):
    with engine.connect() as conn:
        # 检查字段是否存在
        inspector = inspect(engine)
        columns = [c['name'] for c in inspector.get_columns('funds')]

        if 'index_type' not in columns:
            conn.execute(text("ALTER TABLE funds ADD COLUMN index_type TEXT"))
        if 'region' not in columns:
            conn.execute(text("ALTER TABLE funds ADD COLUMN region TEXT"))
```

## 实现文件清单

### 后端

1. `backend/app/models.py` - 添加 `index_type` 和 `region` 字段
2. `backend/app/database.py` - 添加数据迁移逻辑
3. `backend/app/schemas.py` - 添加/更新相关 Schema
4. `backend/app/routers/funds.py` - 添加 `PUT /api/funds/{fund_code}/tags` 接口
5. `backend/app/services/api.py` - 添加标签更新服务方法

### 前端

1. `frontend/src/types/index.ts` - 更新 `Fund` 类型
2. `frontend/src/services/api.ts` - 添加 `updateFundTags()` API 方法
3. `frontend/src/components/FundDetailPanel.tsx` - 添加标签选择 UI

## 待讨论问题

1. 标签是否需要在持仓列表或概览页面中显示？
2. 是否需要按标签筛选基金的功能？
3. 标签数据是否需要参与资产分析或策略计算？
