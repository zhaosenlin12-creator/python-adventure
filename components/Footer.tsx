"use client";

import Image from "next/image";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-slate-700/80 bg-slate-900/90 px-6 py-4 text-center text-xs text-slate-400">
      <div className="mx-auto max-w-4xl space-y-2">
        <div className="flex items-center justify-center gap-2 text-slate-300">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10">
            <Image
              src="/brand/logo11-badge.png"
              alt="LeQiXiang Logo"
              width={24}
              height={24}
              className="h-6 w-6 object-contain"
            />
          </span>
          <p className="text-xs sm:text-sm">&copy; {currentYear} 乐启享 | Python Adventure</p>
        </div>

        <p>
          <a
            href="https://beian.miit.gov.cn/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-400 transition-colors"
          >
            鄂 ICP 备 2025149404 号-1
          </a>
        </p>
      </div>
    </footer>
  );
}
