from __future__ import annotations
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import date, timedelta
from zoneinfo import ZoneInfo
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.user import User
from app.services.stats import compute_weekly_stats, week_bounds
from app.services.summarize import summarize_week
from app.services.mailer import send_email

_scheduler: AsyncIOScheduler | None = None

def _compute_and_send_for_user(db: Session, user: User, week_start: date):
    stats = compute_weekly_stats(db, user.id, week_start)
    summary = summarize_week(stats)
    subject = f"Your Weekly Training Recap • Week of {stats['week_start']}"
    body = f"{summary}\n\n— Workout Tracker"
    if user.email:
        send_email(user.email, subject, body)

def weekly_recap_job():
    tz = ZoneInfo(settings.TIMEZONE)
    today_local = date.today()
    # Compute previous week's Monday (we send on Sunday, recap Mon-Sun)
    this_mon, _ = week_bounds(today_local)
    prev_mon = this_mon - timedelta(days=7)

    with SessionLocal() as db:
        users = db.execute(select(User)).scalars().all()
        for u in users:
            _compute_and_send_for_user(db, u, prev_mon)

def start_scheduler():
    global _scheduler
    if _scheduler:
        return _scheduler

    _scheduler = AsyncIOScheduler(timezone=ZoneInfo(settings.TIMEZONE))
    # Every Sunday at 7pm local time (tweak as you like)
    _scheduler.add_job(
        weekly_recap_job,
        trigger=CronTrigger(day_of_week="sun", hour=19, minute=0, timezone=ZoneInfo(settings.TIMEZONE)),
        id="weekly_recap",
        replace_existing=True,
    )
    _scheduler.start()
    return _scheduler
