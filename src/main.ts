import * as Phaser from 'phaser';

class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
    }

    preload(): void {
        // アセットの読み込み処理
    }

    create(): void {
        // ゲームオブジェクトの初期化
        const text = this.add.text(960, 540, 'Phaser3 Simulation RPG', {
            fontSize: '64px',
            color: '#ffffff',
        });
        text.setOrigin(0.5);
    }

    update(): void {
        // ゲームループ処理
    }
}

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 1920,
    height: 1080,
    parent: 'game-container',
    backgroundColor: '#2c3e50',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 0 },
            debug: false,
        },
    },
    scene: MainScene,
};

// ゲーム開始
new Phaser.Game(config);