from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import get_session
from app.models import LiquidAsset
from app.schemas import LiquidAssetCreate, LiquidAssetUpdate

router = APIRouter(prefix="/api/liquid", tags=["liquid"])
SessionDep = Annotated[Session, Depends(get_session)]


@router.get("")
def list_liquid_assets(session: SessionDep):
    assets = session.exec(select(LiquidAsset)).all()
    total_amount = sum(a.amount for a in assets)
    estimated_annual_return = sum(
        a.amount * (a.annual_rate / 100) for a in assets if a.annual_rate
    )
    return {
        "items": assets,
        "summary": {
            "total_amount": round(total_amount, 2),
            "estimated_annual_return": round(estimated_annual_return, 2),
            "count": len(assets),
        },
    }


@router.post("", status_code=201)
def create_liquid_asset(data: LiquidAssetCreate, session: SessionDep):
    asset = LiquidAsset(**data.model_dump())
    session.add(asset)
    session.commit()
    session.refresh(asset)
    return asset


@router.put("/{asset_id}")
def update_liquid_asset(asset_id: int, data: LiquidAssetUpdate, session: SessionDep):
    asset = session.get(LiquidAsset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Liquid asset not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(asset, key, value)
    asset.updated_at = datetime.now()
    session.add(asset)
    session.commit()
    session.refresh(asset)
    return asset


@router.delete("/{asset_id}")
def delete_liquid_asset(asset_id: int, session: SessionDep):
    asset = session.get(LiquidAsset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Liquid asset not found")
    session.delete(asset)
    session.commit()
    return {"ok": True}
