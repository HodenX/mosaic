# Growth Allocation Target Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在长钱页面添加详细配置对话框，支持设置资产类别（权益/债券/黄金）和权益内部细分（美股/A股港股）的预期占比和浮动范围。

**Architecture:** 新增 `GrowthAllocationTarget` 数据表存储配置，新增 API 接口进行 CRUD，前端使用 Collapsible 组件实现折叠面板式配置对话框。

**Tech Stack:** SQLModel, FastAPI, React, shadcn/ui Collapsible

---

## Task 1: 后端数据模型

**Files:**
- Modify: `backend/app/models.py`
- Modify: `backend/app/schemas.py`

**Step 1: 添加数据模型**

在 `backend/app/models.py` 末尾添加：

```python
class GrowthAllocationTarget(SQLModel, table=True):
    __tablename__ = "growth_allocation_targets"

    id: int | None = Field(default=None, primary_key=True)
    # 层级类型: "asset_class" | "equity_sub"
    level: str
    # 资产类别代码
    # asset_class: equity/bond/gold
    # equity_sub: spx/nasdaq/csi300/dividend/hkt
    code: str
    # 父类别（仅 equity_sub 层级使用）
    parent_code: str | None = None
    # 预期占比 (%)
    target_ratio: float = 0.0
    # 浮动比例 (%)
    float_ratio: float = 5.0
    # 更新时间
    updated_at: datetime.datetime = Field(default_factory=datetime.datetime.now)
```

**Step 2: 添加 Schema**

在 `backend/app/schemas.py` 末尾添加：

```python
class GrowthAllocationItem(BaseModel):
    code: str
    target_ratio: float
    float_ratio: float

class GrowthAllocationRequest(BaseModel):
    asset_class: list[GrowthAllocationItem]
    equity_sub: list[GrowthAllocationItem]

class GrowthAllocationResponse(BaseModel):
    asset_class: list[GrowthAllocationItem]
    equity_sub: list[GrowthAllocationItem]
```

**Step 3: 提交**

```bash
git add backend/app/models.py backend/app/schemas.py
git commit -m "feat: add GrowthAllocationTarget model and schemas"
```

---

## Task 2: 后端 API 接口

**Files:**
- Create: `backend/app/routers/growth.py`
- Modify: `backend/app/main.py`

**Step 1: 创建 growth 路由**

创建 `backend/app/routers/growth.py`：

