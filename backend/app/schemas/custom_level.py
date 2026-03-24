"""
CustomLevel Pydantic Schemas
用于验证和序列化自定义关卡数据

Requirements: 11.2, 16.4
Security: JSON Schema验证、大小限制、元素数量限制
"""
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from typing import Optional, Dict, Any, List
from datetime import datetime
import json

# ==================== 安全常量 ====================
MAX_LEVEL_DATA_SIZE_BYTES = 1024 * 1024  # 1MB 最大关卡数据大小
MAX_ELEMENTS_PER_LEVEL = 500  # 单个关卡最大元素数量
MAX_QUESTIONS_PER_LEVEL = 100  # 单个关卡最大题目数量
MAX_LEVELS_PER_USER = 50  # 每用户最大关卡数量

# 允许的元素类型白名单
ALLOWED_ELEMENT_TYPES = {
    # 平台类型
    'platform', 'ground', 'moving', 'ceiling', 'moving_platform', 
    'disappearing', 'bouncy', 'conveyor', 'gravity_flip',
    # 障碍/陷阱类型
    'spike', 'saw', 'laser', 'fire', 'explosion', 'electric',
    # 敌人类型 - 包括所有敌人变体
    'enemy', 'boss', 'enemy_basic', 'enemy_bat', 'enemy_slime', 
    'enemy_ghost', 'enemy_spider', 'enemy_robot', 'enemy_flying',
    'enemy_boss',  # 🔥 添加 enemy_boss 类型
    # 收集物类型
    'coin', 'gem', 'star', 'key', 'heart', 'powerup', 'checkpoint', 'clue', 'health_pack',
    # 机关类型
    'button', 'lever', 'door', 'trampoline',
    # 特殊元素
    'portal', 'wind', 'gravity_zone',
    # 装饰元素
    'decoration', 'background',
    # 起点/终点
    'player_start', 'goal'
}

# 允许的题目类型白名单
ALLOWED_QUESTION_TYPES = {'choice', 'fill', 'truefalse'}


def validate_level_data_structure(data: Dict[str, Any]) -> List[str]:
    """
    验证level_data的结构和内容安全性
    返回错误列表，空列表表示验证通过
    """
    errors = []
    
    # 检查数据大小
    try:
        data_str = json.dumps(data, ensure_ascii=False)
        if len(data_str.encode('utf-8')) > MAX_LEVEL_DATA_SIZE_BYTES:
            errors.append(f"关卡数据超过最大限制 ({MAX_LEVEL_DATA_SIZE_BYTES // 1024}KB)")
    except (TypeError, ValueError) as e:
        errors.append(f"关卡数据序列化失败: {str(e)}")
        return errors
    
    # 验证必需字段
    required_fields = ['playerStart', 'elements']
    for field in required_fields:
        if field not in data:
            errors.append(f"缺少必需字段: {field}")
    
    # 验证 playerStart
    if 'playerStart' in data:
        ps = data['playerStart']
        if not isinstance(ps, dict) or 'x' not in ps or 'y' not in ps:
            errors.append("playerStart 格式无效")
        elif not (isinstance(ps.get('x'), (int, float)) and isinstance(ps.get('y'), (int, float))):
            errors.append("playerStart 坐标必须是数字")
    
    # 验证 goal
    if 'goal' in data and data['goal'] is not None:
        goal = data['goal']
        if not isinstance(goal, dict) or 'x' not in goal or 'y' not in goal:
            errors.append("goal 格式无效")
        elif not (isinstance(goal.get('x'), (int, float)) and isinstance(goal.get('y'), (int, float))):
            errors.append("goal 坐标必须是数字")
    
    # 验证 elements
    if 'elements' in data:
        elements = data['elements']
        if not isinstance(elements, list):
            errors.append("elements 必须是数组")
        elif len(elements) > MAX_ELEMENTS_PER_LEVEL:
            errors.append(f"元素数量超过限制 (最多 {MAX_ELEMENTS_PER_LEVEL} 个)")
        else:
            for i, elem in enumerate(elements):
                if not isinstance(elem, dict):
                    errors.append(f"元素 {i} 格式无效")
                    continue
                
                # 验证元素类型
                elem_type = elem.get('type')
                if elem_type and elem_type not in ALLOWED_ELEMENT_TYPES:
                    errors.append(f"元素 {i} 类型无效: {elem_type}")
                
                # 验证元素坐标
                if 'x' in elem and not isinstance(elem['x'], (int, float)):
                    errors.append(f"元素 {i} x坐标无效")
                if 'y' in elem and not isinstance(elem['y'], (int, float)):
                    errors.append(f"元素 {i} y坐标无效")
                
                # 验证元素尺寸
                if 'width' in elem and not isinstance(elem['width'], (int, float)):
                    errors.append(f"元素 {i} 宽度无效")
                if 'height' in elem and not isinstance(elem['height'], (int, float)):
                    errors.append(f"元素 {i} 高度无效")
    
    # 验证 questions
    if 'questions' in data:
        questions = data['questions']
        if not isinstance(questions, list):
            errors.append("questions 必须是数组")
        elif len(questions) > MAX_QUESTIONS_PER_LEVEL:
            errors.append(f"题目数量超过限制 (最多 {MAX_QUESTIONS_PER_LEVEL} 道)")
        else:
            for i, q in enumerate(questions):
                if not isinstance(q, dict):
                    errors.append(f"题目 {i} 格式无效")
                    continue
                
                # 验证题目类型
                q_type = q.get('type')
                if q_type and q_type not in ALLOWED_QUESTION_TYPES:
                    errors.append(f"题目 {i} 类型无效: {q_type}")
                
                # 验证题目必需字段
                if not q.get('question'):
                    errors.append(f"题目 {i} 缺少问题内容")
                if not q.get('answer'):
                    errors.append(f"题目 {i} 缺少答案")
    
    return errors


