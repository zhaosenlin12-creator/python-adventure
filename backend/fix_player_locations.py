"""
修复玩家位置数据 - 更新所有玩家的 last_move 时间
"""
from app.core.database import SessionLocal
from app.core.time import utc_now
from app.models.user_location import UserLocation

def fix_locations():
    db = SessionLocal()
    try:
        # 获取所有位置记录
        locations = db.query(UserLocation).all()
        
        print(f"找到 {len(locations)} 条位置记录")
        
        updated = 0
        for location in locations:
            # 更新 last_move 时间为当前时间
            location.last_move = utc_now()
            updated += 1
        
        db.commit()
        print(f"✓ 已更新 {updated} 条记录的 last_move 时间")
        
        # 显示结果
        print("\n当前玩家位置:")
        for location in locations:
            print(f"  用户 {location.user_id}: ({location.x}, {location.y}) in {location.map_area}, last_move: {location.last_move}")
        
    except Exception as e:
        print(f"✗ 错误: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("="*60)
    print("   修复玩家位置数据")
    print("="*60)
    print()
    fix_locations()
    print()
    print("完成!")
