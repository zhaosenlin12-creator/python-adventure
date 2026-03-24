"use client";

import { motion } from "framer-motion";
import { BookOpen, Lock } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface Chapter {
    id: number;
    title: string;
    titleCN: string;
    description: string;
    descriptionCN: string;
    icon: string;
    levelCount: number;
    requiredLevel: number;
}

const CHAPTERS: Chapter[] = [
    {
        id: 1,
        title: "Python Basics",
        titleCN: "Python 基础",
        description: "Learn variables, print, and simple math",
        descriptionCN: "学习变量、打印和简单计算",
        icon: "📚",
        levelCount: 5,
        requiredLevel: 1
    },
    {
        id: 2,
        title: "Simple Logic",
        titleCN: "简单逻辑",
        description: "Master if/else and random numbers",
        descriptionCN: "掌握 if/else 和随机数",
        icon: "🧠",
        levelCount: 5,
        requiredLevel: 2
    },
    {
        id: 3,
        title: "Functions",
        titleCN: "函数之森",
        description: "Learn to define and call functions",
        descriptionCN: "学习定义和调用函数",
        icon: "📜",
        levelCount: 5,
        requiredLevel: 3
    },
    {
        id: 4,
        title: "Data Structures",
        titleCN: "数据神殿",
        description: "Master Lists and Dictionaries",
        descriptionCN: "掌握列表和字典",
        icon: "💎",
        levelCount: 5,
        requiredLevel: 4
    },
    {
        id: 5,
        title: "Advanced Loops",
        titleCN: "循环之地",
        description: "While loops, break, and continue",
        descriptionCN: "While 循环与控制语句",
        icon: "🔄",
        levelCount: 5,
        requiredLevel: 5
    },
    {
        id: 6,
        title: "Modules & Libs",
        titleCN: "知识图书馆",
        description: "Math, Time, and Random modules",
        descriptionCN: "数学、时间与随机模块",
        icon: "📚",
        levelCount: 5,
        requiredLevel: 6
    },
    {
        id: 7,
        title: "Object Oriented",
        titleCN: "构造工厂",
        description: "Classes, Objects, and Methods",
        descriptionCN: "类、对象与方法",
        icon: "🏭",
        levelCount: 5,
        requiredLevel: 7
    },
    {
        id: 8,
        title: "The Final Code",
        titleCN: "系统核心",
        description: "Debug, Algorithms, and Logic",
        descriptionCN: "调试、算法与逻辑",
        icon: "🌌",
        levelCount: 5,
        requiredLevel: 8
    },
    // ===== 新增章节 9-16 =====
    {
        id: 9,
        title: "File Master",
        titleCN: "文件大师",
        description: "Read and write files with Python",
        descriptionCN: "学习文件读写操作",
        icon: "📁",
        levelCount: 5,
        requiredLevel: 9
    },
    {
        id: 10,
        title: "Error Shield",
        titleCN: "异常护盾",
        description: "Handle errors with try/except",
        descriptionCN: "学习异常处理机制",
        icon: "🛡️",
        levelCount: 5,
        requiredLevel: 10
    },
    {
        id: 11,
        title: "String Wizard",
        titleCN: "字符串法师",
        description: "Master string slicing and formatting",
        descriptionCN: "掌握字符串切片与格式化",
        icon: "📝",
        levelCount: 5,
        requiredLevel: 11
    },
    {
        id: 12,
        title: "List Master",
        titleCN: "列表大师",
        description: "List comprehension and advanced operations",
        descriptionCN: "列表推导式与高级操作",
        icon: "📊",
        levelCount: 5,
        requiredLevel: 12
    },
    {
        id: 13,
        title: "Algorithm Lab",
        titleCN: "算法实验室",
        description: "Sorting, searching, and recursion",
        descriptionCN: "排序、搜索与递归",
        icon: "🧮",
        levelCount: 5,
        requiredLevel: 13
    },
    {
        id: 14,
        title: "Project Arena",
        titleCN: "项目竞技场",
        description: "Build real mini projects",
        descriptionCN: "综合项目实战",
        icon: "🚀",
        levelCount: 5,
        requiredLevel: 14
    },
    {
        id: 15,
        title: "Network Explorer",
        titleCN: "网络探索者",
        description: "HTTP requests and JSON data",
        descriptionCN: "网络请求与JSON数据",
        icon: "🌐",
        levelCount: 5,
        requiredLevel: 15
    },
    {
        id: 16,
        title: "Data Analyst",
        titleCN: "数据分析师",
        description: "CSV files and data processing",
        descriptionCN: "CSV文件与数据处理",
        icon: "📈",
        levelCount: 5,
        requiredLevel: 16
    }
];

