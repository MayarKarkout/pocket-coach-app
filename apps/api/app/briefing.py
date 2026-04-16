import os
from datetime import date as Date, datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import delete, select
from sqlalchemy.orm import Session as DBSession

from app.auth import get_current_user, get_db
from app.llm import ChatMessage, LLMProvider, get_llm
from app.llm_context import build_context
from app.models import DailyBriefing, User

router = APIRouter(prefix="/briefing", tags=["briefing"])

USER_TIMEZONE = os.environ.get("USER_TIMEZONE", "UTC")

# Simple day-scoped in-memory context cache.
# Single-user app in a single process — a module-level dict is sufficient.
# Key is ISO date string; cleared whenever a new day's context is first requested.
_context_cache: dict[str, str] = {}


def _get_cached_context(db: DBSession, today: Date) -> str:
    today_str = today.isoformat()
    if _context_cache and next(iter(_context_cache)) != today_str:
        _context_cache.clear()
    if today_str not in _context_cache:
        _context_cache[today_str] = build_context(db, today)
    return _context_cache[today_str]


def _invalidate_context_cache() -> None:
    _context_cache.clear()

BRIEFING_MODEL = "gemini-3-flash-preview"
CHAT_MODEL = "gemini-3-flash-preview"

BRIEFING_SYSTEM = """You are PocketCoach, a realistic and demanding personal sports coach. Analyse the athlete's data and write a concise daily briefing.

Format your response EXACTLY as follows (plain text, no markdown):

LAST 7 DAYS
• [summary of sessions, load, notable numbers]
• [another key observation]

TRENDS
• [pattern, concern, or improvement vs prior weeks]

TODAY'S ADVICE
[1-2 sentences: specific, actionable coaching instruction for today]

Rules:
- Be demanding but encouraging
- Ground every point in actual data — never invent facts
- If data is sparse, say what's missing and why it matters
- Use metric units
- Be concise"""

CHAT_SYSTEM = """You are PocketCoach, a realistic and demanding personal sports coach. You have access to the athlete's recent training data shown below.

Answer questions concisely. Give specific, data-grounded advice. Be demanding but encouraging. If asked about something not in the data, say so clearly.

{context}"""


def _today_user_tz() -> Date:
    return datetime.now(ZoneInfo(USER_TIMEZONE)).date()


class BriefingOut(BaseModel):
    date: str
    content: str
    model: str
    created_at: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []


class ChatResponse(BaseModel):
    reply: str


async def _generate_and_store(db: DBSession, llm: LLMProvider, today: Date) -> DailyBriefing:
    context = _get_cached_context(db, today)
    content = await llm.complete(
        system=BRIEFING_SYSTEM,
        messages=[ChatMessage(role="user", content=f"Generate my daily briefing.\n\n{context}")],
        model=BRIEFING_MODEL,
    )
    briefing = DailyBriefing(date=today, content=content, model=BRIEFING_MODEL)
    db.add(briefing)
    db.commit()
    db.refresh(briefing)
    return briefing


def _to_out(b: DailyBriefing) -> BriefingOut:
    return BriefingOut(
        date=b.date.isoformat(),
        content=b.content,
        model=b.model,
        created_at=b.created_at.isoformat(),
    )


@router.get("/today", response_model=BriefingOut)
async def get_briefing(
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    llm: LLMProvider = Depends(get_llm),
) -> BriefingOut:
    today = _today_user_tz()
    existing = db.scalar(select(DailyBriefing).where(DailyBriefing.date == today))
    if existing:
        return _to_out(existing)
    return _to_out(await _generate_and_store(db, llm, today))


@router.post("/today/regenerate", response_model=BriefingOut)
async def regenerate_briefing(
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    llm: LLMProvider = Depends(get_llm),
) -> BriefingOut:
    today = _today_user_tz()
    _invalidate_context_cache()
    db.execute(delete(DailyBriefing).where(DailyBriefing.date == today))
    db.commit()
    return _to_out(await _generate_and_store(db, llm, today))


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    llm: LLMProvider = Depends(get_llm),
) -> ChatResponse:
    today = _today_user_tz()
    context = _get_cached_context(db, today)
    system = CHAT_SYSTEM.format(context=context)
    messages = list(request.history) + [ChatMessage(role="user", content=request.message)]
    reply = await llm.complete(
        system=system,
        messages=messages,
        model=CHAT_MODEL,
    )
    return ChatResponse(reply=reply)
