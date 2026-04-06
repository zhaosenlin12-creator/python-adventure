/**
 * 🐾 宠物跟随系统
 * 在开放世界中跟随玩家的宠物精灵
 */

import * as Phaser from 'phaser';
import { Pet, PetStatus, PetMood, PET_CONFIGS } from '@/types/pet';
import { getPetConfig, getPetImageUrl } from '@/lib/config/petAssets';
import { getPetVariantScale, getPetWorldYOffset } from '@/lib/config/petArtworkProfiles';
import { getStageAppearance } from '@/lib/petEvolution';
import { migratePetType } from '@/lib/pet/migration';

const DEBUG = process.env.NODE_ENV === 'development';
const debugLog = DEBUG ? console.log.bind(console) : () => {};

export class PetFollower {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private sprite: Phaser.GameObjects.Image;
  private nameText: Phaser.GameObjects.Text;
  private statusIcon: Phaser.GameObjects.Text;
  
  private pet: Pet | null = null;
  private targetX: number = 0;
  private targetY: number = 0;
  
  // 跟随参数
  private readonly FOLLOW_DISTANCE = 80; // 跟随距离
  private readonly FOLLOW_SPEED = 0.08; // 跟随速度（插值系数）
  private readonly MIN_MOVE_DISTANCE = 5; // 最小移动距离（避免抖动）
  
  // 动画状态
  private currentAnimation: string = 'normal';
  private animationTimer: number = 0;
  private readonly ANIMATION_CHANGE_INTERVAL = 3000; // 3秒切换一次动画
  
  // 🎭 情绪状态（由外部 moodSystem 设置）
  private currentMood: PetMood = 'normal';
  private isLottiePet: boolean = false; // Lottie宠物使用emoji降级
  private emojiSprite: Phaser.GameObjects.Text | null = null;
  private isDestroyed: boolean = false;
  
  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    
    // 创建容器
    this.container = scene.add.container(x, y);
    
    // 创建宠物精灵（使用图片而不是精灵表）
    this.sprite = scene.add.image(0, 0, 'pet-placeholder');
    this.sprite.setDisplaySize(48, 48); // 恢复原始尺寸48x48
    this.sprite.setOrigin(0.5, 0.5);
    
    // 创建名字文本
    this.nameText = scene.add.text(0, -35, '', {
      fontSize: '11px',
      color: '#FFD700',
      backgroundColor: '#00000088',
      padding: { x: 4, y: 2 }
    }).setOrigin(0.5);
    
    // 创建状态图标
    this.statusIcon = scene.add.text(0, 25, '', {
      fontSize: '14px'
    }).setOrigin(0.5);
    
    // 添加到容器
    this.container.add([this.sprite, this.nameText, this.statusIcon]);
    
    // 初始隐藏
    this.container.setVisible(false);
    
