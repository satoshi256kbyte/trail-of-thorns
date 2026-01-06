/**
 * SaveLoadManagerのプロパティベーステスト
 * Property-Based Tests for SaveLoadManager
 *
 * Feature: 3.4-chapter-stage-management
 * Properties:
 * - プロパティ4: 状態の永続化ラウンドトリップ
 * - プロパティ11: セーブデータの破損検出
 * - プロパティ12: オートセーブの自動実行
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { SaveLoadManager } from '../../../../game/src/systems/chapterStage/SaveLoadManager';
import { SaveDataValidator } from '../../../../game/src/systems/chapterStage/SaveDataValidator';
import {
  ChapterStateData,
  StageProgressData,
  PartyComposition,
  SaveData,
  StageProgress,
  StageReward,
} from '../../../../game/src/types/chapterStage';

describe('SaveLoadManager プロパティベーステスト', () => {
  let manager: SaveLoadManager;
  let validator: SaveDataValidator;

  beforeEach(() => {
    manager = new SaveLoadManager();
    validator = new SaveDataValidator();
    // LocalStorageをクリア
    localStorage.clear();
  });

  afterEach(() => {
    // テスト後のクリーンアップ
    localStorage.clear();
  });

  // Arbitraries（ランダムデータ生成器）

  const chapterIdArb = fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0);

  const characterIdArb = fc.string({ minLength: 1, maxLength: 10 }).filter((s) => s.trim().length > 0);

  const stageIdArb = fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0);

  const stageRewardArb: fc.Arbitrary<StageReward> = fc.record({
    type: fc.constantFrom('EXPERIENCE', 'ITEM', 'ROSE_ESSENCE', 'CHARACTER'),
    id: fc.option(fc.string({ minLength: 1, maxLength: 10 }), { nil: undefined }),
    amount: fc.integer({ min: 1, max: 1000 }),
  });

  const stageProgressArb: fc.Arbitrary<StageProgress> = fc.record({
    stageId: stageIdArb,
    isUnlocked: fc.boolean(),
    isCompleted: fc.boolean(),
    completionTime: fc.option(fc.integer({ min: 0, max: 10000000 }), { nil: undefined }),
    rewards: fc.array(stageRewardArb, { minLength: 0, maxLength: 5 }),
  });

  const chapterStateDataArb: fc.Arbitrary<ChapterStateData> = fc.record({
    chapterId: chapterIdArb,
    currentStageIndex: fc.integer({ min: 0, max: 23 }),
    lostCharacterIds: fc.array(characterIdArb, { minLength: 0, maxLength: 10 }),
    availableCharacterIds: fc.array(characterIdArb, { minLength: 1, maxLength: 20 }),
    completedStageIds: fc.array(stageIdArb, { minLength: 0, maxLength: 24 }),
    isCompleted: fc.boolean(),
    playTime: fc.integer({ min: 0, max: 36000000 }), // 最大10時間
  });

  const stageProgressDataArb: fc.Arbitrary<StageProgressData> = fc.record({
    stages: fc.array(stageProgressArb, { minLength: 0, maxLength: 24 }),
  });

  const partyCompositionArb: fc.Arbitrary<PartyComposition> = fc.record({
    members: fc.array(characterIdArb, { minLength: 0, maxLength: 6 }),
    formation: fc.constantFrom('BALANCED', 'OFFENSIVE', 'DEFENSIVE', 'CUSTOM'),
  });

  /**
   * プロパティ4: 状態の永続化ラウンドトリップ
   * Property 4: State Persistence Round Trip
   *
   * 任意の有効な章状態に対して、保存してから読み込むと、
   * 元の状態と等価な状態が復元される
   *
   * **検証: 要件 1.4, 1.5, 4.3, 5.1, 5.2**
   */
  describe('プロパティ4: 状態の永続化ラウンドトリップ', () => {
    test('任意の有効な章状態を保存して読み込むと、元の状態が復元される', () => {
      fc.assert(
        fc.property(
          chapterStateDataArb,
          stageProgressDataArb,
          partyCompositionArb,
          fc.integer({ min: 0, max: 36000000 }),
          fc.integer({ min: 1, max: 9 }), // スロットID（0はオートセーブ用）
          (chapterState, stageProgress, partyComposition, playTime, slotId) => {
            // ロストキャラクターと利用可能なキャラクターの重複を除去
            const lostSet = new Set(chapterState.lostCharacterIds);
            const availableFiltered = chapterState.availableCharacterIds.filter(
              (id) => !lostSet.has(id)
            );
            const validChapterState = {
              ...chapterState,
              availableCharacterIds: availableFiltered,
            };

            // パーティメンバーをロストキャラクターから除外
            const validPartyMembers = partyComposition.members.filter((id) => !lostSet.has(id));
            const validPartyComposition = {
              ...partyComposition,
              members: validPartyMembers.slice(0, 6), // 最大6人
            };

            // 保存
            const saveSuccess = manager.saveGame(
              slotId,
              validChapterState,
              stageProgress,
              validPartyComposition,
              playTime
            );

            expect(saveSuccess).toBe(true);

            // 読み込み
            const loadedData = manager.loadGame(slotId);

            expect(loadedData).not.toBeNull();
            if (loadedData) {
              // 章状態の検証
              expect(loadedData.chapterState.chapterId).toBe(validChapterState.chapterId);
              expect(loadedData.chapterState.currentStageIndex).toBe(
                validChapterState.currentStageIndex
              );
              expect(loadedData.chapterState.lostCharacterIds).toEqual(
                validChapterState.lostCharacterIds
              );
              expect(loadedData.chapterState.availableCharacterIds).toEqual(
                validChapterState.availableCharacterIds
              );
              expect(loadedData.chapterState.completedStageIds).toEqual(
                validChapterState.completedStageIds
              );
              expect(loadedData.chapterState.isCompleted).toBe(validChapterState.isCompleted);
              expect(loadedData.chapterState.playTime).toBe(validChapterState.playTime);

              // ステージ進行状況の検証
              expect(loadedData.stageProgress.stages.length).toBe(stageProgress.stages.length);

              // パーティ編成の検証
              expect(loadedData.partyComposition.members).toEqual(validPartyComposition.members);
              expect(loadedData.partyComposition.formation).toBe(validPartyComposition.formation);

              // プレイ時間の検証
              expect(loadedData.playTime).toBe(playTime);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('複数のスロットに保存しても、各スロットのデータは独立している', () => {
      fc.assert(
        fc.property(
          chapterStateDataArb,
          chapterStateDataArb,
          stageProgressDataArb,
          stageProgressDataArb,
          partyCompositionArb,
          partyCompositionArb,
          (chapterState1, chapterState2, stageProgress1, stageProgress2, party1, party2) => {
            const slotId1 = 1;
            const slotId2 = 2;
            const playTime1 = 1000;
            const playTime2 = 2000;

            // スロット1に保存
            manager.saveGame(slotId1, chapterState1, stageProgress1, party1, playTime1);

            // スロット2に保存
            manager.saveGame(slotId2, chapterState2, stageProgress2, party2, playTime2);

            // 両方のスロットから読み込み
            const loaded1 = manager.loadGame(slotId1);
            const loaded2 = manager.loadGame(slotId2);

            expect(loaded1).not.toBeNull();
            expect(loaded2).not.toBeNull();

            if (loaded1 && loaded2) {
              // スロット1のデータが正しい
              expect(loaded1.chapterState.chapterId).toBe(chapterState1.chapterId);
              expect(loaded1.playTime).toBe(playTime1);

              // スロット2のデータが正しい
              expect(loaded2.chapterState.chapterId).toBe(chapterState2.chapterId);
              expect(loaded2.playTime).toBe(playTime2);

              // 2つのスロットのデータは異なる（同じchapterIdでない限り）
              if (chapterState1.chapterId !== chapterState2.chapterId) {
                expect(loaded1.chapterState.chapterId).not.toBe(loaded2.chapterState.chapterId);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * プロパティ11: セーブデータの破損検出
   * Property 11: Save Data Corruption Detection
   *
   * 任意の破損したセーブデータに対して、読み込もうとすると、
   * エラーが検出され、適切なエラーメッセージが表示される
   *
   * **検証: 要件 5.3**
   */
  describe('プロパティ11: セーブデータの破損検出', () => {
    test('破損したJSON文字列を読み込もうとするとエラーが検出される', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter((s) => {
            try {
              JSON.parse(s);
              return false; // 有効なJSONは除外
            } catch {
              return true; // 無効なJSONのみ
            }
          }),
          fc.integer({ min: 1, max: 9 }),
          (corruptedJson, slotId) => {
            // 破損したデータをLocalStorageに直接書き込み
            const storageKey = `trail_of_thorns_save_${slotId}`;
            localStorage.setItem(storageKey, corruptedJson);

            // 読み込みを試みる
            const loadedData = manager.loadGame(slotId);

            // 破損データは読み込めない
            expect(loadedData).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('必須フィールドが欠けているセーブデータは検証に失敗する', () => {
      fc.assert(
        fc.property(
          chapterStateDataArb,
          stageProgressDataArb,
          partyCompositionArb,
          fc.integer({ min: 0, max: 36000000 }),
          fc.integer({ min: 1, max: 9 }),
          (chapterState, stageProgress, partyComposition, playTime, slotId) => {
            // 正常なセーブデータを作成
            const validSaveData: SaveData = {
              version: '1.0.0',
              timestamp: Date.now(),
              chapterState,
              stageProgress,
              partyComposition,
              playTime,
            };

            // 必須フィールドを削除（破損データをシミュレート）
            const corruptedData = { ...validSaveData };
            delete (corruptedData as Partial<SaveData>).chapterState;

            // 検証を実行
            const isValid = validator.validateSaveData(corruptedData as SaveData);

            // 破損データは検証に失敗する
            expect(isValid.isValid).toBe(false);
            expect(isValid.errors.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('データ整合性が取れていないセーブデータは検証に失敗する', () => {
      fc.assert(
        fc.property(
          chapterStateDataArb,
          stageProgressDataArb,
          partyCompositionArb,
          fc.integer({ min: 0, max: 36000000 }),
          characterIdArb,
          (chapterState, stageProgress, partyComposition, playTime, lostCharacterId) => {
            // ロストキャラクターをパーティに含める（整合性違反）
            const inconsistentChapterState = {
              ...chapterState,
              lostCharacterIds: [lostCharacterId],
            };

            const inconsistentParty = {
              ...partyComposition,
              members: [lostCharacterId], // ロストキャラクターをパーティに含める
            };

            const saveData: SaveData = {
              version: '1.0.0',
              timestamp: Date.now(),
              chapterState: inconsistentChapterState,
              stageProgress,
              partyComposition: inconsistentParty,
              playTime,
            };

            // 検証を実行
            const result = validator.validateSaveData(saveData);

            // 整合性違反は検出される
            expect(result.isValid).toBe(false);
            expect(result.errors.some((e) => e.includes('ロスト'))).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * プロパティ12: オートセーブの自動実行
   * Property 12: Auto Save Automatic Execution
   *
   * 任意のステージクリアまたは章完了イベントに対して、
   * オートセーブが有効な場合、自動的に進行状況が保存される
   *
   * **検証: 要件 5.5**
   */
  describe('プロパティ12: オートセーブの自動実行', () => {
    test('オートセーブが有効な場合、autoSave()を呼び出すとスロット0に保存される', () => {
      fc.assert(
        fc.property(
          chapterStateDataArb,
          stageProgressDataArb,
          partyCompositionArb,
          fc.integer({ min: 0, max: 36000000 }),
          (chapterState, stageProgress, partyComposition, playTime) => {
            // オートセーブを有効化
            manager.setAutoSaveEnabled(true);
            expect(manager.isAutoSaveEnabled()).toBe(true);

            // オートセーブを実行
            manager.autoSave(chapterState, stageProgress, partyComposition, playTime);

            // スロット0から読み込み
            const loadedData = manager.loadGame(0);

            expect(loadedData).not.toBeNull();
            if (loadedData) {
              expect(loadedData.chapterState.chapterId).toBe(chapterState.chapterId);
              expect(loadedData.playTime).toBe(playTime);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('オートセーブが無効な場合、autoSave()を呼び出しても保存されない', () => {
      fc.assert(
        fc.property(
          chapterStateDataArb,
          stageProgressDataArb,
          partyCompositionArb,
          fc.integer({ min: 0, max: 36000000 }),
          (chapterState, stageProgress, partyComposition, playTime) => {
            // オートセーブを無効化
            manager.setAutoSaveEnabled(false);
            expect(manager.isAutoSaveEnabled()).toBe(false);

            // 既存のオートセーブデータをクリア
            manager.deleteSaveData(0);

            // オートセーブを実行
            manager.autoSave(chapterState, stageProgress, partyComposition, playTime);

            // スロット0から読み込み
            const loadedData = manager.loadGame(0);

            // オートセーブが無効なので保存されていない
            expect(loadedData).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('オートセーブの有効/無効を切り替えても、既存のセーブデータは影響を受けない', () => {
      fc.assert(
        fc.property(
          chapterStateDataArb,
          stageProgressDataArb,
          partyCompositionArb,
          fc.integer({ min: 0, max: 36000000 }),
          fc.integer({ min: 1, max: 9 }),
          (chapterState, stageProgress, partyComposition, playTime, slotId) => {
            // 通常のセーブを実行
            manager.saveGame(slotId, chapterState, stageProgress, partyComposition, playTime);

            // オートセーブを無効化
            manager.setAutoSaveEnabled(false);

            // 既存のセーブデータを読み込み
            const loadedData = manager.loadGame(slotId);

            // 既存のセーブデータは影響を受けない
            expect(loadedData).not.toBeNull();
            if (loadedData) {
              expect(loadedData.chapterState.chapterId).toBe(chapterState.chapterId);
            }

            // オートセーブを再度有効化
            manager.setAutoSaveEnabled(true);

            // 既存のセーブデータを再度読み込み
            const loadedData2 = manager.loadGame(slotId);

            // 既存のセーブデータは影響を受けない
            expect(loadedData2).not.toBeNull();
            if (loadedData2) {
              expect(loadedData2.chapterState.chapterId).toBe(chapterState.chapterId);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * 追加プロパティ: セーブスロット管理
   * Additional Property: Save Slot Management
   */
  describe('追加プロパティ: セーブスロット管理', () => {
    test('セーブデータを削除すると、そのスロットは空になる', () => {
      fc.assert(
        fc.property(
          chapterStateDataArb,
          stageProgressDataArb,
          partyCompositionArb,
          fc.integer({ min: 0, max: 36000000 }),
          fc.integer({ min: 1, max: 9 }),
          (chapterState, stageProgress, partyComposition, playTime, slotId) => {
            // 保存
            manager.saveGame(slotId, chapterState, stageProgress, partyComposition, playTime);

            // 削除
            const deleteSuccess = manager.deleteSaveData(slotId);
            expect(deleteSuccess).toBe(true);

            // 読み込み
            const loadedData = manager.loadGame(slotId);

            // 削除されたスロットは空
            expect(loadedData).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('getSaveSlots()は全てのスロット情報を返す', () => {
      fc.assert(
        fc.property(
          chapterStateDataArb,
          stageProgressDataArb,
          partyCompositionArb,
          fc.integer({ min: 0, max: 36000000 }),
          fc.array(fc.integer({ min: 1, max: 9 }), { minLength: 1, maxLength: 5 }),
          (chapterState, stageProgress, partyComposition, playTime, slotIds) => {
            // 複数のスロットに保存
            const uniqueSlotIds = [...new Set(slotIds)];
            uniqueSlotIds.forEach((slotId) => {
              manager.saveGame(slotId, chapterState, stageProgress, partyComposition, playTime);
            });

            // 全スロット情報を取得
            const slots = manager.getSaveSlots();

            // スロット数は10個
            expect(slots.length).toBe(10);

            // 保存したスロットにはデータがある
            uniqueSlotIds.forEach((slotId) => {
              const slot = slots[slotId];
              expect(slot.saveData).not.toBeNull();
              if (slot.saveData) {
                expect(slot.saveData.chapterState.chapterId).toBe(chapterState.chapterId);
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

