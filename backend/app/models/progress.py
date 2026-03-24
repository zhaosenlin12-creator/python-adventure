from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import json

class UserProgress(Base):
    """用户游戏进度表"""
    __tablename__ = "user_progress"
    
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True, index=True)
    level = Column(Integer, default=1)
    experience = Column(Integer, default=0)
    coins = Column(Integer, default=0)
    completed_levels = Column(Text, default="[]")  # JSON数组
    skills = Column(Text, default="[]")  # JSON数组
    inventory = Column(Text, default="[]")  # JSON数组
    has_key = Column(Integer, default=0)  # 0=False, 1=True
    arena_score = Column(Integer, default=0)
    arena_high_score = Column(Integer, default=0)
    completed_challenges = Column(Text, default="[]")  # JSON数组
    # 战役进度 (旧版，保留兼容)
    completed_campaigns = Column(Text, default="[]")  # JSON数组
    completed_campaign_levels = Column(Text, default="[]")  # JSON数组
    campaign_progress = Column(Text, default="{}")  # JSON对象
    
    # 年龄分组战役进度 (v2.2.0新增)
    # 格式: {"primary-lower": {"completedLevels": [], "completedCampaigns": []}, ...}
    age_group_campaign_progress = Column(Text, default="{}")  # JSON对象
    
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # 关系
    user = relationship("User", backref="progress")
    
    def get_completed_levels(self):
        """获取完成的关卡列表"""
        try:
            return json.loads(self.completed_levels)
        except:
            return []
    
    def set_completed_levels(self, levels):
        """设置完成的关卡列表"""
        self.completed_levels = json.dumps(levels)
    
    def get_skills(self):
        """获取技能列表"""
        try:
            return json.loads(self.skills)
        except:
            return []
    
    def set_skills(self, skills):
        """设置技能列表"""
        self.skills = json.dumps(skills)
    
    def get_inventory(self):
        """获取道具列表"""
        try:
            return json.loads(self.inventory)
        except:
            return []
    
    def set_inventory(self, items):
        """设置道具列表"""
        self.inventory = json.dumps(items)
    
    def get_completed_challenges(self):
        """获取完成的挑战列表"""
        try:
            return json.loads(self.completed_challenges)
        except:
            return []
    
    def set_completed_challenges(self, challenges):
        """设置完成的挑战列表"""
        self.completed_challenges = json.dumps(challenges)
    
    def get_completed_campaigns(self):
        """获取完成的战役列表"""
        try:
            return json.loads(self.completed_campaigns) if self.completed_campaigns else []
        except:
            return []
    
    def set_completed_campaigns(self, campaigns):
        """设置完成的战役列表"""
        self.completed_campaigns = json.dumps(campaigns)
    
    def get_completed_campaign_levels(self):
        """获取完成的战役关卡列表"""
        try:
            return json.loads(self.completed_campaign_levels) if self.completed_campaign_levels else []
        except:
            return []
    
    def set_completed_campaign_levels(self, levels):
        """设置完成的战役关卡列表"""
        self.completed_campaign_levels = json.dumps(levels)
    
    def get_campaign_progress(self):
        """获取战役进度"""
        try:
            return json.loads(self.campaign_progress) if self.campaign_progress else {}
        except:
            return {}
    
    def set_campaign_progress(self, progress):
        """设置战役进度"""
        self.campaign_progress = json.dumps(progress)
    
    def get_age_group_campaign_progress(self):
        """获取年龄分组战役进度"""
        try:
            return json.loads(self.age_group_campaign_progress) if self.age_group_campaign_progress else {}
        except:
            return {}
    
    def set_age_group_campaign_progress(self, progress):
        """设置年龄分组战役进度"""
        self.age_group_campaign_progress = json.dumps(progress)
    
    def get_age_group_progress(self, age_group: str):
        """获取指定年龄组的战役进度"""
        all_progress = self.get_age_group_campaign_progress()
        return all_progress.get(age_group, {"completedLevels": [], "completedCampaigns": []})
    
    def update_age_group_progress(self, age_group: str, completed_levels: list = None, completed_campaigns: list = None):
        """更新指定年龄组的战役进度"""
        all_progress = self.get_age_group_campaign_progress()
        if age_group not in all_progress:
            all_progress[age_group] = {"completedLevels": [], "completedCampaigns": []}
        
        if completed_levels is not None:
            all_progress[age_group]["completedLevels"] = completed_levels
        if completed_campaigns is not None:
            all_progress[age_group]["completedCampaigns"] = completed_campaigns
        
        self.set_age_group_campaign_progress(all_progress)


class LevelCompletion(Base):
    """关卡完成记录表"""
    __tablename__ = "level_completions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    level_id = Column(String(50), nullable=False, index=True)
    score = Column(Integer, default=0)
    code = Column(Text)
    time_used = Column(Integer)  # 秒
    completed_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 关系
    user = relationship("User", backref="level_completions")
