class DuckJumpGame {
    constructor() {
        // 获取窗口大小
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        this.app = new PIXI.Application({
            width: windowWidth,
            height: windowHeight,
            backgroundColor: 0x87CEEB,
            resizeTo: window, // 自动调整大小以适应窗口
        });
        document.body.appendChild(this.app.view);
        
        // 设置画布样式
        this.app.view.style.position = 'absolute';
        this.app.view.style.left = '0';
        this.app.view.style.top = '0';
        
        // 创建游戏容器，用于实现摄像机效果
        this.gameContainer = new PIXI.Container();
        this.app.stage.addChild(this.gameContainer);
        
        this.gameState = 'START'; // START, PLAYING, END, LEVEL_COMPLETE
        this.currentLevel = 1; // 当前关卡
        this.wordsPerLevel = 10; // 每关10个单词
        this.allWords = []; // 存储所有获取的单词
        this.words = []; // 当前关卡的单词
        this.currentWordIndex = 0;
        this.currentCharIndex = 0;
        this.currentInput = '';
        this.blocks = [];
        this.characterStates = [];
        this.isWaitingForReset = false;
        this.hasStartedJumping = false;
        this.cameraTargetX = 0;
        this.isFirstJump = true;
        
        // 关卡难度设置
        this.blockFallDelay = 8000; // 初始掉落延迟(ms)
        this.blockFallDuration = 2000; // 掉落动画持续时间(ms)
        this.fallDelayDecrement = 500; // 每关减少的延迟时间(ms)
        
        // 音效系统
        this.sounds = {
            bgm: null,
            jump: null,
            miss: null,
            splash: null // 添加落水音效
        };

        // 创建音频上下文
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // 监听窗口大小变化
        window.addEventListener('resize', this.onResize.bind(this));
        
        // 加载 GSAP 库
        this.loadGSAP().then(() => {
            // 先获取单词列表，然后再加载资源
            this.fetchWordList().then(() => {
                this.loadAssets();
            });
        });
    }

    // 加载 GSAP 库
    async loadGSAP() {
        return new Promise((resolve, reject) => {
            if (window.gsap) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    onResize() {
        // 更新背景大小
        if (this.background) {
            this.background.width = window.innerWidth;
            this.background.height = window.innerHeight;
        }
        // 更新水面大小
        if (this.water) {
            this.water.width = window.innerWidth;
            this.water.y = window.innerHeight - 100;
        }
    }

    async loadSound(url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            return audioBuffer;
        } catch (error) {
            console.error('Error loading sound:', error);
            return null;
        }
    }

    playSound(audioBuffer, loop = false) {
        if (!audioBuffer || !this.audioContext) return;
        
        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.loop = loop;
        source.connect(this.audioContext.destination);
        source.start(0);
        return source;
    }

    async loadAssets() {
        // 加载所有需要的资源
        const manifest = {
            bundles: [{
                name: 'game-bundle',
                assets: [
                    {
                        name: 'background',
                        srcs: 'assets/Images/happjumpbg.png'
                    },
                    {
                        name: 'cloud',
                        srcs: 'assets/Images/clound.png'
                    },
                    {
                        name: 'tree',
                        srcs: 'assets/Images/tree.png'
                    },
                    {
                        name: 'panel_bg',
                        srcs: 'assets/Images/panel_bg.png'
                    },
                    {
                        name: 'btn_normal',
                        srcs: 'assets/Images/btn_normal.png'
                    },
                    {
                        name: 'btn_hover',
                        srcs: 'assets/Images/btn_hove.png'
                    },
                    // 加载鸭子空闲状态的序列帧
                    ...[...Array(8)].map((_, i) => ({
                        name: `duck_idle_${(i + 1).toString().padStart(2, '0')}`,
                        srcs: `assets/Images/duck/idle/duck_idle_${(i + 1).toString().padStart(2, '0')}.png`
                    })),
                    // 加载鸭子跳跃状态的序列帧
                    ...[...Array(12)].map((_, i) => ({
                        name: `duck_jump_${(i + 1).toString().padStart(2, '0')}`,
                        srcs: `assets/Images/duck/jump/duck_jump_${(i + 1).toString().padStart(2, '0')}.png`
                    })),
                    {
                        name: 'block1',
                        srcs: 'assets/Images/block_1.png'
                    },
                    {
                        name: 'block2',
                        srcs: 'assets/Images/block_2.png'
                    },
                    {
                        name: 'block3',
                        srcs: 'assets/Images/block_3.png'
                    },
                    {
                        name: 'block4',
                        srcs: 'assets/Images/block_4.png'
                    },
                    {
                        name: 'bridge',
                        srcs: 'assets/Images/bridge.png'
                    },
                    {
                        name: 'water',
                        srcs: 'assets/Images/water.png'
                    },
                    {
                        name: 'start_point',
                        srcs: 'assets/Images/start_point.png'
                    }
                ]
            }]
        };

        // 初始化资源加载器
        await PIXI.Assets.init({ manifest });

        try {
            // 加载资源包
            const bundle = await PIXI.Assets.loadBundle('game-bundle', (progress) => {
                console.log(`Loading progress: ${Math.round(progress * 100)}%`);
            });
            
            // 加载音效
            await this.initSounds();
            
            // 资源加载完成后设置游戏
            this.setup();
        } catch (error) {
            console.error('Error loading assets:', error);
        }
    }

    async initSounds() {
        // 初始化音效
        this.sounds.bgm = await this.loadSound('assets/Sounds/bgm.mp3');
        this.sounds.jump = await this.loadSound('assets/Sounds/jump.mp3');
        this.sounds.miss = await this.loadSound('assets/Sounds/miss.mp3');
        this.sounds.splash = null; // splash.mp3 missing on daziya mirror, omit
        
        // 存储BGM的音源节点
        this.bgmSource = null;
    }

    setup() {
        this.createBackground();
        //this.createClouds();
        this.createGround();
        
        // 初始化游戏容器位置
        this.gameContainer.x = 0;
        
        this.createStartScreen();
        this.setupKeyboardListeners();
        this.setupDuckAnimations();
    }

    createBackground() {
        // 创建背景
        this.background = new PIXI.TilingSprite(
            PIXI.Assets.get('background'),
            window.innerWidth * 6,
            window.innerHeight
        );
        this.gameContainer.addChild(this.background);

    }

    createClouds() {
        // 添加装饰性的云朵，分布在更大的范围内
        const cloudPositions = [
            { x: 100, y: 80 },
            { x: 300, y: 120 },
            { x: 500, y: 60 },
            { x: 700, y: 100 },
            { x: 900, y: 90 },
            { x: 1200, y: 70 },
            { x: 1500, y: 110 },
            { x: 1800, y: 85 }
        ];

        cloudPositions.forEach(pos => {
            const cloud = new PIXI.Sprite(PIXI.Assets.get('cloud'));
            cloud.width = 100;
            cloud.height = 60;
            cloud.x = pos.x;
            cloud.y = pos.y;
            this.gameContainer.addChild(cloud);
        });
    }

    createGround() {
        // 创建起始陆地
        const startGround = new PIXI.Sprite(PIXI.Assets.get('block3'));
        startGround.width = 542;
        startGround.height = 271;
        startGround.x = 0;
        startGround.y = this.app.screen.height - 200;
        this.gameContainer.addChild(startGround);

        // 创建起始平台装饰
        const startPlatform = new PIXI.Sprite(PIXI.Assets.get('start_point'));
        startPlatform.width = 100;
        startPlatform.height = 100;
        startPlatform.x = 75;
        startPlatform.y = startGround.y - 90;
        this.gameContainer.addChild(startPlatform);

        // 添加树
        const tree = new PIXI.Sprite(PIXI.Assets.get('tree'));
        tree.width = 150;  // 调整树的大小
        tree.height = 200;
        tree.x = 300;      // 将树放在起始陆地的右侧
        tree.y = startGround.y - tree.height ;  // 调整树的位置，让树根部在地面上
        this.gameContainer.addChild(tree);

        // 保存起始陆地的位置信息
        this.startGroundY = startGround.y;

        // 创建终点陆地
        const endGround = new PIXI.Sprite(PIXI.Assets.get('block3'));
        endGround.width = 542;
        endGround.height = 271;
        // 将终点陆地放在最后一个方块之后
        const lastBlockX = 630 + (this.words.length - 1) * 400;
        endGround.x = lastBlockX + 300; // 调整终点陆地位置，更靠近最后一个方块
        endGround.y = this.app.screen.height - 200;
        this.gameContainer.addChild(endGround);

        // 创建终点平台装饰
        const endPlatform = new PIXI.Sprite(PIXI.Assets.get('start_point'));
        endPlatform.width = 100;
        endPlatform.height = 100;
        endPlatform.x = endGround.x + 75;
        endPlatform.y = endGround.y - 90;
        this.gameContainer.addChild(endPlatform);

        // 保存终点陆地的信息
        this.endGround = {
            x: endGround.x + 200,
            y: endGround.y - 130
        };

        // 创建水面
        this.water = new PIXI.TilingSprite(
            PIXI.Assets.get('water'),
            window.innerWidth * 6,
            100
        );
        this.water.y = window.innerHeight - 50;
        this.gameContainer.addChild(this.water);
    }

    createStartScreen() {
        this.startText = new PIXI.Text('按空格开始游戏', {
            fontFamily: 'Arial',
            fontSize: 36,
            fill: 0x000000,
            align: 'center',
        });
        this.startText.anchor.set(0.5);
        this.startText.x = this.app.screen.width / 2;
        this.startText.y = this.app.screen.height / 2;
        this.app.stage.addChild(this.startText);
    }

    setupKeyboardListeners() {
        window.addEventListener('keydown', (e) => {
            const isSpaceKey = e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar';
            if (isSpaceKey) {
                e.preventDefault();
            }

            if (this.gameState === 'START' && isSpaceKey) {
                this.startGame();
            } else if (this.gameState === 'PLAYING') {
                if (e.key === 'Backspace') {
                    if (this.currentCharIndex > 0 && !this.isWaitingForReset) {
                        this.currentCharIndex--;
                        this.currentInput = this.currentInput.slice(0, -1);
                        this.updateCharacterDisplay();
                    }
                } else if (e.key.length === 1 && !this.isWaitingForReset) {
                    this.checkCharacter(e.key);
                }
            }
        });
    }

    startGame() {
        this.gameState = 'PLAYING';
        this.app.stage.removeChild(this.startText);
        
        // 开始播放背景音乐
        if (this.sounds.bgm) {
            // 确保先恢复 AudioContext
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            this.bgmSource = this.playSound(this.sounds.bgm, true);
        }

        // 创建关卡显示
        this.levelText = new PIXI.Text(`第 ${this.currentLevel} 关`, {
            fontFamily: 'Arial',
            fontSize: 36,
            fill: 0x000000,
            align: 'center',
            fontWeight: 'bold',
            stroke: 0xFFFFFF,
            strokeThickness: 4
        });
        this.levelText.x = 20;
        this.levelText.y = 20;
        this.app.stage.addChild(this.levelText);

        // 创建倒计时显示
        this.timerText = new PIXI.Text('', {
            fontFamily: 'Arial',
            fontSize: 24,
            fill: 0xFF0000,
            align: 'center',
            fontWeight: 'bold',
            stroke: 0xFFFFFF,
            strokeThickness: 4
        });
        this.timerText.x = 20;
        this.timerText.y = 70;
        this.app.stage.addChild(this.timerText);

        this.createGameElements();
    }

    createGameElements() {
        // 创建木块和单词
        this.words.forEach((word, index) => {
            let blockTexture;
            if (index % 4 === 1) { // house 使用木箱子贴图
                blockTexture = PIXI.Assets.get('block4');
            } else { // 其他使用草地贴图
                blockTexture = PIXI.Assets.get('block2');
            }

            const block = new PIXI.Sprite(blockTexture);
            
            // 调整不同类型方块的大小
            if (index % 4 === 1) {
                block.width = 300;
                block.height = 75;
            } else {
                block.width = 300;
                block.height = 75;
            }

            // 调整方块位置
            block.x = 630 + index * 400;
            // 添加随机上下浮动，范围在-50到50之间
            block.y = this.app.screen.height - 300 + Math.floor(Math.random() * 101) - 50;
            this.gameContainer.addChild(block);

            // 创建字符容器
            const wordContainer = new PIXI.Container();
            wordContainer.x = block.x + block.width / 2;
            wordContainer.y = block.y - 40;
            this.gameContainer.addChild(wordContainer);

            // 为每个字符创建单独的文本对象
            const characters = word.split('');
            let totalWidth = 0;
            const charObjects = characters.map((char, charIndex) => {
                const charContainer = new PIXI.Container();
                
                // 创建背景
                const background = new PIXI.Graphics();
                background.beginFill(0xFFFFFF, 0.8);
                background.drawRect(0, 0, 30, 40);
                background.endFill();
                charContainer.addChild(background);

                // 创建文本
                const text = new PIXI.Text(char, {
                    fontFamily: 'Arial',
                    fontSize: 32,
                    fill: 0x000000
                });
                text.anchor.set(0.5);
                text.x = 15;
                text.y = 20;
                charContainer.addChild(text);

                // 设置字符容器位置
                charContainer.x = totalWidth;
                totalWidth += 32; // 30px宽度 + 2px间距

                return {
                    container: charContainer,
                    background,
                    text,
                    char
                };
            });

            // 调整整个单词容器的位置使其居中
            wordContainer.x -= totalWidth / 2;
            charObjects.forEach(obj => wordContainer.addChild(obj.container));

            // 保存到状态中
            this.characterStates[index] = {
                word,
                characters: charObjects,
                container: wordContainer,
                completed: false
            };

            const blockInfo = { 
                block, 
                wordContainer,
                word,
                charObjects,
                timer: null, // 添加计时器属性
                countdownStarted: false // 添加标记表示是否已开始倒计时
            };
            
            this.blocks.push(blockInfo);

            // 记录最后一个方块的位置
            if (index === this.words.length - 1) {
                this.lastBlockX = block.x + block.width;
            }
        });

        // 设置游戏循环
        this.app.ticker.add(() => {
            this.updateCamera();
        });
    }

    setupDuckAnimations() {
        // 创建空闲动画纹理数组
        this.idleTextures = [...Array(8)].map((_, i) => 
            PIXI.Assets.get(`duck_idle_${(i + 1).toString().padStart(2, '0')}`)
        );

        // 创建跳跃动画纹理数组
        this.jumpTextures = [...Array(12)].map((_, i) => 
            PIXI.Assets.get(`duck_jump_${(i + 1).toString().padStart(2, '0')}`)
        );

        // 创建动画精灵
        this.duck = new PIXI.AnimatedSprite(this.idleTextures);
        this.duck.animationSpeed = 0.2;
        this.duck.width = 100;
        this.duck.height = 138;
        this.duck.x = 200; // 调整鸭子的初始位置
        this.duck.y = this.startGroundY - this.duck.height + 20;
        this.duck.play();

        // 将鸭子添加到游戏容器
        this.gameContainer.addChild(this.duck);
    }

    checkCharacter(inputChar) {
        const currentBlock = this.blocks[this.currentWordIndex];
        if (!currentBlock) return;

        const currentWord = currentBlock.word;
        const charObjects = currentBlock.charObjects;
        
        // 检查当前字符
        if (this.currentCharIndex < currentWord.length) {
            const isCorrect = inputChar === currentWord[this.currentCharIndex];
            const charObj = charObjects[this.currentCharIndex];

            if (isCorrect) {
                // 字符正确
                charObj.background.clear();
                charObj.background.beginFill(0x00FF00, 0.8);
                charObj.background.drawRect(0, 0, 30, 40);
                charObj.background.endFill();

                this.currentInput += inputChar;
                this.currentCharIndex++;

                // 检查是否完成整个单词
                if (this.currentInput === currentWord) {
                    setTimeout(() => {
                        // 隐藏单词
                        currentBlock.wordContainer.visible = false;
                        
                        // 重置状态
                        this.currentCharIndex = 0;
                        this.currentInput = '';
                        this.currentWordIndex++;
                        
                        // 移动鸭子到当前方块
                        this.moveDuck();
                        
                        // 如果是最后一个方块，让鸭子跳到终点陆地
                        if (this.currentWordIndex >= this.blocks.length) {
                            setTimeout(() => {
                                this.moveToEndGround();
                            }, 1000);
                        }
                    }, 200);
                }
            } else {
                // 字符错误，播放错误音效
                if (this.sounds.miss) {
                    this.playSound(this.sounds.miss);
                }

                // 字符错误
                charObj.background.clear();
                charObj.background.beginFill(0xFF0000, 0.8);
                charObj.background.drawRect(0, 0, 30, 40);
                charObj.background.endFill();

                // 设置等待状态
                this.isWaitingForReset = true;

                // 500ms后重置
                setTimeout(() => {
                    charObj.background.clear();
                    charObj.background.beginFill(0xFFFFFF, 0.8);
                    charObj.background.drawRect(0, 0, 30, 40);
                    charObj.background.endFill();
                    this.isWaitingForReset = false;
                }, 500);
            }
        }
    }

    updateCharacterDisplay() {
        const currentBlock = this.blocks[this.currentWordIndex];
        if (!currentBlock) return;

        const charObjects = currentBlock.charObjects;
        const currentWord = currentBlock.word;

        // 更新所有字符的显示状态
        charObjects.forEach((charObj, i) => {
            charObj.background.clear();
            if (i < this.currentCharIndex) {
                // 已正确输入的字符显示绿色
                charObj.background.beginFill(0x00FF00, 0.8);
            } else {
                // 未输入的字符显示白色
                charObj.background.beginFill(0xFFFFFF, 0.8);
            }
            charObj.background.drawRect(0, 0, 30, 40);
            charObj.background.endFill();
        });
    }

    moveDuck() {
        const targetX = this.blocks[this.currentWordIndex - 1].block.x + 100;
        const targetY = this.blocks[this.currentWordIndex - 1].block.y - 130;
        
        // 标记鸭子已开始跳跃
        this.hasStartedJumping = true;
        
        // 播放跳跃音效
        if (this.sounds.jump) {
            this.playSound(this.sounds.jump);
        }
        
        // 切换到跳跃动画
        this.duck.textures = this.jumpTextures;
        this.duck.loop = false;
        this.duck.play();
        
        // 创建跳跃动画
        const jump = {
            x: this.duck.x,
            y: this.duck.y,
            targetX: targetX,
            targetY: targetY,
            progress: 0
        };

        const animate = () => {
            jump.progress += 0.015;
            if (jump.progress >= 1) {
                this.duck.x = jump.targetX;
                this.duck.y = jump.targetY;
                // 跳跃结束后切换回空闲动画
                this.duck.textures = this.idleTextures;
                this.duck.loop = true;
                this.duck.play();
                
                // 第一次跳跃完成后更新标记
                if (this.isFirstJump) {
                    this.isFirstJump = false;
                }

                // 跳跃完成后，开始当前方块的倒计时
                const currentBlock = this.blocks[this.currentWordIndex - 1];
                if (currentBlock) {
                    this.startBlockFallTimer(currentBlock);
                }
                return;
            }

            const t = jump.progress;
            // 抛物线运动
            this.duck.x = jump.x + (jump.targetX - jump.x) * t;
            this.duck.y = jump.y + (jump.targetY - jump.y) * t - Math.sin(t * Math.PI) * 100;

            requestAnimationFrame(animate);
        };

        animate();
    }

    moveToEndGround() {
        // 播放跳跃音效
        if (this.sounds.jump) {
            this.playSound(this.sounds.jump);
        }
        
        // 切换到跳跃动画
        this.duck.textures = this.jumpTextures;
        this.duck.loop = false;
        this.duck.play();
        
        // 创建跳跃动画
        const jump = {
            x: this.duck.x,
            y: this.duck.y,
            targetX: this.endGround.x,
            targetY: this.endGround.y,
            progress: 0
        };

        const animate = () => {
            jump.progress += 0.015; // 稍微加快跳跃速度
            if (jump.progress >= 1) {
                this.duck.x = jump.targetX;
                this.duck.y = jump.targetY;
                // 跳跃结束后切换回空闲动画
                this.duck.textures = this.idleTextures;
                this.duck.loop = true;
                this.duck.play();
                
                // 延迟显示关卡完成
                setTimeout(() => this.showLevelCompleteMessage(), 500);
                return;
            }

            const t = jump.progress;
            // 抛物线运动
            this.duck.x = jump.x + (jump.targetX - jump.x) * t;
            this.duck.y = jump.y + (jump.targetY - jump.y) * t - Math.sin(t * Math.PI) * 100;

            requestAnimationFrame(animate);
        };

        animate();
    }

    endGame() {
        // 停止背景音乐
        if (this.bgmSource) {
            this.bgmSource.stop();
        }
        
        this.gameState = 'END';

        // 创建结束弹窗容器
        const dialogContainer = new PIXI.Container();
        this.app.stage.addChild(dialogContainer);

        // 创建半透明黑色背景
        const overlay = new PIXI.Graphics();
        overlay.beginFill(0x000000, 0.5);
        overlay.drawRect(0, 0, this.app.screen.width, this.app.screen.height);
        overlay.endFill();
        dialogContainer.addChild(overlay);

        // 创建弹窗背景
        const panel = new PIXI.Sprite(PIXI.Assets.get('panel_bg'));
        panel.width = 600;
        panel.height = 400;
        panel.anchor.set(0.5);
        panel.x = this.app.screen.width / 2;
        panel.y = this.app.screen.height / 2;
        dialogContainer.addChild(panel);

        // 创建标题文本
        const titleText = new PIXI.Text('任务完成', {
            fontFamily: 'Arial',
            fontSize: 48,
            fill: 0xFFFFFF,
            align: 'center',
            fontWeight: 'bold'
        });
        titleText.anchor.set(0.5);
        titleText.x = this.app.screen.width / 2;
        titleText.y = this.app.screen.height / 2 - 100;
        dialogContainer.addChild(titleText);

        // 创建提示文本
        const congratsText = new PIXI.Text('恭喜你顺利通过！', {
            fontFamily: 'Arial',
            fontSize: 36,
            fill: 0xFFFFFF,
            align: 'center'
        });
        congratsText.anchor.set(0.5);
        congratsText.x = this.app.screen.width / 2;
        congratsText.y = this.app.screen.height / 2 - 20;
        dialogContainer.addChild(congratsText);

        // 创建按钮
        const createButton = (text, x, isRetry = false) => {
            const button = new PIXI.Container();
            
            // 按钮背景
            const normalTexture = PIXI.Assets.get('btn_normal');
            const hoverTexture = PIXI.Assets.get('btn_hover');
            const buttonBg = new PIXI.Sprite(normalTexture);
            buttonBg.width = 200;
            buttonBg.height = 70;
            buttonBg.anchor.set(0.5);
            button.addChild(buttonBg);

            // 按钮文本
            const buttonText = new PIXI.Text(text, {
                fontFamily: 'Arial',
                fontSize: 28,
                fill: 0xFFFFFF,
                align: 'center'
            });
            buttonText.anchor.set(0.5);
            button.addChild(buttonText);

            // 设置按钮位置
            button.x = x;
            button.y = this.app.screen.height / 2 + 80;

            // 添加交互
            button.eventMode = 'static';
            button.cursor = 'pointer';

            button.on('pointerover', () => {
                buttonBg.texture = hoverTexture;
            });

            button.on('pointerout', () => {
                buttonBg.texture = normalTexture;
            });

            if (isRetry) {
                button.on('pointerdown', () => {
                    window.location.reload();
                });
            }

            dialogContainer.addChild(button);
        };

        // 创建两个按钮
        createButton('再试一次', this.app.screen.width / 2 - 150, true);
        createButton('继续学习', this.app.screen.width / 2 + 150, false);
    }

    updateCamera() {
        if (this.gameState !== 'PLAYING' || !this.hasStartedJumping) return;

        // 计算鸭子在屏幕上的实际位置
        const duckScreenX = this.duck.x + this.gameContainer.x;
        const oneThirdScreen = this.app.screen.width / 3;

        // 只有当鸭子位置超过屏幕1/3时才移动相机
        if (duckScreenX > oneThirdScreen) {
            // 计算目标摄像机位置
            let targetX;
            
            // 计算最后一个方块是否接近屏幕
            const lastBlockScreenX = this.lastBlockX + this.gameContainer.x;
            const isNearEnd = lastBlockScreenX <= this.app.screen.width + 100; // 100是缓冲距离

            if (isNearEnd) {
                // 如果接近终点，固定容器位置让鸭子可以移动到屏幕右侧
                targetX = -(this.lastBlockX - this.app.screen.width + 300);
            } else {
                // 将鸭子位置保持在屏幕1/3处
                targetX = -this.duck.x + oneThirdScreen;
            }

            // 更新相机目标位置
            this.cameraTargetX = targetX;
            
            // 根据是否是第一次跳跃使用不同的缓动系数
            const lerp = this.isFirstJump ? 0.05 : 0.1;
            
            // 使用缓动效果平滑移动摄像机
            this.gameContainer.x += (this.cameraTargetX - this.gameContainer.x) * lerp;

            // 更新背景和水面的平铺位置，创建无限滚动效果
            this.background.tilePosition.x = -this.gameContainer.x * 0.5; // 背景移动速度是摄像机的一半，产生视差效果
            this.water.tilePosition.x = -this.gameContainer.x; // 水面跟随摄像机完全移动
        }
    }

    // 从API获取单词列表
    async fetchWordList() {
        console.log("Fetching word list from API...");
        
        const apiUrl = 'https://daziya-api.cutterman.cn/typing/lesson/random-vocabulary';
        console.log(`Fetching words from: ${apiUrl}`);
        
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), 5000);
        });
        
        try {
            const response = await Promise.race([
                fetch(apiUrl, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: 'action=get_vocabulary'
                }),
                timeoutPromise
            ]);

            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.errno === 0 && Array.isArray(data.data)) {
                // 保存所有单词
                this.allWords = data.data;
                // 获取当前关卡的单词
                this.words = this.allWords.slice(0, this.wordsPerLevel);
                console.log(`Loaded ${this.allWords.length} words from API`);
            } else {
                throw new Error(`Invalid data format from API: ${JSON.stringify(data)}`);
            }
        } catch (error) {
            console.error('Error fetching word list:', error);
            // 使用默认单词列表
            this.allWords = [
                'fine', 'house', 'was', 'a', 'house', 'sky', 'blue', 'sun',
                'yellow', 'cat', 'dog', 'bird', 'tree', 'fish', 'book',
                'desk', 'chair', 'door', 'window', 'wall', 'floor', 'roof',
                'cloud', 'rain', 'snow', 'wind', 'star', 'moon', 'earth', 'sea'
            ];
            this.words = this.allWords.slice(0, this.wordsPerLevel);
            console.log('Using default word list');
        }
    }

    startNextLevel() {
        // 更新关卡
        this.currentLevel++;
        
        // 获取新关卡的单词
        const startIndex = (this.currentLevel - 1) * this.wordsPerLevel;
        this.words = this.allWords.slice(startIndex, startIndex + this.wordsPerLevel);
        
        // 如果没有足够的单词，游戏胜利
        if (this.words.length < this.wordsPerLevel) {
            this.showGameVictoryMessage();
            return;
        }
        
        // 重置游戏状态
        this.currentWordIndex = 0;
        this.currentCharIndex = 0;
        this.currentInput = '';
        this.blocks = [];
        this.characterStates = [];
        this.isWaitingForReset = false;
        this.hasStartedJumping = false;
        this.isFirstJump = true;
        
        // 更新难度
        this.blockFallDelay = Math.max(2000, 8000 - (this.currentLevel - 1) * this.fallDelayDecrement);
        
        // 重新创建游戏元素
        this.gameContainer.removeChildren();
        this.createBackground();
        this.createGround();
        this.createGameElements();
        
        // 重置摄像机位置
        this.gameContainer.x = 0;
        this.cameraTargetX = 0;
        
        // 重置鸭子位置
        this.setupDuckAnimations();
        this.duck.x = 200; // 设置回初始位置
        this.duck.y = this.startGroundY - this.duck.height + 20;
        
        // 重置背景和水面的位置
        if (this.background) {
            this.background.tilePosition.x = 0;
        }
        if (this.water) {
            this.water.tilePosition.x = 0;
        }
        
        // 更新关卡显示
        this.updateLevelText();
        
        // 更新游戏状态
        this.gameState = 'PLAYING';
    }

    showLevelCompleteMessage() {
        this.gameState = 'LEVEL_COMPLETE';
        
        // 创建弹窗容器
        const dialogContainer = new PIXI.Container();
        this.app.stage.addChild(dialogContainer);

        // 创建半透明黑色背景
        const overlay = new PIXI.Graphics();
        overlay.beginFill(0x000000, 0.5);
        overlay.drawRect(0, 0, this.app.screen.width, this.app.screen.height);
        overlay.endFill();
        dialogContainer.addChild(overlay);

        // 创建弹窗背景
        const panel = new PIXI.Sprite(PIXI.Assets.get('panel_bg'));
        panel.width = 400;
        panel.height = 300;
        panel.anchor.set(0.5);
        panel.x = this.app.screen.width / 2;
        panel.y = this.app.screen.height / 2;
        dialogContainer.addChild(panel);

        // 创建标题文本
        const titleText = new PIXI.Text(`第 ${this.currentLevel} 关完成！`, {
            fontFamily: 'Arial',
            fontSize: 36,
            fill: 0xFFFFFF,
            align: 'center',
            fontWeight: 'bold'
        });
        titleText.anchor.set(0.5);
        titleText.x = this.app.screen.width / 2;
        titleText.y = this.app.screen.height / 2 - 60;
        dialogContainer.addChild(titleText);

        // 创建下一关按钮
        const button = new PIXI.Container();
        const buttonBg = new PIXI.Sprite(PIXI.Assets.get('btn_normal'));
        buttonBg.width = 200;
        buttonBg.height = 60;
        buttonBg.anchor.set(0.5);
        button.addChild(buttonBg);

        const buttonText = new PIXI.Text('进入下一关', {
            fontFamily: 'Arial',
            fontSize: 24,
            fill: 0xFFFFFF,
            align: 'center'
        });
        buttonText.anchor.set(0.5);
        button.addChild(buttonText);

        button.x = this.app.screen.width / 2;
        button.y = this.app.screen.height / 2 + 40;
        button.eventMode = 'static';
        button.cursor = 'pointer';

        button.on('pointerover', () => {
            buttonBg.texture = PIXI.Assets.get('btn_hover');
        });

        button.on('pointerout', () => {
            buttonBg.texture = PIXI.Assets.get('btn_normal');
        });

        button.on('pointerdown', () => {
            this.app.stage.removeChild(dialogContainer);
            this.startNextLevel();
        });

        dialogContainer.addChild(button);
    }

    showGameVictoryMessage() {
        this.gameState = 'END';
        
        // 创建弹窗容器
        const dialogContainer = new PIXI.Container();
        this.app.stage.addChild(dialogContainer);

        // 创建半透明黑色背景
        const overlay = new PIXI.Graphics();
        overlay.beginFill(0x000000, 0.5);
        overlay.drawRect(0, 0, this.app.screen.width, this.app.screen.height);
        overlay.endFill();
        dialogContainer.addChild(overlay);

        // 创建弹窗背景
        const panel = new PIXI.Sprite(PIXI.Assets.get('panel_bg'));
        panel.width = 400;
        panel.height = 300;
        panel.anchor.set(0.5);
        panel.x = this.app.screen.width / 2;
        panel.y = this.app.screen.height / 2;
        dialogContainer.addChild(panel);

        // 创建标题文本
        const titleText = new PIXI.Text('恭喜通关！', {
            fontFamily: 'Arial',
            fontSize: 48,
            fill: 0xFFFFFF,
            align: 'center',
            fontWeight: 'bold'
        });
        titleText.anchor.set(0.5);
        titleText.x = this.app.screen.width / 2;
        titleText.y = this.app.screen.height / 2 - 60;
        dialogContainer.addChild(titleText);

        // 创建重新开始按钮
        const button = new PIXI.Container();
        const buttonBg = new PIXI.Sprite(PIXI.Assets.get('btn_normal'));
        buttonBg.width = 200;
        buttonBg.height = 60;
        buttonBg.anchor.set(0.5);
        button.addChild(buttonBg);

        const buttonText = new PIXI.Text('重新开始', {
            fontFamily: 'Arial',
            fontSize: 24,
            fill: 0xFFFFFF,
            align: 'center'
        });
        buttonText.anchor.set(0.5);
        button.addChild(buttonText);

        button.x = this.app.screen.width / 2;
        button.y = this.app.screen.height / 2 + 40;
        button.eventMode = 'static';
        button.cursor = 'pointer';

        button.on('pointerover', () => {
            buttonBg.texture = PIXI.Assets.get('btn_hover');
        });

        button.on('pointerout', () => {
            buttonBg.texture = PIXI.Assets.get('btn_normal');
        });

        button.on('pointerdown', () => {
            window.location.reload();
        });

        dialogContainer.addChild(button);
    }

    startBlockFallTimer(block) {
        // 如果已经在倒计时，不要重新开始
        if (block.countdownStarted) return;
        
        block.countdownStarted = true;
        let timeLeft = this.blockFallDelay;
        let fallStarted = false;
        
        // 清除可能存在的旧计时器
        if (block.timer) {
            clearInterval(block.timer);
        }
        
        // 获取方块的索引
        const blockIndex = this.blocks.indexOf(block);
        
        // 创建新的倒计时计时器
        block.timer = setInterval(() => {
            if (this.gameState !== 'PLAYING') {
                clearInterval(block.timer);
                return;
            }
            
            timeLeft -= 100;
            
            // 更新倒计时显示
            this.updateTimerText(timeLeft);
            
            // 当倒计时结束且还未开始掉落时，触发掉落
            if (timeLeft <= 0 && !fallStarted) {
                fallStarted = true;
                clearInterval(block.timer);
                
                // 检查鸭子是否在这个方块上
                const isDuckOnThisBlock = (this.currentWordIndex - 1) === blockIndex;
                
                if (isDuckOnThisBlock) {
                    // 创建鸭子掉落动画
                    gsap.to(this.duck, {
                        y: this.app.screen.height + 100,
                        duration: this.blockFallDuration / 1000,
                        ease: 'power1.in',
                        onComplete: () => {
                            this.gameOver('落水');
                        }
                    });
                }
                
                // 创建方块掉落动画
                gsap.to(block.block, {
                    y: this.app.screen.height + 100,
                    duration: this.blockFallDuration / 1000,
                    ease: 'power1.in',
                    onComplete: () => {
                        if (block.block.parent) {
                            block.block.parent.removeChild(block.block);
                        }
                    }
                });
                
                // 同时让单词容器也掉落
                gsap.to(block.wordContainer, {
                    y: this.app.screen.height + 100,
                    duration: this.blockFallDuration / 1000,
                    ease: 'power1.in',
                    onComplete: () => {
                        if (block.wordContainer.parent) {
                            block.wordContainer.parent.removeChild(block.wordContainer);
                        }
                    }
                });
            }
        }, 100);
    }

    gameOver(reason) {
        this.gameState = 'END';
        
        // 停止背景音乐
        if (this.bgmSource) {
            this.bgmSource.stop();
        }
        
        // 播放落水音效
        if (this.sounds.splash) {
            this.playSound(this.sounds.splash);
        }
        
        // 创建弹窗容器
        const dialogContainer = new PIXI.Container();
        this.app.stage.addChild(dialogContainer);

        // 创建半透明黑色背景
        const overlay = new PIXI.Graphics();
        overlay.beginFill(0x000000, 0.5);
        overlay.drawRect(0, 0, this.app.screen.width, this.app.screen.height);
        overlay.endFill();
        dialogContainer.addChild(overlay);

        // 创建弹窗背景
        const panel = new PIXI.Sprite(PIXI.Assets.get('panel_bg'));
        panel.width = 400;
        panel.height = 300;
        panel.anchor.set(0.5);
        panel.x = this.app.screen.width / 2;
        panel.y = this.app.screen.height / 2;
        dialogContainer.addChild(panel);

        // 创建标题文本
        const titleText = new PIXI.Text('游戏结束', {
            fontFamily: 'Arial',
            fontSize: 48,
            fill: 0xFFFFFF,
            align: 'center',
            fontWeight: 'bold'
        });
        titleText.anchor.set(0.5);
        titleText.x = this.app.screen.width / 2;
        titleText.y = this.app.screen.height / 2 - 60;
        dialogContainer.addChild(titleText);

        // 创建原因文本
        const reasonText = new PIXI.Text(`原因: ${reason}`, {
            fontFamily: 'Arial',
            fontSize: 24,
            fill: 0xFFFFFF,
            align: 'center'
        });
        reasonText.anchor.set(0.5);
        reasonText.x = this.app.screen.width / 2;
        reasonText.y = this.app.screen.height / 2;
        dialogContainer.addChild(reasonText);

        // 创建重试按钮
        const button = new PIXI.Container();
        const buttonBg = new PIXI.Sprite(PIXI.Assets.get('btn_normal'));
        buttonBg.width = 200;
        buttonBg.height = 60;
        buttonBg.anchor.set(0.5);
        button.addChild(buttonBg);

        const buttonText = new PIXI.Text('重新开始', {
            fontFamily: 'Arial',
            fontSize: 24,
            fill: 0xFFFFFF,
            align: 'center'
        });
        buttonText.anchor.set(0.5);
        button.addChild(buttonText);

        button.x = this.app.screen.width / 2;
        button.y = this.app.screen.height / 2 + 60;
        button.eventMode = 'static';
        button.cursor = 'pointer';

        button.on('pointerover', () => {
            buttonBg.texture = PIXI.Assets.get('btn_hover');
        });

        button.on('pointerout', () => {
            buttonBg.texture = PIXI.Assets.get('btn_normal');
        });

        button.on('pointerdown', () => {
            window.location.reload();
        });

        dialogContainer.addChild(button);
    }

    // 更新倒计时显示
    updateTimerText(timeLeft) {
        if (this.timerText) {
            this.timerText.text = `剩余时间: ${(timeLeft / 1000).toFixed(1)}秒`;
        }
    }

    // 更新关卡显示
    updateLevelText() {
        if (this.levelText) {
            this.levelText.text = `第 ${this.currentLevel} 关`;
        }
    }
}

// 启动游戏
window.onload = () => {
    // 设置body样式以防止滚动条
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';
    
    new DuckJumpGame();
}; 