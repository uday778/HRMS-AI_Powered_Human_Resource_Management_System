from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, Date, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum

class UserRole(str, enum.Enum):
    admin = "admin"
    manager = "manager"
    employee = "employee"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.employee)
    is_active = Column(Boolean, default=True)
    must_change_password = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    employee = relationship("Employee", back_populates="user", uselist=False)

class Employee(Base):
    __tablename__ = "employees"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    designation = Column(String)
    department = Column(String)
    joining_date = Column(Date)
    manager_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    contact = Column(String)
    skills = Column(Text)  # comma-separated
    bio = Column(Text)
    is_active = Column(Boolean, default=True)
    termination_date = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="employee")
    manager = relationship("Employee", remote_side=[id], foreign_keys=[manager_id])
    documents = relationship("EmployeeDocument", back_populates="employee")
    leaves = relationship("Leave", back_populates="employee", foreign_keys="Leave.employee_id")
    self_reviews = relationship("PerformanceSelfReview", back_populates="employee")
    onboarding_progress = relationship("OnboardingProgress", back_populates="employee")

class EmployeeDocument(Base):
    __tablename__ = "employee_documents"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    filename = Column(String)
    file_path = Column(String)
    doc_type = Column(String)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    employee = relationship("Employee", back_populates="documents")

# Recruitment
class JobPosting(Base):
    __tablename__ = "job_postings"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    department = Column(String)
    description = Column(Text)
    required_skills = Column(Text)
    experience_level = Column(String)
    is_open = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    candidates = relationship("Candidate", back_populates="job")

class CandidateStage(str, enum.Enum):
    applied = "Applied"
    screening = "Screening"
    interview = "Interview"
    offer = "Offer"
    hired = "Hired"
    rejected = "Rejected"

class Candidate(Base):
    __tablename__ = "candidates"
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("job_postings.id"))
    name = Column(String, nullable=False)
    email = Column(String)
    resume_path = Column(String)
    resume_text = Column(Text)
    stage = Column(Enum(CandidateStage), default=CandidateStage.applied)
    ai_score = Column(Float, nullable=True)
    ai_reasoning = Column(Text, nullable=True)
    ai_strengths = Column(Text, nullable=True)
    ai_gaps = Column(Text, nullable=True)
    ai_questions = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    job = relationship("JobPosting", back_populates="candidates")

# Leave
class LeaveType(str, enum.Enum):
    sick = "Sick"
    casual = "Casual"
    earned = "Earned"
    wfh = "WFH"

class LeaveStatus(str, enum.Enum):
    pending = "Pending"
    approved = "Approved"
    rejected = "Rejected"

class Leave(Base):
    __tablename__ = "leaves"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    manager_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    leave_type = Column(Enum(LeaveType))
    start_date = Column(Date)
    end_date = Column(Date)
    reason = Column(Text)
    status = Column(Enum(LeaveStatus), default=LeaveStatus.pending)
    manager_comment = Column(Text, nullable=True)
    ai_flag = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    employee = relationship("Employee", back_populates="leaves", foreign_keys=[employee_id])
    manager = relationship("Employee", foreign_keys=[manager_id])

class Attendance(Base):
    __tablename__ = "attendance"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    date = Column(Date)
    status = Column(String)  # Present, WFH, Half Day, Absent
    employee = relationship("Employee")

# Performance
class ReviewCycle(Base):
    __tablename__ = "review_cycles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    period = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    self_reviews = relationship("PerformanceSelfReview", back_populates="cycle")
    manager_reviews = relationship("PerformanceManagerReview", back_populates="cycle")

class PerformanceSelfReview(Base):
    __tablename__ = "performance_self_reviews"
    id = Column(Integer, primary_key=True, index=True)
    cycle_id = Column(Integer, ForeignKey("review_cycles.id"))
    employee_id = Column(Integer, ForeignKey("employees.id"))
    achievements = Column(Text)
    challenges = Column(Text)
    goals_next = Column(Text)
    rating = Column(Float)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    cycle = relationship("ReviewCycle", back_populates="self_reviews")
    employee = relationship("Employee", back_populates="self_reviews")

class PerformanceManagerReview(Base):
    __tablename__ = "performance_manager_reviews"
    id = Column(Integer, primary_key=True, index=True)
    cycle_id = Column(Integer, ForeignKey("review_cycles.id"))
    employee_id = Column(Integer, ForeignKey("employees.id"))
    manager_id = Column(Integer, ForeignKey("employees.id"))
    quality = Column(Float)
    delivery = Column(Float)
    communication = Column(Float)
    initiative = Column(Float)
    teamwork = Column(Float)
    comments = Column(Text)
    ai_summary = Column(Text, nullable=True)
    ai_flags = Column(Text, nullable=True)
    ai_actions = Column(Text, nullable=True)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    cycle = relationship("ReviewCycle", back_populates="manager_reviews")
    employee = relationship("Employee", foreign_keys=[employee_id])
    manager = relationship("Employee", foreign_keys=[manager_id])

# Onboarding
class OnboardingTemplate(Base):
    __tablename__ = "onboarding_templates"
    id = Column(Integer, primary_key=True, index=True)
    role = Column(String, nullable=False)
    items = relationship("OnboardingItem", back_populates="template")

class OnboardingItem(Base):
    __tablename__ = "onboarding_items"
    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("onboarding_templates.id"))
    title = Column(String)
    description = Column(Text)
    due_days = Column(Integer)  # days after joining
    assignee = Column(String)
    template = relationship("OnboardingTemplate", back_populates="items")

class OnboardingProgress(Base):
    __tablename__ = "onboarding_progress"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    item_id = Column(Integer, ForeignKey("onboarding_items.id"))
    is_done = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    employee = relationship("Employee", back_populates="onboarding_progress")
    item = relationship("OnboardingItem")

class PolicyDocument(Base):
    __tablename__ = "policy_documents"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String)
    file_path = Column(String)
    content = Column(Text)  # extracted text for RAG
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

class ChatbotQuery(Base):
    __tablename__ = "chatbot_queries"
    id = Column(Integer, primary_key=True, index=True)
    question = Column(Text)
    answer = Column(Text)
    was_answered = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# Notifications
class NotificationType(str, enum.Enum):
    info = "info"
    warning = "warning"
    critical = "critical"


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    type = Column(Enum(NotificationType), default=NotificationType.info)
    is_read = Column(Boolean, default=False)
    action_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user = relationship("User", foreign_keys=[user_id])


# ─── Offer Letter ─────────────────────────────────────────────────────────────
class OfferLetterStatus(str, enum.Enum):
    draft = "draft"
    sent = "sent"


class OfferLetterTemplate(Base):
    __tablename__ = "offer_letter_templates"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    offer_letters = relationship("OfferLetter", back_populates="template")


class OfferLetter(Base):
    __tablename__ = "offer_letters"
    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    template_id = Column(Integer, ForeignKey("offer_letter_templates.id"), nullable=True)
    generated_content = Column(Text, nullable=False)
    salary = Column(Float)
    role = Column(String)
    joining_date = Column(Date, nullable=True)
    status = Column(Enum(OfferLetterStatus), default=OfferLetterStatus.draft)
    pdf_path = Column(String, nullable=True)
    recipient_email = Column(String, nullable=True)
    recipient_name = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    template = relationship("OfferLetterTemplate", back_populates="offer_letters")
    candidate = relationship("Candidate", foreign_keys=[candidate_id])
    employee = relationship("Employee", foreign_keys=[employee_id])