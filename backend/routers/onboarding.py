import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from database import get_db
from auth import get_current_user, require_admin
from ai_service import chatbot_answer
from config import settings
import models

router = APIRouter()

POLICY_DIR = "uploads/policies"
os.makedirs(POLICY_DIR, exist_ok=True)

class TemplateCreate(BaseModel):
    role: str

class ItemCreate(BaseModel):
    title: str
    description: str
    due_days: int
    assignee: str

class ChatRequest(BaseModel):
    question: str

class AssignOnboarding(BaseModel):
    employee_id: int
    template_id: int

@router.get("/templates")
def list_templates(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    templates = db.query(models.OnboardingTemplate).all()
    return [{
        "id": t.id, "role": t.role,
        "items": [{"id": i.id, "title": i.title, "description": i.description,
                   "due_days": i.due_days, "assignee": i.assignee} for i in t.items]
    } for t in templates]

@router.post("/templates")
def create_template(tmpl: TemplateCreate, db: Session = Depends(get_db), current_user: models.User = Depends(require_admin)):
    new = models.OnboardingTemplate(role=tmpl.role)
    db.add(new)
    db.commit()
    db.refresh(new)
    return {"id": new.id, "message": "Template created"}

@router.post("/templates/{template_id}/items")
def add_item(template_id: int, item: ItemCreate, db: Session = Depends(get_db), current_user: models.User = Depends(require_admin)):
    tmpl = db.query(models.OnboardingTemplate).filter(models.OnboardingTemplate.id == template_id).first()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found")
    new_item = models.OnboardingItem(template_id=template_id, **item.dict())
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return {"id": new_item.id, "message": "Item added"}

@router.delete("/templates/{template_id}/items/{item_id}")
def delete_item(template_id: int, item_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(require_admin)):
    item = db.query(models.OnboardingItem).filter(
        models.OnboardingItem.id == item_id,
        models.OnboardingItem.template_id == template_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(item)
    db.commit()
    return {"message": "Deleted"}

@router.post("/assign")
def assign_onboarding(data: AssignOnboarding, db: Session = Depends(get_db), current_user: models.User = Depends(require_admin)):
    tmpl = db.query(models.OnboardingTemplate).filter(models.OnboardingTemplate.id == data.template_id).first()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found")
    for item in tmpl.items:
        existing = db.query(models.OnboardingProgress).filter(
            models.OnboardingProgress.employee_id == data.employee_id,
            models.OnboardingProgress.item_id == item.id
        ).first()
        if not existing:
            prog = models.OnboardingProgress(employee_id=data.employee_id, item_id=item.id)
            db.add(prog)
    db.commit()
    return {"message": "Onboarding checklist assigned"}

@router.get("/progress/{employee_id}")
def get_progress(employee_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    progress = db.query(models.OnboardingProgress).filter(
        models.OnboardingProgress.employee_id == employee_id
    ).all()
    return [{
        "id": p.id,
        "item_id": p.item_id,
        "title": p.item.title,
        "description": p.item.description,
        "due_days": p.item.due_days,
        "assignee": p.item.assignee,
        "is_done": p.is_done,
        "completed_at": str(p.completed_at) if p.completed_at else None
    } for p in progress]

@router.put("/progress/{progress_id}/complete")
def complete_item(progress_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    from datetime import datetime
    prog = db.query(models.OnboardingProgress).filter(models.OnboardingProgress.id == progress_id).first()
    if not prog:
        raise HTTPException(status_code=404, detail="Progress item not found")
    prog.is_done = True
    prog.completed_at = datetime.utcnow()
    db.commit()
    return {"message": "Item marked complete"}

# Policy documents
@router.post("/upload-policy")
async def upload_policy(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: models.User = Depends(require_admin)):
    content_bytes = await file.read()
    path = os.path.join(POLICY_DIR, file.filename)
    with open(path, "wb") as f:
        f.write(content_bytes)
    
    # Extract text
    text = extract_policy_text(path, content_bytes, file.filename)
    
    doc = models.PolicyDocument(filename=file.filename, file_path=path, content=text)
    db.add(doc)
    db.commit()
    return {"message": "Policy document uploaded", "filename": file.filename}

@router.get("/policies")
def list_policies(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    docs = db.query(models.PolicyDocument).all()
    return [{"id": d.id, "filename": d.filename, "uploaded_at": str(d.uploaded_at)} for d in docs]

@router.delete("/policies/{policy_id}")
def delete_policy(policy_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(require_admin)):
    doc = db.query(models.PolicyDocument).filter(models.PolicyDocument.id == policy_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Policy not found")
    db.delete(doc)
    db.commit()
    return {"message": "Deleted"}

@router.post("/chatbot")
def ask_chatbot(req: ChatRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    docs = db.query(models.PolicyDocument).all()
    if not docs:
        answer = f"No policy documents have been uploaded yet. Please contact HR at {settings.HR_EMAIL}"
        was_answered = False
    else:
        context = "\n\n---\n\n".join([f"Document: {d.filename}\n{d.content}" for d in docs])
        answer = chatbot_answer(req.question, context, settings.HR_EMAIL)
        was_answered = settings.HR_EMAIL not in answer

    # Log query
    log = models.ChatbotQuery(question=req.question, answer=answer, was_answered=was_answered)
    db.add(log)
    db.commit()
    return {"answer": answer, "was_answered": was_answered}

@router.get("/chatbot/top-questions")
def top_questions(db: Session = Depends(get_db), current_user: models.User = Depends(require_admin)):
    queries = db.query(models.ChatbotQuery).order_by(models.ChatbotQuery.created_at.desc()).limit(50).all()
    return [{
        "id": q.id, "question": q.question,
        "was_answered": q.was_answered, "created_at": str(q.created_at)
    } for q in queries]

def extract_policy_text(path: str, content: bytes, filename: str) -> str:
    if filename.endswith(".pdf"):
        try:
            import fitz
            doc = fitz.open(stream=content, filetype="pdf")
            return "\n".join([page.get_text() for page in doc])
        except:
            return content.decode("utf-8", errors="ignore")
    elif filename.endswith(".txt"):
        return content.decode("utf-8", errors="ignore")
    else:
        return content.decode("utf-8", errors="ignore")
