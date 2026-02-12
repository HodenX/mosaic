from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol

from sqlmodel import Session


@dataclass
class PortfolioContext:
    """Standardised context passed to every strategy."""

    total_budget: float
    total_value: float
    total_cost: float
    available_cash: float
    position_ratio: float
    target_position_min: float
    target_position_max: float
    holdings: list[dict]
    strategy_config: dict


@dataclass
class SuggestionItem:
    fund_code: str
    fund_name: str
    action: str  # "buy" | "sell" | "hold"
    amount: float
    reason: str


@dataclass
class StrategyResult:
    strategy_name: str
    summary: str
    suggestions: list[SuggestionItem] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)


class RebalanceStrategy(Protocol):
    name: str
    display_name: str
    description: str
    config_schema: dict

    def evaluate(self, context: PortfolioContext, session: Session) -> StrategyResult: ...
