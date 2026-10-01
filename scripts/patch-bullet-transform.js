// Patch performAttack 和 turretShoot 中的 bullet body transform 同步
const fs = require('fs');
const path = 'C:/kaifa/game-google-clean/components/world/scenes/PlatformGameScene.ts';
let src = fs.readFileSync(path, 'utf8');
let count = 0;
const EOL = '\r\n';

// Site A: performAttack
const siteAOld = ['        // 创建子弹精灵',
    '        const bullet = this.bullets.create(bulletX, bulletY, \'\');',
    '        bullet.setDisplaySize(16, 16);',
    '        bullet.setCircle(8); // 圆形碰撞体'].join(EOL);
const siteANew = ['        // 创建子弹精灵',
    '        const bullet = this.bullets.create(bulletX, bulletY, \'\');',
    '        bullet.setDisplaySize(16, 16);',
    '        bullet.setCircle(8); // 圆形碰撞体',
    '        // 🔥 同步 body.transform:Phaser Body 在 physics.add.group().create 时',
    '        // 用默认 32×32 纹理捕捉 transform,后续 setCircle/移位不会自动更新,',
    '        ' + '导致 bullet body 永久偏移 -16 像素,和 boss body 实际不重叠。',
    '        const __bsyncT = (bullet.body as any).transform;',
    '        if (__bsyncT) {',
    '            __bsyncT.x = bullet.x;',
    '            __bsyncT.y = bullet.y;',
    '            __bsyncT.scaleX = 1;',
    '            __bsyncT.scaleY = 1;',
    '            __bsyncT.displayOriginX = 8;  // 16×16 displaySize * 0.5 origin',
    '            __bsyncT.displayOriginY = 8;',
    '            (bullet.body as any).position.x = bullet.x + 1 * (0 - 8);',
    '            (bullet.body as any).position.y = bullet.y + 1 * (0 - 8);',
    '        }'].join(EOL);
if (src.includes(siteAOld)) { src = src.replace(siteAOld, siteANew); count++; console.log('Site A (performAttack) patched'); }
else console.log('Site A NOT FOUND');

// Site B: turretShoot (第 1 处)
const siteBOld = ['    private turretShoot(turret: any) {',
    '',
    '        // 创建子弹',
    '        const bullet = this.bullets.create(turret.x, turret.y, \'\');',
    '        bullet.setDisplaySize(14, 14);',
    '        bullet.setCircle(7);'].join(EOL);
const siteBNew = ['    private turretShoot(turret: any) {',
    '',
    '        // 创建子弹',
    '        const bullet = this.bullets.create(turret.x, turret.y, \'\');',
    '        bullet.setDisplaySize(14, 14);',
    '        bullet.setCircle(7);',
    '        // 🔥 同步 body.transform(同 performAttack)',
    '        const __tsyncT = (bullet.body as any).transform;',
    '        if (__tsyncT) {',
    '            __tsyncT.x = bullet.x;',
    '            __tsyncT.y = bullet.y;',
    '            __tsyncT.scaleX = 1;',
    '            __tsyncT.scaleY = 1;',
    '            __tsyncT.displayOriginX = 7;',
    '            __tsyncT.displayOriginY = 7;',
    '            (bullet.body as any).position.x = bullet.x + 1 * (0 - 7);',
    '            (bullet.body as any).position.y = bullet.y + 1 * (0 - 7);',
    '        }'].join(EOL);
if (src.includes(siteBOld)) { src = src.replace(siteBOld, siteBNew); count++; console.log('Site B (turretShoot) patched'); }
else console.log('Site B NOT FOUND');

fs.writeFileSync(path, src);
console.log('=== Total patched: ' + count + ' ===');
