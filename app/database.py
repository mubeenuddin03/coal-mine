from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

SQLALCHEMY_DATABASE_URL = "sqlite:///./readings.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


class Reading(Base):
    __tablename__ = "readings"

    id = Column(Integer, primary_key=True, index=True)
    node_id = Column(String, index=True)
    timestamp = Column(DateTime)
    tilt_x = Column(Float)
    tilt_y = Column(Float)
    vibration = Column(Boolean)
    distance_cm = Column(Float, nullable=True)
    displacement_cm = Column(Float, nullable=True)
    crack_state = Column(Boolean, nullable=True)
    status = Column(String, nullable=True)
    received_at = Column(DateTime, default=datetime.utcnow)


class Baseline(Base):
    __tablename__ = "baselines"

    id = Column(Integer, primary_key=True, index=True)
    node_id = Column(String, unique=True, index=True)
    tilt_x = Column(Float)
    tilt_y = Column(Float)
    distance_cm = Column(Float, nullable=True)
    displacement_cm = Column(Float, nullable=True)
    set_at = Column(DateTime, default=datetime.utcnow)


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()