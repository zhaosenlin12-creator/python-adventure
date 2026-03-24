/**
 * 🛡️ 输入验证工具
 * 提供前端安全输入验证
 */

// ============ 验证结果类型 ============

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// ============ 用户输入验证 ============

/**
 * 验证用户名
 * - 3-20个字符
 * - 只允许字母、数字、中文、下划线
 * - 不能以数字开头
 */
export function validateUsername(username: string): ValidationResult {
  if (!username || username.trim().length === 0) {
    return { isValid: false, error: '用户名不能为空' };
  }
  
  const trimmed = username.trim();
  
  if (trimmed.length < 3) {
    return { isValid: false, error: '用户名至少3个字符' };
  }
  
  if (trimmed.length > 20) {
    return { isValid: false, error: '用户名最多20个字符' };
  }
  
  // 允许字母、数字、中文、下划线
  const pattern = /^[a-zA-Z\u4e00-\u9fa5_][a-zA-Z0-9\u4e00-\u9fa5_]*$/;
  if (!pattern.test(trimmed)) {
    return { isValid: false, error: '用户名只能包含字母、数字、中文和下划线，且不能以数字开头' };
  }
  
  return { isValid: true };
}

/**
 * 验证邮箱格式
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || email.trim().length === 0) {
    return { isValid: false, error: '邮箱不能为空' };
  }
  
  const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!pattern.test(email.trim())) {
    return { isValid: false, error: '邮箱格式不正确' };
  }
  
  return { isValid: true };
}

/**
 * 验证密码强度
 * - 至少6个字符
 * - 建议包含字母和数字
 */
export function validatePassword(password: string): ValidationResult {
  if (!password || password.length === 0) {
    return { isValid: false, error: '密码不能为空' };
  }
  
  if (password.length < 6) {
    return { isValid: false, error: '密码至少6个字符' };
  }
  
  if (password.length > 100) {
    return { isValid: false, error: '密码过长' };
  }
  
  // 检查是否过于简单
  const simplePasswords = ['123456', 'password', '111111', 'qwerty', 'abc123'];
  if (simplePasswords.includes(password.toLowerCase())) {
    return { isValid: false, error: '密码过于简单，请使用更复杂的密码' };
  }
  
  return { isValid: true };
}

// ============ 游戏内容验证 ============

/**
 * 验证关卡名称
 */
export function validateLevelName(name: string): ValidationResult {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: '关卡名称不能为空' };
  }
  
  const trimmed = name.trim();
  
  if (trimmed.length < 2) {
    return { isValid: false, error: '关卡名称至少2个字符' };
  }
  
  if (trimmed.length > 50) {
    return { isValid: false, error: '关卡名称最多50个字符' };
  }
  
  return { isValid: true };
}

/**
 * 验证聊天消息
 */
export function validateChatMessage(message: string): ValidationResult {
  if (!message || message.trim().length === 0) {
    return { isValid: false, error: '消息不能为空' };
  }
  
  const trimmed = message.trim();
  
  if (trimmed.length > 500) {
    return { isValid: false, error: '消息最多500个字符' };
  }
  
  // 检查敏感词（简化版）
  const sensitivePatterns = [
    /\b(fuck|shit|ass|bitch)\b/gi,
    /\b(傻[逼B比]|操|妈的|草)\b/g,
  ];
  
  for (const pattern of sensitivePatterns) {
    if (pattern.test(trimmed)) {
      return { isValid: false, error: '消息包含不当内容' };
    }
  }
  
  return { isValid: true };
}

/**
 * 验证房间ID
 */
export function validateRoomId(roomId: string): ValidationResult {
  if (!roomId || roomId.trim().length === 0) {
    return { isValid: false, error: '房间号不能为空' };
  }
  
  // 房间号格式：4-8位数字/字母
  const pattern = /^[A-Z0-9]{4,8}$/;
  if (!pattern.test(roomId.toUpperCase())) {
    return { isValid: false, error: '房间号格式不正确（4-8位字母或数字）' };
  }
  
  return { isValid: true };
}

// ============ 代码验证 ============

/**
 * 验证Python代码（基础安全检查）
 */
export function validatePythonCode(code: string): ValidationResult {
  if (!code || code.trim().length === 0) {
    return { isValid: false, error: '代码不能为空' };
  }
  
  // 检查危险操作
  const dangerousPatterns = [
    /\bimport\s+os\b/,
    /\bimport\s+sys\b/,
    /\bimport\s+subprocess\b/,
    /\b__import__\b/,
    /\beval\s*\(/,
    /\bexec\s*\(/,
    /\bopen\s*\(/,
    /\bfile\s*\(/,
    /\.system\s*\(/,
    /\.popen\s*\(/,
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(code)) {
      return { isValid: false, error: '代码包含不允许的操作' };
    }
  }
  
  // 检查代码长度
  if (code.length > 10000) {
    return { isValid: false, error: '代码过长' };
  }
  
  return { isValid: true };
}

// ============ 数值验证 ============

/**
 * 验证数值范围
 */
export function validateNumber(
  value: number,
  options: {
    min?: number;
    max?: number;
    integer?: boolean;
    name?: string;
  } = {}
): ValidationResult {
  const { min, max, integer, name = '数值' } = options;
  
  if (typeof value !== 'number' || isNaN(value)) {
    return { isValid: false, error: `${name}必须是有效数字` };
  }
  
  if (integer && !Number.isInteger(value)) {
    return { isValid: false, error: `${name}必须是整数` };
  }
  
  if (min !== undefined && value < min) {
    return { isValid: false, error: `${name}不能小于${min}` };
  }
  
  if (max !== undefined && value > max) {
    return { isValid: false, error: `${name}不能大于${max}` };
  }
  
  return { isValid: true };
}

// ============ 通用工具 ============

/**
 * 清理HTML标签（防XSS）
 */
export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * 清理用户输入（通用）
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[\x00-\x1F\x7F]/g, '') // 移除控制字符
    .slice(0, 1000); // 限制长度
}

/**
 * 批量验证
 */
export function validateAll(
  validations: Array<() => ValidationResult>
): ValidationResult {
  for (const validate of validations) {
    const result = validate();
    if (!result.isValid) {
      return result;
    }
  }
  return { isValid: true };
}

/**
 * 创建验证器
 */
export function createValidator<T>(
  validationFn: (value: T) => ValidationResult
) {
  return {
    validate: validationFn,
    isValid: (value: T) => validationFn(value).isValid,
    getError: (value: T) => validationFn(value).error,
  };
}

// ============ 导出常用验证器实例 ============

export const validators = {
  username: createValidator(validateUsername),
  email: createValidator(validateEmail),
  password: createValidator(validatePassword),
  levelName: createValidator(validateLevelName),
  chatMessage: createValidator(validateChatMessage),
  roomId: createValidator(validateRoomId),
  pythonCode: createValidator(validatePythonCode),
};
