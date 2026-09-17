/* typing-debug-gate */
(function silenceGameConsole() {
  try {
    var allow = (typeof location !== "undefined") && /[?&]typingDebug=1/.test(location.search);
    if (allow) return;
    if (!window.__typingConsoleOriginal) {
      window.__typingConsoleOriginal = {
        log: console.log.bind(console),
        info: console.info.bind(console),
        debug: console.debug.bind(console)
      };
    }
    var noop = function () {};
    console.log = noop;
    console.info = noop;
    console.debug = noop;
  } catch (e) { /* never break the game on the console shim */ }
})();
// 从服务器获取文章内容
async function fetchArticle() {
    try {
        const response = await fetch('https://daziya-api.cutterman.cn/typing/lesson/random-english-article');
        const data = await response.json();
        
        if (data.errno === 0 && data.data && data.data.text) {
            return data.data.text;
        } else {
            console.error('获取文章失败:', data);
            // 返回一个默认文本作为后备
            return 'The quick brown fox jumps over the lazy dog.';
        }
    } catch (error) {
        console.error('获取文章出错:', error);
        // 返回一个默认文本作为后备
        return 'The quick brown fox jumps over the lazy dog.';
    }
}

// 游戏配置
const config = {
    backgroundColor: 0x1a1a1a,
    textColor: 0x666666,
    highlightColor: 0xf5a623,
    errorColor: 0xff0000,
    keyboardColor: 0x333333,
    keyHighlightColor: 0xf5a623,
    keyPressColor: 0xff0000,
    keyNextColor: 0x00ff00, // 下一个需要按的键的高亮颜色
    activeTextColor: 0xcccccc,
    cursorBlockColor: 0xf5a623, // 当前字符色块颜色
    cursorBlockAlpha: 0.7, // 当前字符色块透明度
    cursorBlinkSpeed: 0.5, // 色块闪烁速度（秒）
    fontSize: 36,
    smallFontSize: 24,
    paragraphLength: 200000, // 段落中要使用的字符数量
    animationSpeed: 0.2, // 动画速度
    rowHeight: 50, // 行高
    visibleRows: 5, // 可见行数，改为5行
    scrollSpeed: 0.3, // 滚动速度
    wordSpacing: 2, // 单词间距
    charSpacing: 0.6, // 字符间距系数
    keyboardBottomMargin: 20, // 键盘距离底部的边距
    fontFamily: 'SourceCodePro', // 设置默认字体为ComicMono
    fontUrl: 'js/SourceCodePro-Regular.ttf', // 字体文件URL
    soundEnabled: true, // 是否启用声音
    keypressSoundUrl: 'js/keypress.wav', // 按键声音文件URL
    errorSoundUrl: 'js/gong.wav', // 错误声音文件URL
    soundVolume: 0.5, // 声音音量
};

// 游戏状态
const gameState = {
    words: [],
    currentWordIndex: 0,
    currentCharIndex: 0,
    startTime: null,
    endTime: null,
    isActive: false,
    correctChars: 0,
    totalChars: 0,
    wpm: 0,
    accuracy: 0,
    rows: [], // 存储行信息
    currentRowIndex: 0, // 当前行索引
    wordIndexInRow: 0, // 当前行中的单词索引
    baseWordContainerY: null, // 基础单词容器Y位置
    cursorBlock: null, // 当前字符的闪烁色块
    cursorBlinkTween: null, // 色块闪烁动画
    fontLoaded: false, // 字体是否已加载
    text: '', // 存储完整的文本
    textIndex: 0, // 当前字符在完整文本中的索引
    sounds: {}, // 存储音频对象
};

// 键盘布局
const keyboardLayout = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'"],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/']
];

// 初始化 PixiJS 应用
const app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: config.backgroundColor,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
});
document.getElementById('game-container').appendChild(app.view);

// 加载字体
function loadFont() {
    return new Promise((resolve, reject) => {
        // 显示加载提示
        loadingContainer.visible = true;
        gameContainer.visible = false;
        
        // 创建一个新的字体样式
        const fontFace = new FontFace(config.fontFamily, `url(${config.fontUrl})`);
        
        // 加载字体
        fontFace.load().then(function(loadedFace) {
            // 将字体添加到文档中
            document.fonts.add(loadedFace);
            console.log(`字体 ${config.fontFamily} 加载成功`);
            gameState.fontLoaded = true;
            
            // 隐藏加载提示
            loadingContainer.visible = false;
            gameContainer.visible = true;
            
            resolve();
        }).catch(function(error) {
            console.error(`字体加载失败: ${error}`);
            
            // 隐藏加载提示
            loadingContainer.visible = false;
            gameContainer.visible = true;
            
            // 即使字体加载失败，也继续游戏，使用默认字体
            resolve();
        });
    });
}

// 加载音效
function loadSounds() {
    return new Promise((resolve, reject) => {
        // 创建音频对象
        const keypressSound = new Audio(config.keypressSoundUrl);
        const errorSound = new Audio(config.errorSoundUrl);
        
        // 设置音量
        keypressSound.volume = config.soundVolume;
        errorSound.volume = config.soundVolume;
        
        // 预加载音频
        let loadedCount = 0;
        const totalSounds = 2;
        
        function checkAllLoaded() {
            loadedCount++;
            if (loadedCount >= totalSounds) {
                console.log('所有音效加载完成');
                resolve();
            }
        }
        
        // 监听加载事件
        keypressSound.addEventListener('canplaythrough', checkAllLoaded, { once: true });
        errorSound.addEventListener('canplaythrough', checkAllLoaded, { once: true });
        
        // 处理加载错误
        keypressSound.addEventListener('error', (e) => {
            console.error('按键音效加载失败:', e);
            checkAllLoaded(); // 即使失败也继续
        });
        
        errorSound.addEventListener('error', (e) => {
            console.error('错误音效加载失败:', e);
            checkAllLoaded(); // 即使失败也继续
        });
        
        // 存储音频对象
        gameState.sounds.keypress = keypressSound;
        gameState.sounds.error = errorSound;
        
        // 开始加载
        keypressSound.load();
        errorSound.load();
    });
}

// 创建容器
const gameContainer = new PIXI.Container();
const statsContainer = new PIXI.Container();
const wordsContainer = new PIXI.Container();
const keyboardContainer = new PIXI.Container();
const instructionsContainer = new PIXI.Container();
const loadingContainer = new PIXI.Container(); // 添加加载提示容器

app.stage.addChild(gameContainer);
gameContainer.addChild(statsContainer);
gameContainer.addChild(wordsContainer);
gameContainer.addChild(keyboardContainer);
gameContainer.addChild(instructionsContainer);
app.stage.addChild(loadingContainer); // 将加载提示容器添加到舞台

// 创建加载提示
const loadingText = new PIXI.Text('正在加载字体...', {
    fontFamily: 'Arial',
    fontSize: 24,
    fill: 0xffffff,
    align: 'center',
});
loadingText.anchor.set(0.5);
loadingText.x = app.screen.width / 2;
loadingText.y = app.screen.height / 2;
loadingContainer.addChild(loadingText);

// 居中布局
gameContainer.x = app.screen.width / 2;
gameContainer.y = app.screen.height / 2;
statsContainer.x = -app.screen.width / 4;
statsContainer.y = -app.screen.height / 3;
wordsContainer.y = -250; // 单词区域位置，向上移动到垂直居中位置

// 创建统计信息显示
const wpmText = new PIXI.Text('0 wpm', {
    fontFamily: config.fontFamily,
    fontSize: config.fontSize,
    fill: config.highlightColor,
    align: 'center',
});
wpmText.anchor.set(0.5);

const accuracyText = new PIXI.Text('0%', {
    fontFamily: config.fontFamily,
    fontSize: config.fontSize,
    fill: config.highlightColor,
    align: 'center',
});
accuracyText.anchor.set(0.5);
accuracyText.x = 200;

statsContainer.addChild(wpmText);
statsContainer.addChild(accuracyText);

// 创建指令文本
const instructionsText = new PIXI.Text('按 enter 键重置', {
    fontFamily: config.fontFamily,
    fontSize: config.smallFontSize,
    fill: config.textColor,
    align: 'center',
});
instructionsText.anchor.set(0.5);
instructionsContainer.addChild(instructionsText);

// 生成文本
async function generateWords() {
    // 从服务器获取新文章
    const text = await fetchArticle();
    
    // 从文章中截取指定长度的文本
    const truncatedText = text.substring(0, config.paragraphLength);
    gameState.text = truncatedText;
    gameState.textIndex = 0;
    
    // 将文本分割成单词（包括空格和标点符号）
    const words = [];
    let currentWord = '';
    
    for (let i = 0; i < truncatedText.length; i++) {
        const char = truncatedText[i];
        
        // 如果是空格，将当前单词添加到数组中，并将空格作为单独的"单词"
        if (char === ' ') {
            if (currentWord) {
                words.push(currentWord);
                currentWord = '';
            }
            words.push(' ');
        } else {
            currentWord += char;
        }
    }
    
    // 添加最后一个单词
    if (currentWord) {
        words.push(currentWord);
    }
    
    return words;
}

// 创建单词显示
function createWordsDisplay() {
    wordsContainer.removeChildren();
    
    // 每行的最大宽度
    const maxWidth = 800;
    
    // 添加背景框
    const background = new PIXI.Graphics();
    background.beginFill(0x222222, 0.3);
    background.drawRoundedRect(-maxWidth / 2 - 20, 0, maxWidth + 40, config.rowHeight * config.visibleRows + 40, 10);
    background.endFill();
    wordsContainer.addChild(background);
    
    // 计算每行的单词
    const rows = [];
    let currentRow = [];
    let currentRowWidth = 0;
    
    gameState.words.forEach((word) => {
        const wordWidth = word.length * (config.fontSize * config.charSpacing) + config.wordSpacing;
        
        if (currentRowWidth + wordWidth > maxWidth) {
            rows.push([...currentRow]);
            currentRow = [word];
            currentRowWidth = wordWidth;
        } else {
            currentRow.push(word);
            currentRowWidth += wordWidth;
        }
    });
    
    // 添加最后一行
    if (currentRow.length > 0) {
        rows.push(currentRow);
    }
    
    // 保存行信息到游戏状态
    gameState.rows = rows;
    gameState.currentRowIndex = 0;
    gameState.wordIndexInRow = 0;
    
    // 创建行容器
    rows.forEach((row, rowIndex) => {
        const rowContainer = new PIXI.Container();
        rowContainer.name = `row_${rowIndex}`;
        rowContainer.y = rowIndex * config.rowHeight;
        
        // 计算这一行的总宽度，用于居中
        let totalRowWidth = 0;
        row.forEach(word => {
            totalRowWidth += word.length * (config.fontSize * config.charSpacing) + config.wordSpacing;
        });
        
        // 起始位置，使行居中
        let xPos = -totalRowWidth / 2;
        
        row.forEach((word, wordIndexInRow) => {
            const wordContainer = new PIXI.Container();
            wordContainer.x = xPos;
            
            // 计算全局单词索引
            let globalWordIndex = 0;
            for (let i = 0; i < rowIndex; i++) {
                globalWordIndex += rows[i].length;
            }
            globalWordIndex += wordIndexInRow;
            
            // 为每个字符创建文本
            word.split('').forEach((char, charIndex) => {
                const charText = new PIXI.Text(char, {
                    fontFamily: config.fontFamily,
                    fontSize: config.fontSize,
                    fill: config.textColor,
                    align: 'center',
                });
                charText.x = charIndex * (config.fontSize * config.charSpacing);
                charText.name = `char_${charIndex}`;
                wordContainer.addChild(charText);
            });
            
            wordContainer.name = `word_${globalWordIndex}`;
            rowContainer.addChild(wordContainer);
            
            // 更新 x 位置
            xPos += word.length * (config.fontSize * config.charSpacing) + config.wordSpacing;
        });
        
        wordsContainer.addChild(rowContainer);
    });
    
    // 初始化滚动位置
    updateScrollPosition();
}

// 更新滚动位置
function updateScrollPosition(animate = false) {
    // 计算目标 Y 位置，使当前行位于中间位置
    const middleRowOffset = Math.floor(config.visibleRows / 2);
    
    // 计算滚动偏移量
    const scrollOffset = -gameState.currentRowIndex * config.rowHeight + middleRowOffset * config.rowHeight;
    
    // 获取基础位置（由handleResize设置的垂直居中位置）
    // 我们需要从gameState中获取这个值，而不是从当前位置计算
    // 如果gameState中没有这个值，则从handleResize中获取
    if (!gameState.baseWordContainerY) {
        // 计算键盘区域顶部到屏幕中心的距离，然后将单词区域放在上半部分的中间
        const keyboardTopToCenter = Math.abs(keyboardContainer.y - app.screen.height / 2);
        gameState.baseWordContainerY = -keyboardTopToCenter / 2;
    }
    
    // 最终目标位置 = 基础位置 + 滚动偏移量
    const targetY = gameState.baseWordContainerY + scrollOffset;
    
    if (animate) {
        // 使用 GSAP 动画滚动
        gsap.to(wordsContainer, {
            y: targetY,
            duration: config.scrollSpeed,
            ease: "power2.out"
        });
    } else {
        wordsContainer.y = targetY;
    }
    
    // 更新行的透明度
    for (let i = 0; i < gameState.rows.length; i++) {
        const rowContainer = wordsContainer.getChildByName(`row_${i}`);
        if (rowContainer) {
            // 计算与当前行的距离
            const distance = Math.abs(i - gameState.currentRowIndex);
            
            // 中间行完全不透明，其他行根据距离渐隐
            if (distance <= Math.floor(config.visibleRows / 2)) {
                rowContainer.alpha = 1 - (distance * 0.15); // 稍微调整透明度变化
            } else {
                // 距离越远越透明
                rowContainer.alpha = Math.max(0.1, 0.4 - (distance - Math.floor(config.visibleRows / 2)) * 0.1);
            }
        }
    }
    
    // 更新背景框的位置
    if (wordsContainer.children[0] && wordsContainer.children[0] instanceof PIXI.Graphics) {
        const background = wordsContainer.children[0];
        background.y = scrollOffset; // 调整背景位置跟随滚动
    }
}

// 高亮当前字符
function highlightCurrentChar() {
    console.log("执行 highlightCurrentChar 函数");
    console.log(`当前单词索引: ${gameState.currentWordIndex}, 当前字符索引: ${gameState.currentCharIndex}`);
    
    // 重置所有字符颜色
    for (let rowIndex = 0; rowIndex < gameState.rows.length; rowIndex++) {
        const rowContainer = wordsContainer.getChildByName(`row_${rowIndex}`);
        if (rowContainer) {
            for (let i = 0; i < rowContainer.children.length; i++) {
                const wordContainer = rowContainer.children[i];
                // 确保这是一个单词容器
                if (wordContainer.name && wordContainer.name.startsWith('word_')) {
                    for (let j = 0; j < wordContainer.children.length; j++) {
                        const charText = wordContainer.children[j];
                        // 确保这是一个字符文本
                        if (charText.name && charText.name.startsWith('char_')) {
                            // 当前行使用活跃颜色，其他行使用暗色
                            // 注意：不要覆盖已经标记为正确或错误的字符颜色
                            if (charText.style.fill !== config.highlightColor && 
                                charText.style.fill !== config.errorColor) {
                                charText.style.fill = (rowIndex === gameState.currentRowIndex) ? 
                                    config.activeTextColor : config.textColor;
                            }
                        }
                    }
                }
            }
        }
    }
    
    // 移除之前的色块
    if (gameState.cursorBlock) {
        console.log("移除之前的光标色块");
        if (gameState.cursorBlock.parent) {
            gameState.cursorBlock.parent.removeChild(gameState.cursorBlock);
        }
        gameState.cursorBlock = null;
    }
    
    // 停止之前的闪烁动画
    if (gameState.cursorBlinkTween) {
        console.log("停止之前的闪烁动画");
        gameState.cursorBlinkTween.kill();
        gameState.cursorBlinkTween = null;
    }
    
    // 高亮当前单词和字符
    const currentWord = gameState.words[gameState.currentWordIndex];
    const wordContainer = findWordContainer(gameState.currentWordIndex);
    
    console.log(`当前单词: ${currentWord}, 找到单词容器: ${!!wordContainer}`);
    
    if (wordContainer && currentWord && gameState.currentCharIndex < currentWord.length) {
        const charText = wordContainer.getChildByName(`char_${gameState.currentCharIndex}`);
        console.log(`找到字符文本: ${!!charText}, 字符: ${currentWord[gameState.currentCharIndex]}`);
        
        if (charText) {
            // 创建闪烁色块
            const cursorBlock = new PIXI.Graphics();
            cursorBlock.beginFill(config.cursorBlockColor, config.cursorBlockAlpha);
            // 色块尺寸略大于字符
            const padding = 4;
            cursorBlock.drawRect(
                -padding/2, 
                -padding/2, 
                config.fontSize * config.charSpacing + padding, 
                config.fontSize + padding
            );
            cursorBlock.endFill();
            
            // 将色块放在字符位置
            cursorBlock.x = charText.x;
            cursorBlock.y = 0; // 相对于字符容器的位置
            
            // 将色块添加到字符的父容器中，确保它在字符下方
            wordContainer.addChildAt(cursorBlock, 0);
            
            // 保存色块引用
            gameState.cursorBlock = cursorBlock;
            
            // 创建闪烁动画
            gameState.cursorBlinkTween = gsap.to(cursorBlock, {
                alpha: 0.2,
                duration: config.cursorBlinkSpeed,
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut"
            });
            
            console.log(`成功创建光标色块和闪烁动画`);
            console.log(`高亮文本字符: ${currentWord[gameState.currentCharIndex]}`);
        } else {
            console.error(`未找到字符文本，无法创建光标`);
        }
    } else {
        console.log(`无法创建光标，条件不满足: wordContainer=${!!wordContainer}, currentWord=${!!currentWord}, charIndex条件=${gameState.currentCharIndex < (currentWord ? currentWord.length : 0)}`);
    }
    
    // 高亮键盘上对应的按键
    // 先重置所有键盘高亮
    resetKeyHighlights();
    
    // 然后高亮当前需要输入的字符
    if (currentWord && gameState.currentCharIndex < currentWord.length) {
        const nextChar = currentWord[gameState.currentCharIndex].toLowerCase();
        console.log(`当前需要输入的字符: ${nextChar}`);
        
        // 处理空格键特殊情况
        if (nextChar === ' ') {
            console.log("下一个字符是空格");
            highlightKey('space', false, true);
        }
        // 只高亮键盘上存在的按键
        else if (keyboardLayout.flat().includes(nextChar)) {
            console.log(`字符 ${nextChar} 在键盘布局中`);
            // 使用 true 作为第三个参数，表示这是下一个需要输入的字符
            highlightKey(nextChar, false, true);
        } else {
            console.log(`字符 ${nextChar} 不在键盘布局中`);
        }
    } else {
        console.log("没有下一个字符需要高亮");
    }
}

// 查找单词容器
function findWordContainer(wordIndex) {
    // 计算行索引和行内单词索引
    let wordCount = 0;
    for (let rowIndex = 0; rowIndex < gameState.rows.length; rowIndex++) {
        const row = gameState.rows[rowIndex];
        if (wordIndex < wordCount + row.length) {
            const wordIndexInRow = wordIndex - wordCount;
            const rowContainer = wordsContainer.getChildByName(`row_${rowIndex}`);
            if (rowContainer) {
                // 查找名称为 word_X 的容器
                const wordName = `word_${wordIndex}`;
                for (let i = 0; i < rowContainer.children.length; i++) {
                    const child = rowContainer.children[i];
                    if (child.name === wordName) {
                        return child;
                    }
                }
                
                // 如果没有找到，尝试使用索引（旧方法，作为备用）
                console.log(`未找到名称为 ${wordName} 的单词容器，尝试使用索引 ${wordIndexInRow}`);
                if (rowContainer.children[wordIndexInRow]) {
                    return rowContainer.children[wordIndexInRow];
                }
            }
            break;
        }
        wordCount += row.length;
    }
    console.error(`未找到单词容器，wordIndex: ${wordIndex}`);
    return null;
}

// 创建键盘显示
function createKeyboard() {
    keyboardContainer.removeChildren();
    
    const keySize = 40;
    const keyMargin = 5;
    
    // 添加键盘背景
    const keyboardWidth = keyboardLayout[0].length * (keySize + keyMargin);
    // 修改键盘高度，移除回车键的空间
    const keyboardHeight = keyboardLayout.length * (keySize + keyMargin) + keySize + keyMargin; // 只为空格键预留空间
    
    const keyboardBackground = new PIXI.Graphics();
    keyboardBackground.beginFill(0x222222, 0.3);
    keyboardBackground.drawRoundedRect(
        -keyboardWidth / 2 - 20, 
        -20, 
        keyboardWidth + 40, 
        keyboardHeight + 20, 
        10
    );
    keyboardBackground.endFill();
    keyboardContainer.addChild(keyboardBackground);
    
    // 创建键盘行容器
    const keysContainer = new PIXI.Container();
    keysContainer.name = "keysContainer"; // 给容器命名，便于调试
    keysContainer.x = -keyboardWidth / 2; // 将键盘内容左对齐到背景左边缘
    
    keyboardLayout.forEach((row, rowIndex) => {
        const rowContainer = new PIXI.Container();
        rowContainer.name = `row_${rowIndex}`; // 给行容器命名
        rowContainer.y = rowIndex * (keySize + keyMargin);
        
        // 根据行数调整偏移量，使键盘居中
        const rowOffset = (keyboardLayout[0].length - row.length) * (keySize + keyMargin) / 2;
        
        row.forEach((key, keyIndex) => {
            const keyBackground = new PIXI.Graphics();
            keyBackground.beginFill(config.keyboardColor);
            keyBackground.drawRoundedRect(0, 0, keySize, keySize, 5);
            keyBackground.endFill();
            
            // 保存按键的宽度和高度信息
            keyBackground.keyWidth = keySize;
            keyBackground.keyHeight = keySize;
            
            const keyText = new PIXI.Text(key, {
                fontFamily: config.fontFamily,
                fontSize: 20,
                fill: config.textColor,
                align: 'center',
            });
            keyText.anchor.set(0.5);
            keyText.x = keySize / 2;
            keyText.y = keySize / 2;
            
            const keyContainer = new PIXI.Container();
            keyContainer.name = `key_${key}`; // 确保每个按键都有正确的名称
            keyContainer.addChild(keyBackground);
            keyContainer.addChild(keyText);
            keyContainer.x = keyIndex * (keySize + keyMargin) + rowOffset;
            
            rowContainer.addChild(keyContainer);
        });
        
        keysContainer.addChild(rowContainer);
    });
    
    // 添加空格键
    const spaceKey = new PIXI.Container();
    spaceKey.name = 'key_space'; // 确保空格键有正确的名称
    
    const spaceBackground = new PIXI.Graphics();
    spaceBackground.beginFill(config.keyboardColor);
    spaceBackground.drawRoundedRect(0, 0, keySize * 6, keySize, 5);
    spaceBackground.endFill();
    
    // 保存空格键的宽度和高度信息
    spaceBackground.keyWidth = keySize * 6;
    spaceBackground.keyHeight = keySize;
    
    const spaceText = new PIXI.Text('space', {
        fontFamily: config.fontFamily,
        fontSize: 16,
        fill: config.textColor,
        align: 'center',
    });
    spaceText.anchor.set(0.5);
    spaceText.x = keySize * 3;
    spaceText.y = keySize / 2;
    
    spaceKey.addChild(spaceBackground);
    spaceKey.addChild(spaceText);
    // 调整空格键的位置，直接放在字母键下方
    spaceKey.y = 3 * (keySize + keyMargin) + 10;
    // 将空格键水平居中
    spaceKey.x = (keyboardWidth - keySize * 6) / 2;
    
    console.log(`创建空格键, 容器名称: ${spaceKey.name}`);
    
    keysContainer.addChild(spaceKey);
    
    keyboardContainer.addChild(keysContainer);
    
    console.log(`键盘创建完成, keysContainer 子元素数量: ${keysContainer.children.length}`);
}

// 高亮键盘按键
function highlightKey(key, isPressed = false, isNext = false) {
    console.log(`尝试高亮键: ${key}, isPressed: ${isPressed}, isNext: ${isNext}`);
    
    // 检查键盘容器是否存在
    if (!keyboardContainer || keyboardContainer.children.length < 2) {
        console.error("键盘容器不存在或结构不正确");
        return;
    }
    
    // 由于键盘结构变化，需要在keysContainer中递归查找按键
    const keysContainer = keyboardContainer.children[1]; // 第一个是背景，第二个是keysContainer
    if (!keysContainer) {
        console.error("键盘按键容器不存在");
        return;
    }
    
    console.log(`keysContainer 名称: ${keysContainer.name}, 子元素数量: ${keysContainer.children.length}`);
    
    // 递归查找按键
    const keyName = `key_${key}`;
    const keyContainer = findKeyInContainer(keysContainer, keyName);
    
    if (keyContainer && keyContainer.children.length > 0) {
        console.log(`找到按键: ${keyName}, 子元素数量: ${keyContainer.children.length}`);
        const keyBackground = keyContainer.children[0];
        keyBackground.clear();
        
        // 根据状态选择颜色
        let fillColor;
        if (isPressed) {
            fillColor = config.keyPressColor;
        } else if (isNext) {
            fillColor = config.keyNextColor;
        } else {
            fillColor = config.keyHighlightColor;
        }
        
        keyBackground.beginFill(fillColor);
        // 使用保存的宽度和高度信息
        const width = keyBackground.keyWidth || keyBackground.width;
        const height = keyBackground.keyHeight || keyBackground.height;
        keyBackground.drawRoundedRect(0, 0, width, height, 5);
        keyBackground.endFill();
        
        // 添加缩放动画
        if (isPressed) {
            keyContainer.scale.set(0.9);
            gsap.to(keyContainer.scale, {
                x: 1,
                y: 1,
                duration: config.animationSpeed,
                ease: "elastic.out(1, 0.3)"
            });
        }
        
        // 添加调试信息
        console.log(`成功高亮键: ${key}, isPressed: ${isPressed}, isNext: ${isNext}, 颜色: ${fillColor.toString(16)}`);
    } else {
        console.error(`未找到键: ${key} 或其结构不正确`);
    }
}

// 递归查找容器中的特定名称的子容器
function findKeyInContainer(container, name) {
    
    // 直接检查当前容器
    if (container.name === name) {
        return container;
    }
    
    // 遍历所有子容器
    for (let i = 0; i < container.children.length; i++) {
        const child = container.children[i];
        
        // 如果子元素是容器，递归查找
        if (child instanceof PIXI.Container) {
            // 检查当前子容器
            if (child.name === name) {
                return child;
            }
            
            // 递归查找子容器的子元素
            const result = findKeyInContainer(child, name);
            if (result) {
                return result;
            }
        }
    }
    
    return null;
}

// 重置键盘高亮
function resetKeyHighlights() {
    console.log("重置所有键盘高亮");
    
    // 检查键盘容器是否存在
    if (!keyboardContainer || keyboardContainer.children.length < 2) {
        console.error("键盘容器不存在或结构不正确");
        return;
    }
    
    // 由于键盘结构变化，需要在keysContainer中递归查找按键
    const keysContainer = keyboardContainer.children[1]; // 第一个是背景，第二个是keysContainer
    if (!keysContainer) {
        console.error("键盘按键容器不存在");
        return;
    }
    
    console.log(`keysContainer 名称: ${keysContainer.name}, 子元素数量: ${keysContainer.children.length}`);
    
    // 重置所有字母键
    keyboardLayout.flat().forEach(key => {
        const keyName = `key_${key}`;
        const keyContainer = findKeyInContainer(keysContainer, keyName);
        if (keyContainer && keyContainer.children.length > 0) {
            const keyBackground = keyContainer.children[0];
            keyBackground.clear();
            keyBackground.beginFill(config.keyboardColor);
            // 使用保存的宽度和高度信息
            const width = keyBackground.keyWidth || keyBackground.width;
            const height = keyBackground.keyHeight || keyBackground.height;
            keyBackground.drawRoundedRect(0, 0, width, height, 5);
            keyBackground.endFill();
        } else {
            console.error(`未找到按键: ${keyName} 或其结构不正确`);
        }
    });
    
    // 重置空格键
    const spaceKeyName = 'key_space';
    console.log(`重置空格键: ${spaceKeyName}`);
    const spaceKey = findKeyInContainer(keysContainer, spaceKeyName);
    if (spaceKey && spaceKey.children.length > 0) {
        const keyBackground = spaceKey.children[0];
        keyBackground.clear();
        keyBackground.beginFill(config.keyboardColor);
        // 使用保存的宽度和高度信息
        const width = keyBackground.keyWidth || keyBackground.width;
        const height = keyBackground.keyHeight || keyBackground.height;
        keyBackground.drawRoundedRect(0, 0, width, height, 5);
        keyBackground.endFill();
        console.log(`成功重置空格键: ${spaceKeyName}`);
    } else {
        console.error(`未找到空格键: ${spaceKeyName} 或其结构不正确`);
    }
}

// 标记字符为正确或错误
function markChar(isCorrect) {
    const currentWord = gameState.words[gameState.currentWordIndex];
    const wordContainer = findWordContainer(gameState.currentWordIndex);
    
    if (wordContainer && currentWord && gameState.currentCharIndex < currentWord.length) {
        const charText = wordContainer.getChildByName(`char_${gameState.currentCharIndex}`);
        if (charText) {
            // 设置字符颜色
            charText.style.fill = isCorrect ? config.highlightColor : config.errorColor;
            
            // 添加动画效果
            if (isCorrect) {
                // 正确时的动画
                charText.scale.set(1.2);
                gsap.to(charText.scale, {
                    x: 1,
                    y: 1,
                    duration: config.animationSpeed,
                    ease: "back.out(1.7)"
                });
            } else {
                // 错误时的动画
                charText.scale.set(1);
                gsap.to(charText, {
                    x: "+=5",
                    duration: 0.1,
                    repeat: 3,
                    yoyo: true,
                    ease: "power2.inOut"
                });
                
                // 错误时添加红色闪烁背景
                const errorBlock = new PIXI.Graphics();
                errorBlock.beginFill(config.errorColor, 0.3);
                const padding = 4;
                errorBlock.drawRect(
                    -padding/2, 
                    -padding/2, 
                    config.fontSize * config.charSpacing + padding, 
                    config.fontSize + padding
                );
                errorBlock.endFill();
                
                // 将错误色块放在字符位置
                errorBlock.x = charText.x;
                errorBlock.y = 0;
                
                // 将错误色块添加到字符的父容器中，确保它在字符下方
                wordContainer.addChildAt(errorBlock, 0);
                
                // 错误色块闪烁并消失
                gsap.to(errorBlock, {
                    alpha: 0,
                    duration: 0.5,
                    repeat: 2,
                    yoyo: true,
                    onComplete: () => {
                        if (errorBlock.parent) {
                            errorBlock.parent.removeChild(errorBlock);
                        }
                    }
                });
            }
        }
    }
}

// 计算打字速度和准确率
function calculateStats() {
    if (!gameState.startTime) return;
    
    const currentTime = Date.now();
    const elapsedMinutes = (currentTime - gameState.startTime) / 60000;
    
    // 计算WPM (每分钟字数)
    gameState.wpm = Math.round(gameState.correctChars / 5 / elapsedMinutes);
    
    // 计算准确率
    gameState.accuracy = gameState.totalChars > 0 
        ? Math.round((gameState.correctChars / gameState.totalChars) * 100) 
        : 0;
    
    // 更新显示
    wpmText.text = `${gameState.wpm} wpm`;
    accuracyText.text = `${gameState.accuracy}%`;
}

// 开始游戏
function startGame() {
    gameState.isActive = true;
    gameState.startTime = Date.now();
}

// 重置游戏
async function resetGame() {
    // 移除当前的闪烁色块
    if (gameState.cursorBlock) {
        if (gameState.cursorBlock.parent) {
            gameState.cursorBlock.parent.removeChild(gameState.cursorBlock);
        }
        gameState.cursorBlock = null;
    }
    
    // 停止闪烁动画
    if (gameState.cursorBlinkTween) {
        gameState.cursorBlinkTween.kill();
        gameState.cursorBlinkTween = null;
    }
    
    // 显示加载提示
    instructionsText.text = '正在加载新文章...';
    
    // 获取新的单词列表
    gameState.words = await generateWords();
    
    gameState.currentWordIndex = 0;
    gameState.currentCharIndex = 0;
    gameState.startTime = null;
    gameState.endTime = null;
    gameState.isActive = false;
    gameState.correctChars = 0;
    gameState.totalChars = 0;
    gameState.wpm = 0;
    gameState.accuracy = 0;
    
    wpmText.text = '0 wpm';
    accuracyText.text = '0%';
    instructionsText.text = '按 enter 键重置';
    
    createWordsDisplay();
    
    // 确保立即高亮当前字符，不使用setTimeout
    highlightCurrentChar();
}

// 创建粒子效果
function createParticleEffect(x, y, color) {
    const particleCount = 10;
    const particles = [];
    
    for (let i = 0; i < particleCount; i++) {
        const particle = new PIXI.Graphics();
        particle.beginFill(color);
        particle.drawCircle(0, 0, Math.random() * 3 + 1);
        particle.endFill();
        particle.x = x;
        particle.y = y;
        
        // 随机速度和方向
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1;
        particle.vx = Math.cos(angle) * speed;
        particle.vy = Math.sin(angle) * speed;
        particle.alpha = 1;
        
        app.stage.addChild(particle);
        particles.push(particle);
        
        // 粒子动画
        gsap.to(particle, {
            alpha: 0,
            duration: 0.5,
            onComplete: () => {
                app.stage.removeChild(particle);
            }
        });
    }
    
    // 更新粒子位置
    const updateParticles = () => {
        let allDone = true;
        
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            if (p.alpha > 0) {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.1; // 重力
                allDone = false;
            }
        }
        
        if (allDone) {
            app.ticker.remove(updateParticles);
        }
    };
    
    app.ticker.add(updateParticles);
}

// 播放音效
function playSound(soundType) {
    if (!config.soundEnabled) return;
    
    const sound = gameState.sounds[soundType];
    if (!sound) {
        console.error(`未找到音效: ${soundType}`);
        return;
    }
    
    // 克隆音频对象以允许重叠播放
    const soundClone = sound.cloneNode();
    soundClone.volume = config.soundVolume;
    
    // 播放音效
    soundClone.play().catch(error => {
        console.error(`播放音效失败: ${error.message}`);
    });
    
    // 播放完成后释放资源
    soundClone.addEventListener('ended', () => {
        soundClone.remove();
    });
}

// 处理键盘输入
async function handleKeyDown(event) {
    console.log(`按下键: ${event.key.toLowerCase()}`);
    const key = event.key.toLowerCase();

    if (event.code === 'Space' || event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault();
    }
    
    // 忽略修饰键（Shift, Ctrl, Alt, Meta等）
    if (event.key === 'Shift' || event.key === 'Control' || event.key === 'Alt' || event.key === 'Meta' || 
        event.key === 'CapsLock' || event.key === 'Tab' || event.key === 'Escape' || 
        event.key.startsWith('Arrow') || event.key === 'Home' || event.key === 'End' || 
        event.key === 'PageUp' || event.key === 'PageDown' || event.key === 'Insert' || 
        event.key === 'Delete' || event.key === 'F1' || event.key === 'F2' || 
        event.key === 'F3' || event.key === 'F4' || event.key === 'F5' || 
        event.key === 'F6' || event.key === 'F7' || event.key === 'F8' || 
        event.key === 'F9' || event.key === 'F10' || event.key === 'F11' || 
        event.key === 'F12') {
        return;
    }
    
    // 如果按下回车键，重置游戏
    if (key === 'enter') {
        await resetGame();
        highlightCurrentChar(); // 立即高亮，不使用setTimeout
        // 播放按键音效
        playSound('keypress');
        return;
    }
    
    // 如果游戏未开始，开始计时
    if (!gameState.isActive) {
        startGame();
    }
    
    // 高亮按下的键
    if (keyboardLayout.flat().includes(key) || key === ' ') {
        console.log(`高亮按下的键: ${key}`);
        if (key === ' ') {
            // 空格键特殊处理
            highlightKey('space', true);
        } else {
            highlightKey(key, true);
        }
    } else {
        console.log(`键 ${key} 不在键盘布局中`);
    }
    
    const currentWord = gameState.words[gameState.currentWordIndex];
    
    // 处理退格键
    if (key === 'backspace') {
        // 播放按键音效
        playSound('keypress');
        
        if (gameState.currentCharIndex > 0) {
            gameState.currentCharIndex--;
            // 确保高亮当前字符
            highlightCurrentChar(); // 立即高亮，不使用setTimeout
        } else if (gameState.currentWordIndex > 0) {
            // 移动到上一个单词的末尾
            gameState.currentWordIndex--;
            const prevWord = gameState.words[gameState.currentWordIndex];
            gameState.currentCharIndex = prevWord.length - 1;
            
            // 更新行索引和行内单词索引
            updateRowAndWordIndices();
            
            // 更新滚动位置
            updateScrollPosition(true);
            
            // 确保高亮当前字符
            highlightCurrentChar(); // 立即高亮，不使用setTimeout
        }
        return;
    }
    
    // 处理普通字符输入（包括空格）
    if (currentWord && gameState.currentCharIndex < currentWord.length) {
        const expectedChar = currentWord[gameState.currentCharIndex];
        // 使用实际输入的字符（不转换为小写）与期望字符进行比较
        const isCorrect = event.key === expectedChar;
        
        // 播放相应的音效
        if (isCorrect) {
            playSound('keypress');
        } else {
            playSound('error');
        }
        
        // 更新统计信息
        gameState.totalChars++;
        if (isCorrect) {
            gameState.correctChars++;
            
            // 正确时添加粒子效果
            const wordContainer = findWordContainer(gameState.currentWordIndex);
            if (wordContainer) {
                const charText = wordContainer.getChildByName(`char_${gameState.currentCharIndex}`);
                if (charText) {
                    const globalPosition = charText.getGlobalPosition();
                    createParticleEffect(globalPosition.x, globalPosition.y, config.highlightColor);
                }
            }
        }
        
        // 标记字符为正确或错误
        markChar(isCorrect);
        
        // 移动到下一个字符
        gameState.currentCharIndex++;
        
        // 如果到达单词末尾，自动移动到下一个单词
        if (gameState.currentCharIndex >= currentWord.length) {
            if (gameState.currentWordIndex < gameState.words.length - 1) {
                gameState.currentWordIndex++;
                gameState.currentCharIndex = 0;
                
                // 更新行索引和行内单词索引
                updateRowAndWordIndices();
                
                // 更新滚动位置
                updateScrollPosition(true);
            }
        }
        
        // 使用setTimeout确保在DOM更新后再高亮当前字符
        setTimeout(() => {
            highlightCurrentChar();
        }, 0);
        
        calculateStats();
    }
}

// 更新行索引和行内单词索引
function updateRowAndWordIndices() {
    let wordCount = 0;
    for (let rowIndex = 0; rowIndex < gameState.rows.length; rowIndex++) {
        const row = gameState.rows[rowIndex];
        if (gameState.currentWordIndex < wordCount + row.length) {
            gameState.currentRowIndex = rowIndex;
            gameState.wordIndexInRow = gameState.currentWordIndex - wordCount;
            break;
        }
        wordCount += row.length;
    }
}

// 处理键盘释放
function handleKeyUp(event) {
    const key = event.key.toLowerCase();
    // 不需要调用 resetKeyHighlights，因为 highlightCurrentChar 会处理
    highlightCurrentChar();
}

// 窗口大小调整处理
function handleResize() {
    app.renderer.resize(window.innerWidth, window.innerHeight);
    
    // 更新游戏容器位置
    gameContainer.x = app.screen.width / 2;
    gameContainer.y = app.screen.height / 2;
    
    // 将键盘放置在底部并水平居中
    keyboardContainer.x = 0; // 确保水平居中
    keyboardContainer.y = app.screen.height / 2 - keyboardContainer.height - config.keyboardBottomMargin;
    
    // 将指令文本放在键盘上方并水平居中
    instructionsContainer.x = 0; // 确保水平居中
    instructionsContainer.y = keyboardContainer.y - 40;
    
    // 更新单词区域位置，确保垂直居中
    // 计算键盘区域顶部到屏幕中心的距离，然后将单词区域放在上半部分的中间
    const keyboardTopToCenter = Math.abs(keyboardContainer.y - app.screen.height / 2);
    gameState.baseWordContainerY = -keyboardTopToCenter / 2;
    
    // 更新滚动位置，应用新的基础位置
    updateScrollPosition();
}

// 初始化游戏
async function init() {
    console.log("初始化游戏");
    
    // 添加 GSAP 库
    const gsapScript = document.createElement('script');
    gsapScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js';
    document.head.appendChild(gsapScript);
    
    gsapScript.onload = async () => {
        console.log("GSAP 库加载完成");
        
        try {
            // 先加载字体和音效，然后初始化游戏
            await Promise.all([loadFont(), loadSounds()]);
            console.log("字体和音效加载完成，开始初始化游戏");
            
            // 创建键盘
            createKeyboard();
            
            // 将键盘放置在底部并水平居中
            keyboardContainer.x = 0; // 确保水平居中
            keyboardContainer.y = app.screen.height / 2 - keyboardContainer.height - config.keyboardBottomMargin;
            
            // 将指令文本放在键盘上方并水平居中
            instructionsContainer.x = 0; // 确保水平居中
            instructionsContainer.y = keyboardContainer.y - 40;
            
            // 更新单词区域位置，确保垂直居中
            const keyboardTopToCenter = Math.abs(keyboardContainer.y - app.screen.height / 2);
            gameState.baseWordContainerY = -keyboardTopToCenter / 2;
            
            // 重置游戏状态
            await resetGame();
            
            // 更新滚动位置，应用新的基础位置
            updateScrollPosition();
            
            // 确保初始高亮当前字符
            console.log("初始化高亮当前字符");
            setTimeout(() => {
                highlightCurrentChar();
            }, 500); // 延迟一点时间，确保键盘已经完全创建
            
            // 添加事件监听器
            window.addEventListener('keydown', handleKeyDown);
            window.addEventListener('keyup', handleKeyUp);
            window.addEventListener('resize', handleResize);
            
            // 启动游戏循环
            app.ticker.add(() => {
                // 游戏更新逻辑
            });
        } catch (error) {
            console.error("资源加载失败，使用默认设置继续初始化游戏", error);
            
            // 即使资源加载失败，也继续初始化游戏
            createKeyboard();
            keyboardContainer.x = 0;
            keyboardContainer.y = app.screen.height / 2 - keyboardContainer.height - config.keyboardBottomMargin;
            instructionsContainer.x = 0;
            instructionsContainer.y = keyboardContainer.y - 40;
            const keyboardTopToCenter = Math.abs(keyboardContainer.y - app.screen.height / 2);
            gameState.baseWordContainerY = -keyboardTopToCenter / 2;
            await resetGame();
            updateScrollPosition();
            setTimeout(() => highlightCurrentChar(), 500);
            window.addEventListener('keydown', handleKeyDown);
            window.addEventListener('keyup', handleKeyUp);
            window.addEventListener('resize', handleResize);
            app.ticker.add(() => {});
        }
    };
}

// 启动游戏
init(); 