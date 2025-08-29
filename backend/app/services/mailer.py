import smtplib, ssl
from email.message import EmailMessage
from app.core.config import settings

def send_email(to: str, subject: str, text: str) -> None:
    if not (settings.SMTP_HOST and settings.SMTP_FROM):
        # Mail not configured; silently no-op or raise
        return

    msg = EmailMessage()
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(text)

    context = ssl.create_default_context()
    port = settings.SMTP_PORT or 587

    with smtplib.SMTP(settings.SMTP_HOST, port) as server:
        server.ehlo()
        if port == 587:
            server.starttls(context=context)
            server.ehlo()
        if settings.SMTP_USER and settings.SMTP_PASS:
            server.login(settings.SMTP_USER, settings.SMTP_PASS)
        server.send_message(msg)
