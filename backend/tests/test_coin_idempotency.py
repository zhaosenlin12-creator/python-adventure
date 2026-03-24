"""
测试金币系统的幂等性和防重复发放机制
"""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
from app.models.user import User
from app.models.coin import CoinTransaction
from app.core.security import get_password_hash
from app.services.coin_service import CoinService
from app.utils.transaction_id import (
    generate_transaction_id,
    generate_level_transaction_id,
    generate_campaign_transaction_id
)

# 创建测试数据库
TEST_DATABASE_URL = "sqlite:///./test_coin_idempotency.db"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture
def db():
    """创建测试数据库会话"""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # 创建测试用户
    user = User(
        id=1,
        username="test_user",
        email="test@example.com",
        password_hash=get_password_hash("test_password_123"),
        coins=100
    )
    db.add(user)
    db.commit()
    
    yield db
    
    db.close()
    Base.metadata.drop_all(bind=engine)


def test_add_coins_without_transaction_id(db):
    """测试不使用transaction_id的金币发放(允许重复)"""
    # 第一次发放
    success1 = CoinService.add_coins(
        db=db,
        user_id=1,
        amount=50,
        type="reward",
        source="level_complete",
        description="完成关卡1-1"
    )
    assert success1 is True
    
    # 第二次发放(没有transaction_id,允许重复)
    success2 = CoinService.add_coins(
        db=db,
        user_id=1,
        amount=50,
        type="reward",
        source="level_complete",
        description="完成关卡1-1"
    )
    assert success2 is True
    
    # 验证金币余额
    balance = CoinService.get_balance(db, 1)
    assert balance == 200  # 100 + 50 + 50


def test_add_coins_with_transaction_id_prevents_duplicate(db):
    """测试使用transaction_id防止重复发放"""
    transaction_id = generate_level_transaction_id(1, "level_1_1")
    
    # 第一次发放
    success1 = CoinService.add_coins(
        db=db,
        user_id=1,
        amount=50,
        type="reward",
        source="level_complete",
        description="完成关卡1-1",
        transaction_id=transaction_id
    )
    assert success1 is True
    
    # 第二次发放(相同transaction_id,应该被拒绝)
    success2 = CoinService.add_coins(
        db=db,
        user_id=1,
        amount=50,
        type="reward",
        source="level_complete",
        description="完成关卡1-1",
        transaction_id=transaction_id
    )
    assert success2 is False  # 应该失败
    
    # 验证金币余额(只发放了一次)
    balance = CoinService.get_balance(db, 1)
    assert balance == 150  # 100 + 50


def test_different_transaction_ids_allow_multiple_rewards(db):
    """测试不同的transaction_id允许多次发放"""
    transaction_id1 = generate_level_transaction_id(1, "level_1_1")
    transaction_id2 = generate_level_transaction_id(1, "level_1_2")
    
    # 第一次发放
    success1 = CoinService.add_coins(
        db=db,
        user_id=1,
        amount=50,
        type="reward",
        source="level_complete",
        description="完成关卡1-1",
        transaction_id=transaction_id1
    )
    assert success1 is True
    
    # 第二次发放(不同transaction_id,应该成功)
    success2 = CoinService.add_coins(
        db=db,
        user_id=1,
        amount=60,
        type="reward",
        source="level_complete",
        description="完成关卡1-2",
        transaction_id=transaction_id2
    )
    assert success2 is True
    
    # 验证金币余额
    balance = CoinService.get_balance(db, 1)
    assert balance == 210  # 100 + 50 + 60


def test_transaction_id_generation_is_unique(db):
    """测试transaction_id生成的唯一性"""
    # 相同参数生成的ID应该不同(因为时间戳不同)
    import time
    
    id1 = generate_level_transaction_id(1, "level_1_1")
    time.sleep(0.01)  # 等待一小段时间
    id2 = generate_level_transaction_id(1, "level_1_1")
    
    assert id1 != id2  # 应该不同


def test_transaction_id_format(db):
    """测试transaction_id的格式"""
    transaction_id = generate_level_transaction_id(1, "level_1_1")
    
    # 应该包含source、user_id和reference_id
    assert "level_complete" in transaction_id
    assert "_1_" in transaction_id
    assert "level_1_1" in transaction_id


def test_campaign_transaction_id(db):
    """测试战役transaction_id"""
    transaction_id = generate_campaign_transaction_id(1, "campaign_1")
    
    success = CoinService.add_coins(
        db=db,
        user_id=1,
        amount=100,
        type="reward",
        source="campaign_complete",
        description="完成战役1",
        transaction_id=transaction_id
    )
    assert success is True
    
    # 重复发放应该失败
    success2 = CoinService.add_coins(
        db=db,
        user_id=1,
        amount=100,
        type="reward",
        source="campaign_complete",
        description="完成战役1",
        transaction_id=transaction_id
    )
    assert success2 is False


def test_transaction_history_includes_transaction_id(db):
    """测试交易历史包含transaction_id"""
    transaction_id = generate_level_transaction_id(1, "level_1_1")
    
    CoinService.add_coins(
        db=db,
        user_id=1,
        amount=50,
        type="reward",
        source="level_complete",
        description="完成关卡1-1",
        transaction_id=transaction_id
    )
    
    # 获取交易历史
    history = CoinService.get_transaction_history(db, 1, limit=10)
    
    assert len(history) == 1
    assert history[0].transaction_id == transaction_id


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