export default function ChapterSelect({ onSelectChapter, userLevel }: {
    onSelectChapter: (chapterId: number) => void;
    userLevel: number;
}) {
    const { t, language } = useI18n();

    // 🔥 v2.1.12: 恢复原逻辑 - 章节基于用户等级解锁
    const isChapterUnlocked = (chapterId: number): boolean => {
        const chapter = CHAPTERS.find(c => c.id === chapterId);
        if (!chapter) return false;
        return userLevel >= chapter.requiredLevel;
    };

    return (
        <div className="w-full max-w-4xl mx-auto">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-pixel text-blue-400 mb-2 pixel-text-shadow">
                    {t('ui.chapter.select')}
                </h2>
                <p className="text-slate-400">
                    {t('ui.chapter.start')}
                </p>
            </div>

            {/* 🔥 移动端响应式网格：手机1列，平板2列，桌面2列 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 px-2 sm:px-0">
                {CHAPTERS.map((chapter) => {
                    // 🔥 v2.1.10: 使用新的章节解锁逻辑
                    const isUnlocked = isChapterUnlocked(chapter.id);

                    return (
                        <motion.button
                            key={chapter.id}
                            onClick={() => isUnlocked && onSelectChapter(chapter.id)}
                            disabled={!isUnlocked}
                            className={`
                                relative p-4 sm:p-6 rounded-2xl border-2 transition-all
                                min-h-[120px] sm:min-h-[180px]
                                touch-manipulation
                                ${isUnlocked
                                    ? 'border-slate-600 bg-slate-800 hover:bg-slate-700 active:bg-slate-700 hover:scale-105 cursor-pointer shadow-lg'
                                    : 'border-slate-700 bg-slate-800/50 opacity-50 cursor-not-allowed'
                                }
                            `}
                            whileHover={isUnlocked ? { y: -5 } : {}}
                            whileTap={isUnlocked ? { scale: 0.95 } : {}}
                        >
                            {/* Lock Icon for Locked Chapters */}
                            {!isUnlocked && (
                                <div className="absolute top-2 right-2 sm:top-4 sm:right-4">
                                    <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" />
                                </div>
                            )}

                            {/* Chapter Icon - 移动端稍小 */}
                            <div className="text-4xl sm:text-6xl mb-2 sm:mb-4">{chapter.icon}</div>

                            {/* Chapter Title - 移动端字体稍小 */}
                            <h3 className="text-lg sm:text-2xl font-pixel text-blue-400 mb-1 sm:mb-2">
                                {language === 'cn' ? chapter.titleCN : chapter.title}
                            </h3>

                            {/* Chapter Description - 移动端隐藏或缩短 */}
                            <p className="text-slate-400 text-xs sm:text-sm mb-2 sm:mb-4 line-clamp-2">
                                {language === 'cn' ? chapter.descriptionCN : chapter.description}
                            </p>

                            {/* Level Count */}
                            <div className="flex items-center justify-center gap-2 text-slate-400 text-xs sm:text-sm">
                                <BookOpen className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span>{chapter.levelCount} {t('ui.chapter.levels')}</span>
                            </div>

                            {/* Required Level */}
                            {!isUnlocked && (
                                <div className="mt-2 sm:mt-3 text-rose-500 text-xs font-pixel">
                                    {t('ui.chapter.required')} {chapter.requiredLevel}
                                </div>
                            )}
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
}
