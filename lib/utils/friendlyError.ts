export function toFriendlyMessage(err: unknown, fallback: string = '操作失败，请稍后再试'): string {
  let message = err instanceof Error ? err.message : String(err || '');
  if (!message) return fallback;

  // 尝试解析 JSON 格式的后端错误（FastAPI 返回 {"message":..., "detail":...}）
  if (message.startsWith('{')) {
    try {
      const parsed = JSON.parse(message);
      message = parsed.message || parsed.detail || message;
      if (typeof message !== 'string') message = fallback;
    } catch { /* 不是 JSON，继续 */ }
  }

  const lower = message.toLowerCase();

  // 登录过期
  if (message === 'LOGIN_EXPIRED' || lower.includes('not authenticated') || lower.includes('unauthorized') || lower.includes('401')) {
    return '登录已过期，请重新登录';
  }
  // 网络错误
  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('err_connection')) {
    return '网络异常，请检查网络连接';
  }
  // 超时
  if (lower.includes('timeout') || lower.includes('aborted')) {
    return '请求超时，请稍后再试';
  }
  // 频率限制
  if (lower.includes('rate limit') || message.includes('过于频繁') || lower.includes('429') || lower.includes('too many')) {
    return '操作过于频繁，请稍后再试';
  }
  // 服务器技术错误（SQL / traceback / HTTP status）
  if (lower.includes('sqlalchemy') || lower.includes('traceback') || lower.includes('internal server')
    || lower.includes('operationalerror') || lower.includes('integrityerror')) {
    return fallback;
  }
  // 原始 HTTP 状态行
  if (/^(get|post|put|patch|delete|head|options)\s/i.test(message) || /^\d{3}\s/.test(message)) {
    return fallback;
  }
  // 保留业务级中文提示（如 "金币不足"、"互动冷却" 等）
  if (message.includes('互动冷却')) return message;
  // 过长或包含英文技术关键词则用 fallback
  if (message.length > 80 || /\b(error|exception|failed to|stack|at \w+\.\w+)\b/i.test(message)) {
    return fallback;
  }
  return message;
}

export async function showFriendlyErrorToast(err: unknown, fallback?: string) {
  if (typeof window === 'undefined') return;
  try {
    const { showErrorToast } = await import('@/components/ui/ErrorToast');
    showErrorToast(toFriendlyMessage(err, fallback), 'error');
  } catch {
    // ignore toast failures
  }
}
