# 基金资产标签功能实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为基金添加指数类型和地域标签功能，支持手动打标并在基金详情面板中管理

**Architecture:** 在 Fund 模型中添加 index_type 和 region 字段，通过 SQLite ALTER TABLE 迁移，在基金详情面板添加双下拉选择框 UI，后端提供 PUT /api/funds/{fund_code}/tags 接口

**Tech Stack:** Python FastAPI, SQLModel, SQLite, React + TypeScript + shadcn/ui, Tailwind CSS

---

### Task 1: 更新数据库模型

**Files:**
- Modify: `backend/app/models.py:6-14`

**Step 1: 在 Fund 模型中添加标签字段**

```python
class Fund(SQLModel, table=True):
    __tablename__ = "funds"

    fund_code: str = Field(primary_key=True)
    fund_name: str = ""
    fund_type: str = ""
    management_company: str = ""
    # 新增标签字段
    index_type: str | None = Field(default=None, description="指数类型标签: csi300|sp500|nasdaq100|csi500|hsi")
    region: str | None = Field(default=None, description="地域标签: china|usa|hongkong|japan|europe|global")
    last_updated: datetime.datetime | None = None
```

**Step 2: Commit**

```bash
git add backend/app/models.py
git commit -m "feat: add index_type and region fields to Fund model"
```

---

### Task 2: 添加数据迁移逻辑

**Files:**
- Modify: `backend/app/database.py`

**Step 1: 在 database.py 导入必要的模块**

```python
from sqlalchemy import inspect, text
```

**Step 2: 添加迁移函数**

```python
def migrate_fund_tags(engine):
    """迁移基金标签字段到数据库"""
    with engine.connect() as conn:
        inspector = inspect(engine)
        columns = [c['name'] for c in inspector.get_columns('funds')]

        if 'index_type' not in columns:
            conn.execute(text("ALTER TABLE funds ADD COLUMN index_type TEXT"))
            conn.commit()
        if 'region' not in columns:
            conn.execute(text("ALTER TABLE funds ADD COLUMN region TEXT"))
            conn.commit()
```

**Step 3: 在 init_db 函数中调用迁移**

在 `init_db()` 函数中，`create_all()` 调用之后添加：

```python
migrate_fund_tags(engine)
```

**Step 4: Commit**

```bash
git add backend/app/database.py
git commit -m "feat: add database migration for fund tags"
```

---

### Task 3: 更新 Schema 定义

**Files:**
- Modify: `backend/app/schemas.py`

**Step 1: 添加基金标签更新请求 Schema**

在 schemas.py 中找到合适位置添加：

```python
class FundTagsUpdate(SQLModel):
    index_type: str | None = None
    region: str | None = None
```

**Step 2: 在 FundDetailResponse 中添加标签字段**

```python
class FundDetailResponse(SQLModel):
    fund_code: str
    fund_name: str
    fund_type: str = ""
    management_company: str = ""
    index_type: str | None = None
    region: str | None = None
    last_updated: datetime.datetime | None = None
```

**Step 3: Commit**

```bash
git add backend/app/schemas.py
git commit -m "feat: add FundTagsUpdate schema and update FundDetailResponse"
```

---

### Task 4: 添加基金标签更新 API

**Files:**
- Modify: `backend/app/routers/funds.py`

**Step 1: 导入新的 Schema**

```python
from app.schemas import FundTagsUpdate, ...
```

**Step 2: 在文件末尾添加标签更新接口**

```python
@router.put("/{fund_code}/tags")
def update_fund_tags(fund_code: str, data: FundTagsUpdate, session: SessionDep):
    """更新基金标签"""
    fund = session.exec(select(Fund).where(Fund.fund_code == fund_code)).first()
    if not fund:
        raise HTTPException(status_code=404, detail=f"Fund '{fund_code}' not found")

    if data.index_type is not None:
        fund.index_type = data.index_type
    if data.region is not None:
        fund.region = data.region
    fund.last_updated = datetime.datetime.now()

    session.add(fund)
    session.commit()
    session.refresh(fund)

    return {
        "fund_code": fund.fund_code,
        "fund_name": fund.fund_name,
        "index_type": fund.index_type,
        "region": fund.region,
    }
```

**Step 3: Commit**

```bash
git add backend/app/routers/funds.py
git commit -m "feat: add PUT /api/funds/{fund_code}/tags endpoint"
```

---

### Task 5: 前端类型定义更新

**Files:**
- Modify: `frontend/src/types/index.ts`

**Step 1: 更新 Fund 类型定义**

```typescript
export interface Fund {
  fund_code: string;
  fund_name: string;
  fund_type: string;
  management_company: string;
  index_type?: string;
  region?: string;
  last_updated?: string;
}
```

**Step 2: Commit**

