/**
 * 🎨 批量生成 21 个高清装饰品 SVG（128x128）
 * 每个 SVG 含：渐变材质、光影、透视、缝线/木纹等细节
 */
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'public', 'icons', 'decorations');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const SVGS = {
// ────────── 家具类 ──────────
'furniture-sofa': `<svg viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="ss" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#E04040"/><stop offset="100%" stop-color="#B52020"/></linearGradient>
    <linearGradient id="sb" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#C42020"/><stop offset="100%" stop-color="#901818"/></linearGradient>
    <filter id="sf"><feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#000" flood-opacity=".22"/></filter>
  </defs>
  <g filter="url(#sf)">
    <rect x="22" y="98" width="8" height="14" rx="3" fill="#5C3317"/>
    <rect x="44" y="98" width="8" height="14" rx="3" fill="#5C3317"/>
    <rect x="76" y="98" width="8" height="14" rx="3" fill="#5C3317"/>
    <rect x="98" y="98" width="8" height="14" rx="3" fill="#5C3317"/>
    <rect x="16" y="82" width="96" height="20" rx="4" fill="#7B3F00"/>
    <rect x="20" y="32" width="88" height="28" rx="8" fill="url(#sb)"/>
    <line x1="42" y1="36" x2="42" y2="56" stroke="#fff" stroke-width=".7" opacity=".15"/>
    <line x1="64" y1="36" x2="64" y2="56" stroke="#fff" stroke-width=".7" opacity=".15"/>
    <line x1="86" y1="36" x2="86" y2="56" stroke="#fff" stroke-width=".7" opacity=".15"/>
    <ellipse cx="64" cy="40" rx="30" ry="8" fill="#fff" opacity=".12"/>
    <rect x="8" y="40" width="18" height="44" rx="8" fill="url(#sb)"/>
    <rect x="102" y="40" width="18" height="44" rx="8" fill="url(#sb)"/>
    <rect x="20" y="56" width="88" height="28" rx="6" fill="url(#ss)"/>
    <line x1="42" y1="60" x2="42" y2="80" stroke="#fff" stroke-width=".8" opacity=".18"/>
    <line x1="64" y1="60" x2="64" y2="80" stroke="#fff" stroke-width=".8" opacity=".18"/>
    <line x1="86" y1="60" x2="86" y2="80" stroke="#fff" stroke-width=".8" opacity=".18"/>
    <ellipse cx="42" cy="64" rx="12" ry="4" fill="#fff" opacity=".12"/>
    <ellipse cx="86" cy="64" rx="12" ry="4" fill="#fff" opacity=".12"/>
    <ellipse cx="34" cy="52" rx="10" ry="12" fill="#FFD700" opacity=".55" transform="rotate(-10 34 52)"/>
    <ellipse cx="94" cy="52" rx="10" ry="12" fill="#FFD700" opacity=".55" transform="rotate(10 94 52)"/>
  </g>
</svg>`,

'furniture-table': `<svg viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="tt" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#C48A54"/><stop offset="100%" stop-color="#8B5E34"/></linearGradient>
    <filter id="tf"><feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#000" flood-opacity=".2"/></filter>
  </defs>
  <g filter="url(#tf)">
    <rect x="20" y="96" width="10" height="24" rx="3" fill="#6B3A20"/>
    <rect x="98" y="96" width="10" height="24" rx="3" fill="#6B3A20"/>
    <rect x="14" y="52" width="100" height="12" rx="3" fill="url(#tt)"/>
    <rect x="18" y="56" width="92" height="4" rx="1" fill="#fff" opacity=".08"/>
    <rect x="14" y="50" width="100" height="6" rx="2" fill="#D4A06A"/>
    <ellipse cx="64" cy="52" rx="36" ry="2" fill="#fff" opacity=".1"/>
    <rect x="24" y="64" width="6" height="32" rx="2" fill="#7B4A28"/>
    <rect x="98" y="64" width="6" height="32" rx="2" fill="#7B4A28"/>
    <rect x="26" y="80" width="76" height="5" rx="2" fill="#8B5E34" opacity=".7"/>
    <!-- 桌上小物 -->
    <rect x="38" y="36" width="16" height="16" rx="2" fill="#4A90D9" opacity=".7"/>
    <rect x="40" y="38" width="12" height="10" rx="1" fill="#fff" opacity=".3"/>
    <circle cx="82" cy="44" r="7" fill="#E8B04A" opacity=".6"/>
    <ellipse cx="82" cy="42" rx="3" ry="2" fill="#fff" opacity=".2"/>
  </g>
</svg>`,

'furniture-bookshelf': `<svg viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bs" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#A0652A"/><stop offset="100%" stop-color="#6B3A1A"/></linearGradient>
    <filter id="bf"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000" flood-opacity=".2"/></filter>
  </defs>
  <g filter="url(#bf)">
    <!-- 外框 -->
    <rect x="16" y="8" width="96" height="112" rx="4" fill="url(#bs)"/>
    <rect x="18" y="10" width="92" height="108" rx="3" fill="#8B5430"/>
    <!-- 隔板 -->
    <rect x="18" y="40" width="92" height="4" rx="1" fill="#6B3A1A"/>
    <rect x="18" y="72" width="92" height="4" rx="1" fill="#6B3A1A"/>
    <!-- 第1层书 -->
    <rect x="24" y="14" width="8" height="24" rx="1" fill="#E74C3C"/><rect x="24" y="14" width="8" height="3" rx="1" fill="#fff" opacity=".15"/>
    <rect x="34" y="16" width="10" height="22" rx="1" fill="#3498DB"/><rect x="34" y="16" width="10" height="3" rx="1" fill="#fff" opacity=".15"/>
    <rect x="46" y="12" width="7" height="26" rx="1" fill="#2ECC71"/>
    <rect x="55" y="18" width="12" height="20" rx="1" fill="#F39C12"/>
    <rect x="69" y="14" width="9" height="24" rx="1" fill="#9B59B6"/>
    <rect x="80" y="16" width="10" height="22" rx="1" fill="#1ABC9C"/>
    <rect x="92" y="13" width="14" height="25" rx="1" fill="#E67E22"/>
    <!-- 第2层书 -->
    <rect x="24" y="46" width="12" height="24" rx="1" fill="#5DADE2"/>
    <rect x="38" y="48" width="8" height="22" rx="1" fill="#EC7063"/>
    <rect x="48" y="44" width="10" height="26" rx="1" fill="#58D68D"/>
    <rect x="60" y="48" width="14" height="22" rx="1" fill="#AF7AC5"/>
    <rect x="76" y="46" width="10" height="24" rx="1" fill="#F4D03F"/>
    <rect x="88" y="47" width="16" height="23" rx="1" fill="#EB984E"/>
    <!-- 第3层: 装饰品 -->
    <circle cx="36" cy="90" r="10" fill="#D4A06A" opacity=".6"/>
    <ellipse cx="36" cy="88" rx="4" ry="3" fill="#fff" opacity=".15"/>
    <rect x="56" y="80" width="16" height="20" rx="2" fill="#85C1E9" opacity=".5"/>
    <rect x="58" y="82" width="12" height="14" rx="1" fill="#fff" opacity=".2"/>
    <rect x="80" y="82" width="6" height="18" rx="1" fill="#27AE60"/>
    <circle cx="83" cy="80" r="5" fill="#2ECC71"/>
    <ellipse cx="83" cy="79" rx="2" ry="1.5" fill="#fff" opacity=".15"/>
    <!-- 木纹 -->
    <line x1="20" y1="20" x2="108" y2="20" stroke="#5C2E0E" stroke-width=".3" opacity=".2"/>
    <line x1="20" y1="55" x2="108" y2="55" stroke="#5C2E0E" stroke-width=".3" opacity=".2"/>
    <line x1="20" y1="90" x2="108" y2="90" stroke="#5C2E0E" stroke-width=".3" opacity=".2"/>
  </g>
</svg>`,

// ────────── 植物类 ──────────
'plant-small': `<svg viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="ps" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#D4835A"/><stop offset="100%" stop-color="#A0603A"/></linearGradient>
    <filter id="pf"><feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="#000" flood-opacity=".18"/></filter>
  </defs>
  <g filter="url(#pf)">
    <!-- 花盆 -->
    <path d="M38 78 L32 110 C32 116 46 120 64 120 C82 120 96 116 96 110 L90 78 Z" fill="url(#ps)"/>
    <ellipse cx="64" cy="78" rx="26" ry="6" fill="#D4835A"/>
    <ellipse cx="64" cy="78" rx="22" ry="4" fill="#A0603A"/>
    <ellipse cx="64" cy="78" rx="22" ry="4" fill="#6B3A20" opacity=".3"/>
    <!-- 花盆花纹 -->
    <path d="M40 90 Q 64 96 88 90" stroke="#C47A50" stroke-width="2" fill="none" opacity=".4"/>
    <!-- 土壤 -->
    <ellipse cx="64" cy="78" rx="20" ry="3" fill="#5C3D20"/>
    <!-- 茎 -->
    <path d="M64 78 Q62 56 64 38" stroke="#2E7D32" stroke-width="3" fill="none"/>
    <!-- 叶子 -->
    <ellipse cx="50" cy="50" rx="14" ry="8" fill="#4CAF50" transform="rotate(-30 50 50)"/>
    <ellipse cx="50" cy="50" rx="10" ry="5" fill="#66BB6A" transform="rotate(-30 50 50)"/>
    <ellipse cx="78" cy="44" rx="14" ry="8" fill="#4CAF50" transform="rotate(30 78 44)"/>
    <ellipse cx="78" cy="44" rx="10" ry="5" fill="#66BB6A" transform="rotate(30 78 44)"/>
    <ellipse cx="58" cy="34" rx="12" ry="7" fill="#43A047" transform="rotate(-15 58 34)"/>
    <ellipse cx="58" cy="34" rx="8" ry="4" fill="#81C784" transform="rotate(-15 58 34)"/>
    <ellipse cx="72" cy="30" rx="11" ry="7" fill="#43A047" transform="rotate(20 72 30)"/>
    <!-- 叶脉 -->
    <line x1="46" y1="50" x2="56" y2="50" stroke="#2E7D32" stroke-width=".5" opacity=".3"/>
    <line x1="74" y1="44" x2="84" y2="44" stroke="#2E7D32" stroke-width=".5" opacity=".3"/>
    <!-- 叶子高光 -->
    <ellipse cx="48" cy="48" rx="4" ry="2" fill="#fff" opacity=".15" transform="rotate(-30 48 48)"/>
    <ellipse cx="76" cy="42" rx="4" ry="2" fill="#fff" opacity=".15" transform="rotate(30 76 42)"/>
  </g>
</svg>`,

'plant-flower': `<svg viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="fp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#B3584A"/><stop offset="100%" stop-color="#7A3428"/></linearGradient>
    <filter id="ff"><feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="#000" flood-opacity=".18"/></filter>
  </defs>
  <g filter="url(#ff)">
    <!-- 花盆 -->
    <path d="M40 82 L35 112 C35 118 48 122 64 122 C80 122 93 118 93 112 L88 82 Z" fill="url(#fp)"/>
    <ellipse cx="64" cy="82" rx="24" ry="5" fill="#B3584A"/>
    <ellipse cx="64" cy="82" rx="20" ry="3.5" fill="#5C2E1A"/>
    <!-- 茎 -->
    <path d="M64 82 Q62 60 60 38" stroke="#388E3C" stroke-width="3" fill="none"/>
    <path d="M64 82 Q68 65 72 48" stroke="#388E3C" stroke-width="2.5" fill="none"/>
    <path d="M64 82 Q58 68 50 55" stroke="#388E3C" stroke-width="2" fill="none"/>
    <!-- 叶子 -->
    <ellipse cx="52" cy="66" rx="10" ry="5" fill="#43A047" transform="rotate(-40 52 66)"/>
    <ellipse cx="76" cy="60" rx="10" ry="5" fill="#43A047" transform="rotate(35 76 60)"/>
    <!-- 花朵1 - 大 -->
    <circle cx="60" cy="32" r="5" fill="#F48FB1" transform="rotate(0 60 32)"/>
    <circle cx="60" cy="32" r="5" fill="#F48FB1" transform="rotate(72 60 32)"/>
    <circle cx="60" cy="32" r="5" fill="#F48FB1" transform="rotate(144 60 32)"/>
    <circle cx="60" cy="32" r="5" fill="#F48FB1" transform="rotate(216 60 32)"/>
    <circle cx="60" cy="32" r="5" fill="#F48FB1" transform="rotate(288 60 32)"/>
    <circle cx="56" cy="28" r="6" fill="#EC407A"/><circle cx="64" cy="28" r="6" fill="#EC407A"/>
    <circle cx="55" cy="35" r="6" fill="#EC407A"/><circle cx="65" cy="35" r="6" fill="#EC407A"/>
    <circle cx="60" cy="24" r="5" fill="#F06292"/>
    <circle cx="60" cy="31" r="4" fill="#FFD54F"/>
    <ellipse cx="59" cy="30" rx="1.5" ry="1" fill="#fff" opacity=".3"/>
    <!-- 花朵2 - 小 -->
    <circle cx="72" cy="42" r="4" fill="#CE93D8"/>
    <circle cx="76" cy="44" r="4" fill="#CE93D8"/>
    <circle cx="74" cy="39" r="4" fill="#CE93D8"/>
    <circle cx="74" cy="42" r="3" fill="#FFD54F"/>
    <!-- 花苞 -->
    <ellipse cx="48" cy="50" rx="4" ry="6" fill="#81C784"/>
    <ellipse cx="48" cy="48" rx="3" ry="3" fill="#F48FB1" opacity=".7"/>
  </g>
</svg>`,

'plant-tree': `<svg viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="tg" cx="50%" cy="40%" r="55%"><stop offset="0%" stop-color="#66BB6A"/><stop offset="100%" stop-color="#2E7D32"/></radialGradient>
    <filter id="ptf"><feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#000" flood-opacity=".2"/></filter>
  </defs>
  <g filter="url(#ptf)">
    <!-- 地面阴影 -->
    <ellipse cx="64" cy="118" rx="30" ry="5" fill="#000" opacity=".12"/>
    <!-- 花盆 -->
    <path d="M44 98 L40 118 C40 122 50 124 64 124 C78 124 88 122 88 118 L84 98 Z" fill="#8D6E63"/>
    <ellipse cx="64" cy="98" rx="20" ry="4" fill="#A1887F"/>
    <ellipse cx="64" cy="98" rx="16" ry="3" fill="#5D4037"/>
    <path d="M46 106 Q 64 110 82 106" stroke="#795548" stroke-width="1.5" fill="none" opacity=".4"/>
    <!-- 树干 -->
    <rect x="58" y="54" width="12" height="46" rx="4" fill="#795548"/>
    <rect x="60" y="56" width="8" height="42" rx="3" fill="#8D6E63"/>
    <line x1="62" y1="62" x2="66" y2="62" stroke="#5D4037" stroke-width=".5" opacity=".3"/>
    <line x1="61" y1="72" x2="67" y2="72" stroke="#5D4037" stroke-width=".5" opacity=".3"/>
    <line x1="62" y1="82" x2="66" y2="82" stroke="#5D4037" stroke-width=".5" opacity=".3"/>
    <!-- 树冠 - 3层 -->
    <ellipse cx="64" cy="50" rx="32" ry="22" fill="url(#tg)"/>
    <ellipse cx="64" cy="40" rx="26" ry="18" fill="#43A047"/>
    <ellipse cx="64" cy="32" rx="20" ry="14" fill="#4CAF50"/>
    <!-- 叶子高光 -->
    <ellipse cx="52" cy="34" rx="8" ry="4" fill="#A5D6A7" opacity=".5"/>
    <ellipse cx="72" cy="40" rx="6" ry="3" fill="#A5D6A7" opacity=".5"/>
    <ellipse cx="60" cy="28" rx="6" ry="3" fill="#C8E6C9" opacity=".4"/>
    <!-- 小果子 -->
    <circle cx="48" cy="46" r="3" fill="#FF7043" opacity=".7"/>
    <circle cx="78" cy="42" r="2.5" fill="#FF7043" opacity=".7"/>
    <circle cx="58" cy="52" r="2" fill="#FF7043" opacity=".6"/>
  </g>
</svg>`,

// ────────── 玩具类 ──────────
'toy-ball': `<svg viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bg" cx="40%" cy="35%" r="55%"><stop offset="0%" stop-color="#fff"/><stop offset="30%" stop-color="#F5F5F5"/><stop offset="100%" stop-color="#BDBDBD"/></radialGradient>
    <filter id="bsf"><feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000" flood-opacity=".2"/></filter>
  </defs>
  <g filter="url(#bsf)">
    <!-- 地面阴影 -->
    <ellipse cx="64" cy="112" rx="24" ry="5" fill="#000" opacity=".1"/>
    <!-- 球体 -->
    <circle cx="64" cy="64" r="36" fill="url(#bg)" stroke="#E0E0E0" stroke-width="1"/>
    <!-- 黑色五边形花纹 -->
    <polygon points="64,34 73,42 70,54 58,54 55,42" fill="#333"/>
    <polygon points="44,50 38,62 44,72 54,68 52,56" fill="#333"/>
    <polygon points="84,50 90,62 84,72 74,68 76,56" fill="#333"/>
    <polygon points="50,80 58,88 72,88 78,80 64,76" fill="#333"/>
    <!-- 缝线 -->
    <line x1="64" y1="34" x2="55" y2="42" stroke="#999" stroke-width=".5"/>
    <line x1="64" y1="34" x2="73" y2="42" stroke="#999" stroke-width=".5"/>
    <line x1="70" y1="54" x2="76" y2="56" stroke="#999" stroke-width=".5"/>
    <line x1="58" y1="54" x2="52" y2="56" stroke="#999" stroke-width=".5"/>
    <!-- 高光 -->
    <ellipse cx="52" cy="48" rx="8" ry="6" fill="#fff" opacity=".35"/>
    <ellipse cx="54" cy="44" rx="3" ry="2" fill="#fff" opacity=".5"/>
  </g>
</svg>`,

'toy-robot': `<svg viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="rb" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#78909C"/><stop offset="100%" stop-color="#455A64"/></linearGradient>
    <filter id="rf"><feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#000" flood-opacity=".2"/></filter>
  </defs>
  <g filter="url(#rf)">
    <!-- 天线 -->
    <line x1="64" y1="6" x2="64" y2="22" stroke="#90A4AE" stroke-width="3"/>
    <circle cx="64" cy="6" r="5" fill="#F44336"/>
    <ellipse cx="63" cy="5" rx="2" ry="1.5" fill="#fff" opacity=".3"/>
    <!-- 头 -->
    <rect x="36" y="22" width="56" height="36" rx="8" fill="url(#rb)"/>
    <rect x="38" y="24" width="52" height="32" rx="6" fill="#546E7A"/>
    <!-- 眼 LED -->
    <rect x="44" y="32" width="16" height="12" rx="3" fill="#0D47A1"/>
    <rect x="46" y="34" width="12" height="8" rx="2" fill="#42A5F5"/>
    <circle cx="50" cy="38" r="2" fill="#fff" opacity=".6"/>
    <rect x="68" y="32" width="16" height="12" rx="3" fill="#0D47A1"/>
    <rect x="70" y="34" width="12" height="8" rx="2" fill="#42A5F5"/>
    <circle cx="74" cy="38" r="2" fill="#fff" opacity=".6"/>
    <!-- 嘴 -->
    <rect x="50" y="48" width="28" height="4" rx="2" fill="#37474F"/>
    <rect x="54" y="49" width="4" height="2" fill="#4CAF50"/><rect x="62" y="49" width="4" height="2" fill="#4CAF50"/><rect x="70" y="49" width="4" height="2" fill="#4CAF50"/>
    <!-- 身体 -->
    <rect x="32" y="60" width="64" height="40" rx="6" fill="url(#rb)"/>
    <rect x="34" y="62" width="60" height="36" rx="4" fill="#546E7A"/>
    <!-- 胸部仪表 -->
    <circle cx="54" cy="76" r="6" fill="#1B5E20"/><circle cx="54" cy="76" r="4" fill="#4CAF50"/><ellipse cx="53" cy="75" rx="1.5" ry="1" fill="#fff" opacity=".3"/>
    <circle cx="74" cy="76" r="6" fill="#B71C1C"/><circle cx="74" cy="76" r="4" fill="#EF5350"/><ellipse cx="73" cy="75" rx="1.5" ry="1" fill="#fff" opacity=".3"/>
    <rect x="46" y="86" width="36" height="6" rx="2" fill="#37474F"/>
    <!-- 手臂 -->
    <rect x="18" y="64" width="14" height="28" rx="6" fill="#607D8B"/>
    <circle cx="25" cy="96" r="6" fill="#78909C"/>
    <rect x="96" y="64" width="14" height="28" rx="6" fill="#607D8B"/>
    <circle cx="103" cy="96" r="6" fill="#78909C"/>
    <!-- 腿 -->
    <rect x="42" y="100" width="14" height="18" rx="4" fill="#607D8B"/>
    <rect x="72" y="100" width="14" height="18" rx="4" fill="#607D8B"/>
    <rect x="38" y="116" width="22" height="6" rx="3" fill="#455A64"/>
    <rect x="68" y="116" width="22" height="6" rx="3" fill="#455A64"/>
  </g>
</svg>`,

'toy-teddy': `<svg viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="tdb" cx="40%" cy="35%" r="60%"><stop offset="0%" stop-color="#D7A97A"/><stop offset="100%" stop-color="#A0714A"/></radialGradient>
    <filter id="tdf"><feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#000" flood-opacity=".18"/></filter>
  </defs>
  <g filter="url(#tdf)">
    <!-- 左耳 -->
    <circle cx="36" cy="24" r="14" fill="#B8845A"/><circle cx="36" cy="24" r="9" fill="#D4A878"/>
    <!-- 右耳 -->
    <circle cx="92" cy="24" r="14" fill="#B8845A"/><circle cx="92" cy="24" r="9" fill="#D4A878"/>
    <!-- 头 -->
    <circle cx="64" cy="38" r="26" fill="url(#tdb)"/>
    <!-- 脸 -->
    <ellipse cx="64" cy="42" rx="18" ry="14" fill="#D4A878"/>
    <!-- 眼 -->
    <circle cx="54" cy="36" r="5" fill="#2D2D2D"/><ellipse cx="53" cy="35" rx="2" ry="1.5" fill="#fff" opacity=".45"/>
    <circle cx="74" cy="36" r="5" fill="#2D2D2D"/><ellipse cx="73" cy="35" rx="2" ry="1.5" fill="#fff" opacity=".45"/>
    <!-- 鼻子 -->
    <ellipse cx="64" cy="46" rx="5" ry="3.5" fill="#3D2D1A"/>
    <ellipse cx="63" cy="45" rx="2" ry="1" fill="#fff" opacity=".2"/>
    <!-- 嘴 -->
    <path d="M64 49 Q60 53 56 50" stroke="#3D2D1A" stroke-width="1.5" fill="none"/>
    <path d="M64 49 Q68 53 72 50" stroke="#3D2D1A" stroke-width="1.5" fill="none"/>
    <!-- 身体 -->
    <ellipse cx="64" cy="82" rx="28" ry="32" fill="url(#tdb)"/>
    <!-- 肚皮 -->
    <ellipse cx="64" cy="82" rx="20" ry="24" fill="#D4A878"/>
    <!-- 爱心 -->
    <path d="M64 74 Q60 70 56 74 Q52 78 56 82 L64 90 L72 82 Q76 78 72 74 Q68 70 64 74Z" fill="#E91E63" opacity=".5"/>
    <!-- 蝴蝶结 -->
    <ellipse cx="54" cy="62" rx="8" ry="5" fill="#E91E63" transform="rotate(-20 54 62)"/>
    <ellipse cx="74" cy="62" rx="8" ry="5" fill="#E91E63" transform="rotate(20 74 62)"/>
    <circle cx="64" cy="62" r="4" fill="#C2185B"/>
    <!-- 手臂 -->
    <ellipse cx="32" cy="78" rx="10" ry="18" fill="#B8845A" transform="rotate(-15 32 78)"/>
    <circle cx="28" cy="90" r="7" fill="#D4A878"/>
    <ellipse cx="96" cy="78" rx="10" ry="18" fill="#B8845A" transform="rotate(15 96 78)"/>
    <circle cx="100" cy="90" r="7" fill="#D4A878"/>
    <!-- 腿 -->
    <ellipse cx="48" cy="106" rx="12" ry="14" fill="#B8845A"/>
    <ellipse cx="48" cy="112" rx="10" ry="5" fill="#D4A878"/>
    <ellipse cx="80" cy="106" rx="12" ry="14" fill="#B8845A"/>
    <ellipse cx="80" cy="112" rx="10" ry="5" fill="#D4A878"/>
  </g>
</svg>`,

// ────────── 新增 12 种装饰品 ──────────

'furniture-lamp': `<svg viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="lg" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#FFF9C4" stop-opacity=".7"/><stop offset="100%" stop-color="#FFF9C4" stop-opacity="0"/></radialGradient>
    <filter id="lf"><feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="#000" flood-opacity=".15"/></filter>
  </defs>
  <g filter="url(#lf)">
    <!-- 光晕 -->
    <ellipse cx="64" cy="36" rx="40" ry="30" fill="url(#lg)"/>
    <!-- 灯罩 -->
    <path d="M40 18 L30 52 C30 56 44 58 64 58 C84 58 98 56 98 52 L88 18 C88 14 76 12 64 12 C52 12 40 14 40 18Z" fill="#FFF8E1"/>
    <path d="M40 18 L30 52 C30 56 44 58 64 58 C84 58 98 56 98 52 L88 18" stroke="#FFE082" stroke-width="1" fill="none"/>
    <ellipse cx="64" cy="18" rx="24" ry="6" fill="#FFF8E1" stroke="#FFE082" stroke-width=".5"/>
    <!-- 灯罩纹理 -->
    <line x1="48" y1="16" x2="40" y2="54" stroke="#FFD54F" stroke-width=".5" opacity=".3"/>
    <line x1="64" y1="14" x2="64" y2="56" stroke="#FFD54F" stroke-width=".5" opacity=".3"/>
    <line x1="80" y1="16" x2="88" y2="54" stroke="#FFD54F" stroke-width=".5" opacity=".3"/>
    <!-- 杆 -->
    <rect x="62" y="56" width="4" height="50" fill="#8D6E63"/>
    <rect x="63" y="56" width="2" height="50" fill="#A1887F" opacity=".5"/>
    <!-- 底座 -->
    <ellipse cx="64" cy="108" rx="22" ry="6" fill="#795548"/>
    <ellipse cx="64" cy="106" rx="18" ry="4" fill="#8D6E63"/>
    <ellipse cx="64" cy="106" rx="12" ry="2.5" fill="#A1887F" opacity=".4"/>
  </g>
</svg>`,

'furniture-rug': `<svg viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="rg" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#FFAB91"/><stop offset="40%" stop-color="#FF7043"/><stop offset="75%" stop-color="#E64A19"/><stop offset="100%" stop-color="#BF360C"/></radialGradient>
  </defs>
  <!-- 地毯主体 (俯视透视) -->
  <ellipse cx="64" cy="64" rx="56" ry="36" fill="url(#rg)" opacity=".85"/>
  <!-- 花纹 -->
  <ellipse cx="64" cy="64" rx="40" ry="26" fill="none" stroke="#FFF8E1" stroke-width="2" opacity=".4"/>
  <ellipse cx="64" cy="64" rx="24" ry="16" fill="none" stroke="#FFF8E1" stroke-width="1.5" opacity=".3"/>
  <!-- 中心花纹 -->
  <circle cx="64" cy="64" r="8" fill="#FFF8E1" opacity=".2"/>
  <circle cx="64" cy="64" r="4" fill="#FFF8E1" opacity=".15"/>
  <!-- 边缘流苏 -->
  <line x1="14" y1="64" x2="8" y2="64" stroke="#BF360C" stroke-width="2" opacity=".5"/>
  <line x1="16" y1="54" x2="10" y2="52" stroke="#BF360C" stroke-width="2" opacity=".5"/>
  <line x1="16" y1="74" x2="10" y2="76" stroke="#BF360C" stroke-width="2" opacity=".5"/>
  <line x1="114" y1="64" x2="120" y2="64" stroke="#BF360C" stroke-width="2" opacity=".5"/>
  <line x1="112" y1="54" x2="118" y2="52" stroke="#BF360C" stroke-width="2" opacity=".5"/>
  <line x1="112" y1="74" x2="118" y2="76" stroke="#BF360C" stroke-width="2" opacity=".5"/>
</svg>`,

'furniture-clock': `<svg viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="cg" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#FFF8E1"/><stop offset="100%" stop-color="#F5E6C8"/></radialGradient>
    <filter id="cf"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity=".15"/></filter>
  </defs>
  <g filter="url(#cf)">
    <!-- 外框 -->
    <circle cx="64" cy="64" r="48" fill="#5D4037"/>
    <circle cx="64" cy="64" r="44" fill="#795548"/>
    <circle cx="64" cy="64" r="40" fill="url(#cg)"/>
    <!-- 刻度 -->
    <line x1="64" y1="28" x2="64" y2="34" stroke="#5D4037" stroke-width="2.5"/>
    <line x1="64" y1="94" x2="64" y2="100" stroke="#5D4037" stroke-width="2.5"/>
    <line x1="28" y1="64" x2="34" y2="64" stroke="#5D4037" stroke-width="2.5"/>
    <line x1="94" y1="64" x2="100" y2="64" stroke="#5D4037" stroke-width="2.5"/>
    <!-- 小刻度 -->
    <line x1="84" y1="30" x2="82" y2="34" stroke="#8D6E63" stroke-width="1.5"/>
    <line x1="98" y1="44" x2="94" y2="46" stroke="#8D6E63" stroke-width="1.5"/>
    <line x1="44" y1="30" x2="46" y2="34" stroke="#8D6E63" stroke-width="1.5"/>
    <line x1="30" y1="44" x2="34" y2="46" stroke="#8D6E63" stroke-width="1.5"/>
    <line x1="84" y1="98" x2="82" y2="94" stroke="#8D6E63" stroke-width="1.5"/>
    <line x1="98" y1="84" x2="94" y2="82" stroke="#8D6E63" stroke-width="1.5"/>
    <line x1="44" y1="98" x2="46" y2="94" stroke="#8D6E63" stroke-width="1.5"/>
    <line x1="30" y1="84" x2="34" y2="82" stroke="#8D6E63" stroke-width="1.5"/>
    <!-- 时针 -->
    <line x1="64" y1="64" x2="64" y2="40" stroke="#3E2723" stroke-width="3.5" stroke-linecap="round"/>
    <!-- 分针 -->
    <line x1="64" y1="64" x2="82" y2="52" stroke="#3E2723" stroke-width="2.5" stroke-linecap="round"/>
    <!-- 秒针 -->
    <line x1="64" y1="64" x2="48" y2="86" stroke="#E53935" stroke-width="1" stroke-linecap="round"/>
    <!-- 中心点 -->
    <circle cx="64" cy="64" r="3.5" fill="#3E2723"/>
    <circle cx="64" cy="64" r="2" fill="#8D6E63"/>
    <!-- 玻璃高光 -->
    <ellipse cx="52" cy="48" rx="12" ry="8" fill="#fff" opacity=".15"/>
  </g>
</svg>`,

'furniture-bed': `<svg viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bdb" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#90CAF9"/><stop offset="100%" stop-color="#64B5F6"/></linearGradient>
    <filter id="bdf"><feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#000" flood-opacity=".18"/></filter>
  </defs>
  <g filter="url(#bdf)">
    <!-- 床架 -->
    <rect x="10" y="56" width="108" height="52" rx="6" fill="#8D6E63"/>
    <rect x="12" y="58" width="104" height="48" rx="4" fill="#A1887F"/>
    <!-- 床头板 -->
    <rect x="10" y="32" width="20" height="36" rx="4" fill="#6D4C41"/>
    <rect x="12" y="34" width="16" height="32" rx="3" fill="#795548"/>
    <!-- 床垫 -->
    <rect x="14" y="56" width="100" height="36" rx="4" fill="#E3F2FD"/>
    <rect x="14" y="56" width="100" height="6" rx="2" fill="#fff" opacity=".3"/>
    <!-- 被子 -->
    <rect x="30" y="58" width="80" height="32" rx="4" fill="url(#bdb)"/>
    <line x1="50" y1="60" x2="50" y2="88" stroke="#fff" stroke-width=".6" opacity=".2"/>
    <line x1="70" y1="60" x2="70" y2="88" stroke="#fff" stroke-width=".6" opacity=".2"/>
    <line x1="90" y1="60" x2="90" y2="88" stroke="#fff" stroke-width=".6" opacity=".2"/>
    <!-- 枕头 -->
    <ellipse cx="22" cy="70" rx="10" ry="14" fill="#FFF9C4"/>
    <ellipse cx="22" cy="68" rx="6" ry="8" fill="#fff" opacity=".2"/>
    <!-- 床腿 -->
    <rect x="14" y="94" width="8" height="14" rx="2" fill="#5D4037"/>
    <rect x="106" y="94" width="8" height="14" rx="2" fill="#5D4037"/>
    <!-- 被子上的星星装饰 -->
    <circle cx="50" cy="74" r="2" fill="#FFF9C4" opacity=".5"/>
    <circle cx="70" cy="70" r="1.5" fill="#FFF9C4" opacity=".5"/>
    <circle cx="90" cy="76" r="2" fill="#FFF9C4" opacity=".5"/>
  </g>
</svg>`,

'nature-fishtank': `<svg viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#E3F2FD" stop-opacity=".4"/><stop offset="100%" stop-color="#42A5F5" stop-opacity=".6"/></linearGradient>
    <filter id="ftf"><feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#000" flood-opacity=".18"/></filter>
  </defs>
  <g filter="url(#ftf)">
    <!-- 鱼缸框 -->
    <rect x="16" y="16" width="96" height="88" rx="8" fill="#B3E5FC" opacity=".3" stroke="#81D4FA" stroke-width="2"/>
    <!-- 水 -->
    <rect x="18" y="24" width="92" height="76" rx="6" fill="url(#wg)"/>
    <!-- 沙子 -->
    <ellipse cx="64" cy="96" rx="44" ry="6" fill="#FFE082" opacity=".5"/>
    <!-- 水草 -->
    <path d="M32 96 Q28 76 34 60 Q38 50 32 40" stroke="#4CAF50" stroke-width="3" fill="none"/>
    <path d="M40 96 Q36 72 42 56 Q46 44 40 34" stroke="#66BB6A" stroke-width="2.5" fill="none"/>
    <path d="M88 96 Q92 74 86 58 Q82 46 88 36" stroke="#4CAF50" stroke-width="3" fill="none"/>
    <!-- 鱼1 - 橙色 -->
    <ellipse cx="62" cy="52" rx="10" ry="6" fill="#FF7043"/>
    <polygon points="50,52 42,46 42,58" fill="#FF7043"/>
    <circle cx="68" cy="50" r="2" fill="#fff"/><circle cx="69" cy="50" r="1" fill="#333"/>
    <path d="M60 48 Q62 46 64 48" stroke="#E64A19" stroke-width=".5" fill="none"/>
    <!-- 鱼2 - 蓝色 -->
    <ellipse cx="78" cy="72" rx="8" ry="5" fill="#42A5F5"/>
    <polygon points="68,72 62,67 62,77" fill="#42A5F5"/>
    <circle cx="83" cy="70" r="1.5" fill="#fff"/><circle cx="83.5" cy="70" r=".8" fill="#333"/>
    <!-- 泡泡 -->
    <circle cx="56" cy="36" r="3" fill="#fff" opacity=".3" stroke="#fff" stroke-width=".5" opacity=".2"/>
    <circle cx="50" cy="28" r="2" fill="#fff" opacity=".25"/>
    <circle cx="80" cy="32" r="2.5" fill="#fff" opacity=".3"/>
    <!-- 石头 -->
    <ellipse cx="54" cy="94" rx="6" ry="4" fill="#90A4AE" opacity=".5"/>
    <ellipse cx="74" cy="92" rx="8" ry="5" fill="#78909C" opacity=".5"/>
    <!-- 盖子 -->
    <rect x="14" y="14" width="100" height="8" rx="4" fill="#455A64"/>
    <rect x="16" y="16" width="96" height="4" rx="2" fill="#607D8B"/>
  </g>
</svg>`,

'nature-cactus': `<svg viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="cac" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#2E7D32"/><stop offset="50%" stop-color="#43A047"/><stop offset="100%" stop-color="#2E7D32"/></linearGradient>
    <filter id="caf"><feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="#000" flood-opacity=".18"/></filter>
  </defs>
  <g filter="url(#caf)">
    <!-- 花盆 -->
    <path d="M38 88 L34 114 C34 118 46 122 64 122 C82 122 94 118 94 114 L90 88 Z" fill="#D4835A"/>
    <ellipse cx="64" cy="88" rx="26" ry="5" fill="#C47A50"/>
    <ellipse cx="64" cy="88" rx="22" ry="3.5" fill="#8B5230"/>
    <path d="M42 100 Q64 104 86 100" stroke="#A0603A" stroke-width="1.5" fill="none" opacity=".4"/>
    <!-- 主干 -->
    <rect x="52" y="28" width="24" height="62" rx="12" fill="url(#cac)"/>
    <!-- 主干纹理 -->
    <line x1="58" y1="32" x2="58" y2="86" stroke="#1B5E20" stroke-width=".5" opacity=".3"/>
    <line x1="64" y1="28" x2="64" y2="88" stroke="#1B5E20" stroke-width=".5" opacity=".3"/>
    <line x1="70" y1="32" x2="70" y2="86" stroke="#1B5E20" stroke-width=".5" opacity=".3"/>
    <!-- 左臂 -->
    <rect x="28" y="46" width="16" height="28" rx="8" fill="#388E3C"/>
    <rect x="36" y="32" width="16" height="20" rx="8" fill="#43A047"/>
    <line x1="38" y1="36" x2="38" y2="50" stroke="#1B5E20" stroke-width=".4" opacity=".3"/>
    <!-- 右臂 -->
    <rect x="76" y="38" width="16" height="32" rx="8" fill="#388E3C"/>
    <rect x="80" y="24" width="16" height="20" rx="8" fill="#43A047"/>
    <line x1="90" y1="28" x2="90" y2="42" stroke="#1B5E20" stroke-width=".4" opacity=".3"/>
    <!-- 刺 -->
    <line x1="52" y1="40" x2="46" y2="37" stroke="#A5D6A7" stroke-width="1" stroke-linecap="round"/>
    <line x1="76" y1="36" x2="82" y2="33" stroke="#A5D6A7" stroke-width="1" stroke-linecap="round"/>
    <line x1="52" y1="56" x2="46" y2="55" stroke="#A5D6A7" stroke-width="1" stroke-linecap="round"/>
    <line x1="76" y1="52" x2="82" y2="51" stroke="#A5D6A7" stroke-width="1" stroke-linecap="round"/>
    <line x1="52" y1="72" x2="46" y2="73" stroke="#A5D6A7" stroke-width="1" stroke-linecap="round"/>
    <line x1="76" y1="68" x2="82" y2="69" stroke="#A5D6A7" stroke-width="1" stroke-linecap="round"/>
    <!-- 小花 -->
    <circle cx="64" cy="26" r="5" fill="#EC407A" opacity=".8"/>
    <circle cx="64" cy="26" r="2.5" fill="#F48FB1"/>
    <circle cx="64" cy="26" r="1.5" fill="#FFD54F"/>
  </g>
</svg>`,

'nature-vase': `<svg viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="vg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#CE93D8"/><stop offset="100%" stop-color="#7B1FA2"/></linearGradient>
    <filter id="vf"><feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="#000" flood-opacity=".18"/></filter>
  </defs>
  <g filter="url(#vf)">
    <!-- 花瓶 -->
    <path d="M48 50 Q36 70 38 100 C38 112 50 116 64 116 C78 116 90 112 90 100 Q92 70 80 50 Z" fill="url(#vg)"/>
    <path d="M48 50 Q54 46 64 44 Q74 46 80 50" fill="#BA68C8"/>
    <ellipse cx="64" cy="48" rx="16" ry="4" fill="#AB47BC"/>
    <!-- 花瓶装饰纹 -->
    <ellipse cx="64" cy="82" rx="22" ry="3" fill="#fff" opacity=".1"/>
    <ellipse cx="64" cy="72" rx="18" ry="2" fill="#fff" opacity=".08"/>
    <!-- 花瓶高光 -->
    <ellipse cx="52" cy="74" rx="4" ry="16" fill="#fff" opacity=".12"/>
    <!-- 花束 -->
    <path d="M64 44 Q60 30 56 18" stroke="#4CAF50" stroke-width="2" fill="none"/>
    <path d="M64 44 Q68 28 72 16" stroke="#4CAF50" stroke-width="2" fill="none"/>
    <path d="M64 44 Q64 28 64 14" stroke="#388E3C" stroke-width="2" fill="none"/>
    <path d="M64 44 Q56 32 48 22" stroke="#66BB6A" stroke-width="1.5" fill="none"/>
    <path d="M64 44 Q72 32 80 22" stroke="#66BB6A" stroke-width="1.5" fill="none"/>
    <!-- 花朵 -->
    <circle cx="56" cy="16" r="6" fill="#E91E63" opacity=".8"/>
    <circle cx="56" cy="16" r="3" fill="#F48FB1"/>
    <circle cx="72" cy="14" r="5" fill="#FFA726" opacity=".8"/>
    <circle cx="72" cy="14" r="2.5" fill="#FFD54F"/>
    <circle cx="64" cy="12" r="6" fill="#AB47BC" opacity=".7"/>
    <circle cx="64" cy="12" r="3" fill="#CE93D8"/>
    <circle cx="48" cy="20" r="5" fill="#42A5F5" opacity=".7"/>
    <circle cx="48" cy="20" r="2.5" fill="#90CAF9"/>
    <circle cx="80" cy="20" r="5" fill="#EF5350" opacity=".7"/>
    <circle cx="80" cy="20" r="2.5" fill="#FFCDD2"/>
    <!-- 叶子 -->
    <ellipse cx="52" cy="30" rx="6" ry="3" fill="#4CAF50" transform="rotate(-30 52 30)"/>
    <ellipse cx="76" cy="28" rx="6" ry="3" fill="#4CAF50" transform="rotate(30 76 28)"/>
  </g>
</svg>`,

'fun-cattower': `<svg viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="ctf"><feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#000" flood-opacity=".18"/></filter>
  </defs>
  <g filter="url(#ctf)">
    <!-- 底座 -->
    <rect x="24" y="108" width="80" height="12" rx="4" fill="#8D6E63"/>
    <rect x="26" y="110" width="76" height="8" rx="3" fill="#A1887F"/>
    <!-- 柱子 -->
    <rect x="44" y="30" width="16" height="80" rx="3" fill="#D7CCC8"/>
    <rect x="68" y="50" width="16" height="60" rx="3" fill="#D7CCC8"/>
    <!-- 柱子绳纹 -->
    <line x1="44" y1="40" x2="60" y2="42" stroke="#BCAAA4" stroke-width="1.5"/>
    <line x1="44" y1="48" x2="60" y2="50" stroke="#BCAAA4" stroke-width="1.5"/>
    <line x1="44" y1="56" x2="60" y2="58" stroke="#BCAAA4" stroke-width="1.5"/>
    <line x1="44" y1="64" x2="60" y2="66" stroke="#BCAAA4" stroke-width="1.5"/>
    <line x1="68" y1="58" x2="84" y2="60" stroke="#BCAAA4" stroke-width="1.5"/>
    <line x1="68" y1="66" x2="84" y2="68" stroke="#BCAAA4" stroke-width="1.5"/>
    <line x1="68" y1="74" x2="84" y2="76" stroke="#BCAAA4" stroke-width="1.5"/>
    <!-- 平台1 (上) -->
    <rect x="28" y="22" width="48" height="10" rx="4" fill="#795548"/>
    <rect x="30" y="24" width="44" height="6" rx="3" fill="#8D6E63"/>
    <ellipse cx="52" cy="24" rx="16" ry="2" fill="#A1887F" opacity=".4"/>
    <!-- 平台2 (右中) -->
    <rect x="56" y="42" width="44" height="10" rx="4" fill="#795548"/>
    <rect x="58" y="44" width="40" height="6" rx="3" fill="#8D6E63"/>
    <!-- 吊球 -->
    <line x1="38" y1="32" x2="38" y2="48" stroke="#795548" stroke-width="1.5"/>
    <circle cx="38" cy="50" r="5" fill="#FF7043"/>
    <ellipse cx="37" cy="49" rx="2" ry="1.5" fill="#fff" opacity=".2"/>
    <!-- 洞穴 (底部) -->
    <rect x="26" y="86" width="52" height="24" rx="8" fill="#795548"/>
    <rect x="28" y="88" width="48" height="20" rx="6" fill="#6D4C41"/>
    <ellipse cx="52" cy="98" rx="14" ry="10" fill="#3E2723"/>
    <ellipse cx="52" cy="96" rx="8" ry="4" fill="#4E342E" opacity=".6"/>
  </g>
</svg>`,

'fun-musicbox': `<svg viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="mbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#E8B04A"/><stop offset="100%" stop-color="#C47A30"/></linearGradient>
    <filter id="mbf"><feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="#000" flood-opacity=".18"/></filter>
  </defs>
  <g filter="url(#mbf)">
    <!-- 盒子 -->
    <rect x="20" y="52" width="88" height="56" rx="6" fill="url(#mbg)"/>
    <rect x="22" y="54" width="84" height="52" rx="4" fill="#D4A040"/>
    <!-- 盖子 (打开状态) -->
    <path d="M20 52 L24 22 Q64 16 104 22 L108 52 Z" fill="#E8B04A"/>
    <path d="M22 50 L26 24 Q64 18 102 24 L106 50 Z" fill="#D4A040"/>
    <!-- 铰链 -->
    <rect x="56" y="48" width="16" height="6" rx="2" fill="#8D6E63"/>
    <!-- 内部 -->
    <rect x="26" y="56" width="76" height="44" rx="3" fill="#FFF8E1"/>
    <!-- 音乐装置 -->
    <circle cx="64" cy="78" r="14" fill="#F5E6C8" stroke="#D4A040" stroke-width="1"/>
    <circle cx="64" cy="78" r="10" fill="#FFF8E1" stroke="#E8B04A" stroke-width=".5"/>
    <!-- 小突起 -->
    <circle cx="64" cy="68" r="1.5" fill="#8D6E63"/>
    <circle cx="74" cy="74" r="1.5" fill="#8D6E63"/>
    <circle cx="74" cy="82" r="1.5" fill="#8D6E63"/>
    <circle cx="64" cy="88" r="1.5" fill="#8D6E63"/>
    <circle cx="54" cy="82" r="1.5" fill="#8D6E63"/>
    <circle cx="54" cy="74" r="1.5" fill="#8D6E63"/>
    <!-- 音符 -->
    <text x="78" y="42" font-size="18" fill="#E91E63" opacity=".7">♪</text>
    <text x="90" y="34" font-size="14" fill="#E91E63" opacity=".5">♫</text>
    <text x="34" y="38" font-size="16" fill="#E91E63" opacity=".6">♩</text>
    <!-- 装饰 -->
    <rect x="36" y="60" width="52" height="2" rx="1" fill="#E8B04A" opacity=".3"/>
    <rect x="26" y="92" width="76" height="2" rx="1" fill="#C47A30" opacity=".3"/>
  </g>
</svg>`,

'fun-tv': `<svg viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="tvg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#616161"/><stop offset="100%" stop-color="#424242"/></linearGradient>
    <filter id="tvf"><feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#000" flood-opacity=".2"/></filter>
  </defs>
  <g filter="url(#tvf)">
    <!-- 天线 -->
    <line x1="48" y1="8" x2="58" y2="28" stroke="#9E9E9E" stroke-width="3" stroke-linecap="round"/>
    <line x1="80" y1="8" x2="70" y2="28" stroke="#9E9E9E" stroke-width="3" stroke-linecap="round"/>
    <circle cx="48" cy="8" r="3" fill="#BDBDBD"/>
    <circle cx="80" cy="8" r="3" fill="#BDBDBD"/>
    <!-- 外壳 -->
    <rect x="14" y="28" width="100" height="72" rx="10" fill="url(#tvg)"/>
    <rect x="16" y="30" width="96" height="68" rx="8" fill="#4E4E4E"/>
    <!-- 屏幕 -->
    <rect x="22" y="34" width="68" height="56" rx="4" fill="#1B5E20"/>
    <rect x="24" y="36" width="64" height="52" rx="3" fill="#2E7D32"/>
    <!-- 屏幕内容 (简单图案) -->
    <ellipse cx="56" cy="56" rx="16" ry="12" fill="#4CAF50" opacity=".6"/>
    <rect x="40" y="68" width="32" height="4" rx="1" fill="#81C784" opacity=".5"/>
    <rect x="46" y="74" width="20" height="3" rx="1" fill="#A5D6A7" opacity=".4"/>
    <!-- 屏幕扫描线 -->
    <line x1="24" y1="44" x2="86" y2="44" stroke="#fff" stroke-width=".3" opacity=".1"/>
    <line x1="24" y1="52" x2="86" y2="52" stroke="#fff" stroke-width=".3" opacity=".1"/>
    <line x1="24" y1="60" x2="86" y2="60" stroke="#fff" stroke-width=".3" opacity=".1"/>
    <line x1="24" y1="68" x2="86" y2="68" stroke="#fff" stroke-width=".3" opacity=".1"/>
    <line x1="24" y1="76" x2="86" y2="76" stroke="#fff" stroke-width=".3" opacity=".1"/>
    <!-- 旋钮面板 -->
    <rect x="94" y="38" width="14" height="48" rx="3" fill="#3E3E3E"/>
    <circle cx="101" cy="48" r="5" fill="#757575" stroke="#9E9E9E" stroke-width="1"/>
    <circle cx="101" cy="48" r="2" fill="#9E9E9E"/>
    <circle cx="101" cy="64" r="5" fill="#757575" stroke="#9E9E9E" stroke-width="1"/>
    <circle cx="101" cy="64" r="2" fill="#9E9E9E"/>
    <!-- 指示灯 -->
    <circle cx="101" cy="78" r="2.5" fill="#F44336"/>
    <ellipse cx="100.5" cy="77.5" rx="1" ry=".8" fill="#fff" opacity=".3"/>
    <!-- 底座 -->
    <rect x="40" y="100" width="48" height="8" rx="3" fill="#616161"/>
    <rect x="34" y="106" width="60" height="6" rx="3" fill="#757575"/>
    <!-- 屏幕高光 -->
    <ellipse cx="42" cy="44" rx="10" ry="6" fill="#fff" opacity=".08"/>
  </g>
</svg>`,

'decor-fairylights': `<svg viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- 线绳 -->
  <path d="M4 20 Q32 40 64 28 Q96 16 124 36" stroke="#5D4037" stroke-width="2" fill="none"/>
  <!-- 灯泡们 -->
  <circle cx="16" cy="28" r="6" fill="#FFEB3B" opacity=".8"/><circle cx="16" cy="28" r="3" fill="#FFF9C4"/>
  <circle cx="32" cy="36" r="6" fill="#F44336" opacity=".8"/><circle cx="32" cy="36" r="3" fill="#FFCDD2"/>
  <circle cx="48" cy="32" r="6" fill="#4CAF50" opacity=".8"/><circle cx="48" cy="32" r="3" fill="#C8E6C9"/>
  <circle cx="64" cy="28" r="6" fill="#2196F3" opacity=".8"/><circle cx="64" cy="28" r="3" fill="#BBDEFB"/>
  <circle cx="80" cy="24" r="6" fill="#FF9800" opacity=".8"/><circle cx="80" cy="24" r="3" fill="#FFE0B2"/>
  <circle cx="96" cy="28" r="6" fill="#E91E63" opacity=".8"/><circle cx="96" cy="28" r="3" fill="#F8BBD0"/>
  <circle cx="112" cy="34" r="6" fill="#9C27B0" opacity=".8"/><circle cx="112" cy="34" r="3" fill="#E1BEE7"/>
  <!-- 光晕 -->
  <circle cx="16" cy="28" r="12" fill="#FFEB3B" opacity=".15"/>
  <circle cx="32" cy="36" r="12" fill="#F44336" opacity=".15"/>
  <circle cx="48" cy="32" r="12" fill="#4CAF50" opacity=".15"/>
  <circle cx="64" cy="28" r="12" fill="#2196F3" opacity=".15"/>
  <circle cx="80" cy="24" r="12" fill="#FF9800" opacity=".15"/>
  <circle cx="96" cy="28" r="12" fill="#E91E63" opacity=".15"/>
  <circle cx="112" cy="34" r="12" fill="#9C27B0" opacity=".15"/>
</svg>`,

'decor-frame': `<svg viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="frf"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity=".18"/></filter>
  </defs>
  <g filter="url(#frf)">
    <!-- 画框 -->
    <rect x="16" y="12" width="96" height="88" rx="4" fill="#8D6E63"/>
    <rect x="18" y="14" width="92" height="84" rx="3" fill="#A1887F"/>
    <rect x="22" y="18" width="84" height="76" rx="2" fill="#795548"/>
    <!-- 画布 -->
    <rect x="26" y="22" width="76" height="68" rx="1" fill="#E3F2FD"/>
    <!-- 简笔山水画 -->
    <ellipse cx="64" cy="70" rx="36" ry="18" fill="#81C784" opacity=".4"/>
    <path d="M30 62 L48 36 L60 50 L72 30 L90 56 L98 62" fill="#66BB6A" opacity=".5"/>
    <path d="M26 62 L38 44 L50 56 L64 38 L80 54 L98 62 L98 90 L26 90 Z" fill="#43A047" opacity=".4"/>
    <!-- 太阳 -->
    <circle cx="82" cy="34" r="8" fill="#FFD54F" opacity=".6"/>
    <circle cx="82" cy="34" r="5" fill="#FFF9C4" opacity=".4"/>
    <!-- 云 -->
    <ellipse cx="44" cy="32" rx="10" ry="5" fill="#fff" opacity=".5"/>
    <ellipse cx="50" cy="30" rx="8" ry="5" fill="#fff" opacity=".5"/>
    <!-- 水面 -->
    <rect x="26" y="74" width="76" height="16" fill="#64B5F6" opacity=".3"/>
    <line x1="30" y1="78" x2="50" y2="78" stroke="#fff" stroke-width=".5" opacity=".3"/>
    <line x1="60" y1="82" x2="80" y2="82" stroke="#fff" stroke-width=".5" opacity=".3"/>
    <!-- 框高光 -->
    <rect x="22" y="18" width="84" height="3" rx="1" fill="#fff" opacity=".08"/>
    <!-- 挂钩 -->
    <circle cx="64" cy="8" r="4" fill="#6D4C41" stroke="#5D4037" stroke-width="1"/>
    <circle cx="64" cy="8" r="2" fill="#8D6E63"/>
  </g>
</svg>`,
};

let count = 0;
for (const [name, svg] of Object.entries(SVGS)) {
  fs.writeFileSync(path.join(OUT, `${name}.svg`), svg.trim());
  count++;
}
console.log(`Generated ${count} SVG files in ${OUT}`);
