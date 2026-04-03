from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date
from database import get_db
from auth import get_current_user, require_admin
from ai_service import generate_hr_insights
import models

router = APIRouter()

@router.get("/overview")
def get_overview(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    total = db.query(models.Employee).count()
    active = db.query(models.Employee).filter(models.Employee.is_active == True).count()
    terminated = db.query(models.Employee).filter(models.Employee.is_active == False).count()
    attrition_rate = round((terminated / total * 100), 1) if total else 0

    # Headcount by department
    dept_counts = db.query(
        models.Employee.department, func.count(models.Employee.id)
    ).filter(models.Employee.is_active == True).group_by(models.Employee.department).all()
    by_dept = [{"department": d or "Unassigned", "count": c} for d, c in dept_counts]

    # Open vs filled positions
    open_jobs = db.query(models.JobPosting).filter(models.JobPosting.is_open == True).count()
    filled_jobs = db.query(models.JobPosting).filter(models.JobPosting.is_open == False).count()
    hired = db.query(models.Candidate).filter(models.Candidate.stage == models.CandidateStage.hired).count()

    # Leave utilization
    approved_leaves = db.query(models.Leave).filter(models.Leave.status == models.LeaveStatus.approved).count()
    total_leaves = db.query(models.Leave).count()
    leave_util = round((approved_leaves / total_leaves * 100), 1) if total_leaves else 0

    # Average tenure
    employees = db.query(models.Employee).filter(
        models.Employee.is_active == True,
        models.Employee.joining_date != None
    ).all()
    today = date.today()
    tenures = [(today - e.joining_date).days / 365 for e in employees if e.joining_date]
    avg_tenure = round(sum(tenures) / len(tenures), 1) if tenures else 0

    return {
        "total_employees": total,
        "active_employees": active,
        "terminated_employees": terminated,
        "attrition_rate": attrition_rate,
        "by_department": by_dept,
        "open_positions": open_jobs,
        "filled_positions": filled_jobs,
        "total_hired": hired,
        "leave_utilization_rate": leave_util,
        "avg_tenure_years": avg_tenure
    }

@router.post("/ai-insights")
def ai_insights(db: Session = Depends(get_db), current_user: models.User = Depends(require_admin)):
    # Collect stats
    total = db.query(models.Employee).count()
    active = db.query(models.Employee).filter(models.Employee.is_active == True).count()
    terminated = db.query(models.Employee).filter(models.Employee.is_active == False).count()
    attrition_rate = round((terminated / total * 100), 1) if total else 0

    dept_counts = db.query(
        models.Employee.department, func.count(models.Employee.id)
    ).filter(models.Employee.is_active == True).group_by(models.Employee.department).all()

    open_jobs = db.query(models.JobPosting).filter(models.JobPosting.is_open == True).count()
    pending_leaves = db.query(models.Leave).filter(models.Leave.status == models.LeaveStatus.pending).count()

    employees = db.query(models.Employee).filter(
        models.Employee.is_active == True,
        models.Employee.joining_date != None
    ).all()
    today = date.today()
    tenures = [(today - e.joining_date).days / 365 for e in employees if e.joining_date]
    avg_tenure = round(sum(tenures) / len(tenures), 1) if tenures else 0

    stats = {
        "total_employees": total,
        "active_employees": active,
        "attrition_rate_percent": attrition_rate,
        "headcount_by_department": {d or "Unassigned": c for d, c in dept_counts},
        "open_job_positions": open_jobs,
        "pending_leave_requests": pending_leaves,
        "average_tenure_years": avg_tenure,
        "month": date.today().strftime("%B %Y")
    }

    insights = generate_hr_insights(stats)
    return {"insights": insights, "stats": stats}

@router.get("/recruitment-funnel")
def recruitment_funnel(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    stages = ["Applied", "Screening", "Interview", "Offer", "Hired", "Rejected"]
    result = []
    for stage in stages:
        count = db.query(models.Candidate).filter(
            models.Candidate.stage == models.CandidateStage(stage)
        ).count()
        result.append({"stage": stage, "count": count})
    return result