```python
import datetime as dt
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.database import get_session
from app.models import GrowthAllocationTarget
from app.schemas import GrowthAllocationItem, GrowthAllocationRequest, GrowthAllocationResponse

router = APIRouter(prefix="/api/growth", tags=["growth"])
SessionDep = Annotated[Session, Depends(get_session)]

# 默认配置
DEFAULT_ASSET_CLASS = [
    {"code": "equity", "target_ratio": 70.0, "float_ratio": 5.0},
    {"code": "bond", "target_ratio": 10.0, "float_ratio": 2.0},
    {"code": "gold", "target_ratio": 20.0, "float_ratio": 4.0},
]

DEFAULT_EQUITY_SUB = [
    {"code": "spx", "target_ratio": 30.0, "float_ratio": 5.0},
    {"code": "nasdaq", "target_ratio": 15.0, "float_ratio": 5.0},
    {"code": "csi300", "target_ratio": 15.0, "float_ratio": 5.0},
    {"code": "dividend", "target_ratio": 10.0, "float_ratio": 5.0},
    {"code": "hkt", "target_ratio": 10.0, "float_ratio": 5.0},
]


@router.get("/allocation-targets")
def get_allocation_targets(session: SessionDep) -> GrowthAllocationResponse:
    """获取长钱资产配置目标，若无配置则返回默认值。"""
    targets = session.exec(select(GrowthAllocationTarget)).all()

    if not targets:
        # 返回默认配置
        return GrowthAllocationResponse(
            asset_class=[GrowthAllocationItem(**t) for t in DEFAULT_ASSET_CLASS],
            equity_sub=[GrowthAllocationItem(**t) for t in DEFAULT_EQUITY_SUB],
        )

    asset_class = [
        GrowthAllocationItem(code=t.code, target_ratio=t.target_ratio, float_ratio=t.float_ratio)
        for t in targets if t.level == "asset_class"
    ]
    equity_sub = [
        GrowthAllocationItem(code=t.code, target_ratio=t.target_ratio, float_ratio=t.float_ratio)
        for t in targets if t.level == "equity_sub"
    ]

    return GrowthAllocationResponse(asset_class=asset_class, equity_sub=equity_sub)


@router.put("/allocation-targets")
def update_allocation_targets(
    data: GrowthAllocationRequest,
    session: SessionDep,
) -> GrowthAllocationResponse:
    """更新长钱资产配置目标。"""
    # 校验合计
    asset_total = sum(t.target_ratio for t in data.asset_class)
    equity_total = sum(t.target_ratio for t in data.equity_sub)

    if abs(asset_total - 100.0) > 0.01:
        raise ValueError(f"资产类别占比合计应为 100%，当前为 {asset_total}%")
    if abs(equity_total - 100.0) > 0.01:
        raise ValueError(f"权益内部占比合计应为 100%，当前为 {equity_total}%")

    # 清除旧配置
    old_targets = session.exec(select(GrowthAllocationTarget)).all()
    for t in old_targets:
        session.delete(t)

    # 插入新配置
    now = dt.datetime.now()
    for item in data.asset_class:
        session.add(GrowthAllocationTarget(
            level="asset_class",
            code=item.code,
            target_ratio=item.target_ratio,
            float_ratio=item.float_ratio,
            updated_at=now,
        ))
    for item in data.equity_sub:
        session.add(GrowthAllocationTarget(
            level="equity_sub",
            code=item.code,
            parent_code="equity",
            target_ratio=item.target_ratio,
            float_ratio=item.float_ratio,
            updated_at=now,
        ))

    session.commit()
    return get_allocation_targets(session)
```

**Step 2: 注册路由**

在 `backend/app/main.py` 的 routers 部分添加：

```python
from app.routers import growth
app.include_router(growth.router)
```

**Step 3: 提交**

```bash
git add backend/app/routers/growth.py backend/app/main.py
git commit -m "feat: add growth allocation targets API"
```

---

## Task 3: 前端类型定义和 API

**Files:**
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/services/api.ts`

**Step 1: 添加类型定义**

在 `frontend/src/types.ts` 末尾添加：

```typescript
// --- Growth Allocation Target Types ---

export interface GrowthAllocationItem {
  code: string;
  target_ratio: number;
  float_ratio: number;
}

export interface GrowthAllocationRequest {
  asset_class: GrowthAllocationItem[];
  equity_sub: GrowthAllocationItem[];
}

export type GrowthAllocationResponse = GrowthAllocationRequest;
```

**Step 2: 添加 API 调用**

在 `frontend/src/services/api.ts` 中添加 growthApi：

```typescript
export const growthApi = {
  allocationTargets: () =>
    api.get<GrowthAllocationResponse>("/growth/allocation-targets").then((r) => r.data),
  updateAllocationTargets: (data: GrowthAllocationRequest) =>
    api.put<GrowthAllocationResponse>("/growth/allocation-targets", data).then((r) => r.data),
};
```

**Step 3: 提交**

```bash
git add frontend/src/types.ts frontend/src/services/api.ts
git commit -m "feat: add growth allocation types and API"
```

---

## Task 4: 前端配置对话框组件

**Files:**
- Create: `frontend/src/components/GrowthAllocationDialog.tsx`

**Step 1: 创建组件**

创建 `frontend/src/components/GrowthAllocationDialog.tsx`：

```tsx
// 贾维斯: 长钱资产配置目标对话框组件

import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";
import { growthApi } from "@/services/api";
import type { GrowthAllocationItem, GrowthAllocationResponse } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

// 标签映射
const ASSET_CLASS_LABELS: Record<string, string> = {
  equity: "权益",
  bond: "债券",
  gold: "黄金",
};

const EQUITY_SUB_LABELS: Record<string, { label: string; group: string }> = {
  spx: { label: "标普500", group: "美股" },
  nasdaq: { label: "纳斯达克", group: "美股" },
  csi300: { label: "沪深300", group: "A股/港股" },
  dividend: { label: "中证红利", group: "A股/港股" },
  hkt: { label: "恒生科技", group: "A股/港股" },
};

