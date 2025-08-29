from __future__ import annotations
from typing import Any
from openai import OpenAI
from app.core.config import settings

SYSTEM = (
    "You are a concise fitness coach. Given weekly training stats, write a short, motivational summary "
    "(100–160 words). Be concrete: mention body parts hit/missed, standout lifts, and week-over-week trend. "
    "End with a positive, actionable nudge for next week. Avoid emojis."
)

def summarize_week(stats: dict[str, Any]) -> str:
    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    # Make a compact, robust prompt
    content = (
        "Stats JSON:\n"
        f"{stats}\n\n"
        "Write the summary now."
    )
    chat = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role":"system","content":SYSTEM},
            {"role":"user","content":content}
        ],
        temperature=0.7,
        max_tokens=250,
    )
    return chat.choices[0].message.content.strip()
