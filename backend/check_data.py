"""检查数据库中的数据"""
from app.core.database import SessionLocal
from app.models.quiz_battle import QuizQuestion
from app.models.character import CharacterTemplate
from app.models.map_object import MapObject

db = SessionLocal()

print("\n" + "=" * 60)
print("数据库数据检查")
print("=" * 60)

# 角色模板
char_count = db.query(CharacterTemplate).count()
print(f"\n✅ 角色模板数量: {char_count}")
if char_count > 0:
    chars = db.query(CharacterTemplate).all()
    for c in chars:
        print(f"  {c.attributes['icon']} {c.name} (Lv.{c.unlock_level})")

# 题目
quiz_count = db.query(QuizQuestion).count()
print(f"\n✅ 题目数量: {quiz_count}")
if quiz_count > 0:
    categories = {}
    for q in db.query(QuizQuestion).all():
        categories[q.category] = categories.get(q.category, 0) + 1
    for cat, count in categories.items():
        print(f"  {cat}: {count}题")

# 地图对象
map_count = db.query(MapObject).count()
print(f"\n✅ 地图对象数量: {map_count}")
if map_count > 0:
    areas = {}
    for obj in db.query(MapObject).all():
        areas[obj.map_area] = areas.get(obj.map_area, 0) + 1
    for area, count in areas.items():
        print(f"  {area}: {count}个")

print("\n" + "=" * 60)
print("检查完成！")
print("=" * 60 + "\n")

db.close()







