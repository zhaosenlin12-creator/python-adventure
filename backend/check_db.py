from app.core.database import engine, Base
from app.models.user import User
from sqlalchemy import inspect

def check_tables():
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"Existing tables: {tables}")
    
    if "users" in tables:
        print("Users table exists.")
    else:
        print("Users table MISSING!")

if __name__ == "__main__":
    check_tables()
