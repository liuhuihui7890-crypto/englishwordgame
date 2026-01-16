const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#000022',
    parent: document.body,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

let game = new Phaser.Game(config);
let player;
let targets;
let bullets;
let currentWord;
let wordText;
let scoreText;
let livesText;
let gameOverText;
let restartButton;

let score = 0;
let lives = 3;
let isGameOver = false;
let words = []; 

function preload () {
    // 预加载
}

function create () {
    // 0. 重置状态
    score = 0;
    lives = 3;
    isGameOver = false;

    // 1. 创建动态星空背景
    let stars = this.add.graphics();
    stars.fillStyle(0xffffff, 1);
    for(let i=0; i<150; i++) {
        let x = Phaser.Math.Between(0, 800);
        let y = Phaser.Math.Between(0, 600);
        let r = Phaser.Math.FloatBetween(0.5, 2.5);
        stars.fillCircle(x, y, r);
    }

    // 2. 生成纹理 - 子弹 (发光小球)
    let graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0x00ffff, 1);
    graphics.fillCircle(5, 5, 5);
    graphics.generateTexture('bullet', 10, 10);

    // 3. 生成纹理 - 玩家炮台 (更像大炮的样子)
    let playerGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    
    // 炮管 (深灰色长方形)
    playerGraphics.fillStyle(0x444444, 1);
    playerGraphics.fillRect(-10, -40, 20, 60); // 中心点 (0,0) 对应的矩形
    
    // 炮管装饰 (亮色条纹)
    playerGraphics.fillStyle(0x00ccff, 1);
    playerGraphics.fillRect(-6, -35, 12, 10);
    playerGraphics.fillRect(-6, -15, 12, 5);

    // 底座 (圆形)
    playerGraphics.fillStyle(0x666666, 1);
    playerGraphics.fillCircle(0, 10, 25);
    
    // 核心发光点
    playerGraphics.fillStyle(0x00ffff, 1);
    playerGraphics.fillCircle(0, 10, 8);

    playerGraphics.generateTexture('player', 60, 80); // 生成纹理，宽高要足够包容绘制的图形
    
    // 4. 创建玩家对象
    player = this.physics.add.sprite(400, 550, 'player');
    player.setOrigin(0.5, 0.6); // 调整旋转中心，使其看起来像绕着底座转
    player.setCollideWorldBounds(true);

    bullets = this.physics.add.group({
        defaultKey: 'bullet',
        maxSize: 30
    });

    targets = this.physics.add.group();

    // 5. UI 显示
    scoreText = this.add.text(16, 16, 'Score: 0', { font: '32px Arial', fill: '#00ff00' });
    livesText = this.add.text(650, 16, 'Lives: 3', { font: '32px Arial', fill: '#ff0000' });

    // 6. 获取数据
    fetchWords(this);

    // 7. 输入与碰撞
    this.input.on('pointerdown', function(pointer) {
        if (!isGameOver) {
            fireBullet(this, pointer);
        }
    }, this);
    
    this.physics.add.overlap(bullets, targets, hitTarget, null, this);
}

function fetchWords(scene) {
    fetch('/api/words')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data && data.length > 0) {
                words = data;
                displayNextWord(scene);
            } else {
                words = [{en: 'No Data', cn: '无数据'}];
                displayNextWord(scene);
            }
        })
        .catch(err => {
            console.error("API Error:", err);
            words = [{en: 'Error', cn: '网络错误'}, {en: 'Reload', cn: '刷新页面'}];
            displayNextWord(scene);
        });
}

function update (time, delta) {
    if (isGameOver || !player) return;

    let pointer = this.input.activePointer;
    // 计算角度，注意图片素材默认是朝上的，所以不需要额外的 Math.PI / 2 修正，除非素材方向不对
    // 我们的 Graphics 绘制时炮口朝上 (-Y)，Phaser 0度是朝右 (+X)
    // 所以还是需要 +90度 (PI/2) 来修正
    let angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.x, pointer.y);
    player.rotation = angle + Math.PI / 2;

    bullets.children.each(function(b) {
        // 清理逻辑修改：只在飞出上下边界时销毁
        // 左右边界会让它反弹，所以不销毁
        if (b.active) {
            if (b.y < -50 || b.y > 650) {
                b.setActive(false);
                b.setVisible(false);
                b.body.stop();
            }
            // 不需要检测 x，因为有墙壁反弹
        }
    }.bind(this));
}

function displayNextWord(scene) {
    if (words.length === 0) return;

    currentWord = Phaser.Utils.Array.GetRandom(words);

    if (wordText) {
        wordText.destroy();
    }

    wordText = scene.add.text(400, 550, currentWord.en, { 
        font: 'bold 40px Arial', 
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
        shadow: { offsetX: 2, offsetY: 2, color: '#333333', blur: 2, stroke: true, fill: true }
    }).setOrigin(0.5);

    createTargets(scene);
}

function createTargets(scene) {
    if (targets) {
        targets.clear(true, true);
    }

    const minX = 100;
    const maxX = 700;
    const minY = 50;
    const maxY = 350;

    let correctTarget = createTarget(scene, Phaser.Math.Between(minX, maxX), Phaser.Math.Between(minY, maxY), currentWord.cn, true);
    targets.add(correctTarget);

    let incorrectWords = words.filter(word => word.en !== currentWord.en);
    let targetCount = 7;
    
    for (let i = 0; i < targetCount; i++) { 
        if (incorrectWords.length === 0) {
            incorrectWords = words.filter(word => word.en !== currentWord.en);
        }
        
        let randomIndex = Phaser.Math.Between(0, incorrectWords.length - 1);
        let randomWord = incorrectWords[randomIndex];
        incorrectWords.splice(randomIndex, 1);

        let incorrectTarget = createTarget(scene, Phaser.Math.Between(minX, maxX), Phaser.Math.Between(minY, maxY), randomWord.cn, false);
        targets.add(incorrectTarget);
    }
}

function createTarget(scene, x, y, text, isCorrect) {
    let targetContainer = scene.add.container(x, y);
    
    let targetText = scene.add.text(0, 0, text, { 
        font: 'bold 20px "Microsoft YaHei", Arial, sans-serif', 
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 2
    }).setOrigin(0.5);
    
    let radius = Math.max(targetText.width, targetText.height) / 2 + 15;
    
    let visualBg = scene.add.graphics();
    let color = Phaser.Utils.Array.GetRandom([0xff5555, 0x55ff55, 0x5555ff, 0xffff55, 0xff55ff, 0xffaa00, 0x00aaff]);
    visualBg.fillStyle(color, 0.8);
    visualBg.fillCircle(0, 0, radius);
    
    targetContainer.add([visualBg, targetText]);
    targetContainer.setSize(radius*2, radius*2); 
    
    scene.physics.world.enable(targetContainer);
    
    // 设置物理身体为圆形，碰撞更自然
    targetContainer.body.setCircle(radius);

    targetContainer.setData('isCorrect', isCorrect);
    targetContainer.body.setVelocity(Phaser.Math.Between(-100, 100), Phaser.Math.Between(-60, 60));
    targetContainer.body.setCollideWorldBounds(true);
    targetContainer.body.setBounce(1, 1);
    
    return targetContainer;
}

function fireBullet(scene, pointer) {
    if (!player) return;

    // 计算炮口位置（简单的三角函数，基于炮台旋转）
    // player.rotation 是当前炮台的角度
    // 炮管长度大概 40，所以我们在炮口处生成子弹
    let vec = new Phaser.Math.Vector2();
    vec.setToPolar(player.rotation - Math.PI/2, 50); // -90度修正，长度50

    let bullet = bullets.get(player.x + vec.x, player.y + vec.y);
    
    if (bullet) {
        bullet.setActive(true);
        bullet.setVisible(true);
        
        // 关键改动：开启世界边界碰撞和反弹
        bullet.body.setCollideWorldBounds(true);
        bullet.body.setBounce(1, 1); 
        
        // 发射方向
        let angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.x, pointer.y);
        scene.physics.velocityFromRotation(angle, 700, bullet.body.velocity);
    }
}

function hitTarget(bullet, target) {
    bullet.setActive(false);
    bullet.setVisible(false);
    bullet.body.stop(); 
    bullet.x = -100;
    bullet.y = -100;

    if (target.getData('isCorrect')) {
        score += 10;
        scoreText.setText('Score: ' + score);
        displayNextWord(this);
    } else {
        target.destroy(); 
        loseLife(this);
    }
}

function loseLife(scene) {
    lives--;
    livesText.setText('Lives: ' + lives);
    
    if (lives <= 0) {
        gameOver(scene);
    }
}

function gameOver(scene) {
    isGameOver = true;
    
    if (targets) targets.clear(true, true);
    if (wordText) wordText.destroy();
    
    gameOverText = scene.add.text(400, 300, 'GAME OVER\nFinal Score: ' + score, {
        font: 'bold 64px Arial',
        fill: '#ff0000',
        stroke: '#ffffff',
        strokeThickness: 6,
        align: 'center'
    }).setOrigin(0.5);

    restartButton = scene.add.text(400, 480, 'Click to Restart', {
        font: '32px Arial',
        fill: '#ffffff',
        backgroundColor: '#006600',
        padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive();

    restartButton.on('pointerdown', function() {
        restartGame(scene);
    });
}

function restartGame(scene) {
    if (gameOverText) gameOverText.destroy();
    if (restartButton) restartButton.destroy();
    
    score = 0;
    lives = 3;
    scoreText.setText('Score: 0');
    livesText.setText('Lives: 3');
    isGameOver = false;

    fetchWords(scene);
}
