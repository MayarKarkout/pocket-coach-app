from typing import Literal

from fastapi import HTTPException


def reorder(items: list, item_id: int, direction: Literal["up", "down"]) -> None:
    items = sorted(items, key=lambda i: i.position)
    idx = next((i for i, x in enumerate(items) if x.id == item_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Item not found")
    swap_idx = idx - 1 if direction == "up" else idx + 1
    if swap_idx < 0 or swap_idx >= len(items):
        return
    items[idx].position, items[swap_idx].position = items[swap_idx].position, items[idx].position
