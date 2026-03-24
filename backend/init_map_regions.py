"""
初始化地图区域数据
创建10个地图区域，包括现有的3个和新增加的7个
"""
import sys
import io
# 修复Windows控制台编码问题
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.models.map_region import MapRegion

def init_regions():
    """初始化所有地图区域"""
    # 创建表
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        # 检查是否已初始化
        existing_count = db.query(MapRegion).count()
        if existing_count > 0:
            print(f"⚠️  已存在 {existing_count} 个区域，跳过初始化")
            return
        
        regions_data = [
            # 现有区域（优化）
            {
                "name": "新手村",
                "display_name": "新手村",
                "description": "编程冒险的起点，友好的新手训练场",
                "width": 2000,
                "height": 2000,
                "start_x": 0,
                "start_y": 0,
                "required_level": 1,
                "theme": "village",
                "background_color": "#90EE90",
                "icon": "🏘️"
            },
            {
                "name": "猇亭广场",
                "display_name": "猇亭广场",
                "description": "繁华的商业区，更多挑战等待着你",
                "width": 3000,
                "height": 3000,
                "start_x": 2500,
                "start_y": 0,
                "required_level": 10,
                "theme": "city",
                "background_color": "#87CEEB",
                "icon": "🏢"
            },
            {
                "name": "CBD商务区",
                "display_name": "CBD商务区",
                "description": "高耸的商务大厦，高级编程挑战的聚集地",
                "width": 4000,
                "height": 4000,
                "start_x": 6000,
                "start_y": 0,
                "required_level": 20,
                "theme": "urban",
                "background_color": "#708090",
                "icon": "🏙️"
            },
            
            # 新增区域
            {
                "name": "编程森林",
                "display_name": "编程森林",
                "description": "神秘的森林深处，隐藏着编程的奥秘",
                "width": 5000,
                "height": 5000,
                "start_x": 0,
                "start_y": 2500,
                "required_level": 15,
                "theme": "forest",
                "background_color": "#228B22",
                "icon": "🌲"
            },
            {
                "name": "算法迷宫",
                "display_name": "算法迷宫",
                "description": "充满逻辑挑战的迷宫，考验你的算法思维",
                "width": 4000,
                "height": 4000,
                "start_x": 5500,
                "start_y": 2500,
                "required_level": 20,
                "theme": "maze",
                "background_color": "#9370DB",
                "icon": "🧩"
            },
            {
                "name": "数据结构山脉",
                "display_name": "数据结构山脉",
                "description": "高耸入云的山脉，挑战数据结构的高峰",
                "width": 6000,
                "height": 6000,
                "start_x": 11000,
                "start_y": 0,
                "required_level": 25,
                "theme": "mountain",
                "background_color": "#8B7355",
                "icon": "⛰️"
            },
            {
                "name": "代码海洋",
                "display_name": "代码海洋",
                "description": "深不可测的海洋，探索代码的无限可能",
                "width": 5000,
                "height": 5000,
                "start_x": 0,
                "start_y": 8000,
                "required_level": 30,
                "theme": "ocean",
                "background_color": "#1E90FF",
                "icon": "🌊"
            },
            {
                "name": "云端之城",
                "display_name": "云端之城",
                "description": "漂浮在云端的城市，掌握高级技能的天堂",
                "width": 4000,
                "height": 4000,
                "start_x": 6000,
                "start_y": 8000,
                "required_level": 35,
                "theme": "cloud",
                "background_color": "#E0E0E0",
                "icon": "☁️"
            },
            {
                "name": "时空裂隙",
                "display_name": "时空裂隙",
                "description": "连接不同时空的裂隙，特殊的副本挑战",
                "width": 3000,
                "height": 3000,
                "start_x": 11000,
                "start_y": 6500,
                "required_level": 40,
                "theme": "void",
                "background_color": "#2F2F2F",
                "icon": "🌀"
            },
            {
                "name": "编程圣地",
                "display_name": "编程圣地",
                "description": "编程的终极圣地，传说级挑战的终点",
                "width": 8000,
                "height": 8000,
                "start_x": 15000,
                "start_y": 0,
                "required_level": 50,
                "theme": "sanctuary",
                "background_color": "#FFD700",
                "icon": "✨"
            }
        ]
        
        print("📝 开始创建地图区域...")
        for region_data in regions_data:
            region = MapRegion(**region_data)
            db.add(region)
            print(f"  ✅ {region_data['display_name']} ({region_data['width']}x{region_data['height']})")
        
        db.commit()
        print(f"\n🎉 成功创建 {len(regions_data)} 个地图区域！")
        
        # 显示统计信息
        total_width = max(r["start_x"] + r["width"] for r in regions_data)
        total_height = max(r["start_y"] + r["height"] for r in regions_data)
        print(f"\n📊 地图总尺寸: {total_width}x{total_height}")
        print(f"📊 总面积: {total_width * total_height:,} 像素²")
        
    except Exception as e:
        db.rollback()
        print(f"❌ 初始化失败: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    init_regions()

