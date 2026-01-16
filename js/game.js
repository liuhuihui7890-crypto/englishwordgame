const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#2d2d2d',
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

function preload () {
    // 暂时没有外部资源需要预加载
}

function create () {
    // 1. 生成子弹纹理 (用代码画一个黄色的圆)
    let graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0xffff00, 1);
    graphics.fillCircle(5, 5, 5); // 半径5的圆
    graphics.generateTexture('bullet', 10, 10); // 生成名为 'bullet' 的纹理

    // 2. 创建玩家炮台
    player = this.add.rectangle(400, 550, 50, 50, 0x6666ff).setOrigin(0.5);

    // 3. 初始化子弹组
    bullets = this.physics.add.group({
        defaultKey: 'bullet',
        maxSize: 20
    });

    // 4. 显示第一个单词 (传递 'this' 作为场景上下文)
    displayNextWord(this);

    // 5. 设置点击事件
    this.input.on('pointerdown', fireBullet, this);
    
    // 6. 添加碰撞检测：子弹击中目标
    this.physics.add.overlap(bullets, targets, hitTarget, null, this);
}

function update () {
    // 清理飞出屏幕的子弹
    bullets.children.each(function(b) {
        if (b.active && b.y < -50) {
            b.setActive(false);
            b.setVisible(false);
        }
    }.bind(this));
}

function displayNextWord(scene) {
    currentWord = Phaser.Utils.Array.GetRandom(words);

    if (wordText) {
        wordText.destroy();
    }

    // 在底部显示英文单词
    wordText = scene.add.text(400, 580, currentWord.en, { font: '32px Arial', fill: '#ffffff' }).setOrigin(0.5);

    // 创建目标
    createTargets(scene);
}

function createTargets(scene) {
    // 如果已有目标组，先创建或清理
    if (targets) {
        targets.clear(true, true);
    } else {
        targets = scene.physics.add.group();
    }

    // 添加正确答案
    let correctTarget = createTarget(scene, Phaser.Math.Between(100, 700), Phaser.Math.Between(50, 300), currentWord.cn, true);
    targets.add(correctTarget);

    // 添加3个错误答案
    let incorrectWords = words.filter(word => word.en !== currentWord.en);
    for (let i = 0; i < 3; i++) {
        if (incorrectWords.length === 0) break; 
        
        let randomIndex = Phaser.Math.Between(0, incorrectWords.length - 1);
        let randomWord = incorrectWords[randomIndex];
        
        // 移除已选的错误单词，避免重复
        incorrectWords.splice(randomIndex, 1);

        let incorrectTarget = createTarget(scene, Phaser.Math.Between(100, 700), Phaser.Math.Between(50, 300), randomWord.cn, false);
        targets.add(incorrectTarget);
    }
}

function createTarget(scene, x, y, text, isCorrect) {
    let targetContainer = scene.add.container(x, y);
    
    let targetText = scene.add.text(0, 0, text, { font: '24px Arial', fill: '#000000' }).setOrigin(0.5);
    // 根据文字大小创建背景
    let targetBg = scene.add.rectangle(0, 0, targetText.width + 20, targetText.height + 10, 0xffffff).setOrigin(0.5);
    
    targetContainer.add([targetBg, targetText]);
    
    // 启用物理属性
    scene.physics.world.enable(targetContainer);
    
    // 设置数据，标记是否为正确答案
    targetContainer.setData('isCorrect', isCorrect);
    
    // 设置随机速度和边界反弹
    targetContainer.body.setVelocity(Phaser.Math.Between(-100, 100), Phaser.Math.Between(-50, 50));
    targetContainer.body.setCollideWorldBounds(true);
    targetContainer.body.setBounce(1, 1);
    
    return targetContainer;
}

function fireBullet() {
    let bullet = bullets.get(player.x, player.y - 30);
    if (bullet) {
        bullet.setActive(true);
        bullet.setVisible(true);
        bullet.body.velocity.y = -500;
    }
}

function hitTarget(bullet, target) {
    // 销毁子弹
    bullet.setActive(false);
    bullet.setVisible(false);
    bullet.body.stop(); // 停止物理运动
    bullet.y = -100; // 移出屏幕

    if (target.getData('isCorrect')) {
        // 答对了！
        console.log("Correct!");
        // 播放个简单的效果或打印日志，然后下一关
        displayNextWord(this);
    } else {
        // 答错了
        console.log("Wrong!");
        // 简单的惩罚：让目标暂时变红或者只销毁该错误目标
        target.destroy();
    }
}