```bash
git add frontend/src/types/index.ts
git commit -m "feat: add index_type and region to Fund type"
```

---

### Task 6: 前端 API 服务添加标签更新方法

**Files:**
- Modify: `frontend/src/services/api.ts`

**Step 1: 在 fundsApi 中添加 updateTags 方法**

```typescript
updateTags: async (fundCode: string, indexType: string | null, region: string | null) => {
  return await api.put(`/funds/${fundCode}/tags`, {
    index_type: indexType,
    region: region,
  });
},
```

**Step 2: Commit**

```bash
git add frontend/src/services/api.ts
git commit -m "feat: add updateTags method to fundsApi"
```

---

### Task 7: 创建标签选择器组件

**Files:**
- Create: `frontend/src/components/FundTagsSelector.tsx`

**Step 1: 创建标签选择器组件**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface FundTags {
  index_type?: string;
  region?: string;
}

interface FundTagsSelectorProps {
  tags: FundTags;
  onIndexTypeChange: (value: string | null) => void;
  onRegionChange: (value: string | null) => void;
}

const INDEX_TYPE_OPTIONS = [
  { value: "csi300", label: "沪深300" },
  { value: "sp500", label: "标普500" },
  { value: "nasdaq100", label: "纳斯达克100" },
  { value: "csi500", label: "中证500" },
  { value: "hsi", label: "恒生指数" },
] as const;

const REGION_OPTIONS = [
  { value: "china", label: "中国" },
  { value: "usa", label: "美国" },
  { value: "hongkong", label: "香港" },
  { value: "japan", label: "日本" },
  { value: "europe", label: "欧洲" },
  { value: "global", label: "全球" },
] as const;

export default function FundTagsSelector({ tags, onIndexTypeChange, onRegionChange }: FundTagsSelectorProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm">资产标签</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>指数类型</Label>
          <Select
            value={tags.index_type || ""}
            onValueChange={(v) => onIndexTypeChange(v || null)}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="选择指数类型" />
            </SelectTrigger>
            <SelectContent>
              {INDEX_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>地域</Label>
          <Select
            value={tags.region || ""}
            onValueChange={(v) => onRegionChange(v || null)}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="选择地域" />
            </SelectTrigger>
            <SelectContent>
              {REGION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/FundTagsSelector.tsx
git commit -m "feat: create FundTagsSelector component"
```

---

### Task 8: 在基金详情面板中集成标签选择器

**Files:**
- Modify: `frontend/src/components/FundDetailPanel.tsx` (或相关组件)

**Step 1: 导入标签选择器组件**

```tsx
import FundTagsSelector, { type FundTags } from "@/components/FundTagsSelector";
```

**Step 2: 在组件状态中添加标签状态**

```tsx
const [tags, setTags] = useState<FundTags>({
  index_type: fund?.index_type,
  region: fund?.region,
});
```

**Step 3: 添加标签更新处理函数**

```tsx
const handleTagUpdate = async (field: "index_type" | "region", value: string | null) => {
  if (!fund) return;
  const newTags = { ...tags, [field]: value };
  setTags(newTags);
  try {
    await fundsApi.updateTags(fund.fund_code, newTags.index_type, newTags.region);
    // 更新本地 fund 数据
    if (onUpdate) {
      onUpdate({ ...fund, ...newTags });
    }
  } catch (error) {
    // 回滚状态
    setTags(tags);
  }
};
```

**Step 4: 在面板中添加标签选择器**

在基金基本信息卡片之后添加：

```tsx
<FundTagsSelector
  tags={tags}
  onIndexTypeChange={(v) => handleTagUpdate("index_type", v)}
  onRegionChange={(v) => handleTagUpdate("region", v)}
/>
```

**Step 5: Commit**

```bash
git add frontend/src/components/FundDetailPanel.tsx
git commit -m "feat: integrate FundTagsSelector into fund detail panel"
```

---

### Task 9: 测试完整流程

**Step 1: 启动服务**

```bash
./start.sh
```

**Step 2: 手动测试清单**

- [ ] 访问持仓页面，点击任意基金打开详情面板
- [ ] 确认可以看到"资产标签"卡片
- [ ] 选择"沪深300"指数类型，保存后确认更新成功
- [ ] 选择"中国"地域，保存后确认更新成功
- [ ] 清除标签，确认可以设置为空
- [ ] 刷新页面，确认标签值保持不变
- [ ] 打开另一只基金，确认标签互不影响

**Step 3: 提交测试通过记录**

```bash
git commit --allow-empty -m "test: fund tags feature tested and verified"
```

---

## 待验证

1. 数据库迁移是否正确执行
2. 标签更新后基金详情是否实时刷新
3. 标签数据是否正确持久化到数据库
4. 前端 UI 在不同标签状态下显示是否正常
