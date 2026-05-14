from sqlalchemy import Column, Integer, String, Float, ForeignKey, Text, DateTime, Enum as SQLEnum, BigInteger
from database import Base
import enum
from datetime import datetime

class RoleEnum(str, enum.Enum):
    PATIENT = "PATIENT"
    PHYSIOTHERAPIST = "PHYSIOTHERAPIST"

class User(Base):
    __tablename__ = "users"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)
    role = Column(SQLEnum(RoleEnum), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Patient(Base):
    __tablename__ = "patients"

    patient_id = Column(BigInteger, ForeignKey("users.id"), primary_key=True)
    age = Column(Integer)
    gender = Column(String(50))
    medical_condition = Column(String(255))
    assigned_physio_id = Column(BigInteger, ForeignKey("users.id"))

class PostureSession(Base):
    __tablename__ = "posture_sessions"

    session_id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    patient_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    exercise_type = Column(String(50), nullable=False)
    average_score = Column(Float, default=0)
    duration = Column(Integer, default=0)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

class PostureData(Base):
    __tablename__ = "posture_data"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    session_id = Column(BigInteger, ForeignKey("posture_sessions.session_id"), nullable=False)
    timestamp = Column(BigInteger, nullable=False)
    posture_score = Column(Float, nullable=False)
    feedback = Column(Text)
    joint_angles = Column(Text)
