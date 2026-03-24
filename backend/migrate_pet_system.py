"""
宠物系统数据库迁移脚本
创建 pets 表和相关表
"""
import sqlite3
from datetime import datetime
import os
import json

def migrate_pet_system():
    """创建宠物系统所需的数据库表"""
    db_path = os.path.join(os.path.dirname(__file__), 'code_adventure.db')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("🐾 开始迁移宠物系统数据库...")
    
    # 1. 创建 pets 表（宠物主表）
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS pets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            pet_type VARCHAR(50) NOT NULL,
            pet_style VARCHAR(20) NOT NULL,
            name VARCHAR(50),
            level INTEGER DEFAULT 1,
            exp INTEGER DEFAULT 0,
            hp INTEGER DEFAULT 100,
            intelligence INTEGER DEFAULT 0,
            creativity INTEGER DEFAULT 0,
            persistence INTEGER DEFAULT 0,
            intimacy INTEGER DEFAULT 0,
            evolution_stage INTEGER DEFAULT 1,
            code_quality INTEGER DEFAULT 0,
            creator_value INTEGER DEFAULT 0,
            battle_power INTEGER DEFAULT 0,
            status VARCHAR(20) DEFAULT 'normal',
            last_feed_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            coma_start_time TIMESTAMP,
            is_egg INTEGER DEFAULT 0,
            hatch_progress INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    print("✅ pets 表创建成功")
    
    # 2. 创建 pet_skins 表（宠物皮肤）
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS pet_skins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pet_id INTEGER NOT NULL,
            skin_id VARCHAR(50) NOT NULL,
            unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (pet_id) REFERENCES pets(id)
        )
    ''')
    print("✅ pet_skins 表创建成功")
    
    # 3. 创建 pet_growth_logs 表（成长记录）
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS pet_growth_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pet_id INTEGER NOT NULL,
            event_type VARCHAR(50) NOT NULL,
            event_data TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (pet_id) REFERENCES pets(id)
        )
    ''')
    print("✅ pet_growth_logs 表创建成功")
    
    # 4. 创建索引以提升查询性能
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_pets_user_id ON pets(user_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_pet_skins_pet_id ON pet_skins(pet_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_pet_growth_logs_pet_id ON pet_growth_logs(pet_id)')
    print("✅ 索引创建成功")
    
    # 4. 迁移旧版 user_pets 数据到新 pets 表（若存在）
    try:
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_pets'")
        has_user_pets = cursor.fetchone() is not None
        cursor.execute("SELECT COUNT(*) FROM pets")
        pets_count = cursor.fetchone()[0]

        if has_user_pets and pets_count == 0:
            print("🔄 检测到旧版 user_pets，开始迁移到 pets...")

            # 读取模板映射
            cursor.execute("SELECT id, pet_type, name FROM pet_templates")
            template_rows = cursor.fetchall()
            template_map = {row[0]: {"pet_type": row[1], "name": row[2]} for row in template_rows}

            def map_pet_type(old_type: str) -> str:
                if not old_type:
                    return "cute_cat"
                t = old_type.lower()
                if t in ("cat", "cute_cat", "code_cat"):
                    return "cute_cat"
                if t in ("dog", "shiba", "dog_shiba", "cute_dog"):
                    return "cute_dog"
                if t in ("rabbit", "cute_rabbit"):
                    return "cute_rabbit"
                if t in ("robot", "bot", "tech_bot"):
                    return "tech_bot"
                if t in ("drone", "tech_drone"):
                    return "tech_drone"
                if t in ("ai", "dragon", "tech_ai"):
                    return "tech_ai"
                return "cute_cat"

            cursor.execute("SELECT id, user_id, template_id, name, level, experience, current_stats, friendship, last_fed FROM user_pets")
            rows = cursor.fetchall()

            for row in rows:
                _, user_id, template_id, name, level, experience, current_stats, friendship, last_fed = row
                template = template_map.get(template_id, {})
                old_type = template.get("pet_type")
                mapped_type = map_pet_type(old_type)
                pet_style = "tech" if mapped_type.startswith("tech_") else "cute"
                pet_name = name or template.get("name") or "宠物伙伴"

                # 解析旧属性
                intelligence = creativity = persistence = 0
                try:
                    stats = json.loads(current_stats) if current_stats else {}
                    if isinstance(stats, dict):
                        if "intelligence" in stats or "creativity" in stats or "persistence" in stats:
                            intelligence = int(stats.get("intelligence", 0) or 0)
                            creativity = int(stats.get("creativity", 0) or 0)
                            persistence = int(stats.get("persistence", 0) or 0)
                        else:
                            # 兼容旧战斗属性（attack/defense/speed）
                            intelligence = int(stats.get("attack", 0) or 0)
                            creativity = int(stats.get("speed", 0) or 0)
                            persistence = int(stats.get("defense", 0) or 0)
                except Exception:
                    pass

                exp = int(experience or 0) % 100
                lvl = int(level or 1)
                intimacy = int(friendship or 0)

                cursor.execute(
                    """
                    INSERT INTO pets (
                        user_id, pet_type, pet_style, name, level, exp, hp,
                        intelligence, creativity, persistence, intimacy, evolution_stage,
                        status, last_feed_time, is_egg, hatch_progress
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        user_id, mapped_type, pet_style, pet_name, lvl, exp, 100,
                        max(0, min(100, intelligence)), max(0, min(100, creativity)), max(0, min(100, persistence)),
                        max(0, intimacy), 1, "normal", last_fed or datetime.utcnow().isoformat(), 0, 0
                    )
                )

            print(f"✅ 已迁移 {len(rows)} 条宠物数据")
        else:
            print("⏭️ 未检测到需要迁移的旧版宠物数据")
    except Exception as e:
        print(f"⚠️ 迁移旧版宠物数据失败: {e}")

    conn.commit()
    conn.close()
    
    print("🎉 宠物系统数据库迁移完成！")
    print("\n📊 已创建的表：")
    print("  - pets (宠物主表)")
    print("  - pet_skins (皮肤表)")
    print("  - pet_growth_logs (成长记录表)")

if __name__ == '__main__':
    migrate_pet_system()
