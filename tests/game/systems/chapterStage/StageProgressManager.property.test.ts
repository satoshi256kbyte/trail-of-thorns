/**
 * StageProgressManager プロパティベーステスト
 * StageProgressManager Property-Based Tests
 *
 * Feature: 3.4-chapter-stage-management
 */

import { describe, test, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { StageProgressManager } from '../../../../game/src/systems/chapterStage/StageProgressManager';
import {
  StageMetadata,
  StageReward,
  StageUnlockCondition,
} from '../../../../game/src/types/chapterStage';

describe('StageProgressManager - Property-Based Tests', () => {
  let manager: StageProgressManager;

  beforeEach(() => {
    manager = new StageProgressManager();
  });

  /**
   * ステージIDジェネレーター
   */
  const stageIdArb = fc.string({ minLength: 1, maxLength: 20 }).map((s) => `stage-${s}`);

  /**
   * 章IDジェネレーター
   */
  const chapterIdArb = fc.string({ minLength: 1, maxLength: 20 }).map((s) => `chapter-${s}`);

  /**
   * ステージ報酬ジェネレーター
   */
  const stageRewardArb: fc.Arbitrary<StageReward> = fc.record({
    type: fc.constantFrom('EXPERIENCE', 'ITEM', 'ROSE_ESSENCE', 'CHARACTER'),
    id: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
    amount: fc.integer({ min: 1, max: 1000 }),
  });

  /**
   * ステージ解放条件ジェネレーター（PREVIOUS_STAGE）
   */
  const previousStageConditionArb = (
    requiredStageIds: string[]
  ): fc.Arbitrary<StageUnlockCondition> =>
    fc.constant({
      type: 'PREVIOUS_STAGE' as const,
      requiredStageIds,
    });

  /**
   * ステージメタデータジェネレーター
   */
  const stageMetadataArb = (
    stageId: string,
    chapterId: string,
    unlockCondition: StageUnlockCondition
  ): fc.Arbitrary<StageMetadata> =>
    fc.record({
      id: fc.constant(stageId),
      name: fc.string({ minLength: 1, maxLength: 50 }),
      chapterId: fc.constant(chapterId),
      difficulty: fc.integer({ min: 1, max: 10 }),
      recommendedLevel: fc.integer({ min: 1, max: 100 }),
      unlockCondition: fc.constant(unlockCondition),
      rewards: fc.array(stageRewardArb, { minLength: 0, maxLength: 5 }),
    });

  /**
   * プロパティ8: ステージクリアによる進行
   * Property 8: Stage Clear Progression
   *
   * 任意のステージに対して、ステージをクリアすると、クリア状態が記録され、
   * 解放条件を満たす次のステージが自動的に解放される
   *
   * For any stage, when the stage is cleared, the clear state is recorded,
   * and the next stage that meets the unlock condition is automatically unlocked.
   *
   * 検証: 要件 3.1
   * Validates: Requirements 3.1
   */
  test('プロパティ8: ステージクリアによる進行', () => {
    fc.assert(
      fc.property(
        chapterIdArb,
        fc.array(stageRewardArb, { minLength: 0, maxLength: 3 }),
        async (chapterId, rewards) => {
          // 3つのステージを作成（stage1 → stage2 → stage3）
          const stage1Id = `${chapterId}-stage-1`;
          const stage2Id = `${chapterId}-stage-2`;
          const stage3Id = `${chapterId}-stage-3`;

          const stage1Metadata: StageMetadata = {
            id: stage1Id,
            name: 'Stage 1',
            chapterId,
            difficulty: 1,
            recommendedLevel: 1,
            unlockCondition: { type: 'PREVIOUS_STAGE', requiredStageIds: [] },
            rewards: [],
          };

          const stage2Metadata: StageMetadata = {
            id: stage2Id,
            name: 'Stage 2',
            chapterId,
            difficulty: 2,
            recommendedLevel: 2,
            unlockCondition: { type: 'PREVIOUS_STAGE', requiredStageIds: [stage1Id] },
            rewards: [],
          };

          const stage3Metadata: StageMetadata = {
            id: stage3Id,
            name: 'Stage 3',
            chapterId,
            difficulty: 3,
            recommendedLevel: 3,
            unlockCondition: { type: 'PREVIOUS_STAGE', requiredStageIds: [stage2Id] },
            rewards: [],
          };

          // ステージを登録
          manager.registerStageMetadata(stage1Metadata);
          manager.registerStageMetadata(stage2Metadata);
          manager.registerStageMetadata(stage3Metadata);

          // 最初のステージを解放
          manager.unlockStage(stage1Id);

          // stage1をクリア
          manager.completeStage(stage1Id, rewards);

          // stage1が完了状態になっていることを確認
          expect(manager.isStageCompleted(stage1Id)).toBe(true);

          // stage2が自動的に解放されていることを確認
          expect(manager.isStageUnlocked(stage2Id)).toBe(true);

          // stage3はまだ解放されていないことを確認
          expect(manager.isStageUnlocked(stage3Id)).toBe(false);

          // stage2をクリア
          manager.completeStage(stage2Id, rewards);

          // stage3が自動的に解放されていることを確認
          expect(manager.isStageUnlocked(stage3Id)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * プロパティ9: ステージ解放条件の遵守
   * Property 9: Stage Unlock Condition Compliance
   *
   * 任意の未解放ステージに対して、そのステージを選択しようとすると、
   * 操作は拒否され、解放条件が表示される
   *
   * For any unlocked stage, when attempting to select that stage,
   * the operation is rejected and the unlock condition is displayed.
   *
   * 検証: 要件 3.3
   * Validates: Requirements 3.3
   */
  test('プロパティ9: ステージ解放条件の遵守', () => {
    fc.assert(
      fc.property(chapterIdArb, async (chapterId) => {
        // 2つのステージを作成（stage1 → stage2）
        const stage1Id = `${chapterId}-stage-1`;
        const stage2Id = `${chapterId}-stage-2`;

        const stage1Metadata: StageMetadata = {
          id: stage1Id,
          name: 'Stage 1',
          chapterId,
          difficulty: 1,
          recommendedLevel: 1,
          unlockCondition: { type: 'PREVIOUS_STAGE', requiredStageIds: [] },
          rewards: [],
        };

        const stage2Metadata: StageMetadata = {
          id: stage2Id,
          name: 'Stage 2',
          chapterId,
          difficulty: 2,
          recommendedLevel: 2,
          unlockCondition: { type: 'PREVIOUS_STAGE', requiredStageIds: [stage1Id] },
          rewards: [],
        };

        // ステージを登録
        manager.registerStageMetadata(stage1Metadata);
        manager.registerStageMetadata(stage2Metadata);

        // stage1を解放
        manager.unlockStage(stage1Id);

        // stage2は未解放
        expect(manager.isStageUnlocked(stage2Id)).toBe(false);

        // 未解放のstage2をクリアしようとするとエラーが発生
        expect(() => manager.completeStage(stage2Id, [])).toThrow();

        // stage1をクリアすると、stage2が解放される
        manager.completeStage(stage1Id, []);
        expect(manager.isStageUnlocked(stage2Id)).toBe(true);

        // 解放されたstage2はクリアできる
        expect(() => manager.completeStage(stage2Id, [])).not.toThrow();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * プロパティ10: 章完了による次章解放
   * Property 10: Next Chapter Unlock by Chapter Completion
   *
   * 任意の章に対して、章内の全ステージをクリアすると、
   * 章完了状態が記録され、次章が解放される
   *
   * For any chapter, when all stages in the chapter are cleared,
   * the chapter completion state is recorded and the next chapter is unlocked.
   *
   * 検証: 要件 3.4
   * Validates: Requirements 3.4
   */
  test('プロパティ10: 章完了による次章解放', () => {
    fc.assert(
      fc.property(
        chapterIdArb,
        fc.integer({ min: 2, max: 5 }),
        async (chapterId, stageCount) => {
          // 指定された数のステージを作成
          const stageIds: string[] = [];
          for (let i = 0; i < stageCount; i++) {
            stageIds.push(`${chapterId}-stage-${i + 1}`);
          }

          // ステージメタデータを作成して登録
          stageIds.forEach((stageId, index) => {
            const metadata: StageMetadata = {
              id: stageId,
              name: `Stage ${index + 1}`,
              chapterId,
              difficulty: index + 1,
              recommendedLevel: index + 1,
              unlockCondition: {
                type: 'PREVIOUS_STAGE',
                requiredStageIds: index === 0 ? [] : [stageIds[index - 1]],
              },
              rewards: [],
            };
            manager.registerStageMetadata(metadata);
          });

          // 最初のステージを解放
          manager.unlockStage(stageIds[0]);

          // 章は未完了
          expect(manager.isChapterCompleted(chapterId)).toBe(false);

          // 全てのステージをクリア
          for (const stageId of stageIds) {
            manager.completeStage(stageId, []);
          }

          // 章が完了状態になっていることを確認
          expect(manager.isChapterCompleted(chapterId)).toBe(true);

          // 全てのステージが完了していることを確認
          stageIds.forEach((stageId) => {
            expect(manager.isStageCompleted(stageId)).toBe(true);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 追加プロパティ: 進行状況の永続化ラウンドトリップ
   * Additional Property: Progress Persistence Round Trip
   *
   * 任意の進行状況に対して、保存してから読み込むと、
   * 元の状態と等価な状態が復元される
   */
  test('追加プロパティ: 進行状況の永続化ラウンドトリップ', () => {
    fc.assert(
      fc.property(
        chapterIdArb,
        fc.integer({ min: 1, max: 5 }),
        async (chapterId, stageCount) => {
          // ステージを作成して登録
          const stageIds: string[] = [];
          for (let i = 0; i < stageCount; i++) {
            const stageId = `${chapterId}-stage-${i + 1}`;
            stageIds.push(stageId);

            const metadata: StageMetadata = {
              id: stageId,
              name: `Stage ${i + 1}`,
              chapterId,
              difficulty: i + 1,
              recommendedLevel: i + 1,
              unlockCondition: {
                type: 'PREVIOUS_STAGE',
                requiredStageIds: i === 0 ? [] : [stageIds[i - 1]],
              },
              rewards: [],
            };
            manager.registerStageMetadata(metadata);
          }

          // 最初のステージを解放
          manager.unlockStage(stageIds[0]);

          // いくつかのステージをクリア
          const completedCount = Math.floor(stageCount / 2);
          for (let i = 0; i < completedCount; i++) {
            manager.completeStage(stageIds[i], []);
          }

          // 進行状況を保存
          const savedData = manager.saveProgress();

          // 新しいマネージャーを作成して復元
          const newManager = new StageProgressManager();

          // メタデータを再登録
          stageIds.forEach((stageId, index) => {
            const metadata: StageMetadata = {
              id: stageId,
              name: `Stage ${index + 1}`,
              chapterId,
              difficulty: index + 1,
              recommendedLevel: index + 1,
              unlockCondition: {
                type: 'PREVIOUS_STAGE',
                requiredStageIds: index === 0 ? [] : [stageIds[index - 1]],
              },
              rewards: [],
            };
            newManager.registerStageMetadata(metadata);
          });

          // 進行状況を復元
          newManager.restoreProgress(savedData);

          // 全てのステージの状態が一致することを確認
          stageIds.forEach((stageId) => {
            const originalProgress = manager.getStageProgress(stageId);
            const restoredProgress = newManager.getStageProgress(stageId);

            expect(restoredProgress).toEqual(originalProgress);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
