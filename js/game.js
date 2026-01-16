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
    // We'll load assets here later
}

function create () {
    // Create player cannon
    player = this.add.rectangle(400, 550, 50, 100, 0x6666ff).setOrigin(0.5);

    // Display first word
    displayNextWord();

    // Setup input for firing bullets
    this.input.on('pointerdown', fireBullet, this);

    bullets = this.physics.add.group({
        defaultKey: 'bullet',
        maxSize: 10
    });
}

function update () {
    // Game loop logic will go here
}

function displayNextWord() {
    currentWord = Phaser.Utils.Array.GetRandom(words);

    if (wordText) {
        wordText.destroy();
    }

    wordText = this.add.text(400, 580, currentWord.en, { font: '32px Arial', fill: '#ffffff' }).setOrigin(0.5);

    // Create targets with correct and incorrect answers
    createTargets();
}

function createTargets() {
    if (targets) {
        targets.clear(true, true);
    }

    targets = this.physics.add.group();

    // Add correct target
    let correctTarget = createTarget(Phaser.Math.Between(100, 700), Phaser.Math.Between(100, 400), currentWord.cn, true);
    targets.add(correctTarget);

    // Add incorrect targets
    let incorrectWords = words.filter(word => word.en !== currentWord.en);
    for (let i = 0; i < 3; i++) {
        let randomWord = Phaser.Utils.Array.GetRandom(incorrectWords);
        let incorrectTarget = createTarget(Phaser.Math.Between(100, 700), Phaser.Math.Between(100, 400), randomWord.cn, false);
        targets.add(incorrectTarget);
        // Prevent using the same incorrect word twice
        incorrectWords = incorrectWords.filter(word => word.en !== randomWord.en);
    }
}

function createTarget(x, y, text, isCorrect) {
    let targetContainer = this.add.container(x, y);
    let targetText = this.add.text(0, 0, text, { font: '24px Arial', fill: '#000000' }).setOrigin(0.5);
    let targetBg = this.add.rectangle(0, 0, targetText.width + 20, targetText.height + 10, 0xffffff).setOrigin(0.5);
    targetContainer.add([targetBg, targetText]);
    this.physics.world.enable(targetContainer);
    targetContainer.body.setData('isCorrect', isCorrect);
    return targetContainer;
}

function fireBullet() {
    let bullet = bullets.get(player.x, player.y - 50);
    if (bullet) {
        bullet.setActive(true);
        bullet.setVisible(true);
        bullet.body.velocity.y = -500;
    }
}
