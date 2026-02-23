import json
from pathlib import Path

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/diagnosis", tags=["diagnosis"])

# backend/app/routers/diagnosis.py → ../../.. → project root → data/
_DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data"


@router.get("/report")
def get_report():
    """返回最新的诊断报告 JSON（由 Claude skill 生成）"""
    path = _DATA_DIR / "diagnosis_report.json"
    if not path.exists():
        raise HTTPException(404, "尚未生成诊断报告，请先运行资产诊断")
    return json.loads(path.read_text(encoding="utf-8"))
