/**
 * ChapterManager Property-Based Tests
 * 
 * プロパティベーステストによる章管理システムの検証
 * 
 * Feature: 3.4-chapter-stage-management
 * Properties:
 * - Property 1: 章初期化の完全性
 * - Property 2: キャラクターロストの一貫性
 * - Property 3: 章完了時の状態リセット
 * 
 * 検証: 要件 1.1, 1.2, 1.3, 4.1, 4.2
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { ChapterManager } from '../../../../game/src/systems/chapter/ChapterManager';
import { ChapterData } from '../../../../game/src/types/chapter';

describe('ChapterManager Property-Based Tests', () => {
  let chapterManager: ChapterManager;

  beforeEach(() => {
    chapterManager = new ChapterManager();
    // LocalStorageのモック
    global.localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 1: 章初期化の完全性
   * 
   * 任意の章IDに対して、章を開始すると、章データが正しく初期化され、
   * 全ての利用可能なキャラクターが設定され、ロストキャラクターリストが空になる
   * 
   * **Validates: Requirements 1.1**
   */
  describe('Property 1: 章初期化の完全性', () => {
    test('任意の章IDと利用可能なキャラクターリストに対して、章開始時に正しく初期化される', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // chapterId (空白のみを除外)
          fc.array(fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0), { minLength: 1, maxLength: 20 }), // availableCharacterIds
          (chapterId, availableCharacterIds) => {
            // 重複を除去
            const uniqueCharacterIds = [...new Set(availableCharacterIds)];

            // 章データをモック
            const mockChapterData: ChapterData = {
              id: chapterId,
              name: `Chapter ${chapterId}`,
              storyDescription: 'Test chapter',
              stages: [],
              recommendedLevel: 1,
            };

            // 章データを手動で設定（loadChapterDataの代わり）
            (chapterManager as any).chapterData.set(chapterId, mockChapterData);

            // 章を開始
            const result = chapterManager.startChapter(chapterId, uniqueCharacterIds);

            // 検証
            expect(result.success).toBe(true);

            const state = chapterManager.getCurrentChapterState();
            expect(state).not.toBeNull();
            expect(state!.chapterId).toBe(chapterId);
            expect(state!.currentStageIndex).toBe(0);
            expect(state!.lostCharacterIds).toEqual([]);
            expect(state!.availableCharacterIds).toEqual(uniqueCharacterIds);
            expect(state!.completedStageIds).toEqual([]);
            expect(state!.isCompleted).toBe(false);
            expect(state!.startTime).toBeGreaterThan(0);
            expect(state!.playTime).toBe(0);

            // 利用可能なキャラクターの取得
            const availableChars = chapterManager.getAvailableCharacters();
            expect(availableChars).toEqual(uniqueCharacterIds);

            // ロストキャラクターの取得
            const lostChars = chapterManager.getLostCharacters();
            expect(lostChars).toEqual([]);

            // クリーンアップ: 次のテストのために章をクリア
            (chapterManager as any).currentChapter = null;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 2: キャラクターロストの一貫性
   * 
   * 任意のキャラクターに対して、章内でロストすると、そのキャラクターは
   * 使用不可リストに追加され、パーティから除外され、利用可能リストから削除される
   * 
   * **Validates: Requirements 1.2**
   */
  describe('Property 2: キャラクターロストの一貫性', () => {
    test('任意のキャラクターをロストすると、使用不可リストに追加され利用可能リストから削除される', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // chapterId
          fc.array(fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0), { minLength: 3, maxLength: 10 }), // availableCharacterIds
          fc.integer({ min: 0, max: 2 }), // lostCharacterIndex
          (chapterId, availableCharacterIds, lostCharacterIndex) => {
            // 重複を除去
            const uniqueCharacterIds = [...new Set(availableCharacterIds)];
            if (uniqueCharacterIds.length < 3) return; // 最低3人必要

            // 章データをモック
            const mockChapterData: ChapterData = {
              id: chapterId,
              name: `Chapter ${chapterId}`,
              storyDescription: 'Test chapter',
              stages: [],
              recommendedLevel: 1,
            };

            (chapterManager as any).chapterData.set(chapterId, mockChapterData);

            // 章を開始
            chapterManager.startChapter(chapterId, uniqueCharacterIds);

            // ロストするキャラクターを選択
            const lostCharacterId = uniqueCharacterIds[lostCharacterIndex % uniqueCharacterIds.length];
            const initialAvailableCount = uniqueCharacterIds.length;

            // キャラクターをロスト
            const result = chapterManager.markCharacterAsLost(lostCharacterId);

            // 検証
            expect(result.success).toBe(true);

            const state = chapterManager.getCurrentChapterState();
            expect(state).not.toBeNull();

            // ロストキャラクターリストに追加されている
            expect(state!.lostCharacterIds).toContain(lostCharacterId);
            expect(state!.lostCharacterIds.length).toBe(1);

            // 利用可能なキャラクターリストから削除されている
            expect(state!.availableCharacterIds).not.toContain(lostCharacterId);
            expect(state!.availableCharacterIds.length).toBe(initialAvailableCount - 1);

            // ヘルパーメソッドでも確認
            expect(chapterManager.isCharacterLost(lostCharacterId)).toBe(true);
            expect(chapterManager.isCharacterAvailable(lostCharacterId)).toBe(false);

            // 他のキャラクターは影響を受けない
            uniqueCharacterIds.forEach((charId) => {
              if (charId !== lostCharacterId) {
                expect(chapterManager.isCharacterLost(charId)).toBe(false);
                expect(chapterManager.isCharacterAvailable(charId)).toBe(true);
              }
            });

            // クリーンアップ: 次のテストのために章をクリア
            (chapterManager as any).currentChapter = null;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('同じキャラクターを複数回ロストしても一貫性が保たれる', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // chapterId
          fc.array(fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0), { minLength: 2, maxLength: 10 }), // availableCharacterIds
          (chapterId, availableCharacterIds) => {
            const uniqueCharacterIds = [...new Set(availableCharacterIds)];
            if (uniqueCharacterIds.length < 2) return;

            const mockChapterData: ChapterData = {
              id: chapterId,
              name: `Chapter ${chapterId}`,
              storyDescription: 'Test chapter',
              stages: [],
              recommendedLevel: 1,
            };

            (chapterManager as any).chapterData.set(chapterId, mockChapterData);
            chapterManager.startChapter(chapterId, uniqueCharacterIds);

            const lostCharacterId = uniqueCharacterIds[0];

            // 1回目のロスト
            const result1 = chapterManager.markCharacterAsLost(lostCharacterId);
            expect(result1.success).toBe(true);

            const state1 = chapterManager.getCurrentChapterState();
            const lostCount1 = state1!.lostCharacterIds.length;
            const availableCount1 = state1!.availableCharacterIds.length;

            // 2回目のロスト（同じキャラクター）
            const result2 = chapterManager.markCharacterAsLost(lostCharacterId);
            expect(result2.success).toBe(true);

            const state2 = chapterManager.getCurrentChapterState();

            // 状態が変わらないことを確認
            expect(state2!.lostCharacterIds.length).toBe(lostCount1);
            expect(state2!.availableCharacterIds.length).toBe(availableCount1);
            expect(state2!.lostCharacterIds.filter((id) => id === lostCharacterId).length).toBe(1);

            // クリーンアップ: 次のテストのために章をクリア
            (chapterManager as any).currentChapter = null;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 3: 章完了時の状態リセット
   * 
   * 任意の章に対して、章をクリアして次章を開始すると、
   * 前章のロスト状態がクリアされ、全キャラクターが再び利用可能になる
   * 
   * **Validates: Requirements 1.3, 4.1, 4.2**
   */
  describe('Property 3: 章完了時の状態リセット', () => {
    test('章完了後、次章開始時に全キャラクターが利用可能になる', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // chapter1Id
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // chapter2Id
          fc.array(fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0), { minLength: 5, maxLength: 15 }), // allCharacterIds
          fc.array(fc.integer({ min: 0, max: 4 }), { minLength: 1, maxLength: 3 }), // lostCharacterIndices
          (chapter1Id, chapter2Id, allCharacterIds, lostCharacterIndices) => {
            // 章IDが異なることを確認
            if (chapter1Id === chapter2Id) return;

            const uniqueCharacterIds = [...new Set(allCharacterIds)];
            if (uniqueCharacterIds.length < 5) return;

            // 第1章のデータをモック
            const mockChapter1Data: ChapterData = {
              id: chapter1Id,
              name: `Chapter ${chapter1Id}`,
              storyDescription: 'Test chapter 1',
              stages: [],
              recommendedLevel: 1,
            };

            (chapterManager as any).chapterData.set(chapter1Id, mockChapter1Data);

            // 第1章を開始
            chapterManager.startChapter(chapter1Id, uniqueCharacterIds);

            // 複数のキャラクターをロスト
            const lostCharacterIds: string[] = [];
            lostCharacterIndices.forEach((index) => {
              const charId = uniqueCharacterIds[index % uniqueCharacterIds.length];
              if (!lostCharacterIds.includes(charId)) {
                chapterManager.markCharacterAsLost(charId);
                lostCharacterIds.push(charId);
              }
            });

            // 第1章を完了
            const completeResult = chapterManager.completeChapter();
            expect(completeResult.success).toBe(true);

            const state1 = chapterManager.getCurrentChapterState();
            expect(state1!.isCompleted).toBe(true);
            expect(state1!.lostCharacterIds.length).toBeGreaterThan(0);

            // 第2章の準備
            const prepareResult = chapterManager.prepareNextChapter(chapter2Id, uniqueCharacterIds);
            expect(prepareResult.success).toBe(true);

            // 第2章のデータをモック
            const mockChapter2Data: ChapterData = {
              id: chapter2Id,
              name: `Chapter ${chapter2Id}`,
              storyDescription: 'Test chapter 2',
              stages: [],
              recommendedLevel: 1,
            };

            (chapterManager as any).chapterData.set(chapter2Id, mockChapter2Data);

            // 第2章を開始
            const startResult = chapterManager.startChapter(chapter2Id, uniqueCharacterIds);
            expect(startResult.success).toBe(true);

            const state2 = chapterManager.getCurrentChapterState();
            expect(state2).not.toBeNull();

            // 全キャラクターが利用可能になっている
            expect(state2!.availableCharacterIds).toEqual(uniqueCharacterIds);
            expect(state2!.lostCharacterIds).toEqual([]);

            // 前章でロストしたキャラクターも利用可能
            lostCharacterIds.forEach((charId) => {
              expect(chapterManager.isCharacterAvailable(charId)).toBe(true);
              expect(chapterManager.isCharacterLost(charId)).toBe(false);
            });

            // クリーンアップ: 次のテストのために章をクリア
            (chapterManager as any).currentChapter = null;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
