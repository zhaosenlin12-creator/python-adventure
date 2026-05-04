from sqlalchemy import Column, DateTime, Float, Index, Integer, String, Text
from sqlalchemy.sql import func

from app.core.database import Base


class TypingSession(Base):
    __tablename__ = "typing_sessions"

    token = Column(String(255), primary_key=True, index=True)
    source = Column(String(80), default="school", nullable=False)
    user_id = Column(String(100), nullable=True, index=True)
    username = Column(String(100), nullable=False, index=True)
    raw_user = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class TypingSetting(Base):
    __tablename__ = "typing_settings"

    token = Column(String(255), primary_key=True, index=True)
    payload = Column(Text, default="{}", nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class TypingScore(Base):
    __tablename__ = "typing_scores"

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(255), nullable=True, index=True)
    user_id = Column(String(100), nullable=True, index=True)
    username = Column(String(100), nullable=False, index=True)
    mode = Column(String(40), default="lesson", nullable=False, index=True)
    title = Column(String(255), default="", nullable=False)
    speed = Column(Float, default=0, nullable=False)
    accuracy = Column(Float, default=0, nullable=False)
    chars = Column(Integer, default=0, nullable=False)
    seconds = Column(Float, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)


class TypingContestRoom(Base):
    __tablename__ = "typing_contest_rooms"

    id = Column(String(80), primary_key=True, index=True)
    owner_token = Column(String(255), nullable=True, index=True)
    owner_name = Column(String(100), nullable=False)
    title = Column(String(255), default="", nullable=False)
    lesson_id = Column(String(100), nullable=True, index=True)
    status = Column(String(40), default="waiting", nullable=False, index=True)
    payload = Column(Text, default="{}", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


Index("ix_typing_scores_rank", TypingScore.mode, TypingScore.speed, TypingScore.accuracy)
Index("ix_typing_scores_user_time", TypingScore.token, TypingScore.user_id, TypingScore.created_at)
