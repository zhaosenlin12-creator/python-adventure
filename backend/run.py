"""
启动FastAPI服务器
"""
import uvicorn
import sys
import io

# 设置Windows控制台编码
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

if __name__ == "__main__":
    print("="*60)
    print("   启动编程冒险岛后端服务")
    print("="*60)
    print()
    print("[启动] 正在启动服务器...")
    print()
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # 开发模式自动重载
        log_level="info",
        ws_ping_interval=20,  # WebSocket ping间隔
        ws_ping_timeout=20,   # WebSocket ping超时
        timeout_keep_alive=30  # 保持连接超时
    )



