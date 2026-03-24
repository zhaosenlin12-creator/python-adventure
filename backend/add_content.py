# -*- coding: utf-8 -*-
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import engine
from sqlalchemy import text

# Delete old data
with engine.connect() as conn:
    print("[1/2] Clearing old tasks and map objects...")
    conn.execute(text("DELETE FROM tasks"))
    conn.execute(text("DELETE FROM map_objects"))
    conn.commit()
    
    print("[2/2] Adding new content...")
    
    # Add Python tasks
    tasks_sql = """
    INSERT INTO tasks (title, description, task_type, difficulty, map_area, rewards, prerequisites)
    VALUES 
    ('Lesson 1: Turtle Basics', 'Learn turtle graphics', 'main', 1, '新手村', '{"experience": 50, "points": 10}', '[]'),
    ('Lesson 2: Colorful Circles', 'Draw colorful circles', 'main', 1, '新手村', '{"experience": 60, "points": 12}', '[1]'),
    ('Lesson 3: Random Numbers', 'Use random module', 'main', 2, '新手村', '{"experience": 80, "points": 15}', '[2]'),
    ('Lesson 4: Variables', 'Learn variables and data types', 'main', 2, '新手村', '{"experience": 100, "points": 20}', '[3]'),
    ('Lesson 5: Input/Output', 'Master input() and print()', 'main', 2, '新手村', '{"experience": 100, "points": 20}', '[4]'),
    ('Lesson 6: For Loops', 'Draw with for loops', 'main', 2, '猇亭广场', '{"experience": 120, "points": 25}', '[5]'),
    ('Lesson 7: While Loops', 'Learn while loops', 'main', 3, '猇亭广场', '{"experience": 150, "points": 30}', '[6]'),
    ('Lesson 8: Break/Continue', 'Loop control statements', 'main', 3, '猇亭广场', '{"experience": 150, "points": 30}', '[7]'),
    ('Lesson 9: Classes', 'Learn OOP basics', 'main', 4, '猇亭广场', '{"experience": 200, "points": 40}', '[8]'),
    ('Lesson 10: Inheritance', 'Class inheritance', 'main', 4, 'CBD商务区', '{"experience": 250, "points": 50}', '[9]'),
    ('Lesson 11: 3D Graphics', 'Explore 3D programming', 'main', 4, 'CBD商务区', '{"experience": 250, "points": 50}', '[10]'),
    ('Lesson 12: Pillow Basics', 'Image processing with Pillow', 'main', 3, 'CBD商务区', '{"experience": 180, "points": 35}', '[11]'),
    ('Lesson 13: Image Effects', 'Add filters to images', 'main', 4, 'CBD商务区', '{"experience": 200, "points": 40}', '[12]'),
    ('Lesson 14: Audio Files', 'Process audio files', 'main', 4, 'CBD商务区', '{"experience": 220, "points": 45}', '[13]'),
    ('Lesson 15: Audio Effects', 'Add effects to audio', 'main', 4, 'CBD商务区', '{"experience": 220, "points": 45}', '[14]'),
    ('Lesson 16: Arcade Games', 'Make games with Arcade', 'main', 5, 'CBD商务区', '{"experience": 300, "points": 60}', '[15]'),
    ('Lesson 17: Pygame Zero', 'Advanced game dev', 'main', 5, 'CBD商务区', '{"experience": 300, "points": 60}', '[16]'),
    ('Lesson 18: Cryptography', 'Learn encryption', 'main', 5, 'CBD商务区', '{"experience": 280, "points": 55}', '[17]'),
    ('Lesson 19: Web APIs', 'HTTP requests and APIs', 'main', 5, 'CBD商务区', '{"experience": 320, "points": 65}', '[18]'),
    ('Lesson 20: Web Scraping', 'Learn web scraping', 'main', 5, 'CBD商务区', '{"experience": 350, "points": 70}', '[19]'),
    ('Daily: Debug Practice', 'Fix 5 code errors', 'daily', 2, '新手村', '{"experience": 50, "points": 10}', '[]'),
    ('Daily: Algorithm', 'Solve algorithm challenge', 'daily', 3, '猇亭广场', '{"experience": 80, "points": 15}', '[]'),
    ('Daily: Creative Coding', 'Create something new', 'daily', 3, 'CBD商务区', '{"experience": 100, "points": 20}', '[]')
    """
    conn.execute(text(tasks_sql))
    
    # Add map objects
    map_sql = """
    INSERT INTO map_objects (title, description, object_type, map_area, x, y, icon, interaction_type, rewards, requirements)
    VALUES
    ('Code Teacher', 'Programming instructor', 'npc', '新手村', 150, 150, '👨‍🏫', 'talk', '{"experience": 20}', '{}'),
    ('Starter Chest', 'Learning materials', 'chest', '新手村', 200, 100, '📦', 'collect', '{"experience": 50, "points": 10}', '{}'),
    ('Python Library', 'Learn Python basics', 'npc', '新手村', 300, 150, '📚', 'talk', '{}', '{}'),
    ('Turtle Canvas', 'Practice turtle drawing', 'puzzle', '新手村', 250, 250, '🐢', 'solve', '{"experience": 80}', '{}'),
    ('Variable Storage', 'Learn data storage', 'resource', '新手村', 400, 200, '💾', 'collect', '{"experience": 60}', '{}'),
    ('Code Garden', 'Grow code flowers', 'resource', '新手村', 350, 300, '🌺', 'collect', '{"experience": 40}', '{}'),
    ('Bug Fix Station', 'Help fix bugs', 'puzzle', '新手村', 150, 250, '🐛', 'solve', '{"experience": 70}', '{}'),
    
    ('Shengshi Community', 'Lerobot Education Center location', 'npc', '猇亭广场', 500, 300, '🏢', 'talk', '{}', '{}'),
    ('Lerobot Center', 'Learn programming and robots', 'npc', '猇亭广场', 520, 320, '🤖', 'talk', '{"experience": 100}', '{}'),
    ('Xiaoting Government', 'Local landmark', 'npc', '猇亭广场', 450, 250, '🏛️', 'talk', '{}', '{}'),
    ('Wanda Plaza', 'Shopping center', 'npc', '猇亭广场', 600, 280, '🏬', 'talk', '{}', '{}'),
    ('Yichang East Station', 'Train station', 'npc', '猇亭广场', 700, 200, '🚄', 'talk', '{}', '{}'),
    ('Riverside Park', 'Beautiful scenery', 'resource', '猇亭广场', 400, 400, '🌳', 'collect', '{"experience": 30}', '{}'),
    ('Loop Arena', 'Practice loops', 'puzzle', '猇亭广场', 550, 400, '🔄', 'solve', '{"experience": 120}', '{"min_level": 3}'),
    ('Function Lab', 'Learn functions', 'npc', '猇亭广场', 650, 350, '⚙️', 'talk', '{"experience": 100}', '{"min_level": 4}'),
    ('List Laboratory', 'Master lists and dicts', 'puzzle', '猇亭广场', 500, 450, '📋', 'solve', '{"experience": 150}', '{"min_level": 5}'),
    ('Wisdom Tree', 'Ancient wisdom tree', 'resource', '猇亭广场', 450, 350, '🌲', 'collect', '{"experience": 100}', '{}'),
    ('Data Vault', 'Valuable data storage', 'chest', '猇亭广场', 700, 450, '💎', 'collect', '{"experience": 150, "points": 30}', '{"min_level": 5}'),
    ('Algorithm Arena', 'Battle with algorithms', 'npc', '猇亭广场', 600, 500, '⚔️', 'talk', '{}', '{"min_level": 6}'),
    
    ('OOP Tower', 'Learn OOP', 'npc', 'CBD商务区', 800, 300, '🏢', 'talk', '{"experience": 200}', '{"min_level": 8}'),
    ('Pillow Image Center', 'Image processing', 'puzzle', 'CBD商务区', 850, 250, '🖼️', 'solve', '{"experience": 180}', '{"min_level": 10}'),
    ('Audio Studio', 'Music creation', 'puzzle', 'CBD商务区', 900, 300, '🎵', 'solve', '{"experience": 220}', '{"min_level": 12}'),
    ('Arcade Game Factory', 'Make games with Arcade', 'npc', 'CBD商务区', 950, 350, '🎮', 'talk', '{"experience": 300}', '{"min_level": 15}'),
    ('Pygame Base', 'Create big games', 'puzzle', 'CBD商务区', 1000, 300, '🕹️', 'solve', '{"experience": 300}', '{"min_level": 16}'),
    ('Crypto Institute', 'Learn cryptography', 'npc', 'CBD商务区', 850, 400, '🔐', 'talk', '{"experience": 280}', '{"min_level": 17}'),
    ('Network Center', 'HTTP and APIs', 'puzzle', 'CBD商务区', 900, 450, '🌐', 'solve', '{"experience": 320}', '{"min_level": 18}'),
    ('Spider Lab', 'Web scraping', 'npc', 'CBD商务区', 950, 450, '🕷️', 'talk', '{"experience": 350}', '{"min_level": 19}'),
    ('AI Research', 'Explore AI', 'npc', 'CBD商务区', 1050, 250, '🧠', 'talk', '{"experience": 400}', '{"min_level": 20}'),
    ('Open Source Treasure', 'Discover open source', 'chest', 'CBD商务区', 1100, 350, '📦', 'collect', '{"experience": 300, "points": 60}', '{"min_level": 15}'),
    ('Code Museum', 'Great programs in history', 'npc', 'CBD商务区', 800, 350, '🏛️', 'talk', '{}', '{}')
    """
    
    conn.execute(text(map_sql))
    conn.commit()
    
    print("[Complete] Added 23 tasks and 30 map objects!")
    print("\nPlease restart backend to see changes.")

if __name__ == "__main__":
    print("Initializing complete content...")
    init_python_tasks()




