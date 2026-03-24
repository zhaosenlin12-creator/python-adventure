# -*- coding: utf-8 -*-
"""验证所有功能"""
import sys
import io
import requests

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

sys.path.insert(0, '.')

from app.core.database import SessionLocal
from app.models.user import User
from app.models.task_submission import TaskFileSubmission

print("="*70)
print("  验证所有功能")
print("="*70)

# 1. 检查数据库
print("\n[1/5] 检查数据库...")
db = SessionLocal()

demo_user = db.query(User).filter(User.username == "demo").first()
if demo_user:
    print(f"  ✓ demo用户存在")
    print(f"    - 等级: {demo_user.level}")
    print(f"    - 经验: {demo_user.experience}")
    print(f"    - 称号: {demo_user.get_rank_title()}")
else:
    print("  ✗ demo用户不存在")

# 2. 检查新表
print("\n[2/5] 检查文件提交表...")
try:
    submission_count = db.query(TaskFileSubmission).count()
    print(f"  ✓ task_file_submissions 表存在，共 {submission_count} 条记录")
except Exception as e:
    print(f"  ✗ 表不存在或有错误: {e}")

db.close()

# 3. 测试后端API
print("\n[3/5] 测试后端API...")
try:
    response = requests.get("http://localhost:8000/health", timeout=5)
    if response.status_code == 200:
        print(f"  ✓ 后端健康检查通过")
        print(f"    响应: {response.json()}")
    else:
        print(f"  ✗ 健康检查失败: {response.status_code}")
except Exception as e:
    print(f"  ✗ 无法连接到后端: {e}")

# 4. 测试登录
print("\n[4/5] 测试登录...")
try:
    login_data = {
        "username": "demo",
        "password": "123456"
    }
    response = requests.post("http://localhost:8000/api/v1/auth/login", json=login_data, timeout=5)
    if response.status_code == 200:
        result = response.json()
        print(f"  ✓ 登录成功")
        print(f"    - 用户: {result.get('username')}")
        print(f"    - 等级: {result.get('level')}")
        print(f"    - Token: {result.get('access_token')[:30]}...")
        token = result.get('access_token')
    else:
        print(f"  ✗ 登录失败: {response.status_code}")
        print(f"    {response.text}")
        token = None
except Exception as e:
    print(f"  ✗ 登录请求失败: {e}")
    token = None

# 5. 测试任务列表
print("\n[5/5] 测试任务API...")
if token:
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get("http://localhost:8000/api/v1/tasks/list", headers=headers, timeout=5)
        if response.status_code == 200:
            tasks = response.json()
            print(f"  ✓ 获取任务列表成功，共 {len(tasks)} 个任务")
        else:
            print(f"  ✗ 获取任务失败: {response.status_code}")
    except Exception as e:
        print(f"  ✗ 任务请求失败: {e}")
else:
    print("  - 跳过（无token）")

print("\n" + "="*70)
print("  验证完成！")
print("="*70)
print("\n下一步：")
print("  1. 在浏览器访问: http://localhost:3000")
print("  2. 登录: demo / 123456")
print("  3. 检查等级是否为30")
print("="*70)



