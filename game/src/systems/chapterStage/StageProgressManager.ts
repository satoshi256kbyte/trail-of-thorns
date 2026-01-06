/**
 * ステージ進行管理システム
 * Stage Progress Management System
 *
 * ステージの解放条件と進行状況を管理します。
 * Manages stage unlock conditions and progress tracking.
 */

import {
  StageMetadata,
  StageProgress,
  StageProgressData,
  StageUnlockCondition,
  StageReward,
  ChapterStageError,
} from '../../types/chapterStage';

/**
 * ステージ進行管理クラス
 * Stage Progress Manager Class
 */
export class StageProgressManager {
  /** ステージ進行状況マップ（ステージID → 進行状況） */
  private stageProgress: Map<string, StageProgress> = new Map();

  /** ステージメタデータマップ（ステージID → メタデータ） */
  private stageMetadata: Map<string, StageMetadata> = new Map();

  /**
   * コンストラクタ
   * Constructor
   */
  constructor() {
    // 初期化処理
  }

  /**
   * ステージメタデータを登録
   * Register stage metadata
   *
   * @param metadata - ステージメタデータ
   */
  registerStageMetadata(metadata: StageMetadata): void {
    this.stageMetadata.set(metadata.id, metadata);

    // 進行状況が未登録の場合は初期化
    if (!this.stageProgress.has(metadata.id)) {
      this.stageProgress.set(metadata.id, {
        stageId: metadata.id,
        isUnlocked: false,
        isCompleted: false,
        rewards: [],
      });
    }
  }

  /**
   * 複数のステージメタデータを一括登録
   * Register multiple stage metadata
   *
   * @param metadataList - ステージメタデータリスト
   */
  registerStageMetadataList(metadataList: StageMetadata[]): void {
    metadataList.forEach((metadata) => this.registerStageMetadata(metadata));
  }

  /**
   * ステージの解放チェック
   * Check if stage is unlocked
   *
   * @param stageId - ステージID
   * @returns 解放済みの場合true
   */
  isStageUnlocked(stageId: string): boolean {
    const progress = this.stageProgress.get(stageId);
    return progress?.isUnlocked ?? false;
  }

  /**
   * ステージの完了チェック
   * Check if stage is completed
   *
   * @param stageId - ステージID
   * @returns 完了済みの場合true
   */
  isStageCompleted(stageId: string): boolean {
    const progress = this.stageProgress.get(stageId);
    return progress?.isCompleted ?? false;
  }

  /**
   * ステージの解放
   * Unlock stage
   *
   * @param stageId - ステージID
   * @throws ステージが見つからない場合
   */
  unlockStage(stageId: string): void {
    const progress = this.stageProgress.get(stageId);
    if (!progress) {
      throw new Error(`${ChapterStageError.STAGE_NOT_FOUND}: ${stageId}`);
    }

    progress.isUnlocked = true;
  }

  /**
   * ステージ解放条件の評価
   * Evaluate stage unlock condition
   *
   * @param stageId - ステージID
   * @returns 解放条件を満たす場合true
   */
  evaluateUnlockCondition(stageId: string): boolean {
    const metadata = this.stageMetadata.get(stageId);
    if (!metadata) {
      return false;
    }

    const condition = metadata.unlockCondition;

    switch (condition.type) {
      case 'PREVIOUS_STAGE':
        // 前のステージが完了している必要がある
        if (condition.requiredStageIds.length === 0) {
          // 必要なステージがない場合は常に解放可能（最初のステージ）
          return true;
        }
        // 全ての必要なステージが完了している必要がある
        return condition.requiredStageIds.every((requiredId) =>
          this.isStageCompleted(requiredId)
        );

      case 'MULTIPLE_STAGES':
        // 複数のステージが完了している必要がある
        return condition.requiredStageIds.every((requiredId) =>
          this.isStageCompleted(requiredId)
        );

      case 'CHAPTER_COMPLETE':
        // 特定の章が完了している必要がある
        // この条件は章管理システムと連携して評価する必要がある
        // ここでは必要なステージが全て完了しているかをチェック
        return condition.requiredStageIds.every((requiredId) =>
          this.isStageCompleted(requiredId)
        );

      default:
        return false;
    }
  }

  /**
   * ステージのクリア
   * Complete stage
   *
   * @param stageId - ステージID
   * @param rewards - 獲得報酬リスト
   * @throws ステージが見つからない、または解放されていない場合
   */
  completeStage(stageId: string, rewards: StageReward[]): void {
    const progress = this.stageProgress.get(stageId);
    if (!progress) {
      throw new Error(`${ChapterStageError.STAGE_NOT_FOUND}: ${stageId}`);
    }

    if (!progress.isUnlocked) {
      throw new Error(`${ChapterStageError.STAGE_NOT_UNLOCKED}: ${stageId}`);
    }

    // ステージを完了状態にする
    progress.isCompleted = true;
    progress.completionTime = Date.now();
    progress.rewards = rewards;

    // 次のステージを解放
    this.unlockNextStages(stageId);
  }

  /**
   * 次のステージの解放
   * Unlock next stages
   *
   * @param completedStageId - 完了したステージID
   */
  unlockNextStages(completedStageId: string): void {
    // 全てのステージをチェックして、解放条件を満たすステージを解放
    this.stageMetadata.forEach((metadata, stageId) => {
      // 既に解放済みまたは完了済みの場合はスキップ
      const progress = this.stageProgress.get(stageId);
      if (progress?.isUnlocked || progress?.isCompleted) {
        return;
      }

      // 解放条件を評価
      if (this.evaluateUnlockCondition(stageId)) {
        this.unlockStage(stageId);
      }
    });
  }

  /**
   * 章の全ステージクリア確認
   * Check if all stages in chapter are completed
   *
   * @param chapterId - 章ID
   * @returns 全ステージが完了している場合true
   */
  isChapterCompleted(chapterId: string): boolean {
    // 章に属する全てのステージを取得
    const chapterStages = Array.from(this.stageMetadata.values()).filter(
      (metadata) => metadata.chapterId === chapterId
    );

    // 章にステージが存在しない場合はfalse
    if (chapterStages.length === 0) {
      return false;
    }

    // 全てのステージが完了しているかチェック
    return chapterStages.every((metadata) =>
      this.isStageCompleted(metadata.id)
    );
  }

  /**
   * 進行状況の取得
   * Get stage progress
   *
   * @param stageId - ステージID
   * @returns ステージ進行状況（見つからない場合はnull）
   */
  getStageProgress(stageId: string): StageProgress | null {
    return this.stageProgress.get(stageId) ?? null;
  }

  /**
   * 章内の全ステージ進行状況の取得
   * Get all stage progress in chapter
   *
   * @param chapterId - 章ID
   * @returns ステージ進行状況リスト
   */
  getChapterProgress(chapterId: string): StageProgress[] {
    const chapterStages = Array.from(this.stageMetadata.values()).filter(
      (metadata) => metadata.chapterId === chapterId
    );

    return chapterStages
      .map((metadata) => this.stageProgress.get(metadata.id))
      .filter((progress): progress is StageProgress => progress !== undefined);
  }

  /**
   * 進行状況の保存
   * Save progress
   *
   * @returns ステージ進行状況データ
   */
  saveProgress(): StageProgressData {
    const stages = Array.from(this.stageProgress.values());
    return { stages };
  }

  /**
   * 進行状況の復元
   * Restore progress
   *
   * @param data - ステージ進行状況データ
   */
  restoreProgress(data: StageProgressData): void {
    this.stageProgress.clear();

    data.stages.forEach((progress) => {
      this.stageProgress.set(progress.stageId, progress);
    });
  }

  /**
   * 進行状況のリセット
   * Reset progress
   */
  reset(): void {
    this.stageProgress.clear();
    this.stageMetadata.clear();
  }

  /**
   * 章の進行状況をリセット
   * Reset chapter progress
   *
   * @param chapterId - 章ID
   */
  resetChapterProgress(chapterId: string): void {
    const chapterStages = Array.from(this.stageMetadata.values()).filter(
      (metadata) => metadata.chapterId === chapterId
    );

    chapterStages.forEach((metadata) => {
      this.stageProgress.set(metadata.id, {
        stageId: metadata.id,
        isUnlocked: false,
        isCompleted: false,
        rewards: [],
      });
    });
  }
}
