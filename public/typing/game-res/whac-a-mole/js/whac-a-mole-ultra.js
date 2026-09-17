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
// Game Configuration
const CONFIG = {
    width: 800,
    height: 600,
    baseTimePerAnimal: 5000,    // Base time for each animal (level 1)
    minTimePerAnimal: 1000,     // Minimum time an animal will stay (won't go lower than this)
    timeDecreasePerLevel: 300,  // How many milliseconds to decrease per level
    animalsPerLevel: 10,        // Number of animals per level
    maxMistakes: 5,            // Maximum mistakes allowed before game over
    holeRows: [4, 3, 4],       // Number of holes in each row
    holeSize: 50,              // Size of each hole
    holeSpacing: 160,          // Spacing between holes
    verticalSpacing: 100,      // 垂直方向上洞之间的间距
};

// Game state
let gameState = {
    isStarted: false,
    score: 0,
    mistakes: 0,
    currentLevel: 1,
    animalsInLevel: 0,
    currentAnimal: null,
    currentHole: null,
    currentLetter: '',
    activeTimeout: null,
    holes: [],
    animals: [],
    sounds: {}, // 用于存储音频对象
    bgMusic: null // 背景音乐对象
};

// Initialize PixiJS Application
const app = new PIXI.Application({
    width: CONFIG.width,
    height: CONFIG.height,
    backgroundColor: 0x000000,
    resolution: 1,
    autoDensity: true,
});

// Force canvas CSS size explicitly for Android WebView compatibility
app.view.style.width = CONFIG.width + 'px';
app.view.style.height = CONFIG.height + 'px';

document.getElementById('game-container').appendChild(app.view);

// Asset loading
const loader = PIXI.Assets;
const assets = {
    background: 'assets/background.png',
    hole: 'assets/hole_up.png',
    holeCover: 'assets/hole_cover.png',
    mole: 'assets/mole.png',
    moleHit: 'assets/mole_hit.png',
    duck: 'assets/duck.png',
    duckHit: 'assets/duck_hit.png',
    key: 'assets/key_bg.png',
    hammer: 'assets/hammer.png',
    splash: 'assets/splash.png',
    popupBg: 'assets/popup_bg.png',
    button: 'assets/button.png',
    buttonHover: 'assets/button_hover.png'
};

// 音频资源
const audioAssets = {
    bgm: 'assets/bgm.mp3',
    hit: 'assets/hit.mp3',
    miss: 'assets/miss.mp3'
};

// Game containers
const gameContainer = new PIXI.Container();
const uiContainer = new PIXI.Container();
const popupContainer = new PIXI.Container(); // 添加弹窗容器
app.stage.addChild(gameContainer);
app.stage.addChild(uiContainer);
app.stage.addChild(popupContainer);
popupContainer.visible = false; // 初始时隐藏弹窗容器

// Instruction text
const instructionText = new PIXI.Text('输入空格开始游戏', {
    fontFamily: 'Arial',
    fontSize: 36,
    fill: 0xffffff,
    align: 'center',
    stroke: 0x000000,
    strokeThickness: 4
});
instructionText.anchor.set(0.5);
instructionText.position.set(CONFIG.width / 2, CONFIG.height / 2);
uiContainer.addChild(instructionText);

// Score text
const scoreText = new PIXI.Text('得分: 0 / 失误: 0', {
    fontFamily: 'Arial',
    fontSize: 14,
    fill: 0x000000,
    align: 'left',
});
scoreText.position.set(40, CONFIG.height - 90);
scoreText.visible = false;
uiContainer.addChild(scoreText);

// Progress text
const progressText = new PIXI.Text('进度: 0 / ' + CONFIG.animalsPerLevel, {
    fontFamily: 'Arial',
    fontSize: 14,
    fill: 0x000000,
    align: 'right',
});
progressText.position.set(CONFIG.width - 170, CONFIG.height - 90);
progressText.visible = false;
uiContainer.addChild(progressText);

// Hammer sprite
const hammer = new PIXI.Sprite();
hammer.anchor.set(0.3, 0.9); // Set pivot point to the bottom of hammer
hammer.visible = false;
hammer.zIndex = 20; // 确保锤子显示在最上层
gameContainer.addChild(hammer);

// Initialize game resources
async function initGame() {
    // Load all assets
    for (const [key, value] of Object.entries(assets)) {
        await loader.load(value);
    }
    
    // 加载音频资源
    loadAudio();
    
    // 启用容器排序
    gameContainer.sortableChildren = true;
    
    // Create background
    const background = PIXI.Sprite.from(assets.background);
    background.width = CONFIG.width;
    background.height = CONFIG.height;
    background.zIndex = 0;
    gameContainer.addChild(background);
    
    // Initialize hammer
    hammer.texture = PIXI.Texture.from(assets.hammer);
    hammer.scale.set(0.25);
    
    // Create holes
    createHoles();
    
    // Setup keyboard event listener
    window.addEventListener('keydown', handleKeyPress);
}

// 加载音频资源
function loadAudio() {
    // 创建背景音乐
    gameState.bgMusic = new Audio(audioAssets.bgm);
    gameState.bgMusic.loop = true; // 循环播放
    gameState.bgMusic.volume = 0.5; // 设置音量
    
    // 创建音效
    gameState.sounds = {
        hit: new Audio(audioAssets.hit),
        miss: new Audio(audioAssets.miss)
    };
    
    // 预加载音频以避免延迟
    gameState.bgMusic.load();
    gameState.sounds.hit.load();
    gameState.sounds.miss.load();
}

// 播放音效的通用函数
function playSound(soundName) {
    if (gameState.sounds[soundName]) {
        // 克隆音频对象，以便可以重叠播放
        const sound = gameState.sounds[soundName].cloneNode();
        sound.volume = soundName === 'hit' ? 1.0 : 0.8; // 调整音量
        sound.play().catch(error => console.log('音频播放失败:', error));
    }
}

// Create holes in the specified pattern
function createHoles() {
    let holeIndex = 0;
    const totalRows = CONFIG.holeRows.length;
    const centerX = CONFIG.width / 2;
    
    // 顶部1/4区域是天空，所以从height的1/4处开始放置洞
    const skyHeight = CONFIG.height * 0.25; 
    const gameAreaHeight = CONFIG.height - skyHeight;
    
    // 计算垂直分布的起始位置和间距
    const totalVerticalSpace = (totalRows - 1) * CONFIG.verticalSpacing;
    const remainingSpace = gameAreaHeight - totalVerticalSpace;
    const topMargin = remainingSpace / 2; // 顶部和底部的边距
    const startY = skyHeight + topMargin;
    
    for (let row = 0; row < totalRows; row++) {
        const holesInRow = CONFIG.holeRows[row];
        const rowWidth = (holesInRow - 1) * CONFIG.holeSpacing; // 修正计算方式
        const startX = centerX - (rowWidth / 2); // 修正，使每一排都从中心开始计算
        
        for (let col = 0; col < holesInRow; col++) {
            // 计算当前洞的位置
            const holeX = startX + (col * CONFIG.holeSpacing);
            const holeY = startY + (row * CONFIG.verticalSpacing);
            
            // 创建地鼠洞
            const hole = new PIXI.Sprite(PIXI.Texture.from(assets.hole));
            hole.anchor.set(0.5, 0.5);
            hole.position.set(holeX, holeY);
            hole.scale.set(0.4); 
            hole.index = holeIndex++;
            hole.zIndex = 1;
            
            gameContainer.addChild(hole);
            gameState.holes.push(hole);
            
            // 创建洞口盖子 (hole cover) 来盖住动物底部
            const holeCover = new PIXI.Sprite(PIXI.Texture.from(assets.holeCover));
            holeCover.anchor.set(0.5, 0.1);
            holeCover.position.set(hole.position.x, hole.position.y);
            holeCover.scale.set(0.4);
            holeCover.zIndex = 10;
            gameContainer.addChild(holeCover);
            
            // 将holeCover保存到hole对象中，以便后续使用
            hole.cover = holeCover;
        }
    }
}

// iPad Safari e.code fallback for Unidentified key
function codeToChar(code) {
    if (!code) return '';
    if (code.startsWith('Key')) return code.charAt(3).toLowerCase();
    if (code.startsWith('Digit')) return code.charAt(5);
    switch(code) {
        case 'Space': return ' ';
        case 'Semicolon': return ';';
        case 'Equal': return '=';
        case 'Comma': return ',';
        case 'Minus': return '-';
        case 'Period': return '.';
        case 'Slash': return '/';
        case 'Backquote': return '`';
        case 'BracketLeft': return '[';
        case 'BracketRight': return ']';
        case 'Backslash': return '\\';
        case 'Quote': return "'";
        default: return '';
    }
}

// Handle keyboard input
function handleKeyPress(e) {
    let key = e.key;
    if (!key || key === 'Unidentified' || key === 'Process') {
        key = codeToChar(e.code);
    }
    key = key.toLowerCase();

    const isSpaceKey = e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar';
    if (isSpaceKey) {
        e.preventDefault();
    }
    
    // Space key starts the game
    if (isSpaceKey && !gameState.isStarted) {
        startGame();
        return;
    }
    
    // Handle letter input during game
    if (gameState.isStarted && gameState.currentLetter && key === gameState.currentLetter.toLowerCase()) {
        hitAnimal();
    }
}

// Start the game
function startGame() {
    gameState.isStarted = true;
    gameState.score = 0;
    gameState.mistakes = 0;
    gameState.currentLevel = 1;
    gameState.animalsInLevel = 0;
    
    // Hide instruction text and show score
    instructionText.visible = false;
    scoreText.visible = true;
    progressText.visible = true;
    popupContainer.visible = false;
    
    // Play background music
    gameState.bgMusic.play().catch(error => console.log('背景音乐播放失败:', error));
    
    // Start showing animals
    showNextAnimal();
}

// Generate a random letter (A-Z)
function getRandomLetter() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return letters.charAt(Math.floor(Math.random() * letters.length));
}

// Show the next animal with a random letter
function showNextAnimal() {
    // Check for level completion
    if (gameState.animalsInLevel >= CONFIG.animalsPerLevel) {
        // Level completed, start next level
        gameState.currentLevel++;
        gameState.animalsInLevel = 0;
        updateUI();
        // Show level up message and continue
        showLevelUpMessage(() => {
            showNextAnimal();
        });
        return;
    }

    // Check for game over condition
    if (gameState.mistakes >= CONFIG.maxMistakes) {
        endGame();
        return;
    }

    // Choose a random hole
    const randomHoleIndex = Math.floor(Math.random() * gameState.holes.length);
    const hole = gameState.holes[randomHoleIndex];
    gameState.currentHole = hole;

    // Choose random animal (mole or duck)
    const isDuck = Math.random() > 0.5;
    const animalTexture = isDuck ? assets.duck : assets.mole;

    // Create animal sprite
    const animal = new PIXI.Sprite(PIXI.Texture.from(animalTexture));
    animal.anchor.set(0.5, 1.0);
    animal.position.set(hole.position.x, hole.position.y + hole.height * 0.3);
    animal.scale.set(0.4);
    animal.alpha = 1;
    animal.isDuck = isDuck;
    animal.zIndex = 5;
    gameContainer.addChild(animal);

    // Get animal dimensions
    const animalHeight = animal.height;
    const animalWidth = animal.width;

    // Generate random letter
    const letter = getRandomLetter();
    gameState.currentLetter = letter;

    // Create letter background
    const key = new PIXI.Sprite(PIXI.Texture.from(assets.key));
    key.anchor.set(0.5, 0.5);
    key.position.set(0, -animalHeight * 2.5);
    key.scale.set(0.8);
    animal.addChild(key);

    // Add letter text
    const letterText = new PIXI.Text(letter, {
        fontFamily: 'Arial',
        fontSize: 36,
        fontWeight: 'bold',
        fill: 0x000000,
        align: 'center'
    });
    letterText.anchor.set(0.5, 0.5);
    key.addChild(letterText);

    // Store current animal
    gameState.currentAnimal = animal;

    // Calculate current level time (decreases with each level but won't go below minimum)
    const currentTime = Math.max(
        CONFIG.minTimePerAnimal,
        CONFIG.baseTimePerAnimal - (gameState.currentLevel - 1) * CONFIG.timeDecreasePerLevel
    );

    // Animate animal appearance
    gsap.to(animal, {
        y: hole.position.y + 30,
        duration: 0.2,
        ease: 'power2.out'
    });

    // Set timeout for animal disappearance
    gameState.activeTimeout = setTimeout(() => {
        if (gameState.currentAnimal === animal) {
            missAnimal();
        }
    }, currentTime);

    // Update UI
    gameState.animalsInLevel++;
    updateUI();
}

// Hit an animal (successful)
function hitAnimal() {
    if (!gameState.currentAnimal) return;
    
    // Clear the timeout
    clearTimeout(gameState.activeTimeout);
    
    // 播放击中音效
    playSound('hit');
    
    // 获取动物的实际高度
    const animalHeight = gameState.currentAnimal.height;
    
    // 隐藏字母键
    if (gameState.currentAnimal.children.length > 0) {
        gameState.currentAnimal.children[0].visible = false;
    }
    
    // 切换动物图片为击中状态
    const hitTextureName = gameState.currentAnimal.isDuck ? assets.duckHit : assets.moleHit;
    gameState.currentAnimal.texture = PIXI.Texture.from(hitTextureName);
    
    // 添加飞溅效果到头部
    const splash = new PIXI.Sprite(PIXI.Texture.from(assets.splash));
    splash.anchor.set(0.5, 0.5);
    splash.position.set(0, -animalHeight * 2.2); // 放在动物头部
    splash.scale.set(0.6);
    gameState.currentAnimal.addChild(splash);
    
    // Animate hammer hitting
    hammer.visible = true;
    hammer.position.set(
        gameState.currentAnimal.position.x + 10, 
        gameState.currentAnimal.position.y - animalHeight * 0.8
    ); // 调整锤子位置，对准动物减小后的露出部分中间
    hammer.rotation = -0.5;
    
    gsap.to(hammer, {
        rotation: 0.3,
        duration: 0.1,
        onComplete: () => {
            // Hide hammer
            gsap.to(hammer, {
                rotation: -0.5,
                duration: 0.2,
                onComplete: () => {
                    hammer.visible = false;
                }
            });
        }
    });
    
    // Increment score
    gameState.score++;
    
    // 等待一小段时间以展示击中效果，然后隐藏动物
    setTimeout(() => {
        // Animate animal going back
        animateAnimalHide();
    }, 300);
}

// Miss an animal (timeout)
function missAnimal() {
    if (!gameState.currentAnimal) return;
    
    // 播放失误音效
    playSound('miss');
    
    // Increment mistakes
    gameState.mistakes++;
    
    // Animate animal going back
    animateAnimalHide();
}

// Animate animal hiding back in hole
function animateAnimalHide() {
    const animal = gameState.currentAnimal;
    
    // Animate animal going down
    gsap.to(animal, {
        y: gameState.currentHole.position.y + gameState.currentHole.height * 0.3, // 回到初始位置（洞的下方）
        duration: 0.2, // 快速回到洞内
        ease: 'power2.in', // 使用匹配的缓动函数
        onComplete: () => {
            // 移除所有子元素
            while (animal.children.length > 0) {
                animal.removeChild(animal.children[0]);
            }
            
            // Remove animal
            gameContainer.removeChild(animal);
            
            // Reset current animal
            gameState.currentAnimal = null;
            gameState.currentLetter = '';
            
            // Show next animal after a short delay
            setTimeout(showNextAnimal, 500);
        }
    });
    
    // Update UI
    updateUI();
}

// Update UI elements
function updateUI() {
    scoreText.text = `得分: ${gameState.score} / 失误: ${gameState.mistakes}/${CONFIG.maxMistakes}`;
    progressText.text = `关卡: ${gameState.currentLevel} - 进度: ${gameState.animalsInLevel}/${CONFIG.animalsPerLevel}`;
}

// Show level up message
function showLevelUpMessage(callback) {
    const levelText = new PIXI.Text(`第 ${gameState.currentLevel} 关`, {
        fontFamily: 'Arial',
        fontSize: 48,
        fill: 0xFFD700,
        align: 'center',
        stroke: 0x000000,
        strokeThickness: 4
    });
    levelText.anchor.set(0.5);
    levelText.position.set(CONFIG.width / 2, CONFIG.height / 2);
    uiContainer.addChild(levelText);

    // Animate the text
    gsap.to(levelText, {
        alpha: 0,
        y: levelText.y - 50,
        duration: 1.5, // Increased duration to give players more time to read
        onComplete: () => {
            uiContainer.removeChild(levelText);
            if (callback) callback();
        }
    });
}

// End game
function endGame() {
    gameState.isStarted = false;
    
    // Stop background music
    gameState.bgMusic.pause();
    gameState.bgMusic.currentTime = 0;
    
    // Clear and show popup container
    while (popupContainer.children.length > 0) {
        popupContainer.removeChild(popupContainer.children[0]);
    }
    
    // Create popup background
    const popupBg = new PIXI.Sprite(PIXI.Texture.from(assets.popupBg));
    popupBg.anchor.set(0.5);
    popupBg.position.set(CONFIG.width / 2, CONFIG.height / 2);
    popupBg.scale.set(0.4);
    popupContainer.addChild(popupBg);
    
    // Create title text
    const titleText = new PIXI.Text('游戏结束', {
        fontFamily: 'Arial',
        fontSize: 40,
        fill: 0xffffff,
        align: 'center',
    });
    titleText.anchor.set(0.5);
    titleText.position.set(0, -80);
    popupBg.addChild(titleText);
    
    // Create score text
    const scoreText = new PIXI.Text(`消灭地鼠: ${gameState.score}\n到达关卡: ${gameState.currentLevel}`, {
        fontFamily: 'Arial',
        fontSize: 24,
        fill: 0xffffff,
        align: 'center',
    });
    scoreText.anchor.set(0.5);
    scoreText.position.set(0, 0);
    popupBg.addChild(scoreText);
    
    // Create buttons
    const buttonSpacing = 240;
    
    // Create "Play Again" button
    const replayButton = createButton('再玩一次', -buttonSpacing/2);
    replayButton.on('pointerdown', () => {
        startGame();
    });
    popupBg.addChild(replayButton);
    
    // Create "Continue Learning" button
    const continueButton = createButton('继续学习', buttonSpacing/2);
    continueButton.on('pointerdown', () => {
        window.location.href = '/study';
    });
    popupBg.addChild(continueButton);
    
    // Show popup
    popupContainer.visible = true;
    
    // Hide other UI elements
    instructionText.visible = false;
    progressText.visible = false;
}

// 创建按钮的辅助函数
function createButton(text, xOffset) {
    const buttonContainer = new PIXI.Container();
    buttonContainer.position.set(xOffset, 80);
    
    const button = new PIXI.Sprite(PIXI.Texture.from(assets.button));
    button.anchor.set(0.5);
    button.scale.set(1.0);
    buttonContainer.addChild(button);
    
    const buttonText = new PIXI.Text(text, {
        fontFamily: 'Arial',
        fontSize: 24,
        fill: 0xffffff,
        align: 'center',
    });
    buttonText.anchor.set(0.5);
    buttonContainer.addChild(buttonText);
    
    // 设置交互
    buttonContainer.eventMode = 'static';
    buttonContainer.cursor = 'pointer';
    
    // 鼠标悬停效果
    buttonContainer.on('pointerover', () => {
        button.texture = PIXI.Texture.from(assets.buttonHover);
    });
    
    buttonContainer.on('pointerout', () => {
        button.texture = PIXI.Texture.from(assets.button);
    });
    
    return buttonContainer;
}

// Polyfill for GSAP-like animation (since we're not loading the library)
window.gsap = {
    to: (target, params) => {
        const { duration = 1, ease = 'linear', ...props } = params;
        const startValues = {};
        const startTime = Date.now();
        const durationMs = duration * 1000;
        
        // Store starting values
        for (const key in props) {
            if (key !== 'onComplete') {
                startValues[key] = target[key];
            }
        }
        
        // Animation function
        function animate() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / durationMs, 1);
            let easedProgress = progress;
            
            // Simple easing functions
            if (ease === 'back.out') {
                easedProgress = 1 - Math.pow(1 - progress, 3);
            } else if (ease === 'back.in') {
                easedProgress = Math.pow(progress, 3);
            }
            
            // Update properties
            for (const key in props) {
                if (key !== 'onComplete') {
                    target[key] = startValues[key] + (props[key] - startValues[key]) * easedProgress;
                }
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else if (props.onComplete) {
                props.onComplete();
            }
        }
        
        animate();
    }
};

// Start loading assets when page loads
window.onload = initGame; 