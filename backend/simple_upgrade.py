import sys
sys.path.insert(0, '.')

from app.core.database import SessionLocal
from app.models.user import User

db = SessionLocal()
user = db.query(User).filter(User.username == "demo").first()

if user:
    old_level = user.level
    user.level = 30
    user.experience = 3000
    db.commit()
    print(f"OK: demo user upgraded from level {old_level} to {user.level}")
else:
    print("ERROR: demo user not found")

db.close()



