import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import Response
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from security import get_current_user, require_admin, require_manager_or_admin
import models
from services.offer_letter_service import (
    generate_offer_letter_ai,
    generate_pdf,
    send_offer_email,
    save_offer_letter,
)

router = APIRouter()

COMPANY_NAME = "HRMS Technologies"
PDF_DIR = "uploads/offer_letters"
os.makedirs(PDF_DIR, exist_ok=True)


# ─── Schemas ──────────────────────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    candidate_name: str
    email: str
    role: str
    department: str = ""
    salary: float
    joining_date: str
    template_id: Optional[int] = None
    candidate_id: Optional[int] = None
    employee_id: Optional[int] = None

class SaveRequest(BaseModel):
    candidate_name: str
    email: str
    role: str
    department: str = ""
    salary: float
    joining_date: str
    generated_content: str
    candidate_id: Optional[int] = None
    employee_id: Optional[int] = None
    template_id: Optional[int] = None

class TemplateCreate(BaseModel):
    name: str
    content: str


# ─── Templates ────────────────────────────────────────────────────────────────

@router.get("/templates")
def list_templates(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    templates = db.query(models.OfferLetterTemplate).all()
    return [{"id": t.id, "name": t.name, "content": t.content, "created_at": str(t.created_at)} for t in templates]


@router.post("/templates")
def create_template(
    req: TemplateCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    t = models.OfferLetterTemplate(name=req.name, content=req.content)
    db.add(t)
    db.commit()
    db.refresh(t)
    return {"id": t.id, "message": "Template created"}


@router.post("/seed-templates")
def seed_templates(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    existing = db.query(models.OfferLetterTemplate).count()
    if existing > 0:
        return {"message": "Templates already seeded"}
    
    templates = [
        {
            "name": "Standard Offer Letter",
            "content": """Dear {candidate_name},

We are delighted to offer you the position of {role} at {company_name}.

POSITION DETAILS
- Role: {role}
- Department: {department}
- Start Date: {joining_date}
- Employment Type: Full-Time, Permanent

COMPENSATION
- Annual CTC: {salary}
- Payment: Monthly disbursement on last working day

TERMS AND CONDITIONS
This offer is subject to successful verification of your credentials. You are expected to maintain confidentiality of all company information.

Please sign and return a copy of this letter within 5 business days to confirm your acceptance.

We look forward to you joining our team.

Sincerely,
HR Department
{company_name}"""
        },
        {
            "name": "Senior Role Offer Letter",
            "content": """Dear {candidate_name},

On behalf of the entire leadership team at {company_name}, it is our distinct pleasure to offer you the position of {role}.

Your expertise and experience stood out among all candidates, and we are confident that you will make significant contributions to our organization.

OFFER SUMMARY
- Designation: {role}
- Reporting To: Department Head
- Location: Head Office
- Date of Joining: {joining_date}

COMPENSATION PACKAGE
- Annual CTC: {salary}
- Performance Bonus: As per company policy
- Benefits: Health insurance, PF, Gratuity

CONFIDENTIALITY
You will be required to sign a Non-Disclosure Agreement on your first day.

We are excited about the possibility of you leading our team and look forward to your positive response.

With warm regards,
HR & Talent Acquisition
{company_name}"""
        }
    ]
    
    for t in templates:
        db.add(models.OfferLetterTemplate(name=t["name"], content=t["content"]))
    db.commit()
    return {"message": f"Seeded {len(templates)} templates"}


# ─── Generate ─────────────────────────────────────────────────────────────────

@router.post("/generate")
def generate(
    req: GenerateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_manager_or_admin),
):
    template_content = None
    if req.template_id:
        tmpl = db.query(models.OfferLetterTemplate).filter(models.OfferLetterTemplate.id == req.template_id).first()
        if tmpl:
            template_content = tmpl.content

    content = generate_offer_letter_ai(
        candidate_name=req.candidate_name,
        role=req.role,
        department=req.department,
        salary=req.salary,
        joining_date=req.joining_date,
        company_name=COMPANY_NAME,
        template_content=template_content,
    )
    return {"content": content}


# ─── Save ─────────────────────────────────────────────────────────────────────

@router.post("/save")
def save(
    req: SaveRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_manager_or_admin),
):
    pdf_bytes = generate_pdf(req.generated_content, req.candidate_name, COMPANY_NAME)
    pdf_path = os.path.join(PDF_DIR, f"offer_{req.candidate_name.replace(' ', '_')}_{req.joining_date}.pdf")
    with open(pdf_path, "wb") as f:
        f.write(pdf_bytes)

    letter = models.OfferLetter(
        candidate_id=req.candidate_id,
        employee_id=req.employee_id,
        template_id=req.template_id,
        generated_content=req.generated_content,
        salary=req.salary,
        role=req.role,
        joining_date=req.joining_date,
        status=models.OfferLetterStatus.draft,
        pdf_path=pdf_path,
        recipient_email=req.email,
        recipient_name=req.candidate_name,
    )
    db.add(letter)
    db.commit()
    db.refresh(letter)
    return {"id": letter.id, "message": "Offer letter saved"}


# ─── Get ──────────────────────────────────────────────────────────────────────

@router.get("/list")
def list_letters(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    letters = db.query(models.OfferLetter).order_by(models.OfferLetter.created_at.desc()).all()
    return [_letter_to_dict(l) for l in letters]


@router.get("/{letter_id}")
def get_letter(
    letter_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    letter = db.query(models.OfferLetter).filter(models.OfferLetter.id == letter_id).first()
    if not letter:
        raise HTTPException(status_code=404, detail="Offer letter not found")
    return _letter_to_dict(letter)


@router.get("/{letter_id}/pdf")
def download_pdf(
    letter_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    letter = db.query(models.OfferLetter).filter(models.OfferLetter.id == letter_id).first()
    if not letter:
        raise HTTPException(status_code=404, detail="Offer letter not found")

    pdf_bytes = generate_pdf(letter.generated_content, letter.recipient_name or "Candidate", COMPANY_NAME)
    name = (letter.recipient_name or "Candidate").replace(" ", "_")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=Offer_Letter_{name}.pdf"}
    )


# ─── Send Email ───────────────────────────────────────────────────────────────

@router.post("/{letter_id}/send")
def send_letter(
    letter_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    letter = db.query(models.OfferLetter).filter(models.OfferLetter.id == letter_id).first()
    if not letter:
        raise HTTPException(status_code=404, detail="Offer letter not found")
    if not letter.recipient_email:
        raise HTTPException(status_code=400, detail="No email address on this offer letter")

    pdf_bytes = generate_pdf(letter.generated_content, letter.recipient_name or "Candidate", COMPANY_NAME)

    background_tasks.add_task(
        send_offer_email,
        to_email=letter.recipient_email,
        candidate_name=letter.recipient_name or "Candidate",
        role=letter.role or "",
        company_name=COMPANY_NAME,
        offer_content=letter.generated_content,
        pdf_bytes=pdf_bytes,
        joining_date=str(letter.joining_date) if letter.joining_date else "",
    )

    letter.status = models.OfferLetterStatus.sent
    db.commit()
    return {"message": f"Offer letter sent to {letter.recipient_email}"}


def _letter_to_dict(l: models.OfferLetter):
    return {
        "id": l.id,
        "candidate_id": l.candidate_id,
        "employee_id": l.employee_id,
        "recipient_name": l.recipient_name,
        "recipient_email": l.recipient_email,
        "role": l.role,
        "salary": l.salary,
        "joining_date": str(l.joining_date) if l.joining_date else None,
        "status": l.status.value if l.status else "draft",
        "generated_content": l.generated_content,
        "created_at": str(l.created_at),
    }
