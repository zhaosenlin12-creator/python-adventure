/**
 * Python代码执行器
 * 用于安全地执行用户提交的Python代码并获取输出结果
 */

// 生产环境禁用调试日志
const DEBUG = process.env.NODE_ENV === 'development';
const debugLog = DEBUG ? console.log.bind(console) : () => {};

export interface CodeExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime?: number;
}

export interface TestCase {
  input?: string;
  expectedOutput: string;
  description?: string;
}

/**
 * 执行Python代码（使用Pyodide在浏览器中执行）
 * @param code Python代码
 * @param testCases 测试用例
 * @param timeout 超时时间（毫秒）
 * @returns 执行结果
 */
export async function executePythonCode(
  code: string,
  testCases: TestCase[] = [],
  timeout: number = 5000
): Promise<CodeExecutionResult> {
  try {
    // 检查代码是否为空
    if (!code || code.trim() === '') {
      return {
        success: false,
        output: '',
        error: '代码不能为空'
      };
    }

    // 基本安全检查
    const dangerousPatterns = [
      /import\s+os/i,
      /import\s+sys/i,
      /import\s+subprocess/i,
      /exec\s*\(/i,
      /eval\s*\(/i,
      /__import__/i,
      /open\s*\(/i,
      /file\s*\(/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        return {
          success: false,
          output: '',
          error: '代码包含不安全的操作'
        };
      }
    }

    // 如果有测试用例，运行测试
    if (testCases.length > 0) {
      return await runWithTestCases(code, testCases, timeout);
    }

    // 没有测试用例，直接执行代码
    return await executeCodeDirect(code, timeout);
  } catch (error) {
    return {
      success: false,
      output: '',
      error: error instanceof Error ? error.message : '执行出错'
    };
  }
}

/**
 * 直接执行代码（不使用测试用例）
 */
async function executeCodeDirect(code: string, timeout: number): Promise<CodeExecutionResult> {
  const startTime = Date.now();

  try {
    // 使用Pyodide执行Python代码
    if (typeof window !== 'undefined' && (window as any).pyodide) {
      const pyodide = (window as any).pyodide;
      
      // 捕获print输出
      const captureCode = `
import sys
from io import StringIO

# 捕获标准输出
old_stdout = sys.stdout
sys.stdout = StringIO()

try:
${code.split('\n').map(line => '    ' + line).join('\n')}
    output = sys.stdout.getvalue()
finally:
    sys.stdout = old_stdout

output
`;

      const result = await pyodide.runPythonAsync(captureCode);
      const executionTime = Date.now() - startTime;

      return {
        success: true,
        output: result || '',
        executionTime
      };
    } else {
      // Pyodide未加载，使用模拟执行
      return simulateExecution(code);
    }
  } catch (error) {
    return {
      success: false,
      output: '',
      error: error instanceof Error ? error.message : '执行出错',
      executionTime: Date.now() - startTime
    };
  }
}

/**
 * 使用测试用例运行代码
 */
async function runWithTestCases(
  code: string,
  testCases: TestCase[],
  timeout: number
): Promise<CodeExecutionResult> {
  const results: string[] = [];
  const errors: string[] = [];

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    
    try {
      // 执行代码
      const result = await executeCodeDirect(code, timeout);
      
      if (!result.success) {
        errors.push(`测试用例${i + 1}失败: ${result.error}`);
        continue;
      }

      // 比较输出
      const actualOutput = result.output.trim();
      const expectedOutput = testCase.expectedOutput.trim();

      if (actualOutput === expectedOutput) {
        results.push(`✓ 测试用例${i + 1}通过`);
      } else {
        errors.push(`✗ 测试用例${i + 1}失败:\n  期望: ${expectedOutput}\n  实际: ${actualOutput}`);
      }
    } catch (error) {
      errors.push(`测试用例${i + 1}执行出错: ${error}`);
    }
  }

  const allPassed = errors.length === 0;

  return {
    success: allPassed,
    output: results.join('\n'),
    error: errors.length > 0 ? errors.join('\n') : undefined
  };
}

/**
 * 模拟执行（当Pyodide未加载时）
 * 用于简单的代码模式匹配
 */
function simulateExecution(code: string): CodeExecutionResult {
  try {
    // 检测print语句
    const printMatch = code.match(/print\s*\(\s*['"](.+?)['"]\s*\)/);
    if (printMatch) {
      return {
        success: true,
        output: printMatch[1]
      };
    }

    // 检测for循环打印
    const forLoopMatch = code.match(/for\s+(\w+)\s+in\s+range\((\d+)(?:,\s*(\d+))?\):\s*print\((\w+)(?:\s*([+\-])\s*(\d+))?\)/);
    if (forLoopMatch) {
      const varName = forLoopMatch[1];
      const start = forLoopMatch[3] ? parseInt(forLoopMatch[2]) : 0;
      const end = forLoopMatch[3] ? parseInt(forLoopMatch[3]) : parseInt(forLoopMatch[2]);
      const printVar = forLoopMatch[4];
      const op = forLoopMatch[5];
      const offset = forLoopMatch[6] ? parseInt(forLoopMatch[6]) : 0;

      if (varName === printVar) {
        const output: number[] = [];
        for (let i = start; i < end; i++) {
          if (op === '+') {
            output.push(i + offset);
          } else if (op === '-') {
            output.push(i - offset);
          } else {
            output.push(i);
          }
        }
        return {
          success: true,
          output: output.join('\n')
        };
      }
    }

    // 检测列表创建
    const listMatch = code.match(/(\w+)\s*=\s*\[(.+?)\]/);
    if (listMatch) {
      return {
        success: true,
        output: `[${listMatch[2]}]`
      };
    }

    return {
      success: false,
      output: '',
      error: '无法模拟执行此代码，请使用标准Python语法'
    };
  } catch (error) {
    return {
      success: false,
      output: '',
      error: '模拟执行出错'
    };
  }
}

/**
 * 初始化Pyodide（在应用启动时调用）
 * 优先使用本地文件，CDN作为备用
 */
export async function initPyodide(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    // 检查是否已经加载
    if ((window as any).pyodide) {
      debugLog('[CodeExecutor] Pyodide已加载');
      return true;
    }

    debugLog('[CodeExecutor] 开始加载Pyodide...');
    
    // 加载Pyodide脚本（优先本地，CDN备用）
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      // 优先使用本地文件
      script.src = '/pyodide/pyodide.js';
      script.async = true;
      script.onload = () => {
        debugLog('[CodeExecutor] ✅ Pyodide脚本从本地加载成功');
        resolve();
      };
      script.onerror = () => {
        debugLog('[CodeExecutor] ⚠️ 本地Pyodide加载失败，尝试CDN...');
        // 本地失败，尝试CDN
        const cdnScript = document.createElement('script');
        cdnScript.src = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js';
        cdnScript.async = true;
        cdnScript.onload = () => {
          debugLog('[CodeExecutor] ✅ Pyodide脚本从CDN加载成功');
          resolve();
        };
        cdnScript.onerror = reject;
        document.head.appendChild(cdnScript);
      };
      document.head.appendChild(script);
    });

    // 初始化Pyodide（优先本地，CDN备用）
    try {
      debugLog('[CodeExecutor] 🔄 从本地文件初始化Pyodide...');
      (window as any).pyodide = await (window as any).loadPyodide({
        indexURL: '/pyodide/'
      });
      debugLog('[CodeExecutor] ✅ Pyodide从本地初始化成功！');
    } catch (localErr) {
      debugLog('[CodeExecutor] ⚠️ 本地初始化失败，尝试CDN...', localErr);
      (window as any).pyodide = await (window as any).loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/'
      });
      debugLog('[CodeExecutor] ✅ Pyodide从CDN初始化成功！');
    }

    debugLog('[CodeExecutor] Pyodide加载成功！');
    return true;
  } catch (error) {
    console.error('[CodeExecutor] Pyodide加载失败:', error);
    debugLog('[CodeExecutor] 将使用模拟执行模式');
    return false;
  }
}

/**
 * 比较两个代码的输出是否相同
 */
export async function compareCodeOutputs(
  userCode: string,
  correctCode: string,
  testCases: TestCase[] = []
): Promise<boolean> {
  try {
    // 如果有测试用例，使用测试用例比较
    if (testCases.length > 0) {
      const result = await executePythonCode(userCode, testCases);
      return result.success;
    }

    // 没有测试用例，直接比较输出
    const userResult = await executeCodeDirect(userCode, 5000);
    const correctResult = await executeCodeDirect(correctCode, 5000);

    if (!userResult.success || !correctResult.success) {
      return false;
    }

    // 标准化输出后比较
    const normalizeOutput = (output: string) => {
      return output.trim().replace(/\s+/g, ' ').toLowerCase();
    };

    return normalizeOutput(userResult.output) === normalizeOutput(correctResult.output);
  } catch (error) {
    console.error('[CodeExecutor] 比较输出出错:', error);
    return false;
  }
}
