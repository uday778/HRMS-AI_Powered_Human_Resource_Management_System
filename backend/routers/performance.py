import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db
from security import get_current_user, require_admin, require_manager_or_admin
from ai_service import generate_performance_summary
import models
import io

router = APIRouter()

class CycleCreate(BaseModel):
    name: str
    period: str

class SelfReviewCreate(BaseModel):
    cycle_id: int
    achievements: str
    challenges: str
    goals_next: str
    rating: float

class ManagerReviewCreate(BaseModel):
    cycle_id: int
    employee_id: int
    quality: float
    delivery: float
    communication: float
    initiative: float
    teamwork: float
    comments: Optional[str] = ""

@router.get("/cycles")
def list_cycles(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    cycles = db.query(models.ReviewCycle).all()
    return [{"id": c.id, "name": c.name, "period": c.period, "is_active": c.is_active} for c in cycles]

@router.post("/cycles")
def create_cycle(cycle: CycleCreate, db: Session = Depends(get_db), current_user: models.User = Depends(require_admin)):
    new = models.ReviewCycle(**cycle.dict())
    db.add(new)
    db.commit()
    db.refresh(new)
    return {"id": new.id, "message": "Review cycle created"}

@router.post("/self-review")
def submit_self_review(review: SelfReviewCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    emp = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
    if not emp:
        raise HTTPException(status_code=400, detail="No employee profile linked")
    existing = db.query(models.PerformanceSelfReview).filter(
        models.PerformanceSelfReview.cycle_id == review.cycle_id,
        models.PerformanceSelfReview.employee_id == emp.id
    ).first()
    if existing:
        existing.achievements = review.achievements
        existing.challenges = review.challenges
        existing.goals_next = review.goals_next
        existing.rating = review.rating
        db.commit()
        return {"message": "Self review updated"}
    new = models.PerformanceSelfReview(
        cycle_id=review.cycle_id, employee_id=emp.id,
        achievements=review.achievements, challenges=review.challenges,
        goals_next=review.goals_next, rating=review.rating
    )
    db.add(new)
    db.commit()
    return {"message": "Self review submitted"}

@router.post("/manager-review")
def submit_manager_review(review: ManagerReviewCreate, db: Session = Depends(get_db), current_user: models.User = Depends(require_manager_or_admin)):
    manager_emp = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
    manager_id = manager_emp.id if manager_emp else None

    existing = db.query(models.PerformanceManagerReview).filter(
        models.PerformanceManagerReview.cycle_id == review.cycle_id,
        models.PerformanceManagerReview.employee_id == review.employee_id
    ).first()

    self_review = db.query(models.PerformanceSelfReview).filter(
        models.PerformanceSelfReview.cycle_id == review.cycle_id,
        models.PerformanceSelfReview.employee_id == review.employee_id
    ).first()

    emp = db.query(models.Employee).filter(models.Employee.id == review.employee_id).first()

    # Generate AI summary
    self_data = {}
    if self_review:
        self_data = {
            "achievements": self_review.achievements, "challenges": self_review.challenges,
            "goals_next": self_review.goals_next, "rating": self_review.rating
        }
    mgr_data = review.dict()
    ai_result = generate_performance_summary(self_data, mgr_data, emp.name if emp else "Employee")

    if existing:
        for k, v in review.dict().items():
            setattr(existing, k, v)
        existing.manager_id = manager_id
        existing.ai_summary = ai_result.get("summary", "")
        existing.ai_flags = ai_result.get("mismatch_note", "")
        existing.ai_actions = json.dumps(ai_result.get("development_actions", []))
        db.commit()
        return {"message": "Manager review updated", "ai_result": ai_result}

    new = models.PerformanceManagerReview(
        cycle_id=review.cycle_id, employee_id=review.employee_id,
        manager_id=manager_id, **{k: v for k, v in review.dict().items() if k not in ["cycle_id", "employee_id"]},
        ai_summary=ai_result.get("summary", ""),
        ai_flags=ai_result.get("mismatch_note", ""),
        ai_actions=json.dumps(ai_result.get("development_actions", []))
    )
    db.add(new)
    db.commit()
    return {"message": "Manager review submitted", "ai_result": ai_result}

@router.get("/review/{cycle_id}/{employee_id}")
def get_review(cycle_id: int, employee_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    self_r = db.query(models.PerformanceSelfReview).filter(
        models.PerformanceSelfReview.cycle_id == cycle_id,
        models.PerformanceSelfReview.employee_id == employee_id
    ).first()
    mgr_r = db.query(models.PerformanceManagerReview).filter(
        models.PerformanceManagerReview.cycle_id == cycle_id,
        models.PerformanceManagerReview.employee_id == employee_id
    ).first()
    return {
        "self_review": {
            "achievements": self_r.achievements, "challenges": self_r.challenges,
            "goals_next": self_r.goals_next, "rating": self_r.rating
        } if self_r else None,
        "manager_review": {
            "quality": mgr_r.quality, "delivery": mgr_r.delivery,
            "communication": mgr_r.communication, "initiative": mgr_r.initiative,
            "teamwork": mgr_r.teamwork, "comments": mgr_r.comments,
            "ai_summary": mgr_r.ai_summary,
            "ai_flags": mgr_r.ai_flags,
            "ai_actions": json.loads(mgr_r.ai_actions) if mgr_r.ai_actions else []
        } if mgr_r else None
    }

@router.get("/all-reviews/{cycle_id}")
def all_reviews(cycle_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(require_manager_or_admin)):
    mgr_reviews = db.query(models.PerformanceManagerReview).filter(
        models.PerformanceManagerReview.cycle_id == cycle_id
    ).all()
    result = []
    for r in mgr_reviews:
        emp = db.query(models.Employee).filter(models.Employee.id == r.employee_id).first()
        avg = (r.quality + r.delivery + r.communication + r.initiative + r.teamwork) / 5
        result.append({
            "employee_id": r.employee_id,
            "employee_name": emp.name if emp else "Unknown",
            "department": emp.department if emp else "",
            "avg_rating": round(avg, 2),
            "ai_summary": r.ai_summary,
            "ai_flags": r.ai_flags,
            "ai_actions": json.loads(r.ai_actions) if r.ai_actions else []
        })
    return result