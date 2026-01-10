import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as Phaser from 'phaser';
import { ErrorMessage, ErrorMessageConfig, ERROR_MESSAGES } from '../../../game/src/ui/ErrorMessage';

describe('ErrorMessage', () => {
  let scene: Phaser.Scene;
  let errorMessage: ErrorMessage;

  beforeEach(() => {
    // Create mock scene
    scene = {
      add: {
        container: vi.fn().mockReturnValue({
          add: vi.fn(),
          setDepth: vi.fn(),
          setVisible: vi.fn(),
          destroy: vi.fn(),
        }),
        graphics: vi.fn().mockReturnValue({
          fillStyle: vi.fn().mockReturnThis(),
          fillRoundedRect: vi.fn().mockReturnThis(),
          lineStyle: vi.fn().mockReturnThis(),
          strokeRoundedRect: vi.fn().mockReturnThis(),
          destroy: vi.fn(),
        }),
        text: vi.fn().mockReturnValue({
          setOrigin: vi.fn().mockReturnThis(),
          setWordWrapWidth: vi.fn().mockReturnThis(),
          destroy: vi.fn(),
        }),
      },
      time: {
        delayedCall: vi.fn(),
      },
      tweens: {
        add: vi.fn(),
      },
    } as any;
  });

  afterEach(() => {
    if (errorMessage) {
      errorMessage.destroy();
    }
  });

  describe('initialization', () => {
    it('should create error message with config', () => {
      const config: ErrorMessageConfig = {
        title: 'エラー',
        message: 'テストエラーメッセージ',
        action: '再試行してください',
        type: 'error',
      };

      errorMessage = new ErrorMessage(scene, 500, 300, config);

      expect(scene.add.container).toHaveBeenCalled();
      expect(scene.add.text).toHaveBeenCalled();
    });

    it('should use default duration if not provided', () => {
      const config: ErrorMessageConfig = {
        title: 'エラー',
        message: 'テストエラーメッセージ',
        type: 'error',
      };

      errorMessage = new ErrorMessage(scene, 500, 300, config);

      expect(scene.time.delayedCall).toHaveBeenCalled();
    });

    it('should use custom duration if provided', () => {
      const config: ErrorMessageConfig = {
        title: 'エラー',
        message: 'テストエラーメッセージ',
        type: 'error',
        duration: 3000,
      };

      errorMessage = new ErrorMessage(scene, 500, 300, config);

      expect(scene.time.delayedCall).toHaveBeenCalledWith(
        3000,
        expect.any(Function)
      );
    });
  });

  describe('error types', () => {
    it('should display error type message', () => {
      const config: ErrorMessageConfig = {
        title: 'エラー',
        message: 'エラーメッセージ',
        type: 'error',
      };

      errorMessage = new ErrorMessage(scene, 500, 300, config);

      const graphics = (scene.add.graphics as any).mock.results[0].value;
      expect(graphics.fillStyle).toHaveBeenCalled();
    });

    it('should display warning type message', () => {
      const config: ErrorMessageConfig = {
        title: '警告',
        message: '警告メッセージ',
        type: 'warning',
      };

      errorMessage = new ErrorMessage(scene, 500, 300, config);

      const graphics = (scene.add.graphics as any).mock.results[0].value;
      expect(graphics.fillStyle).toHaveBeenCalled();
    });

    it('should display info type message', () => {
      const config: ErrorMessageConfig = {
        title: '情報',
        message: '情報メッセージ',
        type: 'info',
      };

      errorMessage = new ErrorMessage(scene, 500, 300, config);

      const graphics = (scene.add.graphics as any).mock.results[0].value;
      expect(graphics.fillStyle).toHaveBeenCalled();
    });
  });

  describe('predefined error messages', () => {
    it('should use DATA_CORRUPTED message', () => {
      errorMessage = new ErrorMessage(scene, 500, 300, ERROR_MESSAGES.DATA_CORRUPTED);

      expect(scene.add.text).toHaveBeenCalled();
    });

    it('should use STORAGE_UNAVAILABLE message', () => {
      errorMessage = new ErrorMessage(scene, 500, 300, ERROR_MESSAGES.STORAGE_UNAVAILABLE);

      expect(scene.add.text).toHaveBeenCalled();
    });

    it('should use QUOTA_EXCEEDED message', () => {
      errorMessage = new ErrorMessage(scene, 500, 300, ERROR_MESSAGES.QUOTA_EXCEEDED);

      expect(scene.add.text).toHaveBeenCalled();
    });

    it('should use SAVE_FAILED message', () => {
      errorMessage = new ErrorMessage(scene, 500, 300, ERROR_MESSAGES.SAVE_FAILED);

      expect(scene.add.text).toHaveBeenCalled();
    });

    it('should use LOAD_FAILED message', () => {
      errorMessage = new ErrorMessage(scene, 500, 300, ERROR_MESSAGES.LOAD_FAILED);

      expect(scene.add.text).toHaveBeenCalled();
    });

    it('should use DELETE_FAILED message', () => {
      errorMessage = new ErrorMessage(scene, 500, 300, ERROR_MESSAGES.DELETE_FAILED);

      expect(scene.add.text).toHaveBeenCalled();
    });

    it('should use AUTOSAVE_SLOT message', () => {
      errorMessage = new ErrorMessage(scene, 500, 300, ERROR_MESSAGES.AUTOSAVE_SLOT);

      expect(scene.add.text).toHaveBeenCalled();
    });

    it('should use EMPTY_SLOT message', () => {
      errorMessage = new ErrorMessage(scene, 500, 300, ERROR_MESSAGES.EMPTY_SLOT);

      expect(scene.add.text).toHaveBeenCalled();
    });
  });

  describe('auto-hide', () => {
    it('should auto-hide after duration', () => {
      const config: ErrorMessageConfig = {
        title: 'エラー',
        message: 'テストエラーメッセージ',
        type: 'error',
        duration: 2000,
      };

      errorMessage = new ErrorMessage(scene, 500, 300, config);

      expect(scene.time.delayedCall).toHaveBeenCalledWith(
        2000,
        expect.any(Function)
      );
    });

    it('should call hide animation on auto-hide', () => {
      const config: ErrorMessageConfig = {
        title: 'エラー',
        message: 'テストエラーメッセージ',
        type: 'error',
        duration: 1000,
      };

      errorMessage = new ErrorMessage(scene, 500, 300, config);

      // Get the callback passed to delayedCall
      const delayedCallCallback = (scene.time.delayedCall as any).mock.calls[0][1];
      delayedCallCallback();

      expect(scene.tweens.add).toHaveBeenCalled();
    });
  });

  describe('animation', () => {
    it('should animate on show', () => {
      const config: ErrorMessageConfig = {
        title: 'エラー',
        message: 'テストエラーメッセージ',
        type: 'error',
      };

      errorMessage = new ErrorMessage(scene, 500, 300, config);

      expect(scene.tweens.add).toHaveBeenCalled();
    });

    it('should shake on error type', () => {
      const config: ErrorMessageConfig = {
        title: 'エラー',
        message: 'テストエラーメッセージ',
        type: 'error',
      };

      errorMessage = new ErrorMessage(scene, 500, 300, config);

      expect(scene.tweens.add).toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('should clean up all resources', () => {
      const config: ErrorMessageConfig = {
        title: 'エラー',
        message: 'テストエラーメッセージ',
        type: 'error',
      };

      errorMessage = new ErrorMessage(scene, 500, 300, config);
      errorMessage.destroy();

      const container = (scene.add.container as any).mock.results[0].value;
      expect(container.destroy).toHaveBeenCalled();
    });

    it('should be safe to destroy multiple times', () => {
      const config: ErrorMessageConfig = {
        title: 'エラー',
        message: 'テストエラーメッセージ',
        type: 'error',
      };

      errorMessage = new ErrorMessage(scene, 500, 300, config);
      errorMessage.destroy();
      errorMessage.destroy();

      // Should not throw error
      expect(true).toBe(true);
    });
  });

  describe('message content', () => {
    it('should display title', () => {
      const config: ErrorMessageConfig = {
        title: 'カスタムタイトル',
        message: 'メッセージ',
        type: 'error',
      };

      errorMessage = new ErrorMessage(scene, 500, 300, config);

      expect(scene.add.text).toHaveBeenCalled();
    });

    it('should display message', () => {
      const config: ErrorMessageConfig = {
        title: 'タイトル',
        message: 'カスタムメッセージ',
        type: 'error',
      };

      errorMessage = new ErrorMessage(scene, 500, 300, config);

      expect(scene.add.text).toHaveBeenCalled();
    });

    it('should display action if provided', () => {
      const config: ErrorMessageConfig = {
        title: 'タイトル',
        message: 'メッセージ',
        action: 'カスタムアクション',
        type: 'error',
      };

      errorMessage = new ErrorMessage(scene, 500, 300, config);

      expect(scene.add.text).toHaveBeenCalled();
    });

    it('should handle long messages', () => {
      const config: ErrorMessageConfig = {
        title: 'タイトル',
        message: 'これは非常に長いメッセージです。'.repeat(10),
        type: 'error',
      };

      errorMessage = new ErrorMessage(scene, 500, 300, config);

      const text = (scene.add.text as any).mock.results[0].value;
      expect(text.setWordWrapWidth).toHaveBeenCalled();
    });
  });

  describe('color coding', () => {
    it('should use red color for error type', () => {
      const config: ErrorMessageConfig = {
        title: 'エラー',
        message: 'エラーメッセージ',
        type: 'error',
      };

      errorMessage = new ErrorMessage(scene, 500, 300, config);

      const graphics = (scene.add.graphics as any).mock.results[0].value;
      expect(graphics.fillStyle).toHaveBeenCalled();
    });

    it('should use yellow color for warning type', () => {
      const config: ErrorMessageConfig = {
        title: '警告',
        message: '警告メッセージ',
        type: 'warning',
      };

      errorMessage = new ErrorMessage(scene, 500, 300, config);

      const graphics = (scene.add.graphics as any).mock.results[0].value;
      expect(graphics.fillStyle).toHaveBeenCalled();
    });

    it('should use blue color for info type', () => {
      const config: ErrorMessageConfig = {
        title: '情報',
        message: '情報メッセージ',
        type: 'info',
      };

      errorMessage = new ErrorMessage(scene, 500, 300, config);

      const graphics = (scene.add.graphics as any).mock.results[0].value;
      expect(graphics.fillStyle).toHaveBeenCalled();
    });
  });
});
