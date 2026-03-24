import httpx
from typing import Dict, List, Any
from app.core.config import settings

class SandboxService:
    """代码执行沙箱服务"""
    
    def __init__(self):
        self.sandbox_url = settings.SANDBOX_URL
    
    async def execute_code(
        self,
        code: str,
        test_cases: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        执行代码并运行测试用例
        
        Args:
            code: 要执行的代码
            test_cases: 测试用例列表
        
        Returns:
            执行结果字典
        """
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.sandbox_url}/execute",
                    json={
                        "code": code,
                        "test_cases": test_cases
                    }
                )
                response.raise_for_status()
                result = response.json()
                
                # 统一返回格式
                passed_tests = sum(1 for r in result.get("test_results", []) if r.get("passed"))
                total_tests = len(result.get("test_results", []))
                
                return {
                    "success": result.get("success", False),
                    "error": result.get("error", ""),
                    "output": result.get("output", ""),
                    "test_results": result.get("test_results", []),
                    "total_tests": total_tests,
                    "passed_tests": passed_tests
                }
        except httpx.TimeoutException:
            return {
                "success": False,
                "error": "代码执行超时",
                "output": "",
                "test_results": [],
                "total_tests": len(test_cases),
                "passed_tests": 0
            }
        except httpx.HTTPError as e:
            return {
                "success": False,
                "error": f"沙箱服务错误: {str(e)}",
                "output": "",
                "test_results": [],
                "total_tests": len(test_cases),
                "passed_tests": 0
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"未知错误: {str(e)}",
                "output": "",
                "test_results": [],
                "total_tests": len(test_cases),
                "passed_tests": 0
            }
    
    def calculate_score(self, total_tests: int, passed_tests: int) -> int:
        """
        根据通过的测试用例数量计算得分
        
        Args:
            total_tests: 总测试用例数
            passed_tests: 通过的测试用例数
        
        Returns:
            得分（0-100）
        """
        if total_tests == 0:
            return 0
        return int((passed_tests / total_tests) * 100)

# 创建全局实例
sandbox_service = SandboxService()