    debugLog('[PetFollower] Created at', x, y);
  }
  
  /**
   * 设置宠物数据
   */
  setPet(pet: Pet | null) {
    this.pet = pet;
    
    if (!pet) {
      this.container.setVisible(false);
      return;
    }
    
    // 🥚 如果宠物是蛋状态，不显示跟随
    if (pet.isEgg || pet.petType === 'egg') {
      this.container.setVisible(false);
      debugLog('[PetFollower] Pet is egg, hiding follower');
      return;
    }
    
    // 更新名字
    this.nameText.setText(pet.name);
    
    // 更新状态图标
    this.updateStatusIcon();
    
    // 加载宠物动画
    this.loadPetAnimation();
    
    // 显示容器
    this.container.setVisible(true);
    
    debugLog('[PetFollower] Set pet:', pet.name, pet.petType);
  }
  
  /**
   * 加载宠物动画
   */
  private loadPetAnimation() {
    if (!this.pet) return;
    
    const migratedType = migratePetType(this.pet.petType);
    const assetConfig = getPetConfig(migratedType);
    
    // Lottie 宠物在 Phaser 中使用高品质 SVG 预览图
    if (assetConfig?.useLottie) {
      this.isLottiePet = true;
      
      if (assetConfig.previewSvg) {
        // 优先加载 SVG 预览图作为纹理
        const svgPath = assetConfig.previewSvg;
        if (this.emojiSprite) {
          this.emojiSprite.setVisible(false);
        }
        this.sprite.setVisible(true);
        
        if (this.scene.textures.exists(svgPath)) {
          this.sprite.setTexture(svgPath);
          this.applyStageAppearance();
        } else {
          this.loadGifAsTexture(svgPath);
        }
      } else {
        // 没有 SVG 预览时降级为 emoji
        this.sprite.setVisible(false);
        if (!this.emojiSprite) {
          const config = PET_CONFIGS[migratedType];
          this.emojiSprite = this.scene.add.text(0, 0, config.icon, {
            fontSize: '36px'
          }).setOrigin(0.5);
          this.container.add(this.emojiSprite);
        }
        this.emojiSprite.setVisible(true);
        this.applyStageAppearance();
      }
      
      // 根据情绪更新状态图标
      this.updateMoodEmoji();
      return;
    }
    
    // SVG/图片宠物正常加载
    this.isLottiePet = false;
    if (this.emojiSprite) {
      this.emojiSprite.setVisible(false);
    }
    this.sprite.setVisible(true);
    
    const stageIndex = this.pet.evolution_stage ?? (this.pet.isEgg ? 0 : 1);
    const animPath = getPetImageUrl(migratedType, this.currentAnimation as any, stageIndex);
    
    // 检查纹理是否已加载
    if (this.scene.textures.exists(animPath)) {
      this.sprite.setTexture(animPath);
      this.applyStageAppearance();
    } else {
      this.loadGifAsTexture(animPath);
    }
  }
  
  /**
   * 更新 Lottie 宠物的情绪表情（通过 statusIcon 显示）
   */
  private updateMoodEmoji() {
    const MOOD_INDICATORS: Record<string, string> = {
      happy: '😊', excited: '🌟', sad: '😢', tired: '💤',
      curious: '❓', eating: '🍖', playing: '🎮', sleeping: '💤',
      coma: '💀', walking: '👣'
    };
    
    const indicator = MOOD_INDICATORS[this.currentMood];
    if (indicator && this.currentMood !== 'normal') {
      this.statusIcon.setText(indicator);
    } else {
      // 🔒 mood 恢复 normal 时清除残留图标
      this.statusIcon.setText('');
    }
  }
  
  /**
   * 动态加载资源作为纹理（支持SVG/PNG/GIF）
   */
  private loadGifAsTexture(path: string) {
    try {
      if (!this.canUseSceneSystems()) {
        return;
      }

      const loader = this.scene.load as any;
      if (!loader) {
        this.applyFallbackTexture();
        return;
      }
      const isSvg = path.toLowerCase().endsWith('.svg');
      // 使用Phaser的加载器动态加载图片/矢量图
      if (isSvg && typeof loader.svg === 'function') {
        loader.svg(path, path);
      } else {
        loader.image(path, path);
      }
      loader.once('complete', () => {
        // 🔒 安全检查：防止场景/对象已销毁后的回调崩溃
        if (!this.canUseSceneSystems()) return;
        if (this.scene.textures.exists(path)) {
          this.sprite.setTexture(path);
          // 🔧 关键修复：加载完成后重新设置尺寸
          this.applyStageAppearance();
          debugLog('[PetFollower] Loaded texture:', path);
        }
      });
      const isLoaderBusy =
        typeof loader.isLoading === 'function'
          ? loader.isLoading()
          : Boolean(loader.isLoading);

      if (!isLoaderBusy) {
        loader.start();
      }
    } catch (error) {
      console.error('[PetFollower] Failed to load texture:', path, error);
      // 使用占位符（仅在未销毁时）
      this.applyFallbackTexture();
    }
  }

  /** 应用进化阶段外观（大小/位置） */
  private applyStageAppearance() {
    if (!this.pet || !this.canUseSceneSystems()) return;
    const migratedType = migratePetType(this.pet.petType);
    const appearance = getStageAppearance(this.pet.evolution_stage ?? (this.pet.isEgg ? 0 : 1));
    const size = Math.round((appearance.size || 48) * getPetVariantScale(migratedType, 'world'));
    const yOffset = getPetWorldYOffset(migratedType);
    this.sprite.setDisplaySize(size, size);
    this.sprite.setY(yOffset);
    if (this.emojiSprite) {
      this.emojiSprite.setY(yOffset);
    }
    this.nameText.setY(yOffset - (size / 2 + 10));
    this.statusIcon.setY(yOffset + size / 2 + 8);
  }

  private canUseSceneSystems() {
    const status = this.scene?.sys?.settings?.status;
    return Boolean(
      !this.isDestroyed &&
      this.scene &&
      this.scene.textures &&
      this.scene.load &&
      this.container?.scene &&
      this.sprite?.scene &&
      status !== Phaser.Scenes.SHUTDOWN &&
      status !== Phaser.Scenes.DESTROYED
    );
  }

  private applyFallbackTexture() {
    if (!this.canUseSceneSystems()) return;
    if (this.scene.textures.exists('pet-placeholder')) {
      this.sprite.setTexture('pet-placeholder');
    }
    this.applyStageAppearance();
  }
  
  /**
   * 更新状态图标
   */
  private updateStatusIcon() {
    if (!this.pet) return;
    
    switch (this.pet.status) {
      case 'normal':
        this.statusIcon.setText('');
        break;
      case 'tired':
        this.statusIcon.setText('😴');
        break;
      case 'coma':
        this.statusIcon.setText('💀');
        break;
      default:
        this.statusIcon.setText('');
    }
  }
  
  /**
   * 更新跟随逻辑
   */
  update(playerX: number, playerY: number, delta: number, playerDirection?: 'left' | 'right' | 'up' | 'down') {
    if (!this.pet || !this.container.visible) return;
    
    // 计算目标位置（玩家后方，根据玩家朝向）
    let offsetX = 0;
    let offsetY = 0;
    
    // 根据玩家朝向计算跟随位置
    switch (playerDirection) {
      case 'right':
        // 玩家向右，宠物在左后方
        offsetX = -this.FOLLOW_DISTANCE;
        offsetY = 0;
        break;
      case 'left':
        // 玩家向左，宠物在右后方
        offsetX = this.FOLLOW_DISTANCE;
        offsetY = 0;
        break;
      case 'down':
        // 玩家向下，宠物在上方
        offsetX = 0;
        offsetY = -this.FOLLOW_DISTANCE;
        break;
      case 'up':
        // 玩家向上，宠物在下方
        offsetX = 0;
        offsetY = this.FOLLOW_DISTANCE;
        break;
      default:
        // 默认在左后方
        offsetX = -this.FOLLOW_DISTANCE;
        offsetY = 0;
    }
    
    this.targetX = playerX + offsetX;
    this.targetY = playerY + offsetY;
    
    // 计算当前位置与目标位置的距离
    const dx = this.targetX - this.container.x;
    const dy = this.targetY - this.container.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 只有距离大于最小移动距离时才移动（避免抖动）
    if (distance > this.MIN_MOVE_DISTANCE) {
      // 平滑插值移动
      this.container.x += dx * this.FOLLOW_SPEED;
      this.container.y += dy * this.FOLLOW_SPEED;
      
      // 朝向逻辑：根据移动方向设置朝向
      // 用户反馈：第一版方向反了，所以这里交换flipX的值
      if (dx > 1) {
        // 向右移动，不翻转
        this.sprite.setFlipX(false);
      } else if (dx < -1) {
        // 向左移动，翻转
        this.sprite.setFlipX(true);
      }
    }
    
    // 更新动画状态（定时切换）
    this.animationTimer += delta;
    if (this.animationTimer >= this.ANIMATION_CHANGE_INTERVAL) {
      this.animationTimer = 0;
      this.changeAnimation();
    }
  }
  
  /**
   * 切换动画状态
   */
  private changeAnimation() {
    if (!this.pet) return;
    
    // 🔧 Lottie 宠物始终显示 previewSvg，动画切换仅更新 mood 指示器
    if (this.isLottiePet) {
      this.updateMoodEmoji();
      return;
    }
    
    // 根据宠物状态选择动画
    const animations = this.getAvailableAnimations();
    const randomAnim = animations[Math.floor(Math.random() * animations.length)];
    
    if (randomAnim !== this.currentAnimation) {
      this.currentAnimation = randomAnim;
      this.loadPetAnimation();
      debugLog('[PetFollower] Changed animation to:', randomAnim);
    }
  }
  
  /**
   * 获取可用的动画列表
   */
  private getAvailableAnimations(): string[] {
    if (!this.pet) return ['normal'];
    
    // 情绪优先：如果有外部情绪设置，使用情绪状态
    if (this.currentMood !== 'normal') {
      return [this.currentMood, 'normal'];
    }
    
    switch (this.pet.status) {
      case 'tired':
        return ['tired', 'normal'];
      case 'coma':
        return ['coma'];
      default:
        return ['normal', 'happy', 'curious', 'question'];
    }
  }
  
  /**
   * 🎭 设置情绪状态（由外部 moodSystem 调用）
   */
  setMood(mood: PetMood) {
    this.currentMood = mood;
    if (this.isLottiePet) {
      this.updateMoodEmoji();
    } else {
      // 立即切换动画
      this.currentAnimation = mood;
      this.loadPetAnimation();
    }
  }
  
  /**
   * 播放特定动画
   */
  playAnimation(animName: string) {
    this.currentAnimation = animName;
    this.loadPetAnimation();
    this.animationTimer = 0; // 重置计时器
  }
  
  /**
   * 显示/隐藏宠物
   */
  setVisible(visible: boolean) {
    this.container.setVisible(visible);
  }
  
  /**
   * 销毁宠物
   */
  destroy() {
    if (this.isDestroyed) {
      return;
    }
    this.isDestroyed = true;
    this.pet = null;
    if (this.emojiSprite) {
      this.emojiSprite.destroy();
      this.emojiSprite = null;
    }
    this.container.destroy();
    debugLog('[PetFollower] Destroyed');
  }
  
  /**
   * 获取容器位置
   */
  getPosition(): { x: number; y: number } {
    return {
      x: this.container.x,
      y: this.container.y
    };
  }
}
