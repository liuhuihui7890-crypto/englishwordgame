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

    // 2. 生成纹理
    let graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0x00ffff, 1);
    graphics.fillCircle(5, 5, 5);
    graphics.generateTexture('bullet', 10, 10);

    let playerGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    playerGraphics.fillStyle(0x00ccff, 1);
    playerGraphics.fillTriangle(0, 40, 20, 0, 40, 40);
    playerGraphics.generateTexture('player', 40, 40);
    
    // 3. 创建游戏对象
    player = this.physics.add.sprite(400, 550, 'player');
    player.setCollideWorldBounds(true);

    bullets = this.physics.add.group({
        defaultKey: 'bullet',
        maxSize: 30
    });

    targets = this.physics.add.group();

    // 4. UI 显示
    scoreText = this.add.text(16, 16, 'Score: 0', { font: '32px Arial', fill: '#00ff00' });
    livesText = this.add.text(650, 16, 'Lives: 3', { font: '32px Arial', fill: '#ff0000' });

    // 5. 获取数据
    fetchWords(this);

    // 6. 输入与碰撞
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
            console.log("Words received:", data); // 调试日志
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
            // 这里也可以用一些硬编码的词作为最后的防线
            words = [{en: 'Error', cn: '网络错误'}, {en: 'Reload', cn: '刷新页面'}];
            displayNextWord(scene);
        });
}

function update (time, delta) {
    if (isGameOver || !player) return;

    let pointer = this.input.activePointer;
    let angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.x, pointer.y);
    player.rotation = angle + Math.PI / 2;

    bullets.children.each(function(b) {
        if (b.active && (b.y < -50 || b.y > 650 || b.x < -50 || b.x > 850)) {
            b.setActive(false);
            b.setVisible(false);
        }
    }.bind(this));
}

function displayNextWord(scene) {
    if (words.length === 0) return;

    currentWord = Phaser.Utils.Array.GetRandom(words);

    if (wordText) {
        wordText.destroy();
    }

    // 在底部显示英文单词
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

    // 1. 添加正确答案
    let correctTarget = createTarget(scene, Phaser.Math.Between(minX, maxX), Phaser.Math.Between(minY, maxY), currentWord.cn, true);
    targets.add(correctTarget);

    // 2. 添加干扰项 (增加到 7 个，总共 8 个)
    let incorrectWords = words.filter(word => word.en !== currentWord.en);
    // 如果单词总数不够，就重复使用干扰项
    let targetCount = 7;
    
    for (let i = 0; i < targetCount; i++) { 
        if (incorrectWords.length === 0) {
            // 如果干扰词用完了，重新填充（除了正确答案）
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
    
    // 确保字体支持中文，且颜色对比度高
    let targetText = scene.add.text(0, 0, text, { 
        font: 'bold 20px "Microsoft YaHei", Arial, sans-serif', 
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 2
    }).setOrigin(0.5);
    
    // 气泡大小
    let radius = Math.max(targetText.width, targetText.height) / 2 + 15;
    
    let visualBg = scene.add.graphics();
    // 随机颜色
    let color = Phaser.Utils.Array.GetRandom([0xff5555, 0x55ff55, 0x5555ff, 0xffff55, 0xff55ff, 0xffaa00, 0x00aaff]);
    visualBg.fillStyle(color, 0.8); // 增加不透明度
    visualBg.fillCircle(0, 0, radius);
    
    targetContainer.add([visualBg, targetText]);
    targetContainer.setSize(radius*2, radius*2); 
    
    scene.physics.world.enable(targetContainer);
    
    targetContainer.setData('isCorrect', isCorrect);
    // 稍微增加速度范围
    targetContainer.body.setVelocity(Phaser.Math.Between(-100, 100), Phaser.Math.Between(-60, 60));
    targetContainer.body.setCollideWorldBounds(true);
    targetContainer.body.setBounce(1, 1);
    
    return targetContainer;
}

function fireBullet(scene, pointer) {
    if (!player) return;

    let bullet = bullets.get(player.x, player.y);
    
    if (bullet) {
        bullet.setActive(true);
        bullet.setVisible(true);
        
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

    // 重新获取单词，也许能刷新运气
    fetchWords(scene);
}
