const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#2d2d2d',
    parent: document.body, // 将游戏挂载到 body
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
let lastFired = 0; // 限制射速

function preload () {
    // 暂时没有外部资源需要预加载
}

function create () {
    // 1. 生成子弹纹理 (用代码画一个黄色的圆)
    let graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0xffff00, 1);
    graphics.fillCircle(5, 5, 5); // 半径5的圆
    graphics.generateTexture('bullet', 10, 10); // 生成名为 'bullet' 的纹理

    // 2. 创建玩家炮台 (长方形)
    player = this.add.rectangle(400, 550, 40, 80, 0x6666ff);
    // 开启物理，以便将来可能需要碰撞，这里主要为了设置原点方便旋转
    this.physics.add.existing(player);
    player.setOrigin(0.5, 1); // 设置原点在底部中心，方便旋转

    // 3. 初始化子弹组
    bullets = this.physics.add.group({
        defaultKey: 'bullet',
        maxSize: 20
    });

    // 4. 显示第一个单词
    displayNextWord(this);

    // 5. 设置点击事件 (发射子弹)
    this.input.on('pointerdown', function(pointer) {
        fireBullet(this, pointer);
    }, this);
    
    // 6. 添加碰撞检测：子弹击中目标
    this.physics.add.overlap(bullets, targets, hitTarget, null, this);
}

function update (time, delta) {
    // 1. 让炮台跟随鼠标旋转
    let pointer = this.input.activePointer;
    // 计算炮台位置到鼠标位置的角度 (弧度)
    let angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.x, pointer.y);
    // 将弧度转换为度数，并加 90 度（因为 Phaser 中 0 度是指向右侧，而我们默认向上是 -90 度，或者调整图片方向）
    // 这里最简单的是直接设置 rotation (弧度)
    // Phaser 的 0 度是 3点钟方向。
    // 我们的炮台默认竖直向上。所以需要调整一下相位。
    // 让炮台的上边指向鼠标：
    player.rotation = angle + Math.PI / 2;

    // 2. 清理飞出屏幕的子弹
    bullets.children.each(function(b) {
        if (b.active && (b.y < -50 || b.y > 650 || b.x < -50 || b.x > 850)) {
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
    wordText = scene.add.text(400, 580, currentWord.en, { 
        font: '32px "Microsoft YaHei", Arial, sans-serif', 
        fill: '#ffffff' 
    }).setOrigin(0.5);

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

    // 随机位置参数
    const minX = 100;
    const maxX = 700;
    const minY = 50;
    const maxY = 300;

    // 添加正确答案
    let correctTarget = createTarget(scene, Phaser.Math.Between(minX, maxX), Phaser.Math.Between(minY, maxY), currentWord.cn, true);
    targets.add(correctTarget);

    // 添加3个错误答案
    let incorrectWords = words.filter(word => word.en !== currentWord.en);
    for (let i = 0; i < 3; i++) {
        if (incorrectWords.length === 0) break; 
        
        let randomIndex = Phaser.Math.Between(0, incorrectWords.length - 1);
        let randomWord = incorrectWords[randomIndex];
        incorrectWords.splice(randomIndex, 1);

        let incorrectTarget = createTarget(scene, Phaser.Math.Between(minX, maxX), Phaser.Math.Between(minY, maxY), randomWord.cn, false);
        targets.add(incorrectTarget);
    }
}

function createTarget(scene, x, y, text, isCorrect) {
    let targetContainer = scene.add.container(x, y);
    
    // 使用支持中文的字体
    let targetText = scene.add.text(0, 0, text, { 
        font: '24px "Microsoft YaHei", "SimHei", Arial, sans-serif', 
        fill: '#000000' 
    }).setOrigin(0.5);
    
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

function fireBullet(scene, pointer) {
    let bullet = bullets.get(player.x, player.y);
    
    if (bullet) {
        bullet.setActive(true);
        bullet.setVisible(true);
        
        // 计算从炮台到点击位置的角度
        let angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.x, pointer.y);
        
        // 设置速度向量 (速度 600)
        scene.physics.velocityFromRotation(angle, 600, bullet.body.velocity);
    }
}

function hitTarget(bullet, target) {
    // 销毁子弹
    bullet.setActive(false);
    bullet.setVisible(false);
    bullet.body.stop(); 
    bullet.x = -100; // 移出屏幕
    bullet.y = -100; 

    if (target.getData('isCorrect')) {
        // 答对了！
        console.log("Correct!");
        displayNextWord(this);
    } else {
        // 答错了
        console.log("Wrong!");
        target.destroy();
    }
}
