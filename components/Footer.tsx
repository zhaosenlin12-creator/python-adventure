"use client";

/**
 * 页面底部组件 - 显示备案号和版权信息
 */
export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="w-full py-4 px-6 bg-slate-800/90 border-t border-slate-700 text-center text-xs text-slate-400">
      <div className="max-w-4xl mx-auto space-y-2">
        {/* 版权信息 */}
        <p>
          © {currentYear} 乐启享 版权所有 | Python冒险岛
        </p>
        
        {/* ICP备案号 */}
        <p>
          <a 
            href="https://beian.miit.gov.cn/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-blue-400 transition-colors"
          >
            鄂ICP备2025149404号-1
          </a>
        </p>
        
        {/* 公安备案号 - 如果有的话可以添加 */}
        {/* <p>
          <a 
            href="http://www.beian.gov.cn/portal/registerSystemInfo" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-blue-400 transition-colors inline-flex items-center gap-1"
          >
            <img src="/beian.png" alt="" className="w-4 h-4" />
            鄂公网安备 XXXXXXXXXX号
          </a>
        </p> */}
      </div>
    </footer>
  );
}
