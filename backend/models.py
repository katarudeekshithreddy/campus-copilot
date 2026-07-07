from sqlalchemy import Column, Integer, String, Text, DateTime
from database import Base
import datetime

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    role = Column(String, index=True) # "user" or "model"
    content = Column(Text)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class Metric(Base):
    __tablename__ = "metrics"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True)
    value = Column(String)

class Gamification(Base):
    __tablename__ = "gamification"
    
    id = Column(Integer, primary_key=True, index=True)
    xp = Column(Integer, default=0)
    badges = Column(String, default="") # comma separated badges
    streak = Column(Integer, default=0)

class RoadmapStore(Base):
    __tablename__ = "roadmaps"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, default="default_user", index=True)
    data = Column(Text) # JSON string of all roadmaps
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)
