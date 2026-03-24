// 🔥🔥🔥 战役8特殊功能实现 🔥🔥🔥
// 传送门、化学区域、重力翻转的游戏逻辑

import * as Phaser from 'phaser';

// 传送门管理器
export class PortalManager {
  private scene: Phaser.Scene;
  private portals: Map<string, { sprite: Phaser.GameObjects.Arc; data: any }> = new Map();
  private lastTeleportTime: number = 0;
  private teleportCooldown: number = 500;  // 传送冷却500ms
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }
  
  // 创建传送门
  createPortals(portalData: any[]) {
    if (!portalData || portalData.length === 0) return;
    
    portalData.forEach(portal => {
      const color = this.getPortalColor(portal.color);
      
      // 创建传送门视觉效果
      const portalSprite = this.scene.add.circle(portal.x, portal.y, 30, color, 0.7);
      portalSprite.setStrokeStyle(3, 0xffffff, 1);
      
      // 添加旋转动画
      this.scene.tweens.add({
        targets: portalSprite,
        scaleX: 1.2,
        scaleY: 1.2,
        alpha: 0.5,
        duration: 1000,
        yoyo: true,
        repeat: -1
      });
      
      // 添加粒子效果
      const particles = this.scene.add.particles(portal.x, portal.y, undefined, {
        speed: 50,
        scale: { start: 0.3, end: 0 },
        blendMode: 'ADD',
        lifespan: 1000,
        frequency: 100,
        tint: color
      });
      
      this.portals.set(portal.id, {
        sprite: portalSprite,
        data: portal
      });
    });
  }
  
  // 检查玩家是否进入传送门
  checkTeleport(player: Phaser.Physics.Arcade.Sprite): { x: number; y: number } | null {
    const now = Date.now();
    if (now - this.lastTeleportTime < this.teleportCooldown) {
      return null;  // 冷却中
    }
    
    for (const [id, portal] of this.portals) {
      const dist = Phaser.Math.Distance.Between(
        player.x, player.y,
        portal.data.x, portal.data.y
      );
      
      if (dist < 40) {  // 进入传送门范围
        const linkedPortal = this.portals.get(portal.data.linkedTo);
        if (linkedPortal) {
          this.lastTeleportTime = now;
          
          // 传送特效
          this.playTeleportEffect(portal.data.x, portal.data.y);
          this.playTeleportEffect(linkedPortal.data.x, linkedPortal.data.y);
          
          return { x: linkedPortal.data.x, y: linkedPortal.data.y };
        }
      }
    }
    
    return null;
  }
  
  private playTeleportEffect(x: number, y: number) {
    const flash = this.scene.add.circle(x, y, 50, 0xffffff, 0.8);
    this.scene.tweens.add({
      targets: flash,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 300,
      onComplete: () => flash.destroy()
    });
  }
  
  private getPortalColor(colorName: string): number {
    const colors: Record<string, number> = {
      blue: 0x0088ff,
      orange: 0xff8800,
      green: 0x00ff00,
      purple: 0x9900ff
    };
    return colors[colorName] || 0x0088ff;
  }
  
  destroy() {
    this.portals.forEach(portal => {
      portal.sprite.destroy();
    });
    this.portals.clear();
  }
}

// 化学区域管理器
export class ChemicalZoneManager {
  private scene: Phaser.Scene;
  private zones: { rect: Phaser.GameObjects.Rectangle; data: any }[] = [];
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }
  
  createZones(zoneData: any[]) {
    if (!zoneData || zoneData.length === 0) return;
    
    zoneData.forEach(zone => {
      const rect = this.scene.add.rectangle(
        zone.x + zone.width / 2,
        zone.y + zone.height / 2,
        zone.width,
        zone.height,
        zone.color,
        0.3
      );
      rect.setStrokeStyle(2, zone.color, 0.8);
      
      // 添加区域标识
      let emoji = '🧪';
      switch (zone.type) {
        case 'acid': emoji = '☠️'; break;
        case 'poison': emoji = '💀'; break;
        case 'heal': emoji = '💚'; break;
        case 'speed': emoji = '⚡'; break;
        case 'synthesis': emoji = '🔬'; break;
      }
      
      const text = this.scene.add.text(
        zone.x + zone.width / 2,
        zone.y + zone.height / 2,
        emoji,
        { fontSize: '32px' }
      ).setOrigin(0.5);
      
      // 添加波动效果
      this.scene.tweens.add({
        targets: rect,
        alpha: 0.2,
        duration: 1500,
        yoyo: true,
        repeat: -1
      });
      
      this.zones.push({ rect, data: zone });
    });
  }
  
  // 检查玩家是否在化学区域内，返回效果
  checkPlayerInZone(playerX: number, playerY: number): { type: string; value: number } | null {
    for (const zone of this.zones) {
      const { x, y, width, height, type, damage, healAmount, speedBoost } = zone.data;
      
      if (playerX >= x && playerX <= x + width &&
          playerY >= y && playerY <= y + height) {
        
        switch (type) {
          case 'acid':
            return { type: 'damage', value: damage || 20 };
          case 'poison':
            return { type: 'damage', value: damage || 5 };
          case 'heal':
            return { type: 'heal', value: healAmount || 2 };
          case 'speed':
            return { type: 'speed', value: speedBoost || 1.5 };
        }
      }
    }
    return null;
  }
  
  destroy() {
    this.zones.forEach(zone => zone.rect.destroy());
    this.zones = [];
  }
}

