/**
 * セーブデータ検証システム
 * Save Data Validation System
 *
 * セーブデータの構造検証、バージョン互換性チェック、破損データの検出を行います。
 * Performs save data structure validation, version compatibility checks, and corrupted data detection.
 */

import {
  SaveData,
  ChapterStateData,
  StageProgressData,
  PartyComposition,
  ChapterStageError,
} from '../../types/chapterStage';

/**
 * 検証結果
 * Validation Result
 */
export interface ValidationResult {
  /** 有効フラグ */
  isValid: boolean;
  /** エラーメッセージリスト */
  errors: string[];
  /** 警告メッセージリスト */
  warnings: string[];
}

/**
 * セーブデータ検証クラス
 * Save Data Validator Class
 */
export class SaveDataValidator {
  private static readonly SUPPORTED_VERSIONS = ['1.0.0'];
  private static readonly MAX_PARTY_SIZE = 6;

  /**
   * セーブデータの完全検証
   * Complete Save Data Validation
   *
   * @param saveData - 検証するセーブデータ
   * @returns 検証結果
   */
  public validateSaveData(saveData: SaveData): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // バージョン検証
    const versionResult = this.validateVersion(saveData.version);
    errors.push(...versionResult.errors);
    warnings.push(...versionResult.warnings);

    // タイムスタンプ検証
    const timestampResult = this.validateTimestamp(saveData.timestamp);
    errors.push(...timestampResult.errors);
    warnings.push(...timestampResult.warnings);

    // 章状態データ検証
    const chapterStateResult = this.validateChapterState(saveData.chapterState);
    errors.push(...chapterStateResult.errors);
    warnings.push(...chapterStateResult.warnings);

    // ステージ進行状況データ検証
    const stageProgressResult = this.validateStageProgress(saveData.stageProgress);
    errors.push(...stageProgressResult.errors);
    warnings.push(...stageProgressResult.warnings);

    // パーティ編成検証
    const partyResult = this.validatePartyComposition(saveData.partyComposition);
    errors.push(...partyResult.errors);
    warnings.push(...partyResult.warnings);

    // プレイ時間検証
    const playTimeResult = this.validatePlayTime(saveData.playTime);
    errors.push(...playTimeResult.errors);
    warnings.push(...playTimeResult.warnings);

    // データ整合性検証
    const consistencyResult = this.validateDataConsistency(saveData);
    errors.push(...consistencyResult.errors);
    warnings.push(...consistencyResult.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * バージョン検証
   * Version Validation
   *
   * @param version - バージョン文字列
   * @returns 検証結果
   */
  private validateVersion(version: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!version || typeof version !== 'string') {
      errors.push('バージョン情報が無効です');
      return { isValid: false, errors, warnings };
    }

    if (!SaveDataValidator.SUPPORTED_VERSIONS.includes(version)) {
      warnings.push(`サポートされていないバージョンです: ${version}`);
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * タイムスタンプ検証
   * Timestamp Validation
   *
   * @param timestamp - タイムスタンプ
   * @returns 検証結果
   */
  private validateTimestamp(timestamp: number): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeof timestamp !== 'number' || isNaN(timestamp)) {
      errors.push('タイムスタンプが無効です');
      return { isValid: false, errors, warnings };
    }

    if (timestamp < 0) {
      errors.push('タイムスタンプが負の値です');
    }

    // 未来の日付チェック
    if (timestamp > Date.now() + 86400000) {
      // 1日以上未来
      warnings.push('タイムスタンプが未来の日付です');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * 章状態データ検証
   * Chapter State Data Validation
   *
   * @param chapterState - 章状態データ
   * @returns 検証結果
   */
  private validateChapterState(chapterState: ChapterStateData): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!chapterState || typeof chapterState !== 'object') {
      errors.push('章状態データが無効です');
      return { isValid: false, errors, warnings };
    }

    // 章ID検証
    if (!chapterState.chapterId || typeof chapterState.chapterId !== 'string') {
      errors.push('章IDが無効です');
    }

    // ステージインデックス検証
    if (typeof chapterState.currentStageIndex !== 'number' || chapterState.currentStageIndex < 0) {
      errors.push('現在のステージインデックスが無効です');
    }

    // ロストキャラクターID検証
    if (!Array.isArray(chapterState.lostCharacterIds)) {
      errors.push('ロストキャラクターIDリストが無効です');
    } else {
      const invalidIds = chapterState.lostCharacterIds.filter((id) => typeof id !== 'string');
      if (invalidIds.length > 0) {
        errors.push('ロストキャラクターIDに無効な値が含まれています');
      }
    }

    // 利用可能なキャラクターID検証
    if (!Array.isArray(chapterState.availableCharacterIds)) {
      errors.push('利用可能なキャラクターIDリストが無効です');
    } else {
      const invalidIds = chapterState.availableCharacterIds.filter((id) => typeof id !== 'string');
      if (invalidIds.length > 0) {
        errors.push('利用可能なキャラクターIDに無効な値が含まれています');
      }
    }

    // 完了済みステージID検証
    if (!Array.isArray(chapterState.completedStageIds)) {
      errors.push('完了済みステージIDリストが無効です');
    } else {
      const invalidIds = chapterState.completedStageIds.filter((id) => typeof id !== 'string');
      if (invalidIds.length > 0) {
        errors.push('完了済みステージIDに無効な値が含まれています');
      }
    }

    // 章完了フラグ検証
    if (typeof chapterState.isCompleted !== 'boolean') {
      errors.push('章完了フラグが無効です');
    }

    // プレイ時間検証
    if (typeof chapterState.playTime !== 'number' || chapterState.playTime < 0) {
      errors.push('章のプレイ時間が無効です');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * ステージ進行状況データ検証
   * Stage Progress Data Validation
   *
   * @param stageProgress - ステージ進行状況データ
   * @returns 検証結果
   */
  private validateStageProgress(stageProgress: StageProgressData): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!stageProgress || typeof stageProgress !== 'object') {
      errors.push('ステージ進行状況データが無効です');
      return { isValid: false, errors, warnings };
    }

    if (!Array.isArray(stageProgress.stages)) {
      errors.push('ステージ進行状況リストが無効です');
      return { isValid: false, errors, warnings };
    }

    // 各ステージ進行状況の検証
    stageProgress.stages.forEach((stage, index) => {
      if (!stage.stageId || typeof stage.stageId !== 'string') {
        errors.push(`ステージ${index}: ステージIDが無効です`);
      }

      if (typeof stage.isUnlocked !== 'boolean') {
        errors.push(`ステージ${index}: 解放フラグが無効です`);
      }

      if (typeof stage.isCompleted !== 'boolean') {
        errors.push(`ステージ${index}: 完了フラグが無効です`);
      }

      if (stage.completionTime !== undefined) {
        if (typeof stage.completionTime !== 'number' || stage.completionTime < 0) {
          errors.push(`ステージ${index}: 完了時刻が無効です`);
        }
      }

      if (!Array.isArray(stage.rewards)) {
        errors.push(`ステージ${index}: 報酬リストが無効です`);
      }
    });

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * パーティ編成検証
   * Party Composition Validation
   *
   * @param partyComposition - パーティ編成
   * @returns 検証結果
   */
  private validatePartyComposition(partyComposition: PartyComposition): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!partyComposition || typeof partyComposition !== 'object') {
      errors.push('パーティ編成データが無効です');
      return { isValid: false, errors, warnings };
    }

    // メンバーリスト検証
    if (!Array.isArray(partyComposition.members)) {
      errors.push('パーティメンバーリストが無効です');
    } else {
      // パーティサイズ検証
      if (partyComposition.members.length > SaveDataValidator.MAX_PARTY_SIZE) {
        errors.push(`パーティサイズが上限を超えています: ${partyComposition.members.length}`);
      }

      // メンバーID検証
      const invalidMembers = partyComposition.members.filter((id) => typeof id !== 'string');
      if (invalidMembers.length > 0) {
        errors.push('パーティメンバーIDに無効な値が含まれています');
      }

      // 重複チェック
      const uniqueMembers = new Set(partyComposition.members);
      if (uniqueMembers.size !== partyComposition.members.length) {
        errors.push('パーティメンバーに重複があります');
      }
    }

    // フォーメーション検証
    if (!partyComposition.formation || typeof partyComposition.formation !== 'string') {
      errors.push('フォーメーションが無効です');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * プレイ時間検証
   * Play Time Validation
   *
   * @param playTime - プレイ時間（ミリ秒）
   * @returns 検証結果
   */
  private validatePlayTime(playTime: number): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeof playTime !== 'number' || isNaN(playTime)) {
      errors.push('プレイ時間が無効です');
      return { isValid: false, errors, warnings };
    }

    if (playTime < 0) {
      errors.push('プレイ時間が負の値です');
    }

    // 異常に長いプレイ時間の警告（1000時間以上）
    if (playTime > 3600000000) {
      warnings.push('プレイ時間が異常に長い値です');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * データ整合性検証
   * Data Consistency Validation
   *
   * @param saveData - セーブデータ
   * @returns 検証結果
   */
  private validateDataConsistency(saveData: SaveData): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // chapterStateが存在しない場合はスキップ
    if (!saveData.chapterState) {
      return { isValid: true, errors, warnings };
    }

    // ロストキャラクターと利用可能なキャラクターの重複チェック
    const lostSet = new Set(saveData.chapterState.lostCharacterIds || []);
    const availableSet = new Set(saveData.chapterState.availableCharacterIds || []);

    const overlap = [...lostSet].filter((id) => availableSet.has(id));
    if (overlap.length > 0) {
      errors.push('ロストキャラクターと利用可能なキャラクターに重複があります');
    }

    // partyCompositionが存在しない場合はスキップ
    if (!saveData.partyComposition) {
      return { isValid: errors.length === 0, errors, warnings };
    }

    // パーティメンバーがロストキャラクターに含まれていないかチェック
    const partyMembers = new Set(saveData.partyComposition.members || []);
    const lostInParty = [...partyMembers].filter((id) => lostSet.has(id));
    if (lostInParty.length > 0) {
      errors.push('パーティにロストキャラクターが含まれています');
    }

    // パーティメンバーが利用可能なキャラクターに含まれているかチェック
    const unavailableInParty = [...partyMembers].filter((id) => !availableSet.has(id));
    if (unavailableInParty.length > 0) {
      warnings.push('パーティに利用不可能なキャラクターが含まれています');
    }

    // プレイ時間の整合性チェック
    if (saveData.playTime < saveData.chapterState.playTime) {
      warnings.push('総プレイ時間が章のプレイ時間より短い値です');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * セーブデータの破損チェック
   * Check Save Data Corruption
   *
   * @param saveData - セーブデータ
   * @returns 破損している場合true
   */
  public isCorrupted(saveData: SaveData): boolean {
    const result = this.validateSaveData(saveData);
    return !result.isValid;
  }

  /**
   * バージョン互換性チェック
   * Check Version Compatibility
   *
   * @param version - バージョン文字列
   * @returns 互換性がある場合true
   */
  public isVersionCompatible(version: string): boolean {
    return SaveDataValidator.SUPPORTED_VERSIONS.includes(version);
  }
}

