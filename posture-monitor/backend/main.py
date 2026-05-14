from fastapi import FastAPI, Depends, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import List, Optional, Any, Dict
import time

from database import engine, Base, get_db
from models import User, RoleEnum, PostureSession, PostureData
from auth import get_password_hash, verify_password, create_access_token, get_current_user

# Create database tables automatically
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Posture Monitor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for request/response
class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str

class LoginRequest(BaseModel):
    email: str
    password: str

class PostureDataRequest(BaseModel):
    postureScore: float
    feedback: Optional[str] = None
    jointAngles: Optional[str] = None

@app.post("/api/auth/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")
    
    user = User(
        name=req.name,
        email=req.email,
        password=get_password_hash(req.password),
        role=RoleEnum(req.role.upper())
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    token = create_access_token({"sub": user.email, "role": user.role.value})
    return {"token": token, "name": user.name, "email": user.email, "role": user.role.value}

@app.post("/api/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.password):
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    token = create_access_token({"sub": user.email, "role": user.role.value})
    return {"token": token, "name": user.name, "email": user.email, "role": user.role.value}

@app.post("/api/sessions/start")
def start_session(body: Dict[str, str], current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == current_user["sub"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    session = PostureSession(
        patient_id=user.id,
        exercise_type=body.get("exerciseType")
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return {
        "sessionId": session.session_id,
        "patientId": session.patient_id,
        "exerciseType": session.exercise_type,
        "averageScore": session.average_score,
        "duration": session.duration,
        "createdAt": session.created_at
    }

@app.post("/api/sessions/{id}/stop")
def stop_session(id: int, body: dict = Body(...), current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    session = db.query(PostureSession).filter(PostureSession.session_id == id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session.average_score = float(body.get("averageScore", 0.0))
    session.duration = int(body.get("duration", 0))
    db.commit()
    db.refresh(session)
    return {
        "sessionId": session.session_id,
        "patientId": session.patient_id,
        "exerciseType": session.exercise_type,
        "averageScore": session.average_score,
        "duration": session.duration,
        "createdAt": session.created_at
    }

@app.post("/api/sessions/{id}/data")
def save_data(id: int, req: PostureDataRequest, db: Session = Depends(get_db)):
    data = PostureData(
        session_id=id,
        timestamp=int(time.time() * 1000),
        posture_score=req.postureScore,
        feedback=req.feedback,
        joint_angles=req.jointAngles
    )
    db.add(data)
    db.commit()
    db.refresh(data)
    return {
        "id": data.id,
        "sessionId": data.session_id,
        "timestamp": data.timestamp,
        "postureScore": data.posture_score,
        "feedback": data.feedback,
        "jointAngles": data.joint_angles
    }

@app.get("/api/sessions/my")
def get_my_sessions(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == current_user["sub"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    sessions = db.query(PostureSession).filter(PostureSession.patient_id == user.id).order_by(PostureSession.created_at.desc()).all()
    return [
        {
            "sessionId": s.session_id,
            "patientId": s.patient_id,
            "exerciseType": s.exercise_type,
            "averageScore": s.average_score,
            "duration": s.duration,
            "createdAt": s.created_at
        } for s in sessions
    ]

@app.get("/api/sessions/{id}/data")
def get_session_data(id: int, db: Session = Depends(get_db)):
    data = db.query(PostureData).filter(PostureData.session_id == id).order_by(PostureData.timestamp.asc()).all()
    return [
        {
            "id": d.id,
            "sessionId": d.session_id,
            "timestamp": d.timestamp,
            "postureScore": d.posture_score,
            "feedback": d.feedback,
            "jointAngles": d.joint_angles
        } for d in data
    ]

@app.get("/api/analytics/summary")
def get_summary(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == current_user["sub"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    avg_score = db.query(func.avg(PostureSession.average_score)).filter(PostureSession.patient_id == user.id).scalar()
    total_sessions = db.query(func.count(PostureSession.session_id)).filter(PostureSession.patient_id == user.id).scalar()
    
    return {
        "averageScore": round(avg_score) if avg_score else 0,
        "totalSessions": total_sessions or 0
    }

@app.get("/api/analytics/patient/{id}/summary")
def get_patient_summary(id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    avg_score = db.query(func.avg(PostureSession.average_score)).filter(PostureSession.patient_id == id).scalar()
    total_sessions = db.query(func.count(PostureSession.session_id)).filter(PostureSession.patient_id == id).scalar()
    
    return {
        "patientId": id,
        "averageScore": round(avg_score) if avg_score else 0,
        "totalSessions": total_sessions or 0
    }

@app.get("/api/physio/patients")
def get_all_patients(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    patients = db.query(User).filter(User.role == RoleEnum.PATIENT).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "email": p.email,
            "role": p.role.value
        } for p in patients
    ]

@app.get("/api/physio/patients/{id}/sessions")
def get_patient_sessions(id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    sessions = db.query(PostureSession).filter(PostureSession.patient_id == id).order_by(PostureSession.created_at.desc()).all()
    return [
        {
            "sessionId": s.session_id,
            "patientId": s.patient_id,
            "exerciseType": s.exercise_type,
            "averageScore": s.average_score,
            "duration": s.duration,
            "createdAt": s.created_at
        } for s in sessions
    ]
