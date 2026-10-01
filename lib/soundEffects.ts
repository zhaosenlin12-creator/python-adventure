// 音效系统配置
export interface SoundEffect {
  id: string;
  name: string;
  path: string;
  volume: number;
}

// ============================================
// 🎵 完整音效列表
// ============================================
export const SOUND_EFFECTS: { [key: string]: SoundEffect } = {
  // 📝 答题相关 (已有)
  question_show: { id: 'question_show', name: '显示题目', path: '/sounds/question_show.wav', volume: 0.5 },
  answer_correct: { id: 'answer_correct', name: '答对', path: '/sounds/answer_correct.wav', volume: 0.6 },
  answer_wrong: { id: 'answer_wrong', name: '答错', path: '/sounds/answer_wrong.wav', volume: 0.5 },

  // 🏆 关卡相关 (已有)
  level_complete: { id: 'level_complete', name: '关卡完成', path: '/sounds/level_complete.wav', volume: 0.7 },
  level_failed: { id: 'level_failed', name: '关卡失败', path: '/sounds/level_failed.wav', volume: 0.5 },

  // ⚔️ 玩家战斗 (已有)
  player_jump: { id: 'player_jump', name: '跳跃', path: '/sounds/player_jump.wav', volume: 0.3 },
  player_attack: { id: 'player_attack', name: '攻击', path: '/sounds/player_attack.wav', volume: 0.4 },
  enemy_hit: { id: 'enemy_hit', name: '击中敌人', path: '/sounds/enemy_hit.wav', volume: 0.5 },
  player_hurt: { id: 'player_hurt', name: '受伤', path: '/sounds/player_hurt.wav', volume: 0.5 },
  player_revive: { id: 'player_revive', name: '复活', path: '/sounds/player_revive.wav', volume: 0.5 },

  // 💎 收集相关 (已有)
  collect_coin: { id: 'collect_coin', name: '收集金币', path: '/sounds/collect_coin.wav', volume: 0.4 },
  collect_gem: { id: 'collect_gem', name: '收集宝石', path: '/sounds/collect_gem.wav', volume: 0.5 },

  // 🖱️ UI相关 (已有)
  button_click: { id: 'button_click', name: '按钮点击', path: '/sounds/button_click.wav', volume: 0.3 },
  button_hover: { id: 'button_hover', name: '按钮悬停', path: '/sounds/button_hover.wav', volume: 0.2 },

  // 👹 Boss战斗 (需下载)
  boss_appear: { id: 'boss_appear', name: 'Boss出现', path: '/sounds/boss_appear.wav', volume: 0.6 },
  boss_phase_change: { id: 'boss_phase_change', name: 'Boss阶段变化', path: '/sounds/boss_phase_change.wav', volume: 0.5 },
  boss_roar: { id: 'boss_roar', name: 'Boss咆哮', path: '/sounds/boss_roar.wav', volume: 0.6 },
  boss_defeated: { id: 'boss_defeated', name: 'Boss击败', path: '/sounds/boss_defeated.wav', volume: 0.7 },
  boss_teleport: { id: 'boss_teleport', name: 'Boss传送', path: '/sounds/boss_teleport.wav', volume: 0.4 },
  boss_laser: { id: 'boss_laser', name: 'Boss激光', path: '/sounds/boss_laser.wav', volume: 0.5 },
  boss_emp: { id: 'boss_emp', name: 'Boss电磁脉冲', path: '/sounds/boss_emp.wav', volume: 0.5 },
  boss_wave: { id: 'boss_wave', name: 'Boss冲击波', path: '/sounds/boss_wave.wav', volume: 0.5 },
  boss_charge: { id: 'boss_charge', name: 'Boss冲锋', path: '/sounds/boss_charge.wav', volume: 0.5 },
  boss_summon: { id: 'boss_summon', name: 'Boss召唤', path: '/sounds/boss_summon.wav', volume: 0.5 },
  boss_time: { id: 'boss_time', name: 'Boss时间技能', path: '/sounds/boss_time.wav', volume: 0.5 },
  boss_rewind: { id: 'boss_rewind', name: 'Boss时间倒流', path: '/sounds/boss_rewind.wav', volume: 0.5 },

  // 🌀 特殊效果 (需下载)
  portal_teleport: { id: 'portal_teleport', name: '传送门', path: '/sounds/portal_teleport.wav', volume: 0.5 },
  gravity_change: { id: 'gravity_change', name: '重力变化', path: '/sounds/gravity_change.wav', volume: 0.4 },

  // 🎮 PVP战斗 (需下载)
  pvp_battle_start: { id: 'pvp_battle_start', name: 'PVP战斗开始', path: '/sounds/pvp_battle_start.wav', volume: 0.6 },
  pvp_round_win: { id: 'pvp_round_win', name: 'PVP回合胜利', path: '/sounds/pvp_round_win.wav', volume: 0.6 },
  pvp_round_lose: { id: 'pvp_round_lose', name: 'PVP回合失败', path: '/sounds/pvp_round_lose.wav', volume: 0.5 },
  pvp_match_win: { id: 'pvp_match_win', name: 'PVP比赛胜利', path: '/sounds/pvp_match_win.wav', volume: 0.7 },
  pvp_match_lose: { id: 'pvp_match_lose', name: 'PVP比赛失败', path: '/sounds/pvp_match_lose.wav', volume: 0.5 },
  pvp_countdown: { id: 'pvp_countdown', name: 'PVP倒计时', path: '/sounds/pvp_countdown.wav', volume: 0.5 },
  pvp_punch: { id: 'pvp_punch', name: 'PVP拳击', path: '/sounds/pvp_punch.wav', volume: 0.5 },
  pvp_kick: { id: 'pvp_kick', name: 'PVP踢击', path: '/sounds/pvp_kick.wav', volume: 0.5 },
  pvp_block: { id: 'pvp_block', name: 'PVP格挡', path: '/sounds/pvp_block.wav', volume: 0.4 },

  // 🎵 背景音乐
  bgm_main: { id: 'bgm_main', name: '主界面BGM', path: '/sounds/bgm_main.mp3', volume: 0.3 },
  bgm_battle: { id: 'bgm_battle', name: '战斗BGM', path: '/sounds/bgm_battle.mp3', volume: 0.3 },
  bgm_boss: { id: 'bgm_boss', name: 'Boss战BGM', path: '/sounds/bgm_boss.mp3', volume: 0.35 },
  bgm_pvp: { id: 'bgm_pvp', name: 'PVP对战BGM', path: '/sounds/bgm_pvp.mp3', volume: 0.3 },
  bgm_victory: { id: 'bgm_victory', name: '胜利BGM', path: '/sounds/bgm_victory.mp3', volume: 0.4 }
};

// 音效管理器
class SoundManager {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private enabled: boolean = true;
  private masterVolume: number = 1.0;

  private getOrCreateAudio(effect: SoundEffect): HTMLAudioElement {
    const existing = this.sounds.get(effect.id);
    if (existing) return existing;

    const audio = new Audio();
    audio.preload = 'none';
    audio.volume = effect.volume * this.masterVolume;
    audio.addEventListener('error', () => {});
    audio.src = effect.path;
    this.sounds.set(effect.id, audio);
    return audio;
  }

  play(soundId: string) {
    if (!this.enabled) return;
    const effect = SOUND_EFFECTS[soundId];
    if (!effect) return;
    const audio = this.getOrCreateAudio(effect);
    try {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } catch {}
  }

  stop(soundId: string) {
    const audio = this.sounds.get(soundId);
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }

  setMasterVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.sounds.forEach((audio, id) => {
      const effect = SOUND_EFFECTS[id];
      if (effect) audio.volume = effect.volume * this.masterVolume;
    });
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.sounds.forEach(audio => { audio.pause(); audio.currentTime = 0; });
    }
  }

  isEnabled(): boolean { return this.enabled; }
}

export const soundManager = new SoundManager();
export const playSound = (soundId: string) => soundManager.play(soundId);
export const stopSound = (soundId: string) => soundManager.stop(soundId);
export const setSoundVolume = (volume: number) => soundManager.setMasterVolume(volume);
export const setSoundEnabled = (enabled: boolean) => soundManager.setEnabled(enabled);

if (typeof window !== 'undefined') {
  (window as any).playGameSound = playSound;
  (window as any).stopGameSound = stopSound;
}
