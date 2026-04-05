"""
Smart notification triggers — run these on schedule or after key events.
Each function checks a business condition and fires notifications if needed.
"""
import logging
from datetime import date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
import models
from services.notification_service import create_notification

logger = logging.getLogger(__name__)


def _get_all_admins(db: Session):
    return db.query(models.User).filter(models.User.role == models.UserRole.admin).all()


def _get_all_managers(db: Session):
    return db.query(models.User).filter(
        models.User.role.in_([models.UserRole.manager, models.UserRole.admin])
    ).all()


def check_attrition_rate(db: Session):
    """Alert admins if attrition rate exceeds 15%."""
    total = db.query(models.Employee).count()
    if total == 0:
        return
    terminated = db.query(models.Employee).filter(
        models.Employee.is_active == False
    ).count()
    rate = (terminated / total) * 100

    if rate >= 15:
        for admin in _get_all_admins(db):
            create_notification(
                db, admin.id,
                title="⚠️ High Attrition Rate Detected",
                message=f"Attrition rate is {rate:.1f}% ({terminated} of {total} employees). Immediate HR review recommended.",
                notif_type="critical",
                action_url="/analytics",
            )
        logger.info(f"Attrition alert fired — rate: {rate:.1f}%")


def check_pending_leaves(db: Session):
    """Warn managers if there are 5+ pending leave requests."""
    pending_count = db.query(models.Leave).filter(
        models.Leave.status == models.LeaveStatus.pending
    ).count()

    if pending_count >= 5:
        for manager in _get_all_managers(db):
            create_notification(
                db, manager.id,
                title="📋 Pending Leave Requests",
                message=f"There are {pending_count} leave requests awaiting your approval.",
                notif_type="warning",
                action_url="/leaves",
            )


def check_team_capacity_risk(db: Session):
    """Warn if more than 30% of team is on leave on same day."""
    today = date.today()
    total_active = db.query(models.Employee).filter(
        models.Employee.is_active == True
    ).count()
    if total_active == 0:
        return

    on_leave = db.query(models.Leave).filter(
        models.Leave.status == models.LeaveStatus.approved,
        models.Leave.start_date <= today,
        models.Leave.end_date >= today,
    ).count()

    if total_active > 0 and (on_leave / total_active) >= 0.30:
        for manager in _get_all_managers(db):
            create_notification(
                db, manager.id,
                title="🚨 Team Capacity Risk",
                message=f"{on_leave} of {total_active} employees are on leave today ({int(on_leave/total_active*100)}%). Team capacity is critically low.",
                notif_type="critical",
                action_url="/leaves",
            )


def check_open_positions(db: Session):
    """Inform admins about open job positions."""
    open_jobs = db.query(models.JobPosting).filter(
        models.JobPosting.is_open == True
    ).count()

    if open_jobs > 0:
        for admin in _get_all_admins(db):
            create_notification(
                db, admin.id,
                title="💼 Open Positions Reminder",
                message=f"You have {open_jobs} open job posting(s) with active recruitment ongoing.",
                notif_type="info",
                action_url="/recruitment",
            )


def check_pending_reviews(db: Session):
    """Warn managers about active review cycles with no submissions."""
    active_cycles = db.query(models.ReviewCycle).filter(
        models.ReviewCycle.is_active == True
    ).all()

    for cycle in active_cycles:
        review_count = db.query(models.PerformanceManagerReview).filter(
            models.PerformanceManagerReview.cycle_id == cycle.id
        ).count()

        if review_count == 0:
            for manager in _get_all_managers(db):
                create_notification(
                    db, manager.id,
                    title="⭐ Performance Reviews Pending",
                    message=f"Review cycle '{cycle.name}' has no manager reviews submitted yet. Please complete your team's reviews.",
                    notif_type="warning",
                    action_url="/performance",
                )


def check_new_employees(db: Session):
    """Notify admins about employees who joined in the last 7 days."""
    week_ago = date.today() - timedelta(days=7)
    new_emps = db.query(models.Employee).filter(
        models.Employee.joining_date >= week_ago,
        models.Employee.is_active == True,
    ).all()

    if new_emps:
        names = ", ".join([e.name for e in new_emps[:3]])
        extra = f" and {len(new_emps) - 3} more" if len(new_emps) > 3 else ""
        for admin in _get_all_admins(db):
            create_notification(
                db, admin.id,
                title="👋 New Employees Joined",
                message=f"{len(new_emps)} new employee(s) joined this week: {names}{extra}. Ensure onboarding is assigned.",
                notif_type="info",
                action_url="/employees",
            )


def run_all_triggers(db: Session):
    """Run all trigger checks — call this on schedule or manually."""
    logger.info("Running notification triggers...")
    try:
        check_attrition_rate(db)
        check_pending_leaves(db)
        check_team_capacity_risk(db)
        check_open_positions(db)
        check_pending_reviews(db)
        check_new_employees(db)
        logger.info("All notification triggers completed.")
    except Exception as e:
        logger.error(f"Trigger error: {e}")