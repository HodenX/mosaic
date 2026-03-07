import datetime as dt
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import get_session
from app.models import GrowthAllocationTarget, StrategyConfig
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
        raise HTTPException(
            status_code=400,
            detail=f"资产类别占比合计应为 100%，当前为 {asset_total}%"
        )
    if abs(equity_total - 100.0) > 0.01:
        raise HTTPException(
            status_code=400,
            detail=f"权益内部占比合计应为 100%，当前为 {equity_total}%"
        )

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

    # 同步更新 asset_rebalance 策略的 targets 配置
    # 构建 targets 格式
    synced_targets = {}
    for item in data.asset_class:
        synced_targets[item.code] = {
            "target": item.target_ratio,
            "min": max(0, item.target_ratio - item.float_ratio),
            "max": min(100, item.target_ratio + item.float_ratio),
        }

    # 查找或创建 asset_rebalance 策略配置
    cfg_row = session.exec(
        select(StrategyConfig).where(StrategyConfig.strategy_name == "asset_rebalance").limit(1)
    ).first()

    if cfg_row is None:
        cfg_row = StrategyConfig(strategy_name="asset_rebalance")

    import json
    cfg = json.loads(cfg_row.config_json)
    cfg["targets"] = synced_targets
    cfg_row.config_json = json.dumps(cfg, ensure_ascii=False)
    cfg_row.updated_at = now
    session.add(cfg_row)

    session.commit()
    return get_allocation_targets(session)
