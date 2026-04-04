"""
启动FastAPI服务器 - 生产模式（无热重载）
用于测试 PVP 真人对战
"""
import uvicorn
import sys
import io

# 设置Windows控制台编码
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

if __name__ == "__main__":
    print("="*60)
    print("   启动编程冒险岛后端服务 (生产模式)")
    print("="*60)
    print()
    print("[启动] 正在启动服务器（无热重载）...")
    print()
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,  # 🔥 关闭热重载，避免状态丢失
        log_level="warning",
        access_log=False,
        ws_ping_interval=30,   # 🔥 服务器每30秒发ping
        ws_ping_timeout=30,    # 🔥 等待pong超时30秒
        timeout_keep_alive=65  # 🔥 HTTP keep-alive 超时65秒
    )
