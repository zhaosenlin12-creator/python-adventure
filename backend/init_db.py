from app.core.database import engine, Base
from app.models.user import User
# Import other models if needed, but for now we only have User working
# from app.models.inventory import UserInventory
# from app.models.skill import UserSkill
# from app.models.pet import UserPet

def init_db():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully!")

if __name__ == "__main__":
    init_db()
