from pydantic import BaseModel, ConfigDict, EmailStr, field_validator
from datetime import datetime
from typing import Optional
import re

class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str

    @field_validator('username')
    @classmethod
    def validate_username(cls, v: str) -> str:
        if len(v) < 2 or len(v) > 50:
            raise ValueError('用户名长度需要2-50个字符')
        if not re.match(r'^[\w\u4e00-\u9fff]+$', v):
            raise ValueError('用户名只能包含字母、数字、下划线或中文')
        return v

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError('密码长度至少6个字符')
        if len(v) > 128:
            raise ValueError('密码长度不能超过128个字符')
        return v

class UserLogin(BaseModel):
    username: str
    password: str


class PasswordResetRequest(BaseModel):
    username: str

    @field_validator('username')
    @classmethod
    def validate_username(cls, v: str) -> str:
        normalized = v.strip()
        if len(normalized) < 2 or len(normalized) > 50:
            raise ValueError('用户名长度需要2-50个字符')
        if not re.match(r'^[\w\u4e00-\u9fff]+$', normalized):
            raise ValueError('用户名只能包含字母、数字、下划线或中文')
        return normalized


class PasswordResetResponse(BaseModel):
    message: str
    default_password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    level: int
    experience: int
    rank_title: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class UserProfile(BaseModel):
    id: int
    username: str
    email: str
    level: int
    experience: int
    rank_title: str
    next_level_exp: int
    
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenWithUser(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class TokenData(BaseModel):
    user_id: Optional[int] = None
