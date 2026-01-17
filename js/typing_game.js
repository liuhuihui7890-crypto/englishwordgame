const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#000022',
    parent: 'game-container', // 挂载到指定 div
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
let enemies;
let bullets;
let scoreText;
let livesText;
let gameOverText;
let restartButton;
let targetLine; // 瞄准线

let score = 0;
let lives = 5; // 拼写游戏容错率低，给5条命
let isGameOver = false;
let words = []; 
let currentTarget = null; // 当前锁定的敌人
let inputField; // HTML 输入框

function preload () {
    this.load.image('player', 'assets/cannon.png');
}

function create () {
    // 0. 初始化
    score = 0;
    lives = 5;
    isGameOver = false;
    currentTarget = null;

    // 1. 星空背景
    createStars(this);

    // 2. 玩家炮台
    player = this.physics.add.sprite(400, 550, 'player');
    player.displayHeight = 80;
    player.scaleX = player.scaleY;
    player.setOrigin(0.5, 0.7); 

    // 3. 组
    enemies = this.physics.add.group();
    bullets = this.physics.add.group({
        defaultKey: 'bullet',
        maxSize: 30
    });

    // 子弹纹理
    let bg = this.make.graphics({x:0, y:0, add: false});
    bg.fillStyle(0x00ffff, 1);
    bg.fillCircle(5,5,5);
    bg.generateTexture('bullet', 10, 10);
    bg.destroy();

    // 4. UI
    scoreText = this.add.text(16, 16, 'Score: 0', { font: '32px Arial', fill: '#00ff00' });
    livesText = this.add.text(650, 16, 'Lives: 5', { font: '32px Arial', fill: '#ff0000' });
    
    // 瞄准线
    targetLine = this.add.graphics();

    // 5. 获取单词
    fetchWords(this);

    // 6. 输入监听
    inputField = document.getElementById('word-input');
    inputField.value = '';
    inputField.focus();
    
    // 监听输入框变化
    inputField.addEventListener('input', (e) => {
        if (isGameOver) return;
        checkInput(this, e.target.value.trim().toLowerCase());
    });

    // 7. 定时生成敌人
    this.time.addEvent({
        delay: 2500, // 每2.5秒生成一个
        callback: spawnEnemy,
        callbackScope: this,
        loop: true
    });
}

function createStars(scene) {
    let starGraphics = scene.make.graphics({ x: 0, y: 0, add: false });
    starGraphics.fillStyle(0xffffff, 1);
    starGraphics.fillCircle(2, 2, 2); 
    starGraphics.generateTexture('star', 4, 4);
    starGraphics.destroy();

    for(let i=0; i<150; i++) {
        let x = Phaser.Math.Between(0, 800);
        let y = Phaser.Math.Between(0, 600);
        let star = scene.add.image(x, y, 'star');
        star.setScale(Phaser.Math.FloatBetween(0.5, 1.5));
        star.setAlpha(Phaser.Math.FloatBetween(0.3, 1));
        scene.tweens.add({
            targets: star,
            alpha: { from: 0.2, to: 1 },
            duration: Phaser.Math.Between(1000, 3000),
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            delay: Phaser.Math.Between(0, 2000)
        });
    }
}

function fetchWords(scene) {
    fetch('/api/words')
        .then(res => res.json())
        .then(data => {
            if(data && data.length > 0) words = data;
            else words = [{en: 'error', cn: '错误'}, {en: 'test', cn: '测试'}];
        })
        .catch(err => {
            console.error(err);
            words = [{en: 'network', cn: '网络'}, {en: 'offline', cn: '离线'}];
        });
}

function spawnEnemy() {
    if (isGameOver || words.length === 0) return;

    let wordData = Phaser.Utils.Array.GetRandom(words);
    
    // 随机X位置，Y从顶部开始
    let x = Phaser.Math.Between(50, 750);
    let y = -50;

    let enemyContainer = this.add.container(x, y);
    
    // 敌人显示中文
    let text = this.add.text(0, 0, wordData.cn, {
        font: 'bold 24px "Microsoft YaHei", Arial',
        fill: '#ffffff',
        stroke: '#ff0000',
        strokeThickness: 3
    }).setOrigin(0.5);

    // 背景圈
    let radius = Math.max(text.width, text.height) / 2 + 15;
    let bg = this.add.graphics();
    bg.fillStyle(0xff0000, 0.6);
    bg.fillCircle(0, 0, radius);

    enemyContainer.add([bg, text]);
    enemyContainer.setSize(radius*2, radius*2);
    
    this.physics.world.enable(enemyContainer);
    
    // 设置数据
    enemyContainer.setData('word', wordData.en.toLowerCase());
    enemyContainer.setData('isLocked', false);

    // 向下移动，速度稍慢
    enemyContainer.body.setVelocityY(Phaser.Math.Between(30, 60));
    
    enemies.add(enemyContainer);
}

function update(time, delta) {
    if (isGameOver) return;

    // 1. 寻找最近的敌人进行锁定
    findTarget();

    // 2. 炮台瞄准逻辑
    if (currentTarget && currentTarget.active) {
        let angle = Phaser.Math.Angle.Between(player.x, player.y, currentTarget.x, currentTarget.y);
        player.rotation = angle + Math.PI / 2;
        
        // 绘制瞄准线
        targetLine.clear();
        targetLine.lineStyle(2, 0x00ff00, 0.5);
        targetLine.beginPath();
        targetLine.moveTo(player.x, player.y);
        targetLine.lineTo(currentTarget.x, currentTarget.y);
        targetLine.strokePath();
    } else {
        targetLine.clear();
    }

    // 3. 检查敌人是否触底
    enemies.children.each(function(enemy) {
        if (enemy.active && enemy.y > 580) {
            enemy.destroy();
            loseLife(this);
            // 如果销毁的是当前目标，清除引用
            if (enemy === currentTarget) {
                currentTarget = null;
                inputField.value = ''; // 清空输入
            }
        }
    }, this);
}

function findTarget() {
    // 如果当前没有目标，或者当前目标已经销毁，寻找新目标
    if (!currentTarget || !currentTarget.active) {
        let closestDist = Infinity;
        let closestEnemy = null;

        enemies.children.each(function(enemy) {
            if (enemy.active) {
                let dist = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y);
                // 优先锁定距离最近的
                if (dist < closestDist) {
                    closestDist = dist;
                    closestEnemy = enemy;
                }
            }
        });

        if (closestEnemy) {
            currentTarget = closestEnemy;
            // 可选：给锁定的敌人加个高亮效果
        }
    }
}

function checkInput(scene, inputText) {
    if (!currentTarget || !currentTarget.active) return;

    let targetWord = currentTarget.getData('word');

    // 检查拼写
    if (inputText === targetWord) {
        // 拼写正确！
        fireLaser(scene, currentTarget);
        
        // 销毁敌人
        currentTarget.destroy();
        currentTarget = null;
        
        // 加分
        score += 10;
        scoreText.setText('Score: ' + score);
        
        // 清空输入框
        inputField.value = '';
        
        // 重新寻找目标
        findTarget();
    } else {
        // 还没拼完或拼错，什么都不做，继续让玩家输
    }
}

function fireLaser(scene, target) {
    // 简单的激光效果
    let laser = scene.add.graphics();
    laser.lineStyle(5, 0x00ffff, 1);
    laser.beginPath();
    laser.moveTo(player.x, player.y - 40);
    laser.lineTo(target.x, target.y);
    laser.strokePath();

    // 100ms 后消失
    scene.time.delayedCall(100, () => {
        laser.destroy();
    });
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
    enemies.clear(true, true);
    targetLine.clear();
    
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
        // 刷新页面重开最简单
        location.reload(); 
    });
    
    // 禁用输入
    inputField.disabled = true;
}
