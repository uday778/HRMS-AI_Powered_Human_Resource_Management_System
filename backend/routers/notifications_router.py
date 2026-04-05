from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from auth import get_current_user, require_admin
import models
from services.notification_service import (
    get_user_notifications,
    get_unread_count,
    mark_as_read,
    mark_all_read,
    create_notification,
)
from services.notification_triggers import run_all_triggers

router = APIRouter()


class NotificationOut(BaseModel):
    id: int
    title: str
    message: str
    type: str
    is_read: bool
    action_url: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


class CreateNotifRequest(BaseModel):
    user_id: int
    title: str
    message: str
    type: str = "info"
    action_url: Optional[str] = None


@router.get("", response_model=list[NotificationOut])
def list_notifications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    notifs = get_user_notifications(db, current_user.id)
    return [
        NotificationOut(
            id=n.id,
            title=n.title,
            message=n.message,
            type=n.type.value,
            is_read=n.is_read,
            action_url=n.action_url,
            created_at=str(n.created_at),
        )
        for n in notifs
    ]


@router.get("/unread-count")
def unread_count(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    count = get_unread_count(db, current_user.id)
    return {"count": count}


@router.put("/{notif_id}/read")
def read_notification(
    notif_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    success = mark_as_read(db, notif_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Marked as read"}


@router.put("/mark-all-read")
def read_all(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    mark_all_read(db, current_user.id)
    return {"message": "All notifications marked as read"}


@router.post("/run-triggers")
def trigger_notifications(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    """Manually trigger all notification checks — admin only."""
    background_tasks.add_task(run_all_triggers, db)
    return {"message": "Notification triggers running in background"}


@router.post("/create")
def create_notif(
    req: CreateNotifRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    """Manually create a notification for any user — admin only."""
    notif = create_notification(
        db, req.user_id, req.title, req.message, req.type, req.action_url
    )
    return {"id": notif.id, "message": "Notification created"}


@router.delete("/{notif_id}")
def delete_notification(
    notif_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    notif = (
        db.query(models.Notification)
        .filter(
            models.Notification.id == notif_id,
            models.Notification.user_id == current_user.id,
        )
        .first()
    )
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    db.delete(notif)
    db.commit()
    return {"message": "Deleted"}
