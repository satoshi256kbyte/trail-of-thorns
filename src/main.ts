import * as Phaser from 'phaser';
import { GameConfig } from '../game/src/config/GameConfig';
import { HelloWorldScene } from '../game/src/scenes/HelloWorldScene';

// GameConfigクラスのインスタンスを作成
const gameConfig = new GameConfig();

// 設定の検証を実行
if (!gameConfig.validateConfig()) {
    console.error('Game configuration validation failed');
    throw new Error('Invalid game configuration');
}

// Phaser設定を取得
const config: Phaser.Types.Core.GameConfig = gameConfig.getConfig();

// シーン配列にHelloWorldSceneを登録
config.scene = [HelloWorldScene];

// デバッグ用の設定情報をコンソールに出力
if (process.env.NODE_ENV === 'development') {
    gameConfig.logConfig();
    console.log('Development mode: Debug information enabled');
}

// ゲーム開始
const game = new Phaser.Game(config);

// デバッグ用のグローバルゲームオブジェクトを追加
declare global {
    interface Window {
        game: Phaser.Game;
        gameConfig: GameConfig;
    }
}

// グローバルオブジェクトとして公開（デバッグ用）
window.game = game;
window.gameConfig = gameConfig;

console.log('Game initialized successfully');
console.log('Global objects available: window.game, window.gameConfig');
