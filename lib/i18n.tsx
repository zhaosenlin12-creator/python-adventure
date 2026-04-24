"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'cn' | 'en';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const translations = {
  cn: {
    "app.title": "Python 冒险岛",
    "app.subtitle": "乐启享编程教育",
    "app.welcome": "欢迎，{username}",
    "level.locked": "未解锁",
    "btn.run": "释放魔法（运行）",
    "btn.loading": "加载中...",
    "btn.enemyTurn": "敌方回合",
    "btn.openWorld": "开放世界",
    "btn.openWorld.desc": "探索、挑战、成长",
    "btn.logout": "退出登录",
    "btn.soundOn": "关闭音效",
    "btn.soundOff": "开启音效",
    "btn.switchToEnglish": "Switch to English",
    "btn.switchToChinese": "切换到中文",
    "battle.start": "战斗开始，写出正确代码来攻击。",
    "battle.hit": "你的代码命中目标，造成 {damage} 点伤害。",
    "battle.miss": "代码还不完整，这次攻击落空了。",
    "battle.enemyAttack": "{enemy} 发动攻击，造成 {damage} 点伤害。",
    "battle.defeat": "这次挑战失败了，再试一次。",
    "battle.victory": "胜利，关卡完成。",
    "ui.editor": "代码编辑器",
    "ui.terminal": "战斗日志",
    "ui.leaderboard": "排行榜",
    "ui.leaderboard.subtitle": "顶尖编程勇士",
    "ui.coins": "金币",
    "ui.chapter.select": "选择章节",
    "ui.chapter.start": "开始你的 Python 冒险",
    "ui.chapter.levels": "关卡",
    "ui.chapter.required": "需要等级",
    "ui.back": "返回",
    "ui.backToHome": "返回首页",
    "ui.loading": "加载中...",
    "ui.dailyStreak": "每日连胜",
    "battle.enemy.default": "敌人",
  },
  en: {
    "app.title": "Python Adventure",
    "app.subtitle": "LeQiXiang Coding Edu",
    "app.welcome": "Welcome, {username}",
    "level.locked": "LOCKED",
    "btn.run": "CAST SPELL (RUN)",
    "btn.loading": "LOADING...",
    "btn.enemyTurn": "ENEMY TURN",
    "btn.openWorld": "Open World",
    "btn.openWorld.desc": "Explore, Challenge, Grow",
    "btn.logout": "Logout",
    "btn.soundOn": "Mute Sound",
    "btn.soundOff": "Unmute Sound",
    "btn.switchToEnglish": "Switch to English",
    "btn.switchToChinese": "Switch to Chinese",
    "battle.start": "Battle Start! Write code to attack!",
    "battle.hit": "HERO used CODE STRIKE! Dealt {damage} DMG!",
    "battle.miss": "Syntax Error! Attack Missed!",
    "battle.enemyAttack": "{enemy} attacked! Took {damage} DMG!",
    "battle.defeat": "DEFEAT! Try again.",
    "battle.victory": "VICTORY! Level Complete!",
    "ui.editor": "SPELLBOOK",
    "ui.terminal": "BATTLE LOG",
    "ui.leaderboard": "LEADERBOARD",
    "ui.leaderboard.subtitle": "Top Code Warriors",
    "ui.coins": "COINS",
    "ui.chapter.select": "Select Chapter",
    "ui.chapter.start": "Start your Python adventure!",
    "ui.chapter.levels": "Levels",
    "ui.chapter.required": "Requires Level",
    "ui.back": "Back",
    "ui.backToHome": "Back to Home",
    "ui.loading": "Loading...",
    "ui.dailyStreak": "Daily Streak",
    "battle.enemy.default": "Enemy",
  }
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('cn');

  const t = (key: string, params?: Record<string, string | number>) => {
    let text = translations[language][key as keyof typeof translations['cn']] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
