import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import date
from database import get_db
from security import get_current_user, require_manager_or_admin
from ai_service import analyze_leave_patterns, predict_capacity_risk
import models

router = APIRouter()

class LeaveCreate(BaseModel):
    leave_type: str
    start_date: str
    end_date: str
    reason: str

class LeaveDecision(BaseModel):
    status: str
    comment: Optional[str] = None

class AttendanceCreate(BaseModel):
    employee_id: int
    date: str
    status: str

@router.get("")
def list_leaves(
    employee_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    q = db.query(models.Leave)
    # Employees can only see own leaves
    if current_user.role == models.UserRole.employee:
        emp = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
        if emp:
            q = q.filter(models.Leave.employee_id == emp.id)
    elif employee_id:
        q = q.filter(models.Leave.employee_id == employee_id)
    if status:
        q = q.filter(models.Leave.status == models.LeaveStatus(status))
    leaves = q.order_by(models.Leave.created_at.desc()).all()
    return [_leave_to_dict(l) for l in leaves]

@router.post("")
def apply_leave(leave: LeaveCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    emp = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
    if not emp and current_user.role != models.UserRole.admin:
        raise HTTPException(status_code=400, detail="No employee profile linked to this account")
    employee_id = emp.id if emp else None
    new_leave = models.Leave(
        employee_id=employee_id,
        leave_type=models.LeaveType(leave.leave_type),
        start_date=date.fromisoformat(leave.start_date),
        end_date=date.fromisoformat(leave.end_date),
        reason=leave.reason
    )
    db.add(new_leave)
    db.commit()
    db.refresh(new_leave)
    return _leave_to_dict(new_leave)

@router.post("/admin-apply")
def admin_apply_leave(
    employee_id: int,
    leave: LeaveCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_manager_or_admin)
):
    new_leave = models.Leave(
        employee_id=employee_id,
        leave_type=models.LeaveType(leave.leave_type),
        start_date=date.fromisoformat(leave.start_date),
        end_date=date.fromisoformat(leave.end_date),
        reason=leave.reason
    )
    db.add(new_leave)
    db.commit()
    db.refresh(new_leave)
    return _leave_to_dict(new_leave)

@router.put("/{leave_id}/decide")
def decide_leave(leave_id: int, decision: LeaveDecision, db: Session = Depends(get_db), current_user: models.User = Depends(require_manager_or_admin)):
    leave = db.query(models.Leave).filter(models.Leave.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave not found")
    leave.status = models.LeaveStatus(decision.status)
    leave.manager_comment = decision.comment
    emp = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
    if emp:
        leave.manager_id = emp.id
    db.commit()
    return _leave_to_dict(leave)

@router.get("/balance/{employee_id}")
def leave_balance(employee_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Default allocations
    allocations = {"Sick": 12, "Casual": 12, "Earned": 21, "WFH": 52}
    used = {}
    leaves = db.query(models.Leave).filter(
        models.Leave.employee_id == employee_id,
        models.Leave.status == models.LeaveStatus.approved
    ).all()
    for l in leaves:
        lt = l.leave_type.value
        days = (l.end_date - l.start_date).days + 1
        used[lt] = used.get(lt, 0) + days
    balance = {}
    for lt, total in allocations.items():
        balance[lt] = {"total": total, "used": used.get(lt, 0), "remaining": total - used.get(lt, 0)}
    return balance

@router.get("/calendar")
def leave_calendar(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    leaves = db.query(models.Leave).filter(models.Leave.status == models.LeaveStatus.approved).all()
    result = []
    for l in leaves:
        emp = db.query(models.Employee).filter(models.Employee.id == l.employee_id).first()
        result.append({
            "id": l.id,
            "employee_name": emp.name if emp else "Unknown",
            "leave_type": l.leave_type.value,
            "start_date": str(l.start_date),
            "end_date": str(l.end_date)
        })
    return result

@router.post("/ai/analyze-patterns/{employee_id}")
def analyze_patterns(employee_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(require_manager_or_admin)):
    leaves = db.query(models.Leave).filter(models.Leave.employee_id == employee_id).all()
    leave_data = [{
        "type": l.leave_type.value,
        "start": str(l.start_date),
        "end": str(l.end_date),
        "status": l.status.value,
        "day_of_week_start": l.start_date.strftime("%A") if l.start_date else None
    } for l in leaves]
    analysis = analyze_leave_patterns(leave_data)
    return {"analysis": analysis}

@router.post("/ai/capacity-risk")
def capacity_risk(db: Session = Depends(get_db), current_user: models.User = Depends(require_manager_or_admin)):
    pending = db.query(models.Leave).filter(
        models.Leave.status.in_([models.LeaveStatus.pending, models.LeaveStatus.approved])
    ).all()
    team_leaves = [{
        "employee_id": l.employee_id,
        "type": l.leave_type.value,
        "start": str(l.start_date),
        "end": str(l.end_date)
    } for l in pending]
    total_emp = db.query(models.Employee).filter(models.Employee.is_active == True).count()
    risk = predict_capacity_risk(team_leaves, total_emp)
    return {"risk_assessment": risk}

# Attendance
@router.post("/attendance")
def mark_attendance(att: AttendanceCreate, db: Session = Depends(get_db), current_user: models.User = Depends(require_manager_or_admin)):
    existing = db.query(models.Attendance).filter(
        models.Attendance.employee_id == att.employee_id,
        models.Attendance.date == date.fromisoformat(att.date)
    ).first()
    if existing:
        existing.status = att.status
        db.commit()
        return {"message": "Updated"}
    record = models.Attendance(
        employee_id=att.employee_id,
        date=date.fromisoformat(att.date),
        status=att.status
    )
    db.add(record)
    db.commit()
    return {"message": "Attendance marked"}

@router.get("/attendance/{employee_id}")
def get_attendance(employee_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    records = db.query(models.Attendance).filter(models.Attendance.employee_id == employee_id).all()
    return [{"date": str(r.date), "status": r.status} for r in records]

def _leave_to_dict(l: models.Leave):
    return {
        "id": l.id,
        "employee_id": l.employee_id,
        "leave_type": l.leave_type.value,
        "start_date": str(l.start_date),
        "end_date": str(l.end_date),
        "reason": l.reason,
        "status": l.status.value,
        "manager_comment": l.manager_comment,
        "ai_flag": l.ai_flag,
        "created_at": str(l.created_at)
    }