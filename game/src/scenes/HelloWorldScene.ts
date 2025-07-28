import * as Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';

/**
 * HelloWorldシーンクラス
 * Phaser.Sceneを継承し、基本的な"Hello World"表示機能を提供する
 */
export class HelloWorldScene extends Phaser.Scene {
  // プライベートプロパティ（適切なTypeScript型注釈付き）
  private helloText?: Phaser.GameObjects.Text;
  private backgroundGraphics?: Phaser.GameObjects.Graphics;

  /**
   * コンストラクタ
   * シーンキーを設定してPhaser.Sceneを初期化
   */
  constructor() {
    super({ key: 'HelloWorldScene' });
  }

  /**
   * Phaserライフサイクルメソッド: preload
   * アセットの読み込みを行う（現在は将来的な拡張用として空実装）
   */
  public preload(): void {
    // 将来的なアセット読み込み用
    // 現在は基本的なテキスト表示のみなので空実装
    console.log('HelloWorldScene: preload phase');
  }

  /**
   * Phaserライフサイクルメソッド: create
   * シーンの初期化とオブジェクトの作成を行う
   */
  public create(): void {
    console.log('HelloWorldScene: create phase');

    // 背景設定
    this.setupBackground();

    // Hello Worldテキスト作成
    this.createHelloWorldText();

    console.log('HelloWorldScene: initialization completed');
  }

  /**
   * Phaserライフサイクルメソッド: update
   * ゲームループ処理（現在は空実装）
   * @param _time - ゲーム開始からの経過時間（ミリ秒）
   * @param _delta - 前フレームからの経過時間（ミリ秒）
   */
  public update(_time: number, _delta: number): void {
    // 現在は特別な更新処理は不要
    // 将来的にアニメーションやインタラクションを追加する際に使用
  }

  /**
   * プライベートヘルパーメソッド: Hello Worldテキストの作成
   * 画面中央に"Hello World"テキストを表示する
   */
  private createHelloWorldText(): void {
    try {
      // 画面中央の座標を計算
      const centerX: number = GameConfig.GAME_WIDTH / 2;
      const centerY: number = GameConfig.GAME_HEIGHT / 2;

      // テキストスタイルの定義
      const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
        fontSize: '64px',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: '#000000',
          blur: 4,
          fill: true,
        },
      };

      // Hello Worldテキストオブジェクトを作成
      this.helloText = this.add.text(centerX, centerY, 'Hello World', textStyle);

      // テキストを中央に配置（setOrigin(0.5)で中央基準点に設定）
      this.helloText.setOrigin(0.5, 0.5);

      // デバッグ情報をコンソールに出力
      console.log(`Hello World text created at position: (${centerX}, ${centerY})`);
    } catch (error) {
      console.error('Error creating Hello World text:', error);
    }
  }

  /**
   * プライベートヘルパーメソッド: 背景設定
   * ゲーム背景の色と視覚設定を構成する
   */
  private setupBackground(): void {
    try {
      // グラフィックスオブジェクトを作成
      this.backgroundGraphics = this.add.graphics();

      // 背景色を設定（GameConfigから取得）
      this.backgroundGraphics.fillStyle(
        Phaser.Display.Color.HexStringToColor(GameConfig.BACKGROUND_COLOR).color
      );

      // 画面全体を背景色で塗りつぶし
      this.backgroundGraphics.fillRect(0, 0, GameConfig.GAME_WIDTH, GameConfig.GAME_HEIGHT);

      // 背景を最背面に配置
      this.backgroundGraphics.setDepth(-1);

      console.log(`Background setup completed with color: ${GameConfig.BACKGROUND_COLOR}`);
    } catch (error) {
      console.error('Error setting up background:', error);
    }
  }

  /**
   * シーンの破棄時に呼ばれるクリーンアップメソッド
   * Phaserのシーンライフサイクルで自動的に呼ばれる
   */
  public destroy(): void {
    // メモリリーク防止のためのクリーンアップ
    if (this.helloText) {
      this.helloText.destroy();
      this.helloText = undefined;
    }

    if (this.backgroundGraphics) {
      this.backgroundGraphics.destroy();
      this.backgroundGraphics = undefined;
    }

    console.log('HelloWorldScene: cleanup completed');
  }
}
