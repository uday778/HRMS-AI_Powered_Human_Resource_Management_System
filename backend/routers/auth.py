import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from security import verify_password, get_password_hash, create_access_token, get_current_user
import models

router = APIRouter()


class RegisterRequest(BaseModel):
    email: str
    password: str
    role: str = "employee"
    must_change_password: bool = False


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class ResetPasswordRequest(BaseModel):
    new_password: str


@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    role = models.UserRole(req.role) if req.role in ["admin", "manager", "employee"] else models.UserRole.employee
    user = models.User(
        email=req.email,
        hashed_password=get_password_hash(req.password),
        role=role,
        must_change_password=req.must_change_password,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "User created successfully", "id": user.id}


@router.post("/login")
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
        "user_id": user.id,
        "must_change_password": user.must_change_password,
    }


@router.get("/me")
def me(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    emp = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
    return {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role.value,
        "employee_id": emp.id if emp else None,
        "name": emp.name if emp else current_user.email,
        "must_change_password": current_user.must_change_password,
    }


@router.post("/change-password")
def change_password(
    req: ChangePasswordRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(req.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    current_user.hashed_password = get_password_hash(req.new_password)
    current_user.must_change_password = False
    db.commit()
    return {"message": "Password changed successfully"}


@router.post("/admin-reset-password/{user_id}")
def admin_reset_password(
    user_id: int,
    req: ResetPasswordRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.hashed_password = get_password_hash(req.new_password)
    user.must_change_password = True
    db.commit()
    return {"message": "Password reset. User must change on next login."}


@router.post("/seed-admin")
def seed_admin(db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == "admin@hrms.com").first()
    if existing:
        return {"message": "Admin already exists"}
    user = models.User(
        email="admin@hrms.com",
        hashed_password=get_password_hash("admin123"),
        role=models.UserRole.admin,
        must_change_password=False,
    )
    db.add(user)
    db.commit()
    return {"message": "Admin created", "email": "admin@hrms.com", "password": "admin123"}