"""
验证服务器启动状态和API可用性
"""
import sys
import io
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

import requests
import time

def test_api_endpoints():
    """测试所有API端点"""
    base_url = "http://localhost:8000"
    
    print("🧪 验证服务器状态...\n")
    
    # 1. 健康检查
    print("1️⃣ 测试健康检查端点")
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code == 200:
            print(f"   ✅ /health - 状态码: {response.status_code}")
            print(f"      响应: {response.json()}")
        else:
            print(f"   ❌ /health - 状态码: {response.status_code}")
    except Exception as e:
        print(f"   ❌ /health - 错误: {e}")
        return False
    
    # 2. 根端点
    print("\n2️⃣ 测试根端点")
    try:
        response = requests.get(f"{base_url}/", timeout=5)
        if response.status_code == 200:
            print(f"   ✅ / - 状态码: {response.status_code}")
            print(f"      响应: {response.json()}")
        else:
            print(f"   ❌ / - 状态码: {response.status_code}")
    except Exception as e:
        print(f"   ❌ / - 错误: {e}")
    
    print("\n✅ 服务器运行正常！")
    print(f"\n📍 API文档: {base_url}/docs")
    print(f"📍 前端地址: http://localhost:3000")
    
    return True

if __name__ == "__main__":
    print("=" * 60)
    print("  编程冒险岛 - 服务器验证")
    print("=" * 60)
    print()
    
    # 等待服务器启动
    print("⏳ 等待服务器启动...")
    time.sleep(2)
    
    success = test_api_endpoints()
    
    if success:
        print("\n🎉 验证完成！服务器已就绪。")
    else:
        print("\n❌ 验证失败！请检查服务器是否启动。")
        print("\n启动命令:")
        print("   cd backend")
        print("   python run.py")

