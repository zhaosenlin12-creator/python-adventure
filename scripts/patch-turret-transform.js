const fs = require('fs');
const path = 'C:/kaifa/game-google-clean/components/world/scenes/PlatformGameScene.ts';
let src = fs.readFileSync(path, 'utf8');
let count = 0;
const EOL = '\r\n';

// Turret bullets (3 occurrences)
const turretOld = ['        bullet.setDisplaySize(14, 14);',
    '        bullet.setCircle(7);'].join(EOL);
const turretNew = ['        bullet.setDisplaySize(14, 14);',
    '        bullet.setCircle(7);',
    '        const __trsyncT = (bullet.body as any).transform;',
    '        if (__trsyncT) {',
    '            __trsyncT.x = bullet.x; __trsyncT.y = bullet.y;',
    '            __trsyncT.scaleX = 1; __trsyncT.scaleY = 1;',
    '            __trsyncT.displayOriginX = 7; __trsyncT.displayOriginY = 7;',
    '            (bullet.body as any).position.x = bullet.x - 7;',
    '            (bullet.body as any).position.y = bullet.y - 7;',
    '        }'].join(EOL);

const turretOld2 = ['        bullet.setDisplaySize(16, 16);',
    '        bullet.setCircle(8);'].join(EOL);
const turretNew2 = ['        bullet.setDisplaySize(16, 16);',
    '        bullet.setCircle(8);',
    '        const __trsyncT2 = (bullet.body as any).transform;',
    '        if (__trsyncT2) {',
    '            __trsyncT2.x = bullet.x; __trsyncT2.y = bullet.y;',
    '            __trsyncT2.scaleX = 1; __trsyncT2.scaleY = 1;',
    '            __trsyncT2.displayOriginX = 8; __trsyncT2.displayOriginY = 8;',
    '            (bullet.body as any).position.x = bullet.x - 8;',
    '            (bullet.body as any).position.y = bullet.y - 8;',
    '        }'].join(EOL);

// 替换所有 turret 的 setCircle(7) 处
while (src.includes(turretOld)) { src = src.replace(turretOld, turretNew); count++; console.log('Patched turret 14x14'); }
while (src.includes(turretOld2)) { src = src.replace(turretOld2, turretNew2); count++; console.log('Patched turret 16x16'); }

fs.writeFileSync(path, src);
console.log('=== Total turret bullets patched: ' + count + ' ===');