class CustomLevelCreate(BaseModel):
    """创建自定义关卡请求Schema"""
    name: str = Field(..., min_length=1, max_length=100, description="关卡名称")
    description: Optional[str] = Field(None, max_length=500, description="关卡描述")
    difficulty: int = Field(default=1, ge=1, le=3, description="难度等级 1-3")
    map_width: int = Field(default=800, ge=800, le=20000, description="地图宽度 800-20000")
    map_height: int = Field(default=600, ge=600, le=5000, description="地图高度 600-5000")
    level_data: Dict[str, Any] = Field(..., description="完整的关卡JSON数据")
    
    @field_validator('level_data')
    @classmethod
    def validate_level_data(cls, v: Dict[str, Any]) -> Dict[str, Any]:
        """验证level_data的结构和安全性"""
        errors = validate_level_data_structure(v)
        if errors:
            raise ValueError(f"关卡数据验证失败: {'; '.join(errors)}")
        return v
    
    @field_validator('name')
    @classmethod
    def sanitize_name(cls, v: str) -> str:
        """清理关卡名称，防止XSS"""
        # 移除HTML标签和危险字符
        import re
        v = re.sub(r'<[^>]*>', '', v)  # 移除HTML标签
        v = v.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        return v.strip()
    
    @field_validator('description')
    @classmethod
    def sanitize_description(cls, v: Optional[str]) -> Optional[str]:
        """清理关卡描述，防止XSS"""
        if v is None:
            return v
        import re
        v = re.sub(r'<[^>]*>', '', v)
        v = v.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        return v.strip()


class CustomLevelUpdate(BaseModel):
    """更新自定义关卡请求Schema"""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="关卡名称")
    description: Optional[str] = Field(None, max_length=500, description="关卡描述")
    difficulty: Optional[int] = Field(None, ge=1, le=3, description="难度等级 1-3")
    map_width: Optional[int] = Field(None, ge=800, le=20000, description="地图宽度 800-20000")
    map_height: Optional[int] = Field(None, ge=600, le=5000, description="地图高度 600-5000")
    level_data: Optional[Dict[str, Any]] = Field(None, description="完整的关卡JSON数据")
    
    @field_validator('level_data')
    @classmethod
    def validate_level_data(cls, v: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """验证level_data的结构和安全性"""
        if v is None:
            return v
        errors = validate_level_data_structure(v)
        if errors:
            raise ValueError(f"关卡数据验证失败: {'; '.join(errors)}")
        return v
    
    @field_validator('name')
    @classmethod
    def sanitize_name(cls, v: Optional[str]) -> Optional[str]:
        """清理关卡名称，防止XSS"""
        if v is None:
            return v
        import re
        v = re.sub(r'<[^>]*>', '', v)
        v = v.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        return v.strip()
    
    @field_validator('description')
    @classmethod
    def sanitize_description(cls, v: Optional[str]) -> Optional[str]:
        """清理关卡描述，防止XSS"""
        if v is None:
            return v
        import re
        v = re.sub(r'<[^>]*>', '', v)
        v = v.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        return v.strip()


class CustomLevelResponse(BaseModel):
    """自定义关卡完整响应Schema"""
    id: str
    user_id: int
    name: str
    description: Optional[str]
    difficulty: int
    map_width: int
    map_height: int
    level_data: Dict[str, Any]
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class CustomLevelSummary(BaseModel):
    """自定义关卡摘要Schema (用于列表展示)"""
    id: str
    name: str
    description: Optional[str]
    difficulty: int
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
