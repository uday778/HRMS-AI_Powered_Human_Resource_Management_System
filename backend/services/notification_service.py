import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
import models
from config import settings

logger = logging.getLogger(__name__)


def create_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    notif_type: str = "info",
    action_url: Optional[str] = None,
) -> models.Notification:
    notif = models.Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=models.NotificationType(notif_type),
        action_url=action_url,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif


def notify_user(
    db: Session,
    user: models.User,
    title: str,
    message: str,
    notif_type: str = "info",
    action_url: Optional[str] = None,
) -> models.Notification:
    notif = create_notification(db, user.id, title, message, notif_type, action_url)
    if notif_type == "critical":
        try:
            send_email(user.email, title, message)
        except Exception as e:
            logger.error(f"Email send failed for {user.email}: {e}")
    return notif


def send_email(to_email: str, subject: str, body: str):
    if not settings.SMTP_EMAIL or not settings.SMTP_PASSWORD:
        logger.warning("SMTP not configured — skipping email")
        return

    html_body = f"""
    <html>
    <body style="font-family: 'Segoe UI', sans-serif; background: #f4f6fa; padding: 30px;">
      <div style="max-width: 560px; margin: auto; background: white; border-radius: 12px;
                  box-shadow: 0 2px 12px rgba(0,0,0,0.08); overflow: hidden;">
        <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 24px 32px;">
          <h1 style="color: white; margin: 0; font-size: 20px;">⚠️ HRMS Alert</h1>
        </div>
        <div style="padding: 28px 32px;">
          <h2 style="color: #1e1b4b; margin-top: 0;">{subject}</h2>
          <p style="color: #475569; line-height: 1.7;">{body}</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px;">
            This is an automated alert from your AI-Powered HRMS.
          </p>
        </div>
      </div>
    </body>
    </html>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"[HRMS Alert] {subject}"
    msg["From"] = settings.SMTP_EMAIL
    msg["To"] = to_email
    msg.attach(MIMEText(body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.starttls()
        server.login(settings.SMTP_EMAIL, settings.SMTP_PASSWORD)
        server.sendmail(settings.SMTP_EMAIL, to_email, msg.as_string())
    logger.info(f"Email sent to {to_email}: {subject}")


def get_user_notifications(db: Session, user_id: int, limit: int = 50):
    return (
        db.query(models.Notification)
        .filter(models.Notification.user_id == user_id)
        .order_by(models.Notification.created_at.desc())
        .limit(limit)
        .all()
    )


def get_unread_count(db: Session, user_id: int) -> int:
    return (
        db.query(models.Notification)
        .filter(
            models.Notification.user_id == user_id,
            models.Notification.is_read == False,
        )
        .count()
    )


def mark_as_read(db: Session, notif_id: int, user_id: int) -> bool:
    notif = (
        db.query(models.Notification)
        .filter(
            models.Notification.id == notif_id,
            models.Notification.user_id == user_id,
        )
        .first()
    )
    if not notif:
        return False
    notif.is_read = True
    db.commit()
    return True


def mark_all_read(db: Session, user_id: int):
    db.query(models.Notification).filter(
        models.Notification.user_id == user_id,
        models.Notification.is_read == False,
    ).update({"is_read": True})
    db.commit()
