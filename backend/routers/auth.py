from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from auth import verify_password, get_password_hash, create_access_token, get_current_user
import models

router = APIRouter()

class RegisterRequest(BaseModel):
    email: str
    password: str
    role: str = "employee"

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    email: str
    user_id: int

@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    role = models.UserRole(req.role) if req.role in ["admin", "manager", "employee"] else models.UserRole.employee
    user = models.User(
        email=req.email,
        hashed_password=get_password_hash(req.password),
        role=role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "User created successfully", "id": user.id}

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(data={"sub": user.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role.value,
        "email": user.email,
        "user_id": user.id
    }

@router.get("/me")
def me(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    emp = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
    return {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role.value,
        "employee_id": emp.id if emp else None,
        "name": emp.name if emp else current_user.email
    }

@router.post("/seed-admin")
def seed_admin(db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == "admin@hrms.com").first()
    if existing:
        return {"message": "Admin already exists"}
    user = models.User(
        email="admin@hrms.com",
        hashed_password=get_password_hash("admin123"),
        role=models.UserRole.admin
    )
    db.add(user)
    db.commit()
    return {"message": "Admin created", "email": "admin@hrms.com", "password": "admin123"}