const DEFAULT_ASSET_CLASS: GrowthAllocationItem[] = [
  { code: "equity", target_ratio: 70, float_ratio: 5 },
  { code: "bond", target_ratio: 10, float_ratio: 2 },
  { code: "gold", target_ratio: 20, float_ratio: 4 },
];

const DEFAULT_EQUITY_SUB: GrowthAllocationItem[] = [
  { code: "spx", target_ratio: 30, float_ratio: 5 },
  { code: "nasdaq", target_ratio: 15, float_ratio: 5 },
  { code: "csi300", target_ratio: 15, float_ratio: 5 },
  { code: "dividend", target_ratio: 10, float_ratio: 5 },
  { code: "hkt", target_ratio: 10, float_ratio: 5 },
];

export default function GrowthAllocationDialog({ open, onOpenChange, onUpdated }: Props) {
  const [assetClass, setAssetClass] = useState<GrowthAllocationItem[]>(DEFAULT_ASSET_CLASS);
  const [equitySub, setEquitySub] = useState<GrowthAllocationItem[]>(DEFAULT_EQUITY_SUB);
  const [equityOpen, setEquityOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      growthApi.allocationTargets().then((res) => {
        setAssetClass(res.asset_class);
        setEquitySub(res.equity_sub);
      }).catch(() => {
        // 使用默认值
      });
    }
  }, [open]);

  const updateAssetClass = useCallback((code: string, field: "target_ratio" | "float_ratio", value: number) => {
    setAssetClass((prev) =>
      prev.map((item) =>
        item.code === code ? { ...item, [field]: value } : item
      )
    );
  }, []);

  const updateEquitySub = useCallback((code: string, field: "target_ratio" | "float_ratio", value: number) => {
    setEquitySub((prev) =>
      prev.map((item) =>
        item.code === code ? { ...item, [field]: value } : item
      )
    );
  }, []);

  const assetTotal = assetClass.reduce((sum, item) => sum + item.target_ratio, 0);
  const equityTotal = equitySub.reduce((sum, item) => sum + item.target_ratio, 0);
  const isValid = Math.abs(assetTotal - 100) < 0.01 && Math.abs(equityTotal - 100) < 0.01;

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    try {
      await growthApi.updateAllocationTargets({
        asset_class: assetClass,
        equity_sub: equitySub,
      });
      onOpenChange(false);
      onUpdated?.();
    } finally {
      setSaving(false);
    }
  };

  // 按组分类权益子项
  const equityGroups = equitySub.reduce((acc, item) => {
    const meta = EQUITY_SUB_LABELS[item.code];
    if (meta) {
      const group = meta.group;
      if (!acc[group]) acc[group] = [];
      acc[group].push(item);
    }
    return acc;
  }, {} as Record<string, GrowthAllocationItem[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>长钱资产配置目标</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 资产类别配置 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">资产类别配置</Label>
            {assetClass.map((item) => (
              <div key={item.code} className="flex items-center gap-2">
                <span className="w-12 text-sm">{ASSET_CLASS_LABELS[item.code] || item.code}</span>
                <div className="flex-1 flex items-center gap-1">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={item.target_ratio}
                    onChange={(e) => updateAssetClass(item.code, "target_ratio", parseFloat(e.target.value) || 0)}
                    className="h-8 w-16 text-right tabular-nums font-serif"
                  />
                  <span className="text-xs text-muted-foreground">% ±</span>
                  <Input
                    type="number"
                    min={0}
                    max={50}
                    step={1}
                    value={item.float_ratio}
                    onChange={(e) => updateAssetClass(item.code, "float_ratio", parseFloat(e.target.value) || 0)}
                    className="h-8 w-12 text-right tabular-nums font-serif"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              </div>
            ))}
            <div className={`text-xs text-right ${Math.abs(assetTotal - 100) < 0.01 ? "text-emerald-600" : "text-red-500"}`}>
              合计 {assetTotal.toFixed(1)}% {Math.abs(assetTotal - 100) < 0.01 ? "✓" : "（需等于 100%）"}
            </div>
          </div>

          {/* 权益内部配置（折叠） */}
          <Collapsible open={equityOpen} onOpenChange={setEquityOpen}>
            <CollapsibleTrigger className="flex items-center gap-1 text-sm font-medium w-full py-2">
              {equityOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              权益内部配置
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              {Object.entries(equityGroups).map(([group, items]) => (
                <div key={group}>
                  <Label className="text-xs text-muted-foreground">{group}</Label>
                  {items.map((item) => {
                    const meta = EQUITY_SUB_LABELS[item.code];
                    return (
                      <div key={item.code} className="flex items-center gap-2 mt-1">
                        <span className="w-16 text-sm">{meta?.label || item.code}</span>
                        <div className="flex-1 flex items-center gap-1">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step={1}
                            value={item.target_ratio}
                            onChange={(e) => updateEquitySub(item.code, "target_ratio", parseFloat(e.target.value) || 0)}
                            className="h-8 w-16 text-right tabular-nums font-serif"
                          />
                          <span className="text-xs text-muted-foreground">% ±</span>
                          <Input
                            type="number"
                            min={0}
                            max={50}
                            step={1}
                            value={item.float_ratio}
                            onChange={(e) => updateEquitySub(item.code, "float_ratio", parseFloat(e.target.value) || 0)}
                            className="h-8 w-12 text-right tabular-nums font-serif"
                          />
                          <span className="text-xs text-muted-foreground">%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              <div className={`text-xs text-right ${Math.abs(equityTotal - 100) < 0.01 ? "text-emerald-600" : "text-red-500"}`}>
                合计 {equityTotal.toFixed(1)}% {Math.abs(equityTotal - 100) < 0.01 ? "✓" : "（需等于 100%）"}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <DialogFooter>
          <Button size="sm" onClick={handleSave} disabled={!isValid || saving}>
            {saving ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: 提交**

```bash
git add frontend/src/components/GrowthAllocationDialog.tsx
git commit -m "feat: add GrowthAllocationDialog component"
```

---

## Task 5: 集成到 OverviewPage

**Files:**
- Modify: `frontend/src/pages/OverviewPage.tsx`

**Step 1: 添加编辑按钮和对话框**

在 `frontend/src/pages/OverviewPage.tsx` 中：

1. 添加导入：
```tsx
import { Pencil } from "lucide-react";
import GrowthAllocationDialog from "@/components/GrowthAllocationDialog";
```

2. 在组件内添加状态：
```tsx
const [allocDialogOpen, setAllocDialogOpen] = useState(false);
```

3. 在 `AssetAllocationTarget` 组件的父级 Card 添加编辑按钮（或修改 AssetAllocationTarget 组件接收 onEdit 回调）

找到 AssetAllocationTarget 渲染的位置，在其 CardHeader 添加编辑按钮：

```tsx
{position?.active_strategy === "asset_rebalance" && suggestion?.extra?.class_ratios != null && (
  <Card className="shadow-sm">
    <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
      <CardTitle className="text-sm">资产配置目标</CardTitle>
      <button
        onClick={() => setAllocDialogOpen(true)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
      >
        <Pencil className="h-3 w-3" />
        编辑
      </button>
    </CardHeader>
    <CardContent>
      <AssetAllocationTarget ... />
    </CardContent>
  </Card>
)}

{/* 对话框 */}
<GrowthAllocationDialog
  open={allocDialogOpen}
  onOpenChange={setAllocDialogOpen}
  onUpdated={() => {
    // 刷新数据
    positionApi.suggestion().then(setSuggestion);
  }}
/>
```

**Step 2: 提交**

```bash
git add frontend/src/pages/OverviewPage.tsx
git commit -m "feat: integrate GrowthAllocationDialog into OverviewPage"
```

---

## Task 6: 验证功能

**Step 1: 重启服务验证**

1. 打开 http://localhost:5173/growth/overview
2. 确认资产配置目标卡片显示正常
3. 点击"编辑"按钮打开配置对话框
4. 修改配置并保存
5. 刷新页面确认配置已保存

**Step 2: 最终提交**

```bash
git add -A
git commit -m "feat: complete growth allocation target configuration"
```
