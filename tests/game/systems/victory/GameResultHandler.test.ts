/**
 * GameResultHandlerのテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as Phaser from 'phaser';
import { GameResultHandler } from '../../../../game/src/systems/victory/GameResultHandler';
import { GameResult } from '../../../../game/src/types/victory';

describe('GameResultHandler', () => {
  let scene: Phaser.Scene;
  let handler: GameResultHandler;
  let mockCamera: any;

  beforeEach(() => {
    // モックカメラを作成
    mockCamera = {
      fadeOut: vi.fn(),
      once: vi.fn((event: string, callback: () => void) => {
        // フェード完了を即座に呼び出す
        if (event === 'camerafadeoutcomplete') {
          setTimeout(callback, 0);
        }
      }),
    };

    // モックシーンを作成
    scene = {
      scene: {
        key: 'TestScene',
      },
      input: {
        enabled: true,
      },
      cameras: {
        main: mockCamera,
      },
      physics: {
        world: {},
        pause: vi.fn(),
        resume: vi.fn(),
      },
      time: {
        paused: false,
      },
    } as any;

    handler = new GameResultHandler(scene);
  });

  describe('handleVictory', () => {
    it('勝利処理を正常に実行できる', async () => {
      const result: GameResult = {
        result: 'victory',
        timestamp: Date.now(),
        turnCount: 10,
        message: 'ステージクリア！',
      };

      const handlerResult = await handler.handleVictory(result);

      expect(handlerResult.success).toBe(true);
      expect(handlerResult.transitionComplete).toBe(false);
      expect(handler.isGameProgressionStopped()).toBe(true);
      expect(handler.getCurrentResult()).toEqual(result);
    });

    it('勝利イベントを発行する', async () => {
      const result: GameResult = {
        result: 'victory',
        timestamp: Date.now(),
        turnCount: 10,
        message: 'ステージクリア！',
      };

      const victoryListener = vi.fn();
      handler.on('victory', victoryListener);

      await handler.handleVictory(result);

      expect(victoryListener).toHaveBeenCalledWith(result);
    });

    it('ゲーム進行を停止する', async () => {
      const result: GameResult = {
        result: 'victory',
        timestamp: Date.now(),
        turnCount: 10,
        message: 'ステージクリア！',
      };

      await handler.handleVictory(result);

      expect(scene.input.enabled).toBe(false);
      expect(scene.physics.pause).toHaveBeenCalled();
      expect(scene.time.paused).toBe(true);
    });

    it('既に停止している場合はエラーを返す', async () => {
      const result: GameResult = {
        result: 'victory',
        timestamp: Date.now(),
        turnCount: 10,
        message: 'ステージクリア！',
      };

      await handler.handleVictory(result);
      const secondResult = await handler.handleVictory(result);

      expect(secondResult.success).toBe(false);
      expect(secondResult.error).toBe('Game already stopped');
    });
  });

  describe('handleDefeat', () => {
    it('敗北処理を正常に実行できる', async () => {
      const result: GameResult = {
        result: 'defeat',
        timestamp: Date.now(),
        turnCount: 5,
        message: 'ゲームオーバー',
      };

      const handlerResult = await handler.handleDefeat(result);

      expect(handlerResult.success).toBe(true);
      expect(handlerResult.transitionComplete).toBe(false);
      expect(handler.isGameProgressionStopped()).toBe(true);
      expect(handler.getCurrentResult()).toEqual(result);
    });

    it('敗北イベントを発行する', async () => {
      const result: GameResult = {
        result: 'defeat',
        timestamp: Date.now(),
        turnCount: 5,
        message: 'ゲームオーバー',
      };

      const defeatListener = vi.fn();
      handler.on('defeat', defeatListener);

      await handler.handleDefeat(result);

      expect(defeatListener).toHaveBeenCalledWith(result);
    });

    it('ゲーム進行を停止する', async () => {
      const result: GameResult = {
        result: 'defeat',
        timestamp: Date.now(),
        turnCount: 5,
        message: 'ゲームオーバー',
      };

      await handler.handleDefeat(result);

      expect(scene.input.enabled).toBe(false);
      expect(scene.physics.pause).toHaveBeenCalled();
      expect(scene.time.paused).toBe(true);
    });

    it('既に停止している場合はエラーを返す', async () => {
      const result: GameResult = {
        result: 'defeat',
        timestamp: Date.now(),
        turnCount: 5,
        message: 'ゲームオーバー',
      };

      await handler.handleDefeat(result);
      const secondResult = await handler.handleDefeat(result);

      expect(secondResult.success).toBe(false);
      expect(secondResult.error).toBe('Game already stopped');
    });
  });

  describe('transitionToVictoryScreen', () => {
    it('勝利画面への遷移を準備できる', async () => {
      const result: GameResult = {
        result: 'victory',
        timestamp: Date.now(),
        turnCount: 10,
        message: 'ステージクリア！',
      };

      await handler.handleVictory(result);

      const transitionResult = await handler.transitionToVictoryScreen();

      expect(transitionResult.success).toBe(true);
      expect(transitionResult.transitionComplete).toBe(true);
      expect(mockCamera.fadeOut).toHaveBeenCalled();
    });

    it('遷移イベントを発行する', async () => {
      const result: GameResult = {
        result: 'victory',
        timestamp: Date.now(),
        turnCount: 10,
        message: 'ステージクリア！',
      };

      await handler.handleVictory(result);

      const transitionListener = vi.fn();
      handler.on('transition-to-victory', transitionListener);

      await handler.transitionToVictoryScreen();

      expect(transitionListener).toHaveBeenCalled();
      const callArgs = transitionListener.mock.calls[0][0];
      expect(callArgs.result).toEqual(result);
      expect(callArgs.previousScene).toBe('TestScene');
    });

    it('カスタムオプションで遷移できる', async () => {
      const result: GameResult = {
        result: 'victory',
        timestamp: Date.now(),
        turnCount: 10,
        message: 'ステージクリア！',
      };

      await handler.handleVictory(result);

      const customOptions = {
        duration: 500,
        fadeOut: false,
        data: { custom: 'data' },
      };

      const transitionResult = await handler.transitionToVictoryScreen(customOptions);

      expect(transitionResult.success).toBe(true);
      expect(mockCamera.fadeOut).not.toHaveBeenCalled();
    });

    it('フェードアウトなしで遷移できる', async () => {
      const result: GameResult = {
        result: 'victory',
        timestamp: Date.now(),
        turnCount: 10,
        message: 'ステージクリア！',
      };

      await handler.handleVictory(result);

      const transitionResult = await handler.transitionToVictoryScreen({
        fadeOut: false,
      });

      expect(transitionResult.success).toBe(true);
      expect(mockCamera.fadeOut).not.toHaveBeenCalled();
    });
  });

  describe('transitionToDefeatScreen', () => {
    it('敗北画面への遷移を準備できる', async () => {
      const result: GameResult = {
        result: 'defeat',
        timestamp: Date.now(),
        turnCount: 5,
        message: 'ゲームオーバー',
      };

      await handler.handleDefeat(result);

      const transitionResult = await handler.transitionToDefeatScreen();

      expect(transitionResult.success).toBe(true);
      expect(transitionResult.transitionComplete).toBe(true);
      expect(mockCamera.fadeOut).toHaveBeenCalled();
    });

    it('遷移イベントを発行する', async () => {
      const result: GameResult = {
        result: 'defeat',
        timestamp: Date.now(),
        turnCount: 5,
        message: 'ゲームオーバー',
      };

      await handler.handleDefeat(result);

      const transitionListener = vi.fn();
      handler.on('transition-to-defeat', transitionListener);

      await handler.transitionToDefeatScreen();

      expect(transitionListener).toHaveBeenCalled();
      const callArgs = transitionListener.mock.calls[0][0];
      expect(callArgs.result).toEqual(result);
      expect(callArgs.previousScene).toBe('TestScene');
    });

    it('カスタムオプションで遷移できる', async () => {
      const result: GameResult = {
        result: 'defeat',
        timestamp: Date.now(),
        turnCount: 5,
        message: 'ゲームオーバー',
      };

      await handler.handleDefeat(result);

      const customOptions = {
        duration: 500,
        fadeOut: false,
        data: { custom: 'data' },
      };

      const transitionResult = await handler.transitionToDefeatScreen(customOptions);

      expect(transitionResult.success).toBe(true);
      expect(mockCamera.fadeOut).not.toHaveBeenCalled();
    });
  });

  describe('stopGameProgression', () => {
    it('ゲーム進行を停止できる', () => {
      handler.stopGameProgression();

      expect(handler.isGameProgressionStopped()).toBe(true);
      expect(scene.input.enabled).toBe(false);
      expect(scene.physics.pause).toHaveBeenCalled();
      expect(scene.time.paused).toBe(true);
    });

    it('game-stoppedイベントを発行する', () => {
      const stoppedListener = vi.fn();
      handler.on('game-stopped', stoppedListener);

      handler.stopGameProgression();

      expect(stoppedListener).toHaveBeenCalled();
    });

    it('既に停止している場合は警告を出す', () => {
      const consoleSpy = vi.spyOn(console, 'warn');

      handler.stopGameProgression();
      handler.stopGameProgression();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[GameResultHandler] ゲームは既に停止しています'
      );
    });

    it('カメラが存在しない場合でも動作する', () => {
      scene.cameras = null as any;
      handler = new GameResultHandler(scene);

      expect(() => handler.stopGameProgression()).not.toThrow();
      expect(handler.isGameProgressionStopped()).toBe(true);
    });
  });

  describe('reset', () => {
    it('状態をリセットできる', async () => {
      const result: GameResult = {
        result: 'victory',
        timestamp: Date.now(),
        turnCount: 10,
        message: 'ステージクリア！',
      };

      await handler.handleVictory(result);
      handler.reset();

      expect(handler.isGameProgressionStopped()).toBe(false);
      expect(handler.getCurrentResult()).toBeNull();
      expect(scene.input.enabled).toBe(true);
      expect(scene.physics.resume).toHaveBeenCalled();
      expect(scene.time.paused).toBe(false);
    });

    it('イベントリスナーをクリアする', async () => {
      const victoryListener = vi.fn();
      handler.on('victory', victoryListener);

      const result: GameResult = {
        result: 'victory',
        timestamp: Date.now(),
        turnCount: 10,
        message: 'ステージクリア！',
      };

      handler.reset();
      await handler.handleVictory(result);

      expect(victoryListener).not.toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('リソースを破棄できる', () => {
      handler.destroy();

      expect(handler.isGameProgressionStopped()).toBe(false);
      expect(handler.getCurrentResult()).toBeNull();
    });
  });

  describe('エッジケース', () => {
    it('カメラが存在しない場合でもフェードアウトできる', async () => {
      scene.cameras = null as any;
      handler = new GameResultHandler(scene);

      const result: GameResult = {
        result: 'victory',
        timestamp: Date.now(),
        turnCount: 10,
        message: 'ステージクリア！',
      };

      await handler.handleVictory(result);
      const transitionResult = await handler.transitionToVictoryScreen();

      expect(transitionResult.success).toBe(true);
    });

    it('物理演算が存在しない場合でも停止できる', () => {
      scene.physics = null as any;
      handler = new GameResultHandler(scene);

      expect(() => handler.stopGameProgression()).not.toThrow();
      expect(handler.isGameProgressionStopped()).toBe(true);
    });

    it('タイマーが存在しない場合でも停止できる', () => {
      scene.time = null as any;
      handler = new GameResultHandler(scene);

      expect(() => handler.stopGameProgression()).not.toThrow();
      expect(handler.isGameProgressionStopped()).toBe(true);
    });

    it('入力が存在しない場合でも停止できる', () => {
      scene.input = null as any;
      handler = new GameResultHandler(scene);

      expect(() => handler.stopGameProgression()).not.toThrow();
      expect(handler.isGameProgressionStopped()).toBe(true);
    });
  });

  describe('統合シナリオ', () => {
    it('勝利から画面遷移までの完全なフロー', async () => {
      const result: GameResult = {
        result: 'victory',
        timestamp: Date.now(),
        turnCount: 10,
        message: 'ステージクリア！',
      };

      // 勝利処理
      const victoryResult = await handler.handleVictory(result);
      expect(victoryResult.success).toBe(true);
      expect(handler.isGameProgressionStopped()).toBe(true);

      // 画面遷移
      const transitionResult = await handler.transitionToVictoryScreen();
      expect(transitionResult.success).toBe(true);
      expect(transitionResult.transitionComplete).toBe(true);
    });

    it('敗北から画面遷移までの完全なフロー', async () => {
      const result: GameResult = {
        result: 'defeat',
        timestamp: Date.now(),
        turnCount: 5,
        message: 'ゲームオーバー',
      };

      // 敗北処理
      const defeatResult = await handler.handleDefeat(result);
      expect(defeatResult.success).toBe(true);
      expect(handler.isGameProgressionStopped()).toBe(true);

      // 画面遷移
      const transitionResult = await handler.transitionToDefeatScreen();
      expect(transitionResult.success).toBe(true);
      expect(transitionResult.transitionComplete).toBe(true);
    });

    it('複数のイベントリスナーが正しく動作する', async () => {
      const victoryListener = vi.fn();
      const stoppedListener = vi.fn();
      const transitionListener = vi.fn();

      handler.on('victory', victoryListener);
      handler.on('game-stopped', stoppedListener);
      handler.on('transition-to-victory', transitionListener);

      const result: GameResult = {
        result: 'victory',
        timestamp: Date.now(),
        turnCount: 10,
        message: 'ステージクリア！',
      };

      await handler.handleVictory(result);
      await handler.transitionToVictoryScreen();

      expect(victoryListener).toHaveBeenCalledOnce();
      expect(stoppedListener).toHaveBeenCalledOnce();
      expect(transitionListener).toHaveBeenCalledOnce();
    });
  });
});
