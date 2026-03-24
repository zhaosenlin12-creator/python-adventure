"use client";

import { useState, useEffect } from "react";
import { Level } from "@/lib/levels";
import CodeEditor from "./CodeEditor";
import Console from "./Console";
import usePyodide from "@/hooks/usePyodide";
import FateSystem from "./FateSystem";
import BattleArena from "./BattleArena";
import { Play, ArrowLeft, Skull } from "lucide-react";
import confetti from "canvas-confetti";
import { useGameStore } from "@/store/gameStore";
import { useI18n } from "@/lib/i18n";
import { useSound } from "@/hooks/useSound";
import { usePetStore } from "@/store/petStore";
import { useAuthStore } from "@/store/authStore";
import { useCoinStore } from "@/store/coinStore";
import { showCoinRewardToast } from "@/components/ui/CoinRewardToast";
import { addCoinsToServer } from "@/lib/api/coinAPI";

export default function LevelView({ level, onBack }: { level: Level; onBack: () => void }) {
    const [code, setCode] = useState(level.initialCode);
    const [showFate, setShowFate] = useState(false);
    const [fateType, setFateType] = useState<'reward' | 'punishment'>('reward');

    // Battle State
    const [playerHealth, setPlayerHealth] = useState(level.battle?.playerHp || 100);
    const [enemyHealth, setEnemyHealth] = useState(level.battle?.enemyHp || 50);
    const [isAttacking, setIsAttacking] = useState(false);
    const [isHit, setIsHit] = useState(false);
    const [lastDamage, setLastDamage] = useState<number | null>(null);
    const [turn, setTurn] = useState<'player' | 'enemy'>('player');
    const [battleLog, setBattleLog] = useState<string[]>([]);

    const { isReady, isLoading, output, runCode, getGlobal } = usePyodide();
    const { addXp, unlockLevel, completedLevels } = useGameStore();
    const { t, language } = useI18n();
    const { play, stop } = useSound();
    const { currentPet, updateHatchProgress } = usePetStore();
    const { token } = useAuthStore();
    const { loadBalance } = useCoinStore();

    const isBoss = level.type === 'boss';

    // Reset battle state when level changes
    useEffect(() => {
        if (level.battle) {
            setPlayerHealth(level.battle.playerHp);
            setEnemyHealth(level.battle.enemyHp);
            setTurn('player');
            setBattleLog([t('battle.start')]);
            // 注意：背景音乐由 musicManager 统一管理，不在这里播放
        }
    }, [level, t]);

    const handleRun = async () => {
        console.log("Handle Run Clicked. Turn:", turn, "IsReady:", isReady, "IsLoading:", isLoading);
        if (turn !== 'player') return;

        play('run');
        setIsAttacking(true);
        await runCode(code);

        // Validation Logic
        let isSuccess = false;
        // 过滤UI提示，只保留Python输出
        const filteredOutput = output.map(line => {
            // 移除每行中的UI提示文字，保留数字和英文
            let cleaned = line;
            // 移除中文提示
            cleaned = cleaned.replace(/代码已修改.*?✓/g, '');
            cleaned = cleaned.replace(/正在执行\.{3}/g, '');
            cleaned = cleaned.replace(/验证通过！/g, '');
            cleaned = cleaned.replace(/验证失败！/g, '');
            return cleaned.trim();
        }).filter(line => line !== ''); // 过滤空行
        
        const outputStr = filteredOutput.join('\n').trim();
        console.log("Filtered Output:", outputStr);
        console.log("Original Output:", output);

        // Check for errors first
        const hasError = outputStr.toLowerCase().includes('error') || outputStr.includes('Traceback');
        
        console.log("Code:", code);
        console.log("Has Error:", hasError);
        console.log("Has Placeholder:", code.includes('____'));

        if (!hasError) {
            // 🎯 超级宽松验证逻辑 - 优先输出，再看关键字
            
            console.log("=== 验证详情 ===");
            console.log("expectedOutput:", level.expectedOutput);
            console.log("outputStr:", outputStr);
            console.log("validationKeyword:", level.validationKeyword);
            
            if (level.expectedOutput) {
                // 策略1: 有期望输出 - 输出对就直接通过！
                const outputMatches = outputStr.includes(level.expectedOutput);
                
                if (outputMatches) {
                    // ✅ 输出正确，直接通过！
                    isSuccess = true;
                    console.log("✅ 输出匹配，通过！");
                } else if (level.validationKeyword) {
                    // 输出不对，检查关键字（70%匹配）
                    const keywords = level.validationKeyword.split(',').map(k => k.trim());
                    const matchedCount = keywords.filter(keyword => code.includes(keyword)).length;
                    const matchRate = matchedCount / keywords.length;
                    
                    if (matchRate >= 0.7) {
                        isSuccess = true;
                        console.log(`✅ 关键字匹配率 ${(matchRate * 100).toFixed(0)}%，通过！`);
                    } else {
                        console.log(`❌ 关键字匹配率 ${(matchRate * 100).toFixed(0)}%，不通过`);
                    }
                }
            } else if (level.validationKeyword) {
                // 策略2: 无期望输出，检查关键字（70%匹配）
                const keywords = level.validationKeyword.split(',').map(k => k.trim());
                const matchedCount = keywords.filter(keyword => code.includes(keyword)).length;
                const matchRate = matchedCount / keywords.length;
                const hasOutput = outputStr.length > 0;
                
                if (matchRate >= 0.7 && hasOutput) {
                    isSuccess = true;
                    console.log(`✅ 关键字匹配率 ${(matchRate * 100).toFixed(0)}% + 有输出，通过！`);
                } else {
                    console.log(`❌ 关键字匹配率 ${(matchRate * 100).toFixed(0)}%，或无输出`);
                }
            } else {
                // 策略3: 无期望输出也无关键字 - 只要有输出就通过
                const hasOutput = outputStr.length > 0;
                if (hasOutput) {
                    isSuccess = true;
                    console.log("✅ 有输出，通过！");
                }
            }
        }

        console.log("Is Success:", isSuccess);

        // Battle Logic
        if (isSuccess) {
            // Player Attacks
            play('attack');

            // Check if user defined 'damage' variable in Python
            let damage = 0;
            try {
                const pyDamage = getGlobal('damage');
                console.log("PyDamage:", pyDamage);
                if (typeof pyDamage === 'number') {
                    damage = Math.floor(pyDamage);
                } else if (pyDamage && typeof pyDamage.toJs === 'function') {
                    // Handle Pyodide proxy objects if necessary
                    damage = Number(pyDamage.toJs());
                } else {
                    damage = Math.floor(Math.random() * 20) + 10; // Default random dmg
                }
            } catch (e) {
                console.warn("Failed to get damage variable:", e);
                damage = Math.floor(Math.random() * 20) + 10;
            }

            setLastDamage(damage);
            setEnemyHealth(prev => Math.max(0, prev - damage));
            setIsHit(true);
            setBattleLog(prev => [...prev, `> ${t('battle.hit', { damage })}`]);

            // Check Win
            if (enemyHealth - damage <= 0) {
                handleWin();
            } else {
                // Enemy Turn
                setTimeout(() => handleEnemyTurn(), 1500);
            }
        } else {
            // Player Misses
            setLastDamage(0);
            setIsHit(false);
            setBattleLog(prev => [...prev, `> ${t('battle.miss')}`]);

            // Enemy Turn
            setTimeout(() => handleEnemyTurn(), 1500);
        }

        setTimeout(() => {
            setIsAttacking(false);
            setIsHit(false);
        }, 1000);
    };

    const handleEnemyTurn = () => {
        setTurn('enemy');
        if (!level.battle) return;

        // Enemy Attacks
        play('hit');
        const damage = Math.floor(Math.random() * level.battle.enemyAttack) + 5;
        setLastDamage(damage);
        setPlayerHealth(prev => Math.max(0, prev - damage));
        setIsHit(true);
        setBattleLog(prev => [...prev, `> ${t('battle.enemyAttack', { enemy: level.battle?.enemyName || t('battle.enemy.default'), damage })}`]);

        setTimeout(() => {
            setIsHit(false);
            setTurn('player');

            // Check Loss
            if (playerHealth - damage <= 0) {
                play('lose');
                setBattleLog(prev => [...prev, `> ${t('battle.defeat')}`]);
            }
        }, 1000);
    };

    const handleWin = async () => {
        play('win');
        confetti({ particleCount: 200, spread: 150 });
        setBattleLog(prev => [...prev, `> ${t('battle.victory')}`]);

        if (!completedLevels.includes(level.id)) {
            // 🔥 v2.1.10: 无论是普通关卡还是BOSS，都要记录完成状态
            unlockLevel(level.id);
            
            // 🪙 金币奖励：BOSS关卡50金币，普通关卡10金币
            const coinsEarned = isBoss ? 50 : 10;
            
            // 发送金币到服务器
            if (token) {
                try {
                    await addCoinsToServer(coinsEarned, 'level_complete', `完成关卡: ${level.title}`, token);
                    showCoinRewardToast(coinsEarned, `完成关卡: ${language === 'cn' ? (level.titleCN || level.title) : level.title}`, 'reward');
                    // 刷新金币余额
                    loadBalance(token).catch(() => {});
                } catch (error) {
                    console.error('[LevelView] Failed to add coins:', error);
                }
            }
            
            // 🥚 更新宠物孵化进度（如果当前宠物是蛋）
            if (currentPet && currentPet.isEgg && currentPet.petType === 'egg') {
                try {
                    await updateHatchProgress(currentPet.id);
                    console.log('[LevelView] Hatch progress updated for pet:', currentPet.id);
                } catch (error) {
                    console.error('[LevelView] Failed to update hatch progress:', error);
                }
            }
            
            if (isBoss) {
                addXp(500);
                setFateType('reward');
                setShowFate(true);
            } else {
                addXp(50);
                if (Math.random() > 0.7) {
                    setFateType(Math.random() > 0.5 ? 'reward' : 'punishment');
                    setShowFate(true);
                }
            }
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-100px)] gap-2 relative">
            <FateSystem
                isOpen={showFate}
                onClose={() => setShowFate(false)}
                type={fateType}
            />

            {/* Header - 紧凑版 */}
            <div className={`flex justify-between items-center px-4 py-2 rounded-none ${isBoss ? 'pixel-panel-accent' : 'pixel-panel'}`}>
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="hover:bg-white/10 p-1.5 rounded transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className={`text-lg font-bold font-pixel tracking-widest ${isBoss ? 'text-red-500' : 'text-yellow-400 pixel-text-shadow'}`}>
                            {language === 'cn' ? (level.titleCN || level.title) : level.title}
                        </h1>
                        <p className="text-xs text-slate-300">
                            {language === 'cn' ? (level.descriptionCN || level.description) : level.description}
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleRun}
                    disabled={!isReady || isLoading || turn === 'enemy'}
                    className={`pixel-btn ${isBoss ? 'pixel-btn-danger' : 'pixel-btn-success'} flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm px-4 py-2`}
                >
                    <Play className="w-4 h-4" />
                    {isLoading ? t('btn.loading') : turn === 'enemy' ? t('btn.enemyTurn') : t('btn.run')}
                </button>
            </div>

            {/* Battle Arena - 适中大小 */}
            {level.battle && (
                <div className="h-40">
                    <BattleArena
                        config={level.battle}
                        playerHealth={playerHealth}
                        enemyHealth={enemyHealth}
                        isAttacking={isAttacking}
                        isHit={isHit}
                        damage={lastDamage}
                        turn={turn}
                    />
                </div>
            )}

            {/* Main Workspace - 更大的代码区 */}
            <div className="flex-1 grid grid-cols-2 gap-3 min-h-0 pb-2">
                <div className="flex flex-col h-full">
                    <div className="bg-slate-900 px-4 py-2 border-x-4 border-t-4 border-slate-950 font-pixel text-xs text-blue-400 flex justify-between items-center tracking-widest">
                        <span>{t('ui.editor')}</span>
                    </div>
                    <div className="flex-1 border-4 border-slate-950 shadow-2xl relative bg-[#1e1e1e]">
                        {isLoading ? (
                            <div className="h-full w-full flex items-center justify-center text-blue-400 font-pixel animate-pulse">
                                {t('btn.loading')}...
                            </div>
                        ) : (
                            <CodeEditor code={code} onChange={(val) => setCode(val || "")} />
                        )}
                    </div>
                </div>

                <div className="flex flex-col h-full">
                    <div className="bg-slate-900 px-4 py-2 border-x-4 border-t-4 border-slate-950 font-pixel text-xs text-green-400 tracking-widest">
                        {t('ui.terminal')}
                    </div>
                    <div className="flex-1 border-4 border-slate-950 shadow-2xl relative bg-black p-2 font-mono text-sm overflow-y-auto">
                        {/* Battle Log */}
                        <div className="mb-4 text-yellow-300 border-b border-slate-800 pb-2">
                            {battleLog.map((log, i) => (
                                <div key={i}>{log}</div>
                            ))}
                        </div>
                        {/* Standard Output */}
                        <Console output={output} />
                    </div>
                </div>
            </div>
        </div>
    );
}
