from __future__ import annotations

from app.services.strategies.base import RebalanceStrategy
from app.services.strategies.simple import SimpleStrategy

_registry: dict[str, RebalanceStrategy] = {}


def _register(strategy: RebalanceStrategy) -> None:
    _registry[strategy.name] = strategy


# Register built-in strategies
_register(SimpleStrategy())


def get_strategy(name: str) -> RebalanceStrategy | None:
    return _registry.get(name)


def list_strategies() -> list[RebalanceStrategy]:
    return list(_registry.values())
