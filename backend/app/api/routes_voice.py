from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from datetime import date
from openai import OpenAI
from io import BytesIO
import json
import logging
from datetime import date as _date
from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.models.workout import Workout, SetEntry
from app.models.exercise import Exercise
from sqlalchemy.orm import selectinload
from sqlalchemy import select as sq

router = APIRouter()
log = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You convert a spoken workout description into strict JSON for logging. "
    "Assume kilograms if unit omitted. Expand phrases like "
    "'first 2 sets 20kg and third 25kg' into per-set weights. "
    "If reps are missing, infer a reasonable default (e.g., 8). "
    "Return ONLY a function call with JSON arguments that match the schema."
)

# JSON Schema for function calling
VOICE_PARAMS = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "workout_title": {"type": "string"},
        "date": {"type": "string", "description": "YYYY-MM-DD; default today"},
        "items": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "exercise_name": {"type": "string"},
                    "sets": {"type": "integer", "minimum": 1},
                    "reps": {"type": "integer", "minimum": 1},
                    "weights_kg": {
                        "type": "array",
                        "items": {"type": "number"},
                        "description": "Optional per-set weights"
                    }
                },
                "required": ["exercise_name"]  # ← keep only exercise_name strictly required
            }
        }
    },
    "required": ["items"]  # top-level only requires items
}


def _best_exercise_match(db: Session, user_id: int, name: str) -> Exercise | None:
    name_l = (name or "").strip().lower()
    q = select(Exercise).where(
        func.lower(Exercise.name) == name_l,
        (Exercise.user_id == None) | (Exercise.user_id == user_id)  # noqa: E711
    )
    ex = db.execute(q).scalar_one_or_none()
    if ex:
        return ex
    q2 = select(Exercise).where(
        func.lower(Exercise.name).like(f"{name_l}%"),
        (Exercise.user_id == None) | (Exercise.user_id == user_id)
    )
    return db.execute(q2).scalars().first()

@router.post("/log")
async def voice_log(
    file: UploadFile = File(...),
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    # --- 1) Transcribe with Whisper ---
    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(400, "No audio received")

    bio = BytesIO(audio_bytes)
    bio.name = file.filename or "audio.webm"  # OpenAI SDK wants a filename
    tr = client.audio.transcriptions.create(
        model="whisper-1",
        file=bio,
    )
    transcript = (tr.text or "").strip()
    log.info("Voice transcript length: %d", len(transcript))

    if not transcript or len(transcript) < 2:
        raise HTTPException(400, "Empty/inaudible transcription")

    # --- 2) Parse to structured JSON using Chat + tools (function calling) ---
    chat = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": transcript},
        ],
        tools=[
            {
                "type": "function",
                "function": {
                    "name": "voice_workout_log",
                    "description": "Structured workout log extracted from speech",
                    "parameters": VOICE_PARAMS,
                },
            }
        ],
        tool_choice={"type": "function", "function": {"name": "voice_workout_log"}},
        temperature=0
    )

    choice = chat.choices[0].message
    if not choice.tool_calls or choice.tool_calls[0].function.name != "voice_workout_log":
        raise HTTPException(400, "Failed to parse workout from speech")

    args_raw = choice.tool_calls[0].function.arguments
    try:
        parsed = json.loads(args_raw)
    except Exception:
        log.exception("Bad JSON from model: %s", args_raw)
        raise HTTPException(400, "Parser returned invalid JSON")

    raw_date = parsed.get("date")
    try:
        w_date = _date.fromisoformat(raw_date) if raw_date else _date.today()
    except Exception:
        w_date = _date.today()
    # --- 3) Create workout ---
    w = Workout(
        user_id=user.id,
        date=w_date,
        title=parsed.get("workout_title") or "Voice Log",
        notes=f"Voice: {transcript[:500]}"
    )
    db.add(w); db.flush()

    # --- 4) Insert sets ---
    set_index = 1
    for item in parsed["items"]:
        ex_name = item.get("exercise_name", "").strip()
        if not ex_name:
            continue
        ex = _best_exercise_match(db, user.id, ex_name)
        if not ex:
            ex = Exercise(name=ex_name, user_id=user.id, is_custom=True, muscles=[])
            db.add(ex); db.flush()

        sets = int(item.get("sets") or 1)
        reps = int(item.get("reps") or 8)
        weights = item.get("weights_kg") or []
        if len(weights) < sets:
            # pad with last or zeros
            pad = (weights[-1] if weights else 0.0)
            weights = list(weights) + [pad] * (sets - len(weights))
        elif len(weights) > sets:
            weights = list(weights)[:sets]

        for i in range(sets):
            db.add(SetEntry(
                workout_id=w.id,
                exercise_id=ex.id,
                set_index=set_index,
                reps=reps,
                weight_kg=float(weights[i]) if weights[i] is not None else None,
            ))
            set_index += 1

    db.commit()

    saved = db.execute(
        sq(Workout).where(Workout.id == w.id).options(
            selectinload(Workout.sets).selectinload(SetEntry.exercise)
        )
    ).scalar_one_or_none()

    return {"transcript": transcript, "workout": saved}