// 重力区域管理器
export class GravityZoneManager {
  private scene: Phaser.Scene;
  private zones: { rect: Phaser.GameObjects.Rectangle; data: any }[] = [];
  private currentGravity: number = 1;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }
  
  createZones(zoneData: any[]) {
    if (!zoneData || zoneData.length === 0) return;
    
    zoneData.forEach(zone => {
      const color = zone.gravityMultiplier < 0 ? 0x9932cc : 0x00ff00;
      
      const rect = this.scene.add.rectangle(
        zone.x + zone.width / 2,
        zone.y + zone.height / 2,
        zone.width,
        zone.height,
        color,
        0.2
      );
      rect.setStrokeStyle(2, color, 0.6);
      
      // 添加方向指示
      const arrow = zone.gravityMultiplier < 0 ? '⬆️' : '⬇️';
      const text = this.scene.add.text(
        zone.x + zone.width / 2,
        zone.y + zone.height / 2,
        arrow,
        { fontSize: '40px' }
      ).setOrigin(0.5);
      
      // 添加闪烁效果
      this.scene.tweens.add({
        targets: [rect, text],
        alpha: 0.1,
        duration: 2000,
        yoyo: true,
        repeat: -1
      });
      
      this.zones.push({ rect, data: zone });
    });
  }
  
  // 检查玩家是否在重力区域内
  checkGravity(playerX: number, playerY: number): number {
    for (const zone of this.zones) {
      const { x, y, width, height, gravityMultiplier } = zone.data;
      
      if (playerX >= x && playerX <= x + width &&
          playerY >= y && playerY <= y + height) {
        
        if (this.currentGravity !== gravityMultiplier) {
          this.currentGravity = gravityMultiplier;
        }
        return gravityMultiplier;
      }
    }
    
    // 不在任何重力区域，恢复正常
    if (this.currentGravity !== 1) {
      this.currentGravity = 1;
    }
    return 1;
  }
  
  destroy() {
    this.zones.forEach(zone => zone.rect.destroy());
    this.zones = [];
  }
}

// 化学博士Boss技能
export const chemistBossAttacks = {
  // 毒气云攻击
  poisonCloud: (scene: Phaser.Scene, _bossX: number, _bossY: number, playerX: number, playerY: number) => {
    // 创建毒气云
    const cloud = scene.add.circle(playerX, playerY, 100, 0x9932cc, 0.5);
    
    scene.tweens.add({
      targets: cloud,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 3000,
      onComplete: () => cloud.destroy()
    });
    
    return { x: playerX, y: playerY, radius: 150, duration: 3000, damage: 8 };
  },
  
  // 酸液喷射
  acidSpray: (scene: Phaser.Scene, bossX: number, bossY: number, playerX: number, playerY: number) => {
    const angle = Phaser.Math.Angle.Between(bossX, bossY, playerX, playerY);
    const graphics = scene.add.graphics();
    
    graphics.fillStyle(0x00ff00, 0.7);
    graphics.beginPath();
    graphics.moveTo(bossX, bossY);
    graphics.lineTo(
      bossX + Math.cos(angle - 0.3) * 400,
      bossY + Math.sin(angle - 0.3) * 400
    );
    graphics.lineTo(
      bossX + Math.cos(angle + 0.3) * 400,
      bossY + Math.sin(angle + 0.3) * 400
    );
    graphics.closePath();
    graphics.fill();
    
    scene.tweens.add({
      targets: graphics,
      alpha: 0,
      duration: 500,
      onComplete: () => graphics.destroy()
    });
    
    return { angle, range: 400, damage: 20 };
  }
};
