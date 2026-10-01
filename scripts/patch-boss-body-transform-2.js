const fs = require('fs');
const path = 'C:/kaifa/game-google-clean/components/world/scenes/PlatformGameScene.ts';
let src = fs.readFileSync(path, 'utf8');
let count = 0;
const EOL = '\r\n';

// Site 1
const block1Old = ['            const __syncT1 = (body as any).transform;',
    '            if (__syncT1) {',
    '                __syncT1.scaleX = scale;',
    '                __syncT1.scaleY = scale;',
    '                const __fw1 = (enemy.frame ? (enemy.frame.realWidth || enemy.frame.width || 64) : 64);',
    '                const __fh1 = (enemy.frame ? (enemy.frame.realHeight || enemy.frame.height || 64) : 64);',
    '                __syncT1.displayOriginX = __fw1 * (enemy.originX || 0.5);',
    '                __syncT1.displayOriginY = __fh1 * (enemy.originY || 0.5);',
    '            }'].join(EOL);
const block1New = ['            const __syncT1 = (body as any).transform;',
    '            if (__syncT1) {',
    '                __syncT1.x = enemy.x;',
    '                __syncT1.y = enemy.y;',
    '                __syncT1.scaleX = scale;',
    '                __syncT1.scaleY = scale;',
    '                const __fw1 = (enemy.frame ? (enemy.frame.realWidth || enemy.frame.width || 64) : 64);',
    '                const __fh1 = (enemy.frame ? (enemy.frame.realHeight || enemy.frame.height || 64) : 64);',
    '                __syncT1.displayOriginX = __fw1 * (enemy.originX || 0.5);',
    '                __syncT1.displayOriginY = __fh1 * (enemy.originY || 0.5);',
    '                // 强制 body.position 按当前 sprite 位置和 scale 算一次',
    '                body.position.x = enemy.x + scale * (0 - __fw1 * (enemy.originX || 0.5));',
    '                body.position.y = enemy.y + scale * (0 - __fh1 * (enemy.originY || 0.5));',
    '            }'].join(EOL);
if (src.includes(block1Old)) { src = src.replace(block1Old, block1New); count++; console.log('Site 1 patched'); }
else console.log('Site 1 NOT FOUND');

// Site 2
const block2Old = ['                const __syncT2 = (eBody as any).transform;',
    '                if (__syncT2) {',
    '                    __syncT2.scaleX = baseScale;',
    '                    __syncT2.scaleY = baseScale;',
    '                    const __fw2 = (enemy.frame ? (enemy.frame.realWidth || enemy.frame.width || 64) : 64);',
    '                    const __fh2 = (enemy.frame ? (enemy.frame.realHeight || enemy.frame.height || 64) : 64);',
    '                    __syncT2.displayOriginX = __fw2 * (enemy.originX || 0.5);',
    '                    __syncT2.displayOriginY = __fh2 * (enemy.originY || 0.5);',
    '                }'].join(EOL);
const block2New = ['                const __syncT2 = (eBody as any).transform;',
    '                if (__syncT2) {',
    '                    __syncT2.x = enemy.x;',
    '                    __syncT2.y = enemy.y;',
    '                    __syncT2.scaleX = baseScale;',
    '                    __syncT2.scaleY = baseScale;',
    '                    const __fw2 = (enemy.frame ? (enemy.frame.realWidth || enemy.frame.width || 64) : 64);',
    '                    const __fh2 = (enemy.frame ? (enemy.frame.realHeight || enemy.frame.height || 64) : 64);',
    '                    __syncT2.displayOriginX = __fw2 * (enemy.originX || 0.5);',
    '                    __syncT2.displayOriginY = __fh2 * (enemy.originY || 0.5);',
    '                    eBody.position.x = enemy.x + baseScale * (0 - __fw2 * (enemy.originX || 0.5));',
    '                    eBody.position.y = enemy.y + baseScale * (0 - __fh2 * (enemy.originY || 0.5));',
    '                }'].join(EOL);
if (src.includes(block2Old)) { src = src.replace(block2Old, block2New); count++; console.log('Site 2 patched'); }
else console.log('Site 2 NOT FOUND');

// Site 3
const block3Old = ['            const __syncT3 = (b2Body as any).transform;',
    '            if (__syncT3) {',
    '                __syncT3.scaleX = b2Scale;',
    '                __syncT3.scaleY = b2Scale;',
    '                const __fw3 = (boss2.frame ? (boss2.frame.realWidth || boss2.frame.width || 64) : 64);',
    '                const __fh3 = (boss2.frame ? (boss2.frame.realHeight || boss2.frame.height || 64) : 64);',
    '                __syncT3.displayOriginX = __fw3 * (boss2.originX || 0.5);',
    '                __syncT3.displayOriginY = __fh3 * (boss2.originY || 0.5);',
    '            }'].join(EOL);
const block3New = ['            const __syncT3 = (b2Body as any).transform;',
    '            if (__syncT3) {',
    '                __syncT3.x = boss2.x;',
    '                __syncT3.y = boss2.y;',
    '                __syncT3.scaleX = b2Scale;',
    '                __syncT3.scaleY = b2Scale;',
    '                const __fw3 = (boss2.frame ? (boss2.frame.realWidth || boss2.frame.width || 64) : 64);',
    '                const __fh3 = (boss2.frame ? (boss2.frame.realHeight || boss2.frame.height || 64) : 64);',
    '                __syncT3.displayOriginX = __fw3 * (boss2.originX || 0.5);',
    '                __syncT3.displayOriginY = __fh3 * (boss2.originY || 0.5);',
    '                b2Body.position.x = boss2.x + b2Scale * (0 - __fw3 * (boss2.originX || 0.5));',
    '                b2Body.position.y = boss2.y + b2Scale * (0 - __fh3 * (boss2.originY || 0.5));',
    '            }'].join(EOL);
if (src.includes(block3Old)) { src = src.replace(block3Old, block3New); count++; console.log('Site 3 patched'); }
else console.log('Site 3 NOT FOUND');

// Site 4
const block4Old = ['                const __syncT4 = (shadowBody as any).transform;',
    '                if (__syncT4) {',
    '                    __syncT4.scaleX = shadowScale;',
    '                    __syncT4.scaleY = shadowScale;',
    '                    const __fw4 = (clone.frame ? (clone.frame.realWidth || clone.frame.width || 64) : 64);',
    '                    const __fh4 = (clone.frame ? (clone.frame.realHeight || clone.frame.height || 64) : 64);',
    '                    __syncT4.displayOriginX = __fw4 * (clone.originX || 0.5);',
    '                    __syncT4.displayOriginY = __fh4 * (clone.originY || 0.5);',
    '                }'].join(EOL);
const block4New = ['                const __syncT4 = (shadowBody as any).transform;',
    '                if (__syncT4) {',
    '                    __syncT4.x = clone.x;',
    '                    __syncT4.y = clone.y;',
    '                    __syncT4.scaleX = shadowScale;',
    '                    __syncT4.scaleY = shadowScale;',
    '                    const __fw4 = (clone.frame ? (clone.frame.realWidth || clone.frame.width || 64) : 64);',
    '                    const __fh4 = (clone.frame ? (clone.frame.realHeight || clone.frame.height || 64) : 64);',
    '                    __syncT4.displayOriginX = __fw4 * (clone.originX || 0.5);',
    '                    __syncT4.displayOriginY = __fh4 * (clone.originY || 0.5);',
    '                    shadowBody.position.x = clone.x + shadowScale * (0 - __fw4 * (clone.originX || 0.5));',
    '                    shadowBody.position.y = clone.y + shadowScale * (0 - __fh4 * (clone.originY || 0.5));',
    '                }'].join(EOL);
if (src.includes(block4Old)) { src = src.replace(block4Old, block4New); count++; console.log('Site 4 patched'); }
else console.log('Site 4 NOT FOUND');

// Site 5
const block5Old = ['                const __syncT5 = (timeBody as any).transform;',
    '                if (__syncT5) {',
    '                    __syncT5.scaleX = timeScale;',
    '                    __syncT5.scaleY = timeScale;',
    '                    const __fw5 = (clone.frame ? (clone.frame.realWidth || clone.frame.width || 64) : 64);',
    '                    const __fh5 = (clone.frame ? (clone.frame.realHeight || clone.frame.height || 64) : 64);',
    '                    __syncT5.displayOriginX = __fw5 * (clone.originX || 0.5);',
    '                    __syncT5.displayOriginY = __fh5 * (clone.originY || 0.5);',
    '                }'].join(EOL);
const block5New = ['                const __syncT5 = (timeBody as any).transform;',
    '                if (__syncT5) {',
    '                    __syncT5.x = clone.x;',
    '                    __syncT5.y = clone.y;',
    '                    __syncT5.scaleX = timeScale;',
    '                    __syncT5.scaleY = timeScale;',
    '                    const __fw5 = (clone.frame ? (clone.frame.realWidth || clone.frame.width || 64) : 64);',
    '                    const __fh5 = (clone.frame ? (clone.frame.realHeight || clone.frame.height || 64) : 64);',
    '                    __syncT5.displayOriginX = __fw5 * (clone.originX || 0.5);',
    '                    __syncT5.displayOriginY = __fh5 * (clone.originY || 0.5);',
    '                    timeBody.position.x = clone.x + timeScale * (0 - __fw5 * (clone.originX || 0.5));',
    '                    timeBody.position.y = clone.y + timeScale * (0 - __fh5 * (clone.originY || 0.5));',
    '                }'].join(EOL);
if (src.includes(block5Old)) { src = src.replace(block5Old, block5New); count++; console.log('Site 5 patched'); }
else console.log('Site 5 NOT FOUND');

fs.writeFileSync(path, src);
console.log('=== Total sites patched: ' + count + ' ===');
