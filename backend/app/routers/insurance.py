import datetime as dt
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.database import get_session
from app.models import InsurancePolicy
from app.schemas import InsurancePolicyCreate, InsurancePolicyUpdate

router = APIRouter(prefix="/api/insurance", tags=["insurance"])
SessionDep = Annotated[Session, Depends(get_session)]


@router.get("")
def list_policies(
    session: SessionDep,
    insured_person: str | None = Query(None),
):
    query = select(InsurancePolicy)
    if insured_person:
        query = query.where(InsurancePolicy.insured_person == insured_person)
    policies = session.exec(query).all()
    total_premium = sum(p.annual_premium for p in policies if p.status == "active")
    persons = set(p.insured_person for p in policies if p.status == "active")
    return {
        "items": policies,
        "summary": {
            "total_annual_premium": round(total_premium, 2),
            "active_count": sum(1 for p in policies if p.status == "active"),
            "total_count": len(policies),
            "covered_persons": len(persons),
        },
    }


@router.post("", status_code=201)
def create_policy(data: InsurancePolicyCreate, session: SessionDep):
    policy = InsurancePolicy(**data.model_dump())
    session.add(policy)
    session.commit()
    session.refresh(policy)
    return policy


@router.put("/{policy_id}")
def update_policy(policy_id: int, data: InsurancePolicyUpdate, session: SessionDep):
    policy = session.get(InsurancePolicy, policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Insurance policy not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(policy, key, value)
    policy.updated_at = dt.datetime.now()
    session.add(policy)
    session.commit()
    session.refresh(policy)
    return policy


@router.delete("/{policy_id}")
def delete_policy(policy_id: int, session: SessionDep):
    policy = session.get(InsurancePolicy, policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Insurance policy not found")
    session.delete(policy)
    session.commit()
    return {"ok": True}


@router.post("/{policy_id}/renew")
def renew_policy(policy_id: int, session: SessionDep):
    """Roll next_payment_date forward by one year."""
    policy = session.get(InsurancePolicy, policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Insurance policy not found")
    if not policy.next_payment_date:
        raise HTTPException(status_code=422, detail="No next_payment_date set")
    policy.next_payment_date = policy.next_payment_date.replace(
        year=policy.next_payment_date.year + 1
    )
    policy.updated_at = dt.datetime.now()
    session.add(policy)
    session.commit()
    session.refresh(policy)
    return policy
