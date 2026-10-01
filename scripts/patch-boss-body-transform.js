const fs = require('fs');
const path = 'C:/kaifa/game-google-clean/components/world/scenes/PlatformGameScene.ts';
let src = fs.readFileSync(path, 'utf8');
let count = 0;

function makeSync(varName, scaleVar, frameVar) {
    return [
        '                const __syncT = (' + varName + ' as any).transform;',
        '                if (__syncT) {',
        '                    __syncT.scaleX = ' + scaleVar + ';',
        '                    __syncT.scaleY = ' + scaleVar + ';',
        '                    const __fw = (' + frameVar + '.frame ? (' + frameVar + '.frame.realWidth || ' + frameVar + '.frame.width || 64) : 64);',
        '                    const __fh = (' + frameVar + '.frame ? (' + frameVar + '.frame.realHeight || ' + frameVar + '.frame.height || 64) : 64);',
        '                    __syncT.displayOriginX = __fw * (' + frameVar + '.originX || 0.5);',
        '                    __syncT.displayOriginY = __fh * (' + frameVar + '.originY || 0.5);',
        '                }',
    ].join('\r\n');
}

// 检测 line endings
const isCRLF = src.indexOf('\r\n') > 0;
const EOL = isCRLF ? '\r\n' : '\n';
console.log('Line endings:', isCRLF ? 'CRLF' : 'LF');

// Site 1: applyBossVisual
const site1Old = ['            body.setSize(safeFrameSize, safeFrameSize);',
    '            body.setOffset(0, 0);',
    '            body.updateCenter();',
    '        }',
    '',
    '        if (bossConfig?.tint) {'].join(EOL);
const site1New = ['            body.setSize(safeFrameSize, safeFrameSize);',
    '            body.setOffset(0, 0);',
    '            body.updateCenter();',
    '            const __syncT1 = (body as any).transform;',
    '            if (__syncT1) {',
    '                __syncT1.scaleX = scale;',
    '                __syncT1.scaleY = scale;',
    '                const __fw1 = (enemy.frame ? (enemy.frame.realWidth || enemy.frame.width || 64) : 64);',
    '                const __fh1 = (enemy.frame ? (enemy.frame.realHeight || enemy.frame.height || 64) : 64);',
    '                __syncT1.displayOriginX = __fw1 * (enemy.originX || 0.5);',
    '                __syncT1.displayOriginY = __fh1 * (enemy.originY || 0.5);',
    '            }',
    '        }',
    '',
    '        if (bossConfig?.tint) {'].join(EOL);
if (src.includes(site1Old)) { src = src.replace(site1Old, site1New); count++; console.log('Site 1 (applyBossVisual) patched'); }
else console.log('Site 1 NOT FOUND');

// Site 2: createEnemy
const site2Old = ['                eBody.setSize(safeBaseFrameSize, safeBaseFrameSize);',
    '                eBody.setOffset(0, 0);',
    '                eBody.updateCenter();',
    '            }'].join(EOL);
const site2New = ['                eBody.setSize(safeBaseFrameSize, safeBaseFrameSize);',
    '                eBody.setOffset(0, 0);',
    '                eBody.updateCenter();',
    '                const __syncT2 = (eBody as any).transform;',
    '                if (__syncT2) {',
    '                    __syncT2.scaleX = baseScale;',
    '                    __syncT2.scaleY = baseScale;',
    '                    const __fw2 = (enemy.frame ? (enemy.frame.realWidth || enemy.frame.width || 64) : 64);',
    '                    const __fh2 = (enemy.frame ? (enemy.frame.realHeight || enemy.frame.height || 64) : 64);',
    '                    __syncT2.displayOriginX = __fw2 * (enemy.originX || 0.5);',
    '                    __syncT2.displayOriginY = __fh2 * (enemy.originY || 0.5);',
    '                }',
    '            }'].join(EOL);
if (src.includes(site2Old)) { src = src.replace(site2Old, site2New); count++; console.log('Site 2 (createEnemy boss branch) patched'); }
else console.log('Site 2 NOT FOUND');

