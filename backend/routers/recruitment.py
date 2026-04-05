import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json
import re
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db
from security import get_current_user, require_admin, require_manager_or_admin
from ai_service import score_resume, generate_interview_questions
import models

router = APIRouter()

RESUME_DIR = "uploads/resumes"
os.makedirs(RESUME_DIR, exist_ok=True)


class JobCreate(BaseModel):
    title: str
    department: str
    description: str
    required_skills: str
    experience_level: str


class StageUpdate(BaseModel):
    stage: str


@router.get("/jobs")
def list_jobs(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    jobs = db.query(models.JobPosting).all()
    return [{
        "id": j.id, "title": j.title, "department": j.department,
        "description": j.description, "required_skills": j.required_skills,
        "experience_level": j.experience_level, "is_open": j.is_open,
        "created_at": str(j.created_at),
        "candidate_count": len(j.candidates)
    } for j in jobs]


@router.post("/jobs")
def create_job(job: JobCreate, db: Session = Depends(get_db), current_user: models.User = Depends(require_admin)):
    new_job = models.JobPosting(**job.dict())
    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    return {"id": new_job.id, "message": "Job posting created"}


@router.put("/jobs/{job_id}")
def update_job(job_id: int, job: JobCreate, db: Session = Depends(get_db), current_user: models.User = Depends(require_admin)):
    j = db.query(models.JobPosting).filter(models.JobPosting.id == job_id).first()
    if not j:
        raise HTTPException(status_code=404, detail="Job not found")
    for k, v in job.dict().items():
        setattr(j, k, v)
    db.commit()
    return {"message": "Updated"}


@router.delete("/jobs/{job_id}")
def close_job(job_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(require_admin)):
    j = db.query(models.JobPosting).filter(models.JobPosting.id == job_id).first()
    if not j:
        raise HTTPException(status_code=404, detail="Job not found")
    j.is_open = False
    db.commit()
    return {"message": "Job closed"}


@router.get("/jobs/{job_id}/candidates")
def get_candidates(job_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    candidates = db.query(models.Candidate).filter(models.Candidate.job_id == job_id).all()
    return [_cand_to_dict(c) for c in candidates]


@router.post("/jobs/{job_id}/candidates")
async def add_candidate(
    job_id: int,
    name: str = Form(...),
    email: str = Form(...),
    resume: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_manager_or_admin)
):
    job = db.query(models.JobPosting).filter(models.JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    resume_bytes = await resume.read()
    safe_name = re.sub(r'[^\w\-_.]', '_', name.strip())
    original_filename = os.path.basename(resume.filename or "resume.txt")
    clean_filename = f"{job_id}_{safe_name}_{original_filename}"
    resume_path = os.path.join(RESUME_DIR, clean_filename)

    with open(resume_path, "wb") as f:
        f.write(resume_bytes)

    resume_text = extract_resume_text(resume_bytes, original_filename)

    cand = models.Candidate(
        job_id=job_id, name=name, email=email,
        resume_path=resume_path, resume_text=resume_text
    )
    db.add(cand)
    db.commit()
    db.refresh(cand)

    if resume_text:
        try:
            ai_result = score_resume(resume_text, job.description, job.required_skills)
            cand.ai_score = ai_result.get("match_percentage", 0)
            cand.ai_reasoning = ai_result.get("reasoning", "")
            cand.ai_strengths = json.dumps(ai_result.get("strengths", []))
            cand.ai_gaps = json.dumps(ai_result.get("gaps", []))
            questions = generate_interview_questions(
                job.title, job.description,
                ai_result.get("strengths", []), ai_result.get("gaps", [])
            )
            cand.ai_questions = json.dumps(questions)
            db.commit()
        except Exception as e:
            print(f"AI scoring error: {e}")

    return _cand_to_dict(cand)


@router.put("/candidates/{cand_id}/stage")
def update_stage(cand_id: int, update: StageUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(require_manager_or_admin)):
    cand = db.query(models.Candidate).filter(models.Candidate.id == cand_id).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")
    valid_stages = [s.value for s in models.CandidateStage]
    if update.stage not in valid_stages:
        raise HTTPException(status_code=400, detail=f"Invalid stage. Must be one of: {valid_stages}")
    cand.stage = models.CandidateStage(update.stage)
    db.commit()
    return {"message": f"Stage updated to {update.stage}"}


@router.get("/candidates/{cand_id}")
def get_candidate(cand_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    cand = db.query(models.Candidate).filter(models.Candidate.id == cand_id).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return _cand_to_dict(cand)


@router.post("/candidates/{cand_id}/rescore")
def rescore(cand_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(require_manager_or_admin)):
    cand = db.query(models.Candidate).filter(models.Candidate.id == cand_id).first()
    if not cand or not cand.resume_text:
        raise HTTPException(status_code=404, detail="Candidate or resume not found")
    job = cand.job
    ai_result = score_resume(cand.resume_text, job.description, job.required_skills)
    cand.ai_score = ai_result.get("match_percentage", 0)
    cand.ai_reasoning = ai_result.get("reasoning", "")
    cand.ai_strengths = json.dumps(ai_result.get("strengths", []))
    cand.ai_gaps = json.dumps(ai_result.get("gaps", []))
    questions = generate_interview_questions(
        job.title, job.description,
        ai_result.get("strengths", []), ai_result.get("gaps", [])
    )
    cand.ai_questions = json.dumps(questions)
    db.commit()
    return _cand_to_dict(cand)


def extract_resume_text(content: bytes, filename: str = "") -> str:
    if filename.lower().endswith(".pdf"):
        try:
            import fitz
            doc = fitz.open(stream=content, filetype="pdf")
            return "\n".join([page.get_text() for page in doc])
        except Exception as e:
            print(f"PDF parse error: {e}")
    try:
        return content.decode("utf-8", errors="ignore")
    except Exception:
        return ""


def _cand_to_dict(c: models.Candidate):
    return {
        "id": c.id, "job_id": c.job_id, "name": c.name, "email": c.email,
        "stage": c.stage.value if c.stage else "Applied",
        "ai_score": c.ai_score,
        "ai_reasoning": c.ai_reasoning,
        "ai_strengths": json.loads(c.ai_strengths) if c.ai_strengths else [],
        "ai_gaps": json.loads(c.ai_gaps) if c.ai_gaps else [],
        "ai_questions": json.loads(c.ai_questions) if c.ai_questions else [],
        "created_at": str(c.created_at)
    }