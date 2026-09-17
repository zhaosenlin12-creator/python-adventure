// Game constants
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

let GAME_WIDTH = window.innerWidth;
let GAME_HEIGHT = window.innerHeight;
const CELL_RADIUS = 40;
const VIRUS_RADIUS = 10; // 增加病毒大小
const PROJECTILE_RADIUS = 6; // 调整炮弹大小
let VIRUS_SPEED = 0.15; // 进一步降低病毒移动速度
const PROJECTILE_SPEED = 18; // 增加炮弹速度
let SPAWN_INTERVAL = 4000; // 增加生成间隔
const SAFE_DISTANCE = 20; // minimum distance from cell to game over
const BREATHING_SPEED = 0.03; // 呼吸效果速度
let VIRUSES_FIRST_LEVEL = 4; // 第一关的病毒数量
let VIRUSES_INCREMENT = 2; // 每关增加的病毒数量

// Debug mode
let debugMode = false;

// Audio objects
let bgMusic;
let shootSound;
let explosionSound;
let isMuted = false;
let bgMusicPlaying = false;

// Word list for viruses - 将被API获取的单词替换
let WORD_LIST = [];
// 当前关卡已使用的单词索引
let currentWordIndex = 0;
// 是否已完成所有单词
let allWordsCompleted = false;
// API基础URL
let API_BASE_URL = 'https://daziya-api.cutterman.cn'; 

// Game variables
let app;
let cell;
let viruses = [];
let projectiles = [];
let score = 0;
let gameOver = false;
let gameStarted = false; // 新增：游戏是否已开始
let spawnTimer;
let targetVirus = null;
let currentInput = '';
let currentLevel = 1; // 当前关卡
let virusesDestroyed = 0; // 已消灭的病毒数量
let levelDisplay; // 关卡显示
let leftPupil, rightPupil;
let pauseScreen; // 暂停界面

const isSpaceKey = (event) => event && (event.code === 'Space' || event.key === ' ' || event.key === 'Spacebar');

// 游戏状态
let isPaused = false;
let difficulty = 'normal'; // 'easy', 'normal', 'hard'


// Initialize the game
function init() {
    // 创建PIXI应用
    app = new PIXI.Application({
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        backgroundColor: 0x0a0a2a,
        view: document.getElementById('game-canvas'),
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        antialias: true
    });
    
    // 设置画布大小
    app.renderer.resize(GAME_WIDTH, GAME_HEIGHT);
    
    // 设置API基础URL
    
    // Initialize audio
    initAudio();
    
    // Create cell (player)
    createCell();
    
    // 获取单词列表
    fetchWordList();
    
    // 设置开始屏幕
    setupStartScreen();
    
    // Set up debug toggle
    setupDebug();
    
    // 添加窗口大小变化监听
    window.addEventListener('resize', handleResize);
    
    // Start game loop (只更新视觉效果，不开始游戏逻辑)
    app.ticker.add(gameLoop);
    
    // Debug log
    console.log("Game initialized, waiting for player to start");
    updateDebugInfo();
}

// Initialize audio objects
function initAudio() {
    // Background music
    bgMusic = new Audio('assets/bgm.ogg');
    bgMusic.loop = true;
    bgMusic.volume = 0.5;
    
    // Shoot sound effect
    shootSound = new Audio('assets/shoot.mp3');
    shootSound.volume = 0.4;
    
    // Explosion sound effect
    explosionSound = new Audio('assets/explosion.flac');
    explosionSound.volume = 0.6;
    
    // Add audio controls to the UI
    setupAudioControls();
}

// Setup audio controls
function setupAudioControls() {
    // Create audio control container if it doesn't exist
    if (!document.getElementById('audio-controls')) {
        const audioControls = document.createElement('div');
        audioControls.id = 'audio-controls';
        audioControls.style.position = 'absolute';
        audioControls.style.bottom = '10px';
        audioControls.style.right = '10px';
        audioControls.style.zIndex = '1000';
        
        // Create mute button
        const muteButton = document.createElement('button');
        muteButton.id = 'mute-button';
        muteButton.innerHTML = '🔊';
        muteButton.style.fontSize = '24px';
        muteButton.style.padding = '5px 10px';
        muteButton.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        muteButton.style.color = 'white';
        muteButton.style.border = 'none';
        muteButton.style.borderRadius = '5px';
        muteButton.style.cursor = 'pointer';
        
        // Add click event to toggle mute
        muteButton.addEventListener('click', toggleMute);
        
        // Add button to container
        audioControls.appendChild(muteButton);
        
        // Add container to document
        document.body.appendChild(audioControls);
    }
}

// Toggle mute state
function toggleMute() {
    isMuted = !isMuted;
    
    // Update button text
    const muteButton = document.getElementById('mute-button');
    muteButton.innerHTML = isMuted ? '🔇' : '🔊';
    
    // Update audio volumes
    if (isMuted) {
        if (bgMusicPlaying) bgMusic.volume = 0;
        shootSound.volume = 0;
        explosionSound.volume = 0;
    } else {
        bgMusic.volume = 0.5;
        shootSound.volume = 0.4;
        explosionSound.volume = 0.6;
    }
}

// Play background music
function playBackgroundMusic() {
    if (!bgMusicPlaying && !isMuted) {
        bgMusic.play().catch(error => {
            console.error("Error playing background music:", error);
        });
        bgMusicPlaying = true;
    }
}

// Play shoot sound
function playShootSound() {
    if (!isMuted) {
        // Clone the sound to allow overlapping sounds
        const sound = shootSound.cloneNode();
        sound.volume = shootSound.volume;
        sound.play().catch(error => {
            console.error("Error playing shoot sound:", error);
        });
    }
}

// Play explosion sound
function playExplosionSound() {
    if (!isMuted) {
        // Clone the sound to allow overlapping sounds
        const sound = explosionSound.cloneNode();
        sound.volume = explosionSound.volume;
        sound.play().catch(error => {
            console.error("Error playing explosion sound:", error);
        });
    }
}

// 设置开始屏幕
function setupStartScreen() {
    console.log("setupStartScreen called");
    
    // 获取难度选择器
    const difficultySelect = document.getElementById('difficulty-select');
    
    // 设置难度选择器的初始值
    difficultySelect.value = difficulty;
    
    // 添加难度选择器的变更事件
    difficultySelect.addEventListener('change', function() {
        difficulty = this.value;
        console.log(`Difficulty set to: ${difficulty}`);
    });
    
    // 添加空格键监听，开始游戏
    window.addEventListener('keydown', function startGameHandler(e) {
        console.log("Key pressed:", e.code);
        if (isSpaceKey(e) && !gameStarted) {
            e.preventDefault();
            console.log("Space key pressed, starting game");
            
            // 移除开始屏幕
            const startScreen = document.getElementById('start-screen');
            startScreen.style.display = 'none';
            
            // 应用难度设置
            applyDifficultySettings();
            
            // 开始游戏
            startGame();
            
            // 移除这个事件监听器，避免重复触发
            window.removeEventListener('keydown', startGameHandler);
        }
    });
    
    console.log("Start screen setup complete");
}

// 开始游戏
function startGame() {
    console.log("startGame called");
    
    // 标记游戏已开始
    gameStarted = true;
    console.log("gameStarted set to:", gameStarted);
    
    // 重置游戏状态
    resetGameState();
    
    // 创建关卡显示
    createLevelDisplay();
    
    // 生成初始病毒
    spawnInitialViruses();
    console.log("After spawnInitialViruses, viruses count:", viruses.length);
    
    // Set up input handling
    setupInput();
    
    // 设置暂停键监听
    setupPauseListener();
    
    // Play background music
    playBackgroundMusic();
    
    console.log("Game started!");
}

// 重置游戏状态
function resetGameState() {
    // 清除所有病毒和炮弹
    clearAllViruses();
    clearAllProjectiles();
    
    // 重置游戏变量
    score = 0;
    document.getElementById('score').textContent = score;
    gameOver = false;
    currentLevel = 1;
    virusesDestroyed = 0;
    
    // 重置单词索引
    currentWordIndex = 0;
    allWordsCompleted = false;
    
    // 清除定时器
    if (spawnTimer) {
        clearInterval(spawnTimer);
        spawnTimer = null;
    }
}

// 创建关卡显示
function createLevelDisplay() {
    // 移除旧的关卡显示（如果存在）
    if (levelDisplay) {
        app.stage.removeChild(levelDisplay);
    }
    
    // 创建新的关卡显示
    levelDisplay = new PIXI.Text(`关卡 ${currentLevel}`, {
        fontFamily: 'Arial',
        fontSize: 24,
        fontWeight: 'bold',
        fill: 0xFFFFFF,
        align: 'center',
        stroke: 0x000000,
        strokeThickness: 4
    });
    
    levelDisplay.anchor.set(0.5);
    levelDisplay.position.set(GAME_WIDTH / 2, 30);
    
    app.stage.addChild(levelDisplay);
}

// 生成初始病毒
function spawnInitialViruses() {
    // 计算当前关卡应该生成的病毒数量
    const virusCount = VIRUSES_FIRST_LEVEL + (currentLevel - 1) * VIRUSES_INCREMENT;
    
    console.log("Attempting to spawn initial viruses:", virusCount);
    console.log("Current level:", currentLevel);
    console.log("VIRUSES_FIRST_LEVEL:", VIRUSES_FIRST_LEVEL);
    console.log("VIRUSES_INCREMENT:", VIRUSES_INCREMENT);
    
    // 检查剩余单词数量
    const remainingWords = WORD_LIST.length - currentWordIndex;
    console.log("Remaining words:", remainingWords);
    
    // 如果没有剩余单词，显示游戏通关消息
    if (remainingWords <= 0) {
        if (!allWordsCompleted) {
            allWordsCompleted = true;
            showGameCompletedMessage();
        }
        return;
    }
    
    // 确定实际生成的病毒数量（不超过剩余单词数量）
    const actualVirusCount = Math.min(virusCount, remainingWords);
    console.log("Actual virus count to spawn:", actualVirusCount);
    
    // 生成病毒
    for (let i = 0; i < actualVirusCount; i++) {
        console.log(`Spawning virus ${i+1} of ${actualVirusCount}`);
        spawnVirus();
    }
    
    console.log(`Spawned ${actualVirusCount} viruses for level ${currentLevel}`);
}

// 升级到下一关
function levelUp() {
    currentLevel++;
    virusesDestroyed = 0;
    
    // 更新关卡显示
    levelDisplay.text = `关卡 ${currentLevel}`;
    
    // 显示升级消息
    showLevelUpMessage();
    
    // 清除所有病毒
    clearAllViruses();
    
    // 检查是否已用完所有单词
    if (currentWordIndex >= WORD_LIST.length) {
        console.log("All words completed!");
        
        // 如果所有单词都已完成，显示游戏通关消息
        if (!allWordsCompleted) {
            allWordsCompleted = true;
            showGameCompletedMessage();
        }
        return;
    }
    
    // 短暂延迟后生成新关卡的病毒
    setTimeout(() => {
        // 生成新关卡的病毒
        spawnInitialViruses();
    }, 1500);
    
    console.log(`Level up! Now at level ${currentLevel}`);
}

// 显示升级消息
function showLevelUpMessage() {
    const levelUpContainer = new PIXI.Container();
    levelUpContainer.position.set(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    
    // 背景
    const background = new PIXI.Graphics();
    background.beginFill(0x000000, 0.7);
    background.drawRoundedRect(-200, -100, 400, 200, 20);
    background.endFill();
    
    // 主标题
    const titleText = new PIXI.Text(`关卡 ${currentLevel}!`, {
        fontFamily: 'Arial',
        fontSize: 48,
        fontWeight: 'bold',
        fill: 0xFFFF00,
        align: 'center',
        stroke: 0x000000,
        strokeThickness: 6
    });
    titleText.anchor.set(0.5);
    titleText.position.set(0, -30);
    
    // 副标题
    const subtitleText = new PIXI.Text(`Viruses: ${viruses.length}`, {
        fontFamily: 'Arial',
        fontSize: 24,
        fill: 0xFFFFFF,
        align: 'center'
    });
    subtitleText.anchor.set(0.5);
    subtitleText.position.set(0, 30);
    
    // 添加到容器
    levelUpContainer.addChild(background);
    levelUpContainer.addChild(titleText);
    levelUpContainer.addChild(subtitleText);
    
    // 添加到舞台
    app.stage.addChild(levelUpContainer);
    
    // 设置初始状态
    levelUpContainer.alpha = 0;
    levelUpContainer.scale.set(0.5);
    
    // 使用GSAP动画库创建动画效果
    gsap.to(levelUpContainer, {
        alpha: 1,
        scale: 1,
        duration: 0.5,
        ease: "back.out(1.7)",
        onComplete: () => {
            // 显示一段时间后淡出
            gsap.to(levelUpContainer, {
                alpha: 0,
                scale: 1.2,
                duration: 0.8,
                delay: 1.2,
                ease: "power2.out",
                onComplete: () => {
                    app.stage.removeChild(levelUpContainer);
                }
            });
        }
    });
}

// 清除所有炮弹
function clearAllProjectiles() {
    for (const projectile of projectiles) {
        app.stage.removeChild(projectile);
    }
    projectiles = [];
}

// Set up debug toggle
function setupDebug() {
    const toggleButton = document.getElementById('toggle-debug');
    const debugPanel = document.getElementById('debug-panel');
    const spawnButton = document.getElementById('spawn-virus');
    const clearButton = document.getElementById('clear-viruses');
    
    toggleButton.addEventListener('click', () => {
        debugMode = !debugMode;
        debugPanel.style.display = debugMode ? 'block' : 'none';
        updateDebugInfo();
    });
    
    // Add spawn virus button functionality
    spawnButton.addEventListener('click', () => {
        spawnVirus();
        console.log("Manually spawned a virus");
    });
    
    // Add clear viruses button functionality
    clearButton.addEventListener('click', () => {
        clearAllViruses();
        console.log("Cleared all viruses");
    });
}

// Update debug information
function updateDebugInfo() {
    if (!debugMode) return;
    
    const debugInfo = document.getElementById('debug-info');
    let info = `
        <p>Level: ${currentLevel}</p>
        <p>Viruses: ${viruses.length}</p>
        <p>Viruses Destroyed: ${virusesDestroyed}/${viruses.length}</p>
        <p>Projectiles: ${projectiles.length}</p>
        <p>Current Input: "${currentInput}"</p>
        <p>Target Virus: ${targetVirus ? targetVirus.word : 'none'}</p>
        <p>Game Over: ${gameOver}</p>
        <p>Score: ${score}</p>
        <p>Word Index: ${currentWordIndex}/${WORD_LIST.length}</p>
        <p>All Words Completed: ${allWordsCompleted}</p>
        <hr>
        <p>Virus List:</p>
        <ul>
    `;
    
    viruses.forEach((virus, index) => {
        info += `<li>Virus ${index}: "${virus.word}" at (${Math.round(virus.position.x)}, ${Math.round(virus.position.y)})</li>`;
    });
    
    info += '</ul>';
    debugInfo.innerHTML = info;
}

// Create the cell (player)
function createCell() {
    cell = new PIXI.Container();
    
    // Load cell texture from image
    const cellTexture = PIXI.Texture.from('assets/cell.png');
    const cellSprite = new PIXI.Sprite(cellTexture);
    
    // Set the anchor point to the center
    cellSprite.anchor.set(0.5);
    
    // Scale the sprite to match the cell radius
    const scaleFactor = (CELL_RADIUS * 2) / Math.max(cellTexture.width, cellTexture.height);
    cellSprite.scale.set(scaleFactor);
    
    // Add a glow effect - 修改光晕颜色为红色
    const glow = new PIXI.Graphics();
    glow.beginFill(0x84D9F9, 0.3); // 淡红色光晕
    glow.drawCircle(0, 0, CELL_RADIUS * 1.5);
    glow.endFill();
    
    // Add all parts to the cell container
    cell.addChild(glow);
    cell.addChild(cellSprite);
    
    // Position the cell
    cell.x = GAME_WIDTH / 2;
    cell.y = GAME_HEIGHT - CELL_RADIUS * 2;
    
    // Add the cell to the stage
    app.stage.addChild(cell);
    
    // Remove the eye-related variables since we're not using them anymore
    leftPupil = null;
    rightPupil = null;
}

// 更新眼睛位置函数 - 不再需要，但保留空函数以避免错误
function updateEyes(event) {
    // 不再需要更新眼睛，因为我们使用图片了
    return;
}

// 获取关卡对应的病毒颜色
function getVirusColorForLevel(level) {
    // 基础颜色
    const colors = [
        0xFF5252, // 红色 - 第1关
        0xFF9800, // 橙色 - 第2关
        0xFFEB3B, // 黄色 - 第3关
        0x4CAF50, // 绿色 - 第4关
        0x2196F3, // 蓝色 - 第5关
        0x9C27B0, // 紫色 - 第6关
        0xE91E63  // 粉色 - 第7关及以上
    ];
    
    // 获取颜色索引，超过颜色数组长度则使用最后一个颜色
    const colorIndex = Math.min(level - 1, colors.length - 1);
    return colors[colorIndex];
}

// 获取关卡对应的病毒光晕颜色
function getVirusGlowColorForLevel(level) {
    // 基础光晕颜色
    const glowColors = [
        0xFF8A80, // 红色光晕 - 第1关
        0xFFCC80, // 橙色光晕 - 第2关
        0xFFF59D, // 黄色光晕 - 第3关
        0xA5D6A7, // 绿色光晕 - 第4关
        0x90CAF9, // 蓝色光晕 - 第5关
        0xCE93D8, // 紫色光晕 - 第6关
        0xF48FB1  // 粉色光晕 - 第7关及以上
    ];
    
    // 获取颜色索引，超过颜色数组长度则使用最后一个颜色
    const colorIndex = Math.min(level - 1, glowColors.length - 1);
    return glowColors[colorIndex];
}

// 获取关卡对应的病毒形状
function getVirusShapeForLevel(level) {
    // 不同关卡的病毒形状
    const shapes = [
        'circle',    // 第1关：圆形
        'triangle',  // 第2关：三角形
        'square',    // 第3关：方形
        'pentagon',  // 第4关：五边形
        'hexagon',   // 第5关：六边形
        'star',      // 第6关：星形
        'diamond'    // 第7关及以上：菱形
    ];
    
    // 获取形状索引，超过形状数组长度则使用最后一个形状
    const shapeIndex = Math.min(level - 1, shapes.length - 1);
    return shapes[shapeIndex];
}

// 绘制病毒形状
function drawVirusShape(graphics, shape, radius, color) {
    graphics.beginFill(color);
    
    switch (shape) {
        case 'circle':
            graphics.drawCircle(0, 0, radius);
            break;
            
        case 'triangle':
            const trianglePoints = [];
            for (let i = 0; i < 3; i++) {
                const angle = (i / 3) * Math.PI * 2;
                trianglePoints.push(
                    Math.cos(angle) * radius * 1.2,
                    Math.sin(angle) * radius * 1.2
                );
            }
            graphics.drawPolygon(trianglePoints);
            break;
            
        case 'square':
            graphics.drawRect(-radius, -radius, radius * 2, radius * 2);
            break;
            
        case 'pentagon':
            const pentagonPoints = [];
            for (let i = 0; i < 5; i++) {
                const angle = (i / 5) * Math.PI * 2 - Math.PI / 10;
                pentagonPoints.push(
                    Math.cos(angle) * radius * 1.1,
                    Math.sin(angle) * radius * 1.1
                );
            }
            graphics.drawPolygon(pentagonPoints);
            break;
            
        case 'hexagon':
            const hexagonPoints = [];
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                hexagonPoints.push(
                    Math.cos(angle) * radius * 1.1,
                    Math.sin(angle) * radius * 1.1
                );
            }
            graphics.drawPolygon(hexagonPoints);
            break;
            
        case 'star':
            const starPoints = [];
            for (let i = 0; i < 10; i++) {
                const angle = (i / 5) * Math.PI;
                const r = (i % 2 === 0) ? radius * 1.1 : radius * 0.6;
                starPoints.push(
                    Math.cos(angle) * r,
                    Math.sin(angle) * r
                );
            }
            graphics.drawPolygon(starPoints);
            break;
            
        case 'diamond':
            graphics.drawPolygon([
                0, -radius * 1.3,
                radius * 1.3, 0,
                0, radius * 1.3,
                -radius * 1.3, 0
            ]);
            break;
            
        default:
            graphics.drawCircle(0, 0, radius);
    }
    
    graphics.endFill();
}

// 获取关卡对应的病毒速度
function getVirusSpeedForLevel(level) {
    // 基础速度
    const baseSpeed = VIRUS_SPEED;
    // 每关增加10%的速度
    const levelSpeedFactor = 1 + (level - 1) * 0.1;
    // 返回调整后的速度
    return baseSpeed * levelSpeedFactor;
}

// Spawn a virus with a word from the list
function spawnVirus() {
    console.log("spawnVirus called, gameOver:", gameOver);
    if (gameOver) return;
    
    // 检查是否已用完所有单词
    if (currentWordIndex >= WORD_LIST.length) {
        console.log("All words completed!");
        
        // 如果所有单词都已完成，显示游戏通关消息
        if (!allWordsCompleted) {
            allWordsCompleted = true;
            showGameCompletedMessage();
        }
        return;
    }
    
    // Create virus container
    const virus = new PIXI.Container();
    
    // 所有病毒都从顶部出现
    let x = Math.random() * GAME_WIDTH;
    let y = -VIRUS_RADIUS * 2;
    
    console.log("Creating virus at position:", x, y);
    
    // 从单词列表中按顺序获取单词
    const word = WORD_LIST[currentWordIndex];
    currentWordIndex++;
    
    // 获取当前关卡的病毒颜色和形状
    const virusColor = getVirusColorForLevel(currentLevel);
    const glowColor = getVirusGlowColorForLevel(currentLevel);
    const virusShape = getVirusShapeForLevel(currentLevel);
    
    console.log("Virus properties:", { word, virusColor, glowColor, virusShape });
    
    // Virus body
    const virusBody = new PIXI.Graphics();
    drawVirusShape(virusBody, virusShape, VIRUS_RADIUS, virusColor);
    
    // Add a glow effect
    const glow = new PIXI.Graphics();
    glow.beginFill(glowColor, 0.3);
    glow.drawCircle(0, 0, VIRUS_RADIUS * 2);
    glow.endFill();
    
    // Virus spikes
    const spikes = new PIXI.Graphics();
    spikes.lineStyle(1.5, glowColor); // 增加线条粗细
    for (let i = 0; i < 10; i++) { // 增加刺的数量
        const angle = (i / 10) * Math.PI * 2;
        const spikeLength = VIRUS_RADIUS * 0.8; // 保持刺的相对长度
        spikes.moveTo(0, 0);
        spikes.lineTo(
            Math.cos(angle) * (VIRUS_RADIUS + spikeLength),
            Math.sin(angle) * (VIRUS_RADIUS + spikeLength)
        );
    }
    
    // 创建单词字母容器
    const wordContainer = new PIXI.Container();
    wordContainer.position.y = VIRUS_RADIUS + 15; // 调整文字位置
    
    // 为每个字母创建单独的文本对象
    const letterSpacing = 0; // 增加字母间距
    let totalWidth = 0;
    
    // 先计算总宽度
    for (let i = 0; i < word.length; i++) {
        const letter = new PIXI.Text(word[i], {
            fontFamily: 'Arial',
            fontSize: 14, // 增加字体大小
            fontWeight: 'bold',
            fill: 0xFFFFFF,
            align: 'center',
            stroke: 0xff0000,
            strokeThickness: 2
        });
        letter.anchor.set(0.5, 0.5);
        totalWidth += letter.width + letterSpacing;
    }
    
    // 调整起始位置，使单词居中
    let xPos = -totalWidth / 2 + 5;
    
    // 创建并添加每个字母
    for (let i = 0; i < word.length; i++) {
        const letter = new PIXI.Text(word[i], {
            fontFamily: 'Arial',
            fontSize: 14, // 增加字体大小
            fontWeight: 'bold',
            fill: 0xFFFFFF,
            align: 'center'
        });
        letter.anchor.set(0.5, 0.5);
        letter.position.x = xPos + letter.width / 2;
        xPos += letter.width + letterSpacing;
        
        wordContainer.addChild(letter);
    }
    
    // Add all parts to the virus container
    virus.addChild(glow);
    virus.addChild(virusBody);
    virus.addChild(spikes);
    virus.addChild(wordContainer);
    
    // Set virus position
    virus.position.set(x, y);
    
    // Add virus data
    virus.word = word;
    virus.wordContainer = wordContainer;
    virus.lettersShot = 0; // 已经射击的字母数
    virus.isHighlighted = false; // 是否高亮显示
    virus.readyToDestroy = false; // 新增：标记病毒是否准备好被销毁
    
    // 根据关卡调整病毒速度
    const baseSpeed = getVirusSpeedForLevel(currentLevel);
    virus.speed = baseSpeed * (0.8 + Math.random() * 0.4); // 随机速度变化
    
    // 添加呼吸效果数据
    virus.breathingFactor = 0;
    virus.breathingDirection = 1;
    
    // Add virus to the stage and the viruses array
    app.stage.addChild(virus);
    viruses.push(virus);
    
    // Debug log to confirm virus creation
    console.log(`Virus created at (${x}, ${y}) with word: ${word}, speed: ${virus.speed.toFixed(3)}`);
    updateDebugInfo();
}

// Create a projectile
function createProjectile(angle) {
    const projectile = new PIXI.Container();
    
    // Projectile body
    const projectileBody = new PIXI.Graphics();
    projectileBody.beginFill(0x2C65B0);
    projectileBody.drawCircle(0, 0, PROJECTILE_RADIUS);
    projectileBody.endFill();
    
    // Add glow effect
    const glow = new PIXI.Graphics();
    glow.beginFill(0x2C65B0, 0.3);
    glow.drawCircle(0, 0, PROJECTILE_RADIUS * 1.5);
    glow.endFill();
    
    // Add trail effect
    const trail = new PIXI.Graphics();
    trail.beginFill(0x7AA5D6, 0.7);
    trail.moveTo(-PROJECTILE_RADIUS * 0.5, -PROJECTILE_RADIUS * 0.5);
    trail.lineTo(-PROJECTILE_RADIUS * 3, 0);
    trail.lineTo(-PROJECTILE_RADIUS * 0.5, PROJECTILE_RADIUS * 0.5);
    trail.lineTo(-PROJECTILE_RADIUS * 0.5, -PROJECTILE_RADIUS * 0.5);
    trail.endFill();
    
    // Add all parts to the projectile container
    projectile.addChild(glow);
    projectile.addChild(trail);
    projectile.addChild(projectileBody);
    
    // Set projectile position to cell position
    projectile.position.set(cell.position.x, cell.position.y);
    
    // Set projectile velocity based on angle
    projectile.vx = Math.cos(angle) * PROJECTILE_SPEED;
    projectile.vy = Math.sin(angle) * PROJECTILE_SPEED;
    
    // Rotate projectile to match direction
    projectile.rotation = angle;
    
    // Add projectile to the stage and the projectiles array
    app.stage.addChild(projectile);
    projectiles.push(projectile);
    
    // Play shoot sound
    playShootSound();
    
    updateDebugInfo();
    
    // 返回创建的炮弹对象
    return projectile;
}

// Set up input handling
function setupInput() {
    // 添加键盘事件监听
    window.addEventListener('keydown', (e) => {
        if (isSpaceKey(e)) {
            e.preventDefault();
        }

        if (gameOver || isPaused || !gameStarted) return;
        
        // 获取当前输入的字符（转为小写）
        const currentChar = e.key.toLowerCase();
        
        // 只处理字母、数字和常见特殊字符（如连字符、撇号等）
        if (!/^[a-z0-9\-'_.]$/.test(currentChar)) return;
        
        console.log("Input detected:", currentChar);
        
        // 如果没有目标病毒，尝试找新的目标
        if (!targetVirus || !viruses.includes(targetVirus)) {
            // 重置所有病毒的高亮状态
            resetAllVirusHighlights();
            targetVirus = null;
            
            // 查找匹配当前字符的病毒
            for (const virus of viruses) {
                // 获取病毒单词中第一个字母
                const firstChar = virus.word[0];
                
                if (firstChar && firstChar.toLowerCase() === currentChar) {
                    targetVirus = virus;
                    highlightVirus(virus);
                    
                    // 计算角度
                    const dx = virus.position.x - cell.position.x;
                    const dy = virus.position.y - cell.position.y;
                    const angle = Math.atan2(dy, dx);
                    
                    // 发射炮弹并设置目标病毒
                    const projectile = createProjectile(angle);
                    projectile.targetVirus = virus;
                    
                    // 更新病毒的字母显示（隐藏第一个字母）
                    updateVirusLetters(virus, 0);
                    
                    console.log("Locked on virus:", virus.word);
                    
                    break; // 找到匹配的病毒后退出循环
                }
            }
        } 
        // 如果已有目标病毒，检查当前输入是否匹配下一个字母
        else {
            // 获取目标病毒单词中下一个未射击的字母
            const nextChar = targetVirus.word[targetVirus.lettersShot];
            
            if (nextChar && nextChar.toLowerCase() === currentChar) {
                // 计算角度
                const dx = targetVirus.position.x - cell.position.x;
                const dy = targetVirus.position.y - cell.position.y;
                const angle = Math.atan2(dy, dx);
                
                // 发射炮弹并设置目标病毒
                const projectile = createProjectile(angle);
                projectile.targetVirus = targetVirus;
                
                // 更新病毒的字母显示
                updateVirusLetters(targetVirus, targetVirus.lettersShot);
                
                // 确保目标病毒始终在最前面
                app.stage.removeChild(targetVirus);
                app.stage.addChild(targetVirus);
                
                console.log("Projectile fired at target virus:", targetVirus.word);
                
                // 如果所有字母都被射击，标记病毒为准备销毁状态，但不立即销毁
                if (targetVirus.lettersShot >= targetVirus.word.length) {
                    // 标记病毒为准备销毁状态
                    targetVirus.readyToDestroy = true;
                    
                    // 添加视觉效果表示病毒已被完全输入
                    markVirusAsCompleted(targetVirus);
                    
                    console.log("Target virus marked as ready to destroy!");
                    
                    // 重置目标病毒
                    targetVirus = null;
                }
            }
            // 如果输入不匹配当前目标病毒的下一个字母，则忽略输入
            else {
                console.log("Input does not match next letter of target virus");
            }
        }
        
        updateDebugInfo();
    });
    
    // Set up restart button
    document.getElementById('restart-button').addEventListener('click', restartGame);
}

// 重置所有病毒的高亮状态
function resetAllVirusHighlights() {
    for (const virus of viruses) {
        if (virus.isHighlighted) {
            // 恢复原始颜色
            const virusColor = getVirusColorForLevel(currentLevel);
            const virusBody = virus.getChildAt(1); // 病毒主体是第二个子元素
            virusBody.clear();
            drawVirusShape(virusBody, getVirusShapeForLevel(currentLevel), VIRUS_RADIUS, virusColor);
            
            // 恢复字母颜色
            const wordContainer = virus.wordContainer;
            for (let i = 0; i < wordContainer.children.length; i++) {
                wordContainer.children[i].style.fill = 0xFFFFFF;
            }
            
            virus.isHighlighted = false;
        }
    }
}

// 高亮显示目标病毒
function highlightVirus(virus) {
    // 设置病毒主体为高亮颜色
    const virusBody = virus.getChildAt(1); // 病毒主体是第二个子元素
    virusBody.clear();
    drawVirusShape(virusBody, getVirusShapeForLevel(currentLevel), VIRUS_RADIUS, 0x00FFFF);
    
    // 设置字母为红色
    const wordContainer = virus.wordContainer;
    for (let i = 0; i < wordContainer.children.length; i++) {
        wordContainer.children[i].style.fill = 0xffffff; // 红色
        wordContainer.children[i].style.stroke = 0xff0000;
        wordContainer.children[i].style.strokeThickness = 2;
    }
    
    // 将病毒移到显示列表的最前面
    // 先从舞台移除，再添加回去，这样会放在最上层
    app.stage.removeChild(virus);
    app.stage.addChild(virus);
    
    virus.isHighlighted = true;
    
    console.log("Virus brought to front:", virus.word);
}

// 更新病毒的字母显示
function updateVirusLetters(virus, letterIndex) {
    if (letterIndex < virus.wordContainer.children.length) {
        // 隐藏对应的字母
        virus.wordContainer.children[letterIndex].visible = false;
        virus.lettersShot++;
    }
}

// Destroy a virus and update score
function destroyVirus(virus) {
    // Remove from stage
    app.stage.removeChild(virus);
    
    // Remove from viruses array
    const index = viruses.indexOf(virus);
    if (index !== -1) {
        viruses.splice(index, 1);
    }
    
    // Play explosion sound
    playExplosionSound();
    
    // 计算得分（根据关卡和单词长度）
    const levelBonus = currentLevel * 5; // 关卡加成
    const wordScore = virus.word.length * 10; // 单词长度得分
    const pointsEarned = wordScore + levelBonus;
    
    // 更新总分
    score += pointsEarned;
    document.getElementById('score').textContent = score;
    
    // 显示得分动画
    showScorePopup(virus.position.x, virus.position.y, pointsEarned);
    
    // 更新已消灭的病毒数量
    virusesDestroyed++;
    
    // 检查是否所有病毒都被消灭
    if (viruses.length === 0) {
        // 检查是否已用完所有单词
        if (currentWordIndex >= WORD_LIST.length) {
            if (!allWordsCompleted) {
                allWordsCompleted = true;
                showGameCompletedMessage();
            }
        } else {
            levelUp();
        }
    }
    
    updateDebugInfo();
}

// 显示得分弹出动画
function showScorePopup(x, y, points) {
    const scoreText = new PIXI.Text(`+${points}`, {
        fontFamily: 'Arial',
        fontSize: 16,
        fontWeight: 'bold',
        fill: 0xFFFF00,
        align: 'center',
        stroke: 0x000000,
        strokeThickness: 3
    });
    
    scoreText.anchor.set(0.5);
    scoreText.position.set(x, y);
    
    app.stage.addChild(scoreText);
    
    // 使用GSAP创建动画
    gsap.to(scoreText, {
        y: y - 50,
        alpha: 0,
        duration: 1,
        ease: "power1.out",
        onComplete: () => {
            app.stage.removeChild(scoreText);
        }
    });
}

// Check for collisions between projectiles and viruses
function checkCollisions() {
    // Check each projectile against each virus
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const projectile = projectiles[i];
        
        // 检查与非目标病毒的碰撞
        for (let j = viruses.length - 1; j >= 0; j--) {
            const virus = viruses[j];
            
            // 如果病毒是目标病毒，跳过碰撞检测（已在输入处理中处理）
            if (virus === projectile.targetVirus) continue;
            
            // Calculate distance between projectile and virus
            const dx = projectile.position.x - virus.position.x;
            const dy = projectile.position.y - virus.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // If collision detected - use a more generous collision radius for smaller viruses
            const collisionThreshold = PROJECTILE_RADIUS + VIRUS_RADIUS * 2; // 调整碰撞范围
            
            if (distance < collisionThreshold) {
                // 计算击退方向（与炮弹运动方向相同）
                const knockbackAngle = Math.atan2(projectile.vy, projectile.vx);
                const knockbackDistance = 5; // 击退距离改为5像素
                const knockbackDuration = 0.3; // 击退动画持续时间
                
                // 计算击退目标位置
                const targetX = virus.position.x + Math.cos(knockbackAngle) * knockbackDistance;
                const targetY = virus.position.y + Math.sin(knockbackAngle) * knockbackDistance;
                
                // 创建击退动画
                gsap.to(virus.position, {
                    x: targetX,
                    y: targetY,
                    duration: knockbackDuration,
                    ease: "power2.out",
                    yoyo: true, // 反弹回原位
                    repeat: 1, // 重复一次（来回一次）
                });
                
                // Remove projectile
                app.stage.removeChild(projectile);
                projectiles.splice(i, 1);
                
                // Create explosion effect
                createExplosion(virus.position.x, virus.position.y);
                
                // 如果病毒已标记为准备销毁，且没有其他炮弹瞄准它，则销毁病毒
                if (virus.readyToDestroy && !hasTargetingProjectiles(virus)) {
                    // 销毁病毒
                    destroyVirus(virus);
                    console.log("Virus destroyed by non-targeting projectile after being marked ready!");
                } else if (!virus.readyToDestroy) {
                    // 如果病毒未标记为准备销毁，则直接销毁（保持原有行为）
                    destroyVirus(virus);
                    console.log("Collision detected! Virus destroyed by projectile.");
                }
                
                break;
            }
        }
    }
    
    // Check if any virus is too close to the cell
    for (const virus of viruses) {
        const dx = virus.position.x - cell.position.x;
        const dy = virus.position.y - cell.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < CELL_RADIUS + VIRUS_RADIUS + SAFE_DISTANCE) {
            console.log("Game over! Virus too close to cell.");
            endGame();
            break;
        }
    }
}

// Create explosion effect
function createExplosion(x, y) {
    const explosion = new PIXI.Container();
    explosion.position.set(x, y);
    
    // Play explosion sound
    playExplosionSound();
    
    // Inner explosion
    const inner = new PIXI.Graphics();
    inner.beginFill(0xFFEB3B, 0.9);
    inner.drawCircle(0, 0, VIRUS_RADIUS * 2.5);
    inner.endFill();
    
    // Outer explosion
    const outer = new PIXI.Graphics();
    outer.beginFill(0xFF5252, 0.5);
    outer.drawCircle(0, 0, VIRUS_RADIUS * 3.5);
    outer.endFill();
    
    // Particles
    const particles = [];
    const particleCount = 12; // 增加粒子数量
    
    for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2;
        const distance = VIRUS_RADIUS * 1.5 + Math.random() * VIRUS_RADIUS * 2;
        
        const particle = new PIXI.Graphics();
        particle.beginFill(0xFFF59D);
        particle.drawCircle(0, 0, 1.5 + Math.random() * 3); // 增加粒子大小
        particle.endFill();
        
        particle.position.set(
            Math.cos(angle) * distance,
            Math.sin(angle) * distance
        );
        
        particle.vx = Math.cos(angle) * (5 + Math.random() * 6); // 增加粒子速度
        particle.vy = Math.sin(angle) * (5 + Math.random() * 6); // 增加粒子速度
        
        explosion.addChild(particle);
        particles.push(particle);
    }
    
    // Add all parts to the explosion
    explosion.addChild(outer);
    explosion.addChild(inner);
    
    app.stage.addChild(explosion);
    
    // Animate explosion
    let scale = 1;
    let alpha = 1;
    
    const explodeInterval = setInterval(() => {
        scale += 0.25;
        alpha -= 0.1;
        
        inner.scale.set(scale * 0.8);
        outer.scale.set(scale);
        
        inner.alpha = alpha;
        outer.alpha = alpha * 0.7;
        
        // Update particles
        for (const particle of particles) {
            particle.position.x += particle.vx;
            particle.position.y += particle.vy;
            particle.alpha = alpha;
        }
        
        if (alpha <= 0) {
            clearInterval(explodeInterval);
            app.stage.removeChild(explosion);
        }
    }, 30);
}

// End the game
function endGame() {
    gameOver = true;
    
    // 清除定时器
    if (spawnTimer) {
        clearInterval(spawnTimer);
        spawnTimer = null;
    }
    
    // Stop background music
    if (bgMusicPlaying) {
        bgMusic.pause();
        bgMusic.currentTime = 0;
        bgMusicPlaying = false;
    }
    
    // 更新游戏结束界面
    document.getElementById('final-score').textContent = score;
    document.getElementById('final-level').textContent = currentLevel;
    document.getElementById('game-over').style.display = 'block';
    
    console.log(`Game over at level ${currentLevel} with score ${score}`);
}

// Restart the game
function restartGame() {
    console.log("Restarting game...");
    window.location.reload();
}

// Game loop
function gameLoop(delta) {
    // 每10帧记录一次，避免日志过多
    if (app.ticker.lastTime % 10 === 0) {
        console.log("gameLoop called, gameStarted:", gameStarted, "gameOver:", gameOver, "isPaused:", isPaused);
    }
    
    if (gameOver || isPaused) return;
    
    // 更新细胞的呼吸效果 - 无论游戏是否开始都应用
    updateCellBreathing(delta);
    
    // 只有在游戏开始后才更新游戏逻辑
    if (gameStarted) {
        // 更新病毒
        updateViruses(delta);
        
        // 更新投射物
        updateProjectiles(delta);
        
        // 检查碰撞
        checkCollisions();
        
        // 检查游戏结束条件
        checkGameOver();
    }
}

// 更新细胞的呼吸效果
function updateCellBreathing(delta) {
    if (!cell) return;
    
    // 计算呼吸效果的缩放因子
    const time = Date.now() * 0.001;
    const breathScale = 1 + Math.sin(time * BREATHING_SPEED * 10) * 0.08;
    
    // 应用缩放效果到细胞
    if (cell.children.length > 1) {
        // 只对细胞精灵应用缩放，不影响光晕
        cell.children[1].scale.set(
            breathScale * ((CELL_RADIUS * 2) / Math.max(cell.children[1].texture.width, cell.children[1].texture.height))
        );
    }
}

// Clear all viruses
function clearAllViruses() {
    for (const virus of viruses) {
        app.stage.removeChild(virus);
    }
    viruses = [];
    updateDebugInfo();
}

// 应用难度设置
function applyDifficultySettings() {
    switch(difficulty) {
        case 'easy':
            // 简单模式：病毒速度慢，生成间隔长
            VIRUS_SPEED = 0.1;
            SPAWN_INTERVAL = 5000;
            VIRUSES_FIRST_LEVEL = 3;
            VIRUSES_INCREMENT = 1;
            break;
        case 'normal':
            // 正常模式：默认设置
            VIRUS_SPEED = 0.15;
            SPAWN_INTERVAL = 4000;
            VIRUSES_FIRST_LEVEL = 4;
            VIRUSES_INCREMENT = 2;
            break;
        case 'hard':
            // 困难模式：病毒速度快，生成间隔短
            VIRUS_SPEED = 0.2;
            SPAWN_INTERVAL = 3000;
            VIRUSES_FIRST_LEVEL = 5;
            VIRUSES_INCREMENT = 3;
            break;
    }
}

// 设置暂停键监听
function setupPauseListener() {
    window.addEventListener('keydown', function(e) {
        // 按下 ESC 键暂停/继续游戏
        if (e.key === 'Escape' && !gameOver && gameStarted) {
            togglePause();
        }
    });
}

// 切换暂停状态
function togglePause() {
    isPaused = !isPaused;
    
    if (isPaused) {
        // 显示暂停界面
        showPauseScreen();
        // 停止游戏循环
        app.ticker.stop();
        // Pause background music
        if (bgMusicPlaying) {
            bgMusic.pause();
        }
    } else {
        // 隐藏暂停界面
        hidePauseScreen();
        // 恢复游戏循环
        app.ticker.start();
        // Resume background music if it was playing
        if (bgMusicPlaying && !isMuted) {
            bgMusic.play().catch(error => {
                console.error("Error resuming background music:", error);
            });
        }
    }
}

// 显示暂停界面
function showPauseScreen() {
    // 创建暂停界面容器
    pauseScreen = new PIXI.Container();
    pauseScreen.position.set(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    
    // 背景
    const background = new PIXI.Graphics();
    background.beginFill(0x000000, 0.7);
    background.drawRoundedRect(-200, -150, 400, 300, 20);
    background.endFill();
    
    // 暂停标题
    const pauseText = new PIXI.Text('GAME PAUSED', {
        fontFamily: 'Arial',
        fontSize: 36,
        fontWeight: 'bold',
        fill: 0xFFFFFF,
        align: 'center',
        stroke: 0x000000,
        strokeThickness: 5
    });
    pauseText.anchor.set(0.5);
    pauseText.position.set(0, -80);
    
    // 继续提示
    const continueText = new PIXI.Text('Press ESC to continue', {
        fontFamily: 'Arial',
        fontSize: 20,
        fill: 0xFFFFFF,
        align: 'center'
    });
    continueText.anchor.set(0.5);
    continueText.position.set(0, 0);
    
    // 当前状态
    const statsText = new PIXI.Text(`Level: ${currentLevel}   Score: ${score}`, {
        fontFamily: 'Arial',
        fontSize: 18,
        fill: 0xFFFFFF,
        align: 'center'
    });
    statsText.anchor.set(0.5);
    statsText.position.set(0, 50);
    
    // 添加到容器
    pauseScreen.addChild(background);
    pauseScreen.addChild(pauseText);
    pauseScreen.addChild(continueText);
    pauseScreen.addChild(statsText);
    
    // 添加到舞台
    app.stage.addChild(pauseScreen);
    
    // 添加闪烁动画
    gsap.to(continueText, {
        alpha: 0.3,
        duration: 0.8,
        repeat: -1,
        yoyo: true
    });
}

// 隐藏暂停界面
function hidePauseScreen() {
    if (pauseScreen) {
        app.stage.removeChild(pauseScreen);
        pauseScreen = null;
    }
}

// 处理窗口大小变化
function handleResize() {
    // 更新游戏尺寸
    GAME_WIDTH = window.innerWidth;
    GAME_HEIGHT = window.innerHeight;
    
    // 调整渲染器大小
    app.renderer.resize(GAME_WIDTH, GAME_HEIGHT);
    
    // 重新定位细胞
    if (cell) {
        cell.x = GAME_WIDTH / 2;
        cell.y = GAME_HEIGHT - CELL_RADIUS * 2;
    }
    
    // 更新关卡显示位置
    if (levelDisplay) {
        levelDisplay.position.set(GAME_WIDTH / 2, 30);
    }
}

// 更新病毒位置和状态
function updateViruses(delta) {
    console.log("updateViruses called, viruses count:", viruses.length);
    
    for (const virus of viruses) {
        // 移动病毒朝向细胞
        const dx = cell.position.x - virus.position.x;
        const dy = cell.position.y - virus.position.y;
        const angle = Math.atan2(dy, dx);
        
        const oldX = virus.position.x;
        const oldY = virus.position.y;
        
        virus.position.x += Math.cos(angle) * virus.speed * delta;
        virus.position.y += Math.sin(angle) * virus.speed * delta;
        
        // 只为第一个病毒记录位置变化，避免日志过多
        if (virus === viruses[0]) {
            console.log("First virus moved from", 
                        {x: oldX.toFixed(2), y: oldY.toFixed(2)}, 
                        "to", 
                        {x: virus.position.x.toFixed(2), y: virus.position.y.toFixed(2)},
                        "speed:", virus.speed,
                        "delta:", delta);
        }
        
        // 更新呼吸效果
        virus.breathingFactor += BREATHING_SPEED * virus.breathingDirection;
        if (virus.breathingFactor >= 1) {
            virus.breathingFactor = 1;
            virus.breathingDirection = -1;
        } else if (virus.breathingFactor <= 0) {
            virus.breathingFactor = 0;
            virus.breathingDirection = 1;
        }
        
        // 应用呼吸效果到病毒大小
        const breathingScale = 1 + virus.breathingFactor * 0.1;
        virus.scale.set(breathingScale);
    }
    
    updateDebugInfo();
}

// 更新投射物位置
function updateProjectiles(delta) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const projectile = projectiles[i];
        
        // 移动投射物
        projectile.position.x += projectile.vx * delta;
        projectile.position.y += projectile.vy * delta;
        
        // 检查是否有目标病毒，并检测碰撞
        if (projectile.targetVirus && viruses.includes(projectile.targetVirus)) {
            const dx = projectile.position.x - projectile.targetVirus.position.x;
            const dy = projectile.position.y - projectile.targetVirus.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // 如果碰撞到目标病毒
            const collisionThreshold = PROJECTILE_RADIUS + VIRUS_RADIUS * 2; // 调整碰撞范围
            if (distance < collisionThreshold) {
                // 计算击退方向（与炮弹运动方向相同）
                const knockbackAngle = Math.atan2(projectile.vy, projectile.vx);
                const knockbackDistance = 5; // 击退距离改为5像素
                const knockbackDuration = 0.3; // 击退动画持续时间
                
                // 计算击退目标位置
                const targetX = projectile.targetVirus.position.x + Math.cos(knockbackAngle) * knockbackDistance;
                const targetY = projectile.targetVirus.position.y + Math.sin(knockbackAngle) * knockbackDistance;
                
                // 创建击退动画
                gsap.to(projectile.targetVirus.position, {
                    x: targetX,
                    y: targetY,
                    duration: knockbackDuration,
                    ease: "power2.out",
                    yoyo: true, // 反弹回原位
                    repeat: 1, // 重复一次（来回一次）
                });
                
                // 创建爆炸效果
                createExplosion(projectile.targetVirus.position.x, projectile.targetVirus.position.y);
                
                // 获取当前病毒
                const hitVirus = projectile.targetVirus;
                
                // 移除炮弹
                app.stage.removeChild(projectile);
                projectiles.splice(i, 1);
                
                // 如果病毒已标记为准备销毁，且没有其他炮弹瞄准它，则销毁病毒
                if (hitVirus.readyToDestroy && !hasTargetingProjectiles(hitVirus)) {
                    // 销毁病毒
                    destroyVirus(hitVirus);
                    console.log("Target virus destroyed after all projectiles hit!");
                    
                    // 重置目标病毒
                    if (targetVirus === hitVirus) {
                        targetVirus = null;
                    }
                }
                
                continue; // 跳过当前炮弹的其他检测
            }
        }
        
        // 检查是否超出屏幕边界
        if (
            projectile.position.x < -PROJECTILE_RADIUS * 2 ||
            projectile.position.x > GAME_WIDTH + PROJECTILE_RADIUS * 2 ||
            projectile.position.y < -PROJECTILE_RADIUS * 2 ||
            projectile.position.y > GAME_HEIGHT + PROJECTILE_RADIUS * 2
        ) {
            // 移除超出屏幕的投射物
            app.stage.removeChild(projectile);
            projectiles.splice(i, 1);
            
            // 如果这个炮弹有目标病毒，检查该病毒是否准备销毁且没有其他炮弹瞄准它
            if (projectile.targetVirus && 
                viruses.includes(projectile.targetVirus) && 
                projectile.targetVirus.readyToDestroy && 
                !hasTargetingProjectiles(projectile.targetVirus)) {
                // 销毁病毒
                destroyVirus(projectile.targetVirus);
                console.log("Target virus destroyed after projectile went off-screen!");
            }
        }
    }
}

// 检查游戏结束条件
function checkGameOver() {
    // 如果没有病毒且游戏未结束，可能需要生成更多病毒
    if (viruses.length === 0 && !gameOver) {
        // 检查是否已用完所有单词
        if (currentWordIndex >= WORD_LIST.length && !allWordsCompleted) {
            allWordsCompleted = true;
            showGameCompletedMessage();
        }
    }
    
    // 检查是否有准备销毁的病毒，但没有炮弹瞄准它们
    for (const virus of viruses) {
        if (virus.readyToDestroy && !hasTargetingProjectiles(virus)) {
            // 销毁病毒
            destroyVirus(virus);
            console.log("Virus destroyed during game over check - no projectiles targeting it!");
        }
    }
}

// 检查是否有炮弹正在瞄准指定的病毒
function hasTargetingProjectiles(virus) {
    for (const projectile of projectiles) {
        if (projectile.targetVirus === virus) {
            return true;
        }
    }
    return false;
}

// 标记病毒为已完成状态的视觉效果
function markVirusAsCompleted(virus) {
    // 添加一个闪烁效果
    gsap.to(virus, {
        alpha: 0.7,
        duration: 0.3,
        repeat: 3,
        yoyo: true
    });
    
    // 改变病毒颜色为灰色，表示已完成但等待炮弹命中
    const virusBody = virus.getChildAt(1); // 病毒主体是第二个子元素
    virusBody.clear();
    drawVirusShape(virusBody, getVirusShapeForLevel(currentLevel), VIRUS_RADIUS, 0x888888);
    
    // 确保已完成的病毒仍然在最前面
    app.stage.removeChild(virus);
    app.stage.addChild(virus);
}

// 显示游戏通关消息
function showGameCompletedMessage() {
    const completionContainer = new PIXI.Container();
    completionContainer.position.set(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    
    // 背景
    const background = new PIXI.Graphics();
    background.beginFill(0x000000, 0.8);
    background.drawRoundedRect(-250, -150, 500, 300, 20);
    background.endFill();
    
    // 主标题
    const titleText = new PIXI.Text('恭喜通关!', {
        fontFamily: 'Arial',
        fontSize: 48,
        fontWeight: 'bold',
        fill: 0xFFFF00,
        align: 'center',
        stroke: 0x000000,
        strokeThickness: 6
    });
    titleText.anchor.set(0.5);
    titleText.position.set(0, -70);
    
    // 副标题
    const subtitleText = new PIXI.Text(`你已完成所有 ${WORD_LIST.length} 个单词!`, {
        fontFamily: 'Arial',
        fontSize: 24,
        fill: 0xFFFFFF,
        align: 'center'
    });
    subtitleText.anchor.set(0.5);
    subtitleText.position.set(0, -10);
    
    // 得分
    const scoreText = new PIXI.Text(`最终得分: ${score}`, {
        fontFamily: 'Arial',
        fontSize: 32,
        fill: 0x4CAF50,
        align: 'center'
    });
    scoreText.anchor.set(0.5);
    scoreText.position.set(0, 50);
    
    // 添加到容器
    completionContainer.addChild(background);
    completionContainer.addChild(titleText);
    completionContainer.addChild(subtitleText);
    completionContainer.addChild(scoreText);
    
    // 添加到舞台
    app.stage.addChild(completionContainer);
    
    // 设置初始状态
    completionContainer.alpha = 0;
    completionContainer.scale.set(0.5);
    
    // 使用GSAP动画库创建动画效果
    gsap.to(completionContainer, {
        alpha: 1,
        scale: 1,
        duration: 0.8,
        ease: "back.out(1.7)"
    });
    
    // 游戏结束
    gameOver = true;
    
    // 清除定时器
    if (spawnTimer) {
        clearInterval(spawnTimer);
        spawnTimer = null;
    }
    
    // 显示重新开始按钮
    const restartButton = new PIXI.Text('重新开始', {
        fontFamily: 'Arial',
        fontSize: 24,
        fontWeight: 'bold',
        fill: 0xFFFFFF,
        align: 'center',
        stroke: 0x000000,
        strokeThickness: 3
    });
    restartButton.anchor.set(0.5);
    restartButton.position.set(0, 120);
    restartButton.interactive = true;
    restartButton.buttonMode = true;
    
    // 修改点击事件为刷新页面
    restartButton.on('pointerdown', () => {
        window.location.reload();
    });
    
    // 添加到容器
    completionContainer.addChild(restartButton);
}

// 从API获取单词列表
function fetchWordList() {
    console.log("Fetching word list from API...");
    
    // 显示加载提示
    const startScreen = document.getElementById('start-screen');
    const loadingText = document.createElement('p');
    loadingText.id = 'loading-text';
    loadingText.textContent = '正在加载单词列表...';
    loadingText.style.color = '#FFFFFF';
    startScreen.appendChild(loadingText);
    
    // 禁用开始游戏
    const spacePrompt = document.getElementById('space-prompt');
    if (spacePrompt) {
        spacePrompt.style.display = 'none';
    }
    
    // 构建API URL (8080端口)
    const apiUrl = `${API_BASE_URL}/typing/lesson/random-vocabulary`;
    console.log(`Fetching words from: ${apiUrl}`);
    
    // 设置超时
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 5000);
    });
    
    // 尝试使用form-urlencoded POST请求获取数据
    Promise.race([
        fetchWithFormData(apiUrl)
            .catch(error => {
                console.warn("Failed to fetch from port 8080, trying current port:", error);
                
                // 尝试使用当前页面的端口
                const currentUrl = window.location.href;
                const urlObj = new URL(currentUrl);
                const currentPortApiUrl = `${urlObj.protocol}//${urlObj.hostname}:${urlObj.port}/typing/lesson/random-vocabulary`;
                
                console.log(`Trying current port API URL: ${currentPortApiUrl}`);
                return fetchWithFormData(currentPortApiUrl);
            }),
        timeoutPromise
    ])
    .catch(error => {
        console.warn("All fetch attempts failed or timed out, using default word list:", error);
        return useDefaultWordList();
    })
    .catch(error => {
        // 最终的错误处理，确保游戏可以启动
        console.error("Critical error in word list fetching:", error);
        console.warn("Using emergency default word list to ensure game can start");
        
        // 使用紧急默认单词列表
        WORD_LIST = [
            'error', 'fallback', 'default', 'emergency', 'backup', 'system',
            'retry', 'later', 'simple', 'basic', 'test', 'demo'
        ];
        
        // 重置单词索引
        currentWordIndex = 0;
        allWordsCompleted = false;
        
        // 更新UI
        updateWordListUI(false);
        
        // 启用开始游戏
        const spacePrompt = document.getElementById('space-prompt');
        if (spacePrompt) {
            spacePrompt.style.display = 'block';
        }
    });
}

// 使用form-urlencoded方式获取数据
function fetchWithFormData(url) {
    console.log(`Making POST request to: ${url}`);
    
    return fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: 'action=get_vocabulary'
    })
    .then(response => {
        console.log(`Response status: ${response.status} ${response.statusText}`);
        return handleResponse(response);
    })
    .catch(error => {
        console.error(`Error in fetchWithFormData for ${url}:`, error);
        throw error;
    });
}

// 处理响应
function handleResponse(response) {
    if (!response.ok) {
        const errorMsg = `Network response was not ok: ${response.status} ${response.statusText}`;
        console.error(errorMsg);
        throw new Error(errorMsg);
    }
    
    return response.json()
        .then(data => {
            console.log("Word list fetched successfully:", data);
            
            if (data.errno === 0 && Array.isArray(data.data)) {
                // 保存获取的单词列表
                WORD_LIST = data.data;
                console.log(`Loaded ${WORD_LIST.length} words from API`);
                
                // 重置单词索引
                currentWordIndex = 0;
                allWordsCompleted = false;
                
                // 更新UI
                updateWordListUI(true);
                
                return data;
            } else {
                const errorMsg = `Invalid data format from API: ${JSON.stringify(data)}`;
                console.error(errorMsg);
                throw new Error(errorMsg);
            }
        })
        .catch(error => {
            console.error("Error parsing JSON response:", error);
            throw error;
        });
}

// 使用默认单词列表
function useDefaultWordList() {
    console.log("Using default word list");
    
    // 使用默认单词列表
    WORD_LIST = [
        'virus', 'cell', 'dna', 'rna', 'protein', 'bacteria', 'immune', 'vaccine',
        'health', 'disease', 'infection', 'pathogen', 'microbe', 'antibody', 'antigen',
        'fever', 'symptom', 'cure', 'treatment', 'medicine', 'doctor', 'hospital',
        'science', 'biology', 'chemistry', 'research', 'laboratory', 'experiment'
    ];
    
    // 重置单词索引
    currentWordIndex = 0;
    allWordsCompleted = false;
    
    // 更新UI
    updateWordListUI(false);
    
    return Promise.resolve({ errno: 0, data: WORD_LIST });
}

// 更新单词列表UI
function updateWordListUI(success) {
    const startScreen = document.getElementById('start-screen');
    
    // 移除加载提示
    const loadingText = document.getElementById('loading-text');
    if (loadingText) {
        startScreen.removeChild(loadingText);
    }
    
    // 移除可能存在的错误或单词数量文本
    const errorText = document.getElementById('error-text');
    if (errorText) {
        startScreen.removeChild(errorText);
    }
    
    const wordCountText = document.getElementById('word-count-text');
    if (wordCountText) {
        startScreen.removeChild(wordCountText);
    }
    
    // 添加适当的文本
    if (success) {
    } else {
        // 显示错误信息
        const newErrorText = document.createElement('p');
        newErrorText.id = 'error-text';
        newErrorText.textContent = '无法加载单词列表，使用默认单词';
        newErrorText.style.color = '#FF5252';
        startScreen.appendChild(newErrorText);
    }
    
    // 启用开始游戏
    const spacePrompt = document.getElementById('space-prompt');
    if (spacePrompt) {
        spacePrompt.style.display = 'block';
    }
}

// 在游戏初始化时调用
window.onload = function() {
    // 更新游戏尺寸
    GAME_WIDTH = window.innerWidth;
    GAME_HEIGHT = window.innerHeight;
    
    // 初始化游戏
    init();
    
    // 设置调试面板
    setupDebugPanel();
    
    // 默认隐藏调试面板
    const debugPanel = document.getElementById('debug-panel');
    if (debugPanel) {
        debugPanel.style.display = 'none';
    }
};

// 设置调试面板
function setupDebugPanel() {
    const toggleButton = document.getElementById('toggle-debug');
    const debugPanel = document.getElementById('debug-panel');
    const spawnButton = document.getElementById('spawn-virus');
    const clearButton = document.getElementById('clear-viruses');
    
    toggleButton.addEventListener('click', () => {
        debugMode = !debugMode;
        debugPanel.style.display = debugMode ? 'block' : 'none';
        updateDebugInfo();
    });
    
    // Add spawn virus button functionality
    spawnButton.addEventListener('click', () => {
        spawnVirus();
        console.log("Manually spawned a virus");
    });
    
    // Add clear viruses button functionality
    clearButton.addEventListener('click', () => {
        clearAllViruses();
        console.log("Cleared all viruses");
    });
}