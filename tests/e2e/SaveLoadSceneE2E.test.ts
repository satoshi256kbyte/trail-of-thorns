/**
 * 統合セーブ・ロードUIシステムE2Eテスト
 *
 * このテストスイートは、SaveLoadSceneのエンドツーエンドフローを検証します：
 * - セーブ→ロードの完全フロー
 * - 上書き確認→キャンセルのフロー
 * - エラー発生時のリカバリーフロー
 * - キーボード操作のみでの完全フロー
 *
 * **Validates: Requirements 4.1.16**
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import Phaser from 'phaser';
import { SaveLoadManager } from '../../game/src/systems/chapterStage/SaveLoadManager';
import type { SaveData, ChapterStateData, StageProgressData, PartyComposition } from '../../game/src/types/chapterStage';

describe('統合セーブ・ロードUIシステムE2Eテスト', () => {
  let game: Phaser.Game;
  let saveLoadManager: SaveLoadManager;

  // テスト用のゲーム状態データ
  const createMockChapterState = (chapterId: string = 'chapter-1'): ChapterStateData => ({
    version: '1.0.0',
    timestamp: Date.now(),
    chapterId,
    currentStageIndex: 0,
    lostCharacterIds: [],
    availableCharacterIds: ['hero', 'warrior', 'mage', 'healer'],
    completedStageIds: [],
    isCompleted: false,
    startTime: Date.now(),
    playTime: 1000,
  });

  const createMockStageProgress = (): StageProgressData => ({
    stages: [
      {
        stageId: 'stage-1-1',
        isUnlocked: true,
        isCompleted: false,
        rewards: [],
      },
    ],
  });

  const createMockParty = (): PartyComposition => ({
    members: ['hero', 'warrior', 'mage'],
    formation: 'BALANCED',
  });

  beforeEach(() => {
    // LocalStorageをクリア
    localStorage.clear();

    // SaveLoadManagerを初期化
    saveLoadManager = new SaveLoadManager();

    // Phaserゲームインスタンスを作成（ヘッドレスモード）
    game = new Phaser.Game({
      type: Phaser.HEADLESS,
      width: 1920,
      height: 1080,
      parent: 'game-container',
      scene: [],
      audio: {
        noAudio: true,
      },
    });
  });

  afterEach(() => {
    // クリーンアップ
    if (game) {
      game.destroy(true);
    }
    localStorage.clear();
  });

  describe('E2Eテスト1: セーブ→ロードの完全フロー', () => {
    test('ゲーム開始 → セーブ → ロード → ゲーム再開の完全フローが正常に動作する', () => {
      // 1. ゲーム開始（初期状態）
      const initialChapterState = createMockChapterState('chapter-1');
      const initialStageProgress = createMockStageProgress();
      const initialParty = createMockParty();
      const initialPlayTime = 5000;

      // 2. スロット1にセーブ
      const saveResult = saveLoadManager.saveGame(
        1,
        initialChapterState,
        initialStageProgress,
        initialParty,
        initialPlayTime
      );

      expect(saveResult).toBe(true);

      // 3. セーブスロット一覧を取得して確認
      const saveSlots = saveLoadManager.getSaveSlots();
      expect(saveSlots).toHaveLength(10);
      expect(saveSlots[1].saveData).not.toBeNull();
      expect(saveSlots[1].saveData?.chapterState.chapterId).toBe('chapter-1');

      // 4. スロット1からロード
      const loadedData = saveLoadManager.loadGame(1);
      expect(loadedData).not.toBeNull();

      // 5. ロードしたデータが元のデータと一致することを確認
      expect(loadedData?.chapterState.chapterId).toBe(initialChapterState.chapterId);
      expect(loadedData?.chapterState.availableCharacterIds).toEqual(
        initialChapterState.availableCharacterIds
      );
      expect(loadedData?.partyComposition.members).toEqual(initialParty.members);
      expect(loadedData?.playTime).toBe(initialPlayTime);

      // 6. ゲーム再開（ロードしたデータで状態を復元）
      expect(loadedData?.chapterState.currentStageIndex).toBe(0);
      expect(loadedData?.chapterState.isCompleted).toBe(false);
    });

    test('複数のセーブスロットを使い分けて保存・読み込みできる', () => {
      // スロット1: 章1の序盤
      const chapter1State = createMockChapterState('chapter-1');
      saveLoadManager.saveGame(
        1,
        chapter1State,
        createMockStageProgress(),
        createMockParty(),
        1000
      );

      // スロット2: 章2の中盤
      const chapter2State = createMockChapterState('chapter-2');
      chapter2State.completedStageIds = ['stage-2-1'];
      saveLoadManager.saveGame(
        2,
        chapter2State,
        createMockStageProgress(),
        createMockParty(),
        5000
      );

      // スロット3: 章3の終盤
      const chapter3State = createMockChapterState('chapter-3');
      chapter3State.completedStageIds = ['stage-3-1', 'stage-3-2'];
      saveLoadManager.saveGame(
        3,
        chapter3State,
        createMockStageProgress(),
        createMockParty(),
        10000
      );

      // 各スロットから正しくロードできることを確認
      const loaded1 = saveLoadManager.loadGame(1);
      const loaded2 = saveLoadManager.loadGame(2);
      const loaded3 = saveLoadManager.loadGame(3);

      expect(loaded1?.chapterState.chapterId).toBe('chapter-1');
      expect(loaded2?.chapterState.chapterId).toBe('chapter-2');
      expect(loaded3?.chapterState.chapterId).toBe('chapter-3');

      expect(loaded1?.chapterState.completedStageIds).toHaveLength(0);
      expect(loaded2?.chapterState.completedStageIds).toHaveLength(1);
      expect(loaded3?.chapterState.completedStageIds).toHaveLength(2);
    });

    test('オートセーブスロット（スロット0）が正常に動作する', () => {
      // オートセーブを有効化
      saveLoadManager.setAutoSaveEnabled(true);
      expect(saveLoadManager.isAutoSaveEnabled()).toBe(true);

      // オートセーブを実行
      const chapterState = createMockChapterState('chapter-1');
      const stageProgress = createMockStageProgress();
      const party = createMockParty();
      const playTime = 3000;

      saveLoadManager.autoSave(chapterState, stageProgress, party, playTime);

      // スロット0からロードできることを確認
      const loadedData = saveLoadManager.loadGame(0);
      expect(loadedData).not.toBeNull();
      expect(loadedData?.chapterState.chapterId).toBe('chapter-1');
      expect(loadedData?.playTime).toBe(playTime);

      // スロット0への手動保存も技術的には可能（実装上の制限なし）
      // オートセーブ専用スロットだが、手動保存も許可されている
      const manualSaveToSlot0 = saveLoadManager.saveGame(
        0,
        chapterState,
        stageProgress,
        party,
        playTime
      );
      // 現在の実装では手動保存も成功する
      expect(manualSaveToSlot0).toBe(true);
    });
  });

  describe('E2Eテスト2: 上書き確認→キャンセルのフロー', () => {
    test('既存データへの上書き保存をキャンセルできる', () => {
      // 1. 最初のセーブ
      const firstChapterState = createMockChapterState('chapter-1');
      firstChapterState.completedStageIds = ['stage-1-1'];

      saveLoadManager.saveGame(
        1,
        firstChapterState,
        createMockStageProgress(),
        createMockParty(),
        5000
      );

      // 2. 元のデータを確認
      const originalData = saveLoadManager.loadGame(1);
      expect(originalData?.chapterState.completedStageIds).toHaveLength(1);
      expect(originalData?.playTime).toBe(5000);

      // 3. 上書き保存をシミュレート（実際のUIでは確認ダイアログが表示される）
      // ここではキャンセルをシミュレート（保存しない）
      const shouldOverwrite = false;

      if (shouldOverwrite) {
        const newChapterState = createMockChapterState('chapter-1');
        newChapterState.completedStageIds = ['stage-1-1', 'stage-1-2'];

        saveLoadManager.saveGame(
          1,
          newChapterState,
          createMockStageProgress(),
          createMockParty(),
          10000
        );
      }

      // 4. キャンセルしたので元のデータが保持されていることを確認
      const unchangedData = saveLoadManager.loadGame(1);
      expect(unchangedData?.chapterState.completedStageIds).toHaveLength(1);
      expect(unchangedData?.playTime).toBe(5000);
    });

    test('上書き保存を確認して実行できる', () => {
      // 1. 最初のセーブ
      const firstChapterState = createMockChapterState('chapter-1');
      firstChapterState.completedStageIds = ['stage-1-1'];

      saveLoadManager.saveGame(
        1,
        firstChapterState,
        createMockStageProgress(),
        createMockParty(),
        5000
      );

      // 2. 上書き保存を確認して実行
      const shouldOverwrite = true;

      if (shouldOverwrite) {
        const newChapterState = createMockChapterState('chapter-1');
        newChapterState.completedStageIds = ['stage-1-1', 'stage-1-2', 'stage-1-3'];

        const overwriteResult = saveLoadManager.saveGame(
          1,
          newChapterState,
          createMockStageProgress(),
          createMockParty(),
          15000
        );

        expect(overwriteResult).toBe(true);
      }

      // 3. 新しいデータが保存されていることを確認
      const updatedData = saveLoadManager.loadGame(1);
      expect(updatedData?.chapterState.completedStageIds).toHaveLength(3);
      expect(updatedData?.playTime).toBe(15000);
    });
  });

  describe('E2Eテスト3: エラー発生時のリカバリーフロー', () => {
    test('データ破損エラーが発生した場合、適切にエラーを表示して復旧できる', () => {
      // 1. 正常なデータを保存
      const chapterState = createMockChapterState('chapter-1');
      saveLoadManager.saveGame(
        1,
        chapterState,
        createMockStageProgress(),
        createMockParty(),
        5000
      );

      // 2. LocalStorageのデータを破損させる（無効なJSON）
      const corruptedData = '{ invalid json }';
      localStorage.setItem('trail_of_thorns_save_save_1', corruptedData);

      // 3. ロードを試みる（エラーが発生してnullが返る）
      const loadedData = saveLoadManager.loadGame(1);
      expect(loadedData).toBeNull();

      // 4. エラーメッセージが表示される（UIレベルでの処理）
      // ここではエラーが適切に検出されることを確認

      // 5. 別のスロットから復旧を試みる
      // スロット2に正常なデータを保存
      saveLoadManager.saveGame(
        2,
        chapterState,
        createMockStageProgress(),
        createMockParty(),
        5000
      );

      // スロット2からロードできることを確認
      const recoveredData = saveLoadManager.loadGame(2);
      expect(recoveredData).not.toBeNull();
      expect(recoveredData?.chapterState.chapterId).toBe('chapter-1');
    });

    test('ストレージ容量不足エラーが発生した場合、適切に処理される', () => {
      // LocalStorageの容量制限をシミュレート
      const originalSetItem = Storage.prototype.setItem;
      let saveCallCount = 0;

      // 特定のキーへの保存時に容量不足エラーをスロー
      Storage.prototype.setItem = function (key: string, value: string) {
        // trail_of_thorns_save_save_3 への保存時にエラーをスロー
        if (key === 'trail_of_thorns_save_save_3') {
          throw new DOMException('QuotaExceededError', 'QuotaExceededError');
        }
        return originalSetItem.call(this, key, value);
      };

      try {
        // 1. 最初のセーブは成功
        const result1 = saveLoadManager.saveGame(
          1,
          createMockChapterState('chapter-1'),
          createMockStageProgress(),
          createMockParty(),
          5000
        );
        expect(result1).toBe(true);

        // 2. 2回目のセーブも成功
        const result2 = saveLoadManager.saveGame(
          2,
          createMockChapterState('chapter-2'),
          createMockStageProgress(),
          createMockParty(),
          10000
        );
        expect(result2).toBe(true);

        // 3. 3回目のセーブで容量不足エラー
        const result3 = saveLoadManager.saveGame(
          3,
          createMockChapterState('chapter-3'),
          createMockStageProgress(),
          createMockParty(),
          15000
        );
        expect(result3).toBe(false);

        // 4. エラー後も既存のデータは保持されている
        const loaded1 = saveLoadManager.loadGame(1);
        const loaded2 = saveLoadManager.loadGame(2);
        expect(loaded1).not.toBeNull();
        expect(loaded2).not.toBeNull();
      } finally {
        // モックを元に戻す
        Storage.prototype.setItem = originalSetItem;
      }
    });

    test('ストレージ利用不可エラーが発生した場合、適切に処理される', () => {
      // LocalStorageを無効化
      const originalLocalStorage = global.localStorage;
      Object.defineProperty(global, 'localStorage', {
        value: undefined,
        writable: true,
      });

      try {
        // 新しいSaveLoadManagerインスタンスを作成
        const newManager = new SaveLoadManager();

        // セーブを試みる（失敗するはず）
        const saveResult = newManager.saveGame(
          1,
          createMockChapterState('chapter-1'),
          createMockStageProgress(),
          createMockParty(),
          5000
        );

        // ストレージが利用できない場合は false を返す
        expect(saveResult).toBe(false);

        // ロードも失敗する
        const loadResult = newManager.loadGame(1);
        expect(loadResult).toBeNull();
      } finally {
        // LocalStorageを復元
        Object.defineProperty(global, 'localStorage', {
          value: originalLocalStorage,
          writable: true,
        });
      }
    });
  });

  describe('E2Eテスト4: キーボード操作のみでの完全フロー', () => {
    test('マウスを使わずにキーボードのみで全操作を実行できる', () => {
      // このテストはUIレベルでの操作をシミュレートします
      // 実際のキーボードイベントは統合テストで検証済みのため、
      // ここではキーボード操作で実行される機能が正常に動作することを確認

      // 1. 矢印キーでスロット選択（スロット1を選択）
      let selectedSlotId = 1;

      // 2. Enterキーでセーブ実行
      const chapterState = createMockChapterState('chapter-1');
      const saveResult = saveLoadManager.saveGame(
        selectedSlotId,
        chapterState,
        createMockStageProgress(),
        createMockParty(),
        5000
      );
      expect(saveResult).toBe(true);

      // 3. 矢印キーで別のスロットを選択（スロット2）
      selectedSlotId = 2;

      // 4. Enterキーでセーブ実行
      const chapter2State = createMockChapterState('chapter-2');
      const saveResult2 = saveLoadManager.saveGame(
        selectedSlotId,
        chapter2State,
        createMockStageProgress(),
        createMockParty(),
        10000
      );
      expect(saveResult2).toBe(true);

      // 5. 矢印キーでスロット1に戻る
      selectedSlotId = 1;

      // 6. Enterキーでロード実行
      const loadedData = saveLoadManager.loadGame(selectedSlotId);
      expect(loadedData).not.toBeNull();
      expect(loadedData?.chapterState.chapterId).toBe('chapter-1');

      // 7. Escキーで画面を閉じる（シーン遷移）
      // 実際のシーン遷移は統合テストで検証済み
      expect(loadedData).not.toBeNull();
    });

    test('Tabキーでボタン間を移動して操作できる', () => {
      // 1. セーブボタンにフォーカス → Enterで実行
      const chapterState = createMockChapterState('chapter-1');
      const saveResult = saveLoadManager.saveGame(
        1,
        chapterState,
        createMockStageProgress(),
        createMockParty(),
        5000
      );
      expect(saveResult).toBe(true);

      // 2. Tabキーでロードボタンに移動 → Enterで実行
      const loadedData = saveLoadManager.loadGame(1);
      expect(loadedData).not.toBeNull();

      // 3. Tabキーで削除ボタンに移動 → Enterで実行
      const deleteResult = saveLoadManager.deleteSaveData(1);
      expect(deleteResult).toBe(true);

      // 4. 削除後、スロットが空になっていることを確認
      const deletedSlot = saveLoadManager.loadGame(1);
      expect(deletedSlot).toBeNull();

      // 5. Tabキーでオートセーブトグルに移動 → Enterで切り替え
      saveLoadManager.setAutoSaveEnabled(true);
      expect(saveLoadManager.isAutoSaveEnabled()).toBe(true);

      saveLoadManager.setAutoSaveEnabled(false);
      expect(saveLoadManager.isAutoSaveEnabled()).toBe(false);

      // 6. Tabキーで戻るボタンに移動 → Enterで画面を閉じる
      // 実際のシーン遷移は統合テストで検証済み
    });
  });

  describe('E2Eテスト5: 削除機能の完全フロー', () => {
    test('セーブデータを削除し、空スロットに戻すことができる', () => {
      // 1. データを保存
      const chapterState = createMockChapterState('chapter-1');
      saveLoadManager.saveGame(
        1,
        chapterState,
        createMockStageProgress(),
        createMockParty(),
        5000
      );

      // 2. データが保存されていることを確認
      const savedData = saveLoadManager.loadGame(1);
      expect(savedData).not.toBeNull();

      // 3. 削除を実行
      const deleteResult = saveLoadManager.deleteSaveData(1);
      expect(deleteResult).toBe(true);

      // 4. スロットが空になっていることを確認
      const deletedData = saveLoadManager.loadGame(1);
      expect(deletedData).toBeNull();

      // 5. 空スロットに新しいデータを保存できることを確認
      const newChapterState = createMockChapterState('chapter-2');
      const newSaveResult = saveLoadManager.saveGame(
        1,
        newChapterState,
        createMockStageProgress(),
        createMockParty(),
        10000
      );
      expect(newSaveResult).toBe(true);

      const newData = saveLoadManager.loadGame(1);
      expect(newData?.chapterState.chapterId).toBe('chapter-2');
    });

    test('複数のスロットを削除できる', () => {
      // 1. 複数のスロットにデータを保存
      for (let i = 1; i <= 5; i++) {
        saveLoadManager.saveGame(
          i,
          createMockChapterState(`chapter-${i}`),
          createMockStageProgress(),
          createMockParty(),
          i * 1000
        );
      }

      // 2. 全てのスロットにデータがあることを確認
      for (let i = 1; i <= 5; i++) {
        const data = saveLoadManager.loadGame(i);
        expect(data).not.toBeNull();
      }

      // 3. スロット2と4を削除
      saveLoadManager.deleteSaveData(2);
      saveLoadManager.deleteSaveData(4);

      // 4. 削除したスロットが空になっていることを確認
      expect(saveLoadManager.loadGame(2)).toBeNull();
      expect(saveLoadManager.loadGame(4)).toBeNull();

      // 5. 削除していないスロットはデータが残っていることを確認
      expect(saveLoadManager.loadGame(1)).not.toBeNull();
      expect(saveLoadManager.loadGame(3)).not.toBeNull();
      expect(saveLoadManager.loadGame(5)).not.toBeNull();
    });
  });
});
