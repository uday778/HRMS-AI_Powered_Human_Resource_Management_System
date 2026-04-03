import os, csv, io
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import date
from database import get_db
from auth import get_current_user, require_admin
from ai_service import generate_employee_bio
import models

router = APIRouter()

UPLOAD_DIR = "uploads/employee_docs"
os.makedirs(UPLOAD_DIR, exist_ok=True)

class EmployeeCreate(BaseModel):
    name: str
    email: str
    designation: str
    department: str
    joining_date: Optional[str] = None
    manager_id: Optional[int] = None
    contact: Optional[str] = None
    skills: Optional[str] = None
    user_id: Optional[int] = None

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = None
    joining_date: Optional[str] = None
    manager_id: Optional[int] = None
    contact: Optional[str] = None
    skills: Optional[str] = None
    is_active: Optional[bool] = None
    termination_date: Optional[str] = None

@router.get("")
def list_employees(
    search: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(True),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    q = db.query(models.Employee)
    if is_active is not None:
        q = q.filter(models.Employee.is_active == is_active)
    if department:
        q = q.filter(models.Employee.department == department)
    if search:
        term = f"%{search}%"
        q = q.filter(
            models.Employee.name.ilike(term) |
            models.Employee.email.ilike(term) |
            models.Employee.designation.ilike(term) |
            models.Employee.skills.ilike(term)
        )
    employees = q.all()
    return [_emp_to_dict(e) for e in employees]

@router.post("")
def create_employee(emp: EmployeeCreate, db: Session = Depends(get_db), current_user: models.User = Depends(require_admin)):
    existing = db.query(models.Employee).filter(models.Employee.email == emp.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Employee with this email already exists")
    joining = date.fromisoformat(emp.joining_date) if emp.joining_date else date.today()
    new_emp = models.Employee(
        name=emp.name, email=emp.email, designation=emp.designation,
        department=emp.department, joining_date=joining,
        manager_id=emp.manager_id, contact=emp.contact,
        skills=emp.skills, user_id=emp.user_id
    )
    db.add(new_emp)
    db.commit()
    db.refresh(new_emp)
    return _emp_to_dict(new_emp)

@router.get("/departments")
def get_departments(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    rows = db.query(models.Employee.department).filter(models.Employee.department != None).distinct().all()
    return [r[0] for r in rows if r[0]]

@router.get("/export-csv")
def export_csv(db: Session = Depends(get_db), current_user: models.User = Depends(require_admin)):
    employees = db.query(models.Employee).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Name", "Email", "Designation", "Department", "Joining Date", "Contact", "Skills", "Active"])
    for e in employees:
        writer.writerow([e.id, e.name, e.email, e.designation, e.department,
                         str(e.joining_date) if e.joining_date else "", e.contact or "", e.skills or "", e.is_active])
    output.seek(0)
    return StreamingResponse(io.BytesIO(output.read().encode()),
                             media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=employees.csv"})

@router.get("/org-chart")
def org_chart(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    employees = db.query(models.Employee).filter(models.Employee.is_active == True).all()
    nodes = []
    for e in employees:
        nodes.append({
            "id": e.id,
            "name": e.name,
            "designation": e.designation,
            "department": e.department,
            "manager_id": e.manager_id
        })
    return nodes

@router.get("/{emp_id}")
def get_employee(emp_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    emp = db.query(models.Employee).filter(models.Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    return _emp_to_dict(emp)

@router.put("/{emp_id}")
def update_employee(emp_id: int, data: EmployeeUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(require_admin)):
    emp = db.query(models.Employee).filter(models.Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    for field, val in data.dict(exclude_none=True).items():
        if field in ("joining_date", "termination_date") and val:
            val = date.fromisoformat(val)
        setattr(emp, field, val)
    db.commit()
    db.refresh(emp)
    return _emp_to_dict(emp)

@router.delete("/{emp_id}")
def deactivate_employee(emp_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(require_admin)):
    emp = db.query(models.Employee).filter(models.Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    emp.is_active = False
    emp.termination_date = date.today()
    db.commit()
    return {"message": "Employee deactivated"}

@router.post("/{emp_id}/generate-bio")
def gen_bio(emp_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(require_admin)):
    emp = db.query(models.Employee).filter(models.Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    bio = generate_employee_bio(emp.name, emp.designation or "", emp.department or "", emp.skills or "")
    emp.bio = bio
    db.commit()
    return {"bio": bio}

@router.post("/{emp_id}/upload-document")
async def upload_document(
    emp_id: int,
    doc_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin)
):
    emp = db.query(models.Employee).filter(models.Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    path = os.path.join(UPLOAD_DIR, f"{emp_id}_{file.filename}")
    with open(path, "wb") as f:
        f.write(await file.read())
    doc = models.EmployeeDocument(employee_id=emp_id, filename=file.filename, file_path=path, doc_type=doc_type)
    db.add(doc)
    db.commit()
    return {"message": "Document uploaded", "filename": file.filename}

@router.get("/{emp_id}/documents")
def get_documents(emp_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    docs = db.query(models.EmployeeDocument).filter(models.EmployeeDocument.employee_id == emp_id).all()
    return [{"id": d.id, "filename": d.filename, "doc_type": d.doc_type, "uploaded_at": str(d.uploaded_at)} for d in docs]

def _emp_to_dict(e: models.Employee):
    return {
        "id": e.id, "name": e.name, "email": e.email,
        "designation": e.designation, "department": e.department,
        "joining_date": str(e.joining_date) if e.joining_date else None,
        "manager_id": e.manager_id, "contact": e.contact,
        "skills": e.skills, "bio": e.bio, "is_active": e.is_active,
        "termination_date": str(e.termination_date) if e.termination_date else None,
        "user_id": e.user_id
    }