// Site 3: spawnSecondBoss
const site3Old = ['            b2Body.setSize(b2SafeFrame, b2SafeFrame);',
    '            b2Body.setOffset(0, 0);',
    '            b2Body.updateCenter();',
    '        }'].join(EOL);
const site3New = ['            b2Body.setSize(b2SafeFrame, b2SafeFrame);',
    '            b2Body.setOffset(0, 0);',
    '            b2Body.updateCenter();',
    '            const __syncT3 = (b2Body as any).transform;',
    '            if (__syncT3) {',
    '                __syncT3.scaleX = b2Scale;',
    '                __syncT3.scaleY = b2Scale;',
    '                const __fw3 = (boss2.frame ? (boss2.frame.realWidth || boss2.frame.width || 64) : 64);',
    '                const __fh3 = (boss2.frame ? (boss2.frame.realHeight || boss2.frame.height || 64) : 64);',
    '                __syncT3.displayOriginX = __fw3 * (boss2.originX || 0.5);',
    '                __syncT3.displayOriginY = __fh3 * (boss2.originY || 0.5);',
    '            }',
    '        }'].join(EOL);
if (src.includes(site3Old)) { src = src.replace(site3Old, site3New); count++; console.log('Site 3 (spawnSecondBoss) patched'); }
else console.log('Site 3 NOT FOUND');

// Site 4: bossShadowClone
const site4Old = ['                shadowBody.setSize(shadowSafeFrameSize, shadowSafeFrameSize);',
    '                shadowBody.setOffset(0, 0);',
    '                shadowBody.updateCenter();',
    '            }'].join(EOL);
const site4New = ['                shadowBody.setSize(shadowSafeFrameSize, shadowSafeFrameSize);',
    '                shadowBody.setOffset(0, 0);',
    '                shadowBody.updateCenter();',
    '                const __syncT4 = (shadowBody as any).transform;',
    '                if (__syncT4) {',
    '                    __syncT4.scaleX = shadowScale;',
    '                    __syncT4.scaleY = shadowScale;',
    '                    const __fw4 = (clone.frame ? (clone.frame.realWidth || clone.frame.width || 64) : 64);',
    '                    const __fh4 = (clone.frame ? (clone.frame.realHeight || clone.frame.height || 64) : 64);',
    '                    __syncT4.displayOriginX = __fw4 * (clone.originX || 0.5);',
    '                    __syncT4.displayOriginY = __fh4 * (clone.originY || 0.5);',
    '                }',
    '            }'].join(EOL);
if (src.includes(site4Old)) { src = src.replace(site4Old, site4New); count++; console.log('Site 4 (bossShadowClone) patched'); }
else console.log('Site 4 NOT FOUND');

// Site 5: bossTimeClone
const site5Old = ['                timeBody.setSize(timeSafeFrameSize, timeSafeFrameSize);',
    '                timeBody.setOffset(0, 0);',
    '                timeBody.updateCenter();',
    '            }'].join(EOL);
const site5New = ['                timeBody.setSize(timeSafeFrameSize, timeSafeFrameSize);',
    '                timeBody.setOffset(0, 0);',
    '                timeBody.updateCenter();',
    '                const __syncT5 = (timeBody as any).transform;',
    '                if (__syncT5) {',
    '                    __syncT5.scaleX = timeScale;',
    '                    __syncT5.scaleY = timeScale;',
    '                    const __fw5 = (clone.frame ? (clone.frame.realWidth || clone.frame.width || 64) : 64);',
    '                    const __fh5 = (clone.frame ? (clone.frame.realHeight || clone.frame.height || 64) : 64);',
    '                    __syncT5.displayOriginX = __fw5 * (clone.originX || 0.5);',
    '                    __syncT5.displayOriginY = __fh5 * (clone.originY || 0.5);',
    '                }',
    '            }'].join(EOL);
if (src.includes(site5Old)) { src = src.replace(site5Old, site5New); count++; console.log('Site 5 (bossTimeClone) patched'); }
else console.log('Site 5 NOT FOUND');

fs.writeFileSync(path, src);
console.log('=== Total sites patched: ' + count + ' ===');
