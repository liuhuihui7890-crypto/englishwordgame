const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#000022',
    parent: 'game-container',
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
let targetLine; 
let errorText; // 错误提示文本

let score = 0;
let lives = 5;
let isGameOver = false;
let words = []; 
let currentTarget = null;
let inputField; 

function preload () {
    this.load.image('player', 'assets/cannon.png');
}

function create () {
    score = 0;
    lives = 5;
    isGameOver = false;
    currentTarget = null;

    createStars(this);

    player = this.physics.add.sprite(400, 550, 'player');
    player.displayHeight = 80;
    player.scaleX = player.scaleY;
    player.setOrigin(0.5, 0.7); 

    enemies = this.physics.add.group();
    
    // UI
    scoreText = this.add.text(16, 16, 'Score: 0', { font: '32px Arial', fill: '#00ff00' });
    livesText = this.add.text(650, 16, 'Lives: 5', { font: '32px Arial', fill: '#ff0000' });
    errorText = this.add.text(400, 500, '', { font: 'bold 32px Arial', fill: '#ff0000' }).setOrigin(0.5);
    
    targetLine = this.add.graphics();

    fetchWords(this);

    inputField = document.getElementById('word-input');
    inputField.value = '';
    inputField.focus();
    
    // 输入监听 (使用 'change' 或 'keyup' 回车可能更适合发射炮弹的感觉，但 'input' 实时性更强)
    // 这里为了配合 "浪费炮弹" 的设定，我们监听 'keydown' 捕获回车键提交，或者保持实时检查
    // 为了体验顺畅，我们继续用 input 实时检查，但如果拼写长度足够但错误，可以视为一次失败的射击
    
    // 方案：改为按回车确认发射，或者实时匹配。
    // 为了实现"输错浪费炮弹"，我们改为：每次按下按键时，都进行判断，如果整个单词拼完了但是不对，或者为了简单，
    // 我们保留实时匹配正确发射，但如果用户按了回车且不匹配，或者输入长度超过目标长度，就视为失误。
    
    // 简化方案：监听 input 事件，每次输入都检查。
    inputField.addEventListener('input', (e) => {
        if (isGameOver) return;
        // 清除错误提示
        errorText.setText('');
        
        let val = e.target.value.trim().toLowerCase();
        
        // 只有当有目标锁定时才检查
        if (currentTarget && currentTarget.active) {
            let targetWord = currentTarget.getData('word');
            
            // 1. 完全匹配 -> 成功
            if (val === targetWord) {
                successShot(this);
            } 
            // 2. 输入长度已经超过目标单词，或者长度一样但内容不同 -> 错误 (浪费炮弹)
            else if (val.length >= targetWord.length && val !== targetWord) {
                failShot(this);
            }
        }
    });

    this.time.addEvent({
        delay: 2000, 
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

    // 限制最大数量为 5
    if (enemies.countActive(true) >= 5) return;

    let wordData = Phaser.Utils.Array.GetRandom(words);
    let x = Phaser.Math.Between(50, 750);
    let y = -50;

    let enemyContainer = this.add.container(x, y);
    
    let text = this.add.text(0, 0, wordData.cn, {
        font: 'bold 20px "Microsoft YaHei", Arial', // 字体稍小
        fill: '#ffffff',
        stroke: '#ff0000',
        strokeThickness: 3
    }).setOrigin(0.5);

    // 半径缩小：根据文字大小适配，但基数减小
    let radius = Math.max(text.width, text.height) / 2 + 10; 
    // 强制限制最大半径，防止变得太大
    radius = Phaser.Math.Clamp(radius, 25, 60);

    let bg = this.add.graphics();
    bg.fillStyle(0xff0000, 0.6);
    bg.fillCircle(0, 0, radius);

    enemyContainer.add([bg, text]);
    enemyContainer.setSize(radius*2, radius*2);
    
    this.physics.world.enable(enemyContainer);
    
    enemyContainer.setData('word', wordData.en.toLowerCase());
    enemyContainer.body.setVelocityY(Phaser.Math.Between(30, 60));
    
    enemies.add(enemyContainer);
}

function update(time, delta) {
    if (isGameOver) return;

    findTarget();

    if (currentTarget && currentTarget.active) {
        let angle = Phaser.Math.Angle.Between(player.x, player.y, currentTarget.x, currentTarget.y);
        player.rotation = angle + Math.PI / 2;
        
        targetLine.clear();
        targetLine.lineStyle(2, 0x00ff00, 0.3); // 线条变淡一点
        targetLine.beginPath();
        targetLine.moveTo(player.x, player.y);
        targetLine.lineTo(currentTarget.x, currentTarget.y);
        targetLine.strokePath();
    } else {
        targetLine.clear();
        // 如果没有目标，清空输入框防止误判
        if (inputField.value !== '') inputField.value = '';
    }

    enemies.children.each(function(enemy) {
        if (enemy.active && enemy.y > 580) {
            enemy.destroy();
            loseLife(this);
            if (enemy === currentTarget) {
                currentTarget = null;
                inputField.value = ''; 
            }
        }
    }, this);
}

function findTarget() {
    if (!currentTarget || !currentTarget.active) {
        let closestDist = Infinity;
        let closestEnemy = null;

        enemies.children.each(function(enemy) {
            if (enemy.active) {
                let dist = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestEnemy = enemy;
                }
            }
        });

        if (closestEnemy) {
            currentTarget = closestEnemy;
            inputField.value = ''; // 切换目标时清空输入
            inputField.placeholder = "Type: " + closestEnemy.getData('word').length + " letters"; // 提示长度
        }
    }
}

function successShot(scene) {
    fireLaser(scene, currentTarget, 0x00ffff); // 青色激光
    
    currentTarget.destroy();
    currentTarget = null;
    
    score += 10;
    scoreText.setText('Score: ' + score);
    
    inputField.value = '';
    findTarget();
}

function failShot(scene) {
    // 错误反馈
    scene.cameras.main.shake(100, 0.01); // 屏幕震动
    errorText.setText('WRONG!'); 
    errorText.alpha = 1;
    
    // 淡出错误提示
    scene.tweens.add({
        targets: errorText,
        alpha: 0,
        duration: 800,
        delay: 200
    });

    // 发射红色“哑弹”激光
    fireLaser(scene, currentTarget, 0xff0000); 
    
    // 清空输入框，让用户重新输入
    inputField.value = '';
}

function fireLaser(scene, target, color) {
    let laser = scene.add.graphics();
    laser.lineStyle(5, color, 1);
    laser.beginPath();
    laser.moveTo(player.x, player.y - 40);
    // 如果是哑弹，激光可以打偏一点或者稍微短一点，这里为了视觉简单直接打过去但颜色不同
    laser.lineTo(target.x, target.y);
    laser.strokePath();

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
    inputField.disabled = true;
    
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
        location.reload(); 
    });
}
