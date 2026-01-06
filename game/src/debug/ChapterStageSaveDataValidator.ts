/**
 * ChapterStageSaveDataValidator - セーブデータ検証ツール
 *
 * セーブデータの整合性チェックと修復機能を提供:
 * - データ構造の検証
 * - バージョン互換性チェック
 * - データ整合性チェック
 * - 破損データの検出と修復
 */

/**
 * セーブデータ検証結果
 */
export interface SaveDataValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
  canBeRepaired: boolean;
}

/**
 * 検証エラー
 */
export interface ValidationError {
  code: string;
  message: string;
  severity: 'critical' | 'error' | 'warning';
  path: string;
  value?: any;
}

/**
 * 検証警告
 */
export interface ValidationWarning {
  code: string;
  message: string;
  path: string;
  value?: any;
}

/**
 * セーブデータ修復結果
 */
export interface SaveDataRepairResult {
  success: boolean;
  repairedData?: any;
  appliedFixes: string[];
  remainingErrors: ValidationError[];
}

/**
 * セーブデータ検証ツール
 */
export class ChapterStageSaveDataValidator {
  private readonly CURRENT_VERSION = '1.0.0';
  private readonly SUPPORTED_VERSIONS = ['1.0.0'];

  /**
   * セーブデータの完全検証
   * @param saveData - 検証するセーブデータ
   * @returns 検証結果
   */
  public validateSaveData(saveData: any): SaveDataValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: string[] = [];

    // 基本構造の検証
    this.validateBasicStructure(saveData, errors);

    // バージョンの検証
    this.validateVersion(saveData, errors, warnings);

    // 章状態の検証
    if (saveData.chapterState) {
      this.validateChapterState(saveData.chapterState, errors, warnings);
    }

    // ステージ進行状況の検証
    if (saveData.stageProgress) {
      this.validateStageProgress(saveData.stageProgress, errors, warnings);
    }

    // パーティ編成の検証
    if (saveData.partyComposition) {
      this.validatePartyComposition(saveData.partyComposition, errors, warnings);
    }

    // データ整合性の検証
    this.validateDataConsistency(saveData, errors, warnings);

    // 修復可能性の判定
    const canBeRepaired = this.canRepairData(errors);

    // 提案の生成
    if (warnings.length > 0) {
      suggestions.push('警告が検出されました。データの確認をお勧めします。');
    }

    if (canBeRepaired) {
      suggestions.push('検出されたエラーは自動修復可能です。');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      canBeRepaired,
    };
  }

  /**
   * セーブデータの修復
   * @param saveData - 修復するセーブデータ
   * @returns 修復結果
   */
  public repairSaveData(saveData: any): SaveDataRepairResult {
    const appliedFixes: string[] = [];
    let repairedData = JSON.parse(JSON.stringify(saveData)); // ディープコピー

    try {
      // バージョンの修復
      if (!repairedData.version || !this.SUPPORTED_VERSIONS.includes(repairedData.version)) {
        repairedData.version = this.CURRENT_VERSION;
        appliedFixes.push('バージョンを最新に更新');
      }

      // タイムスタンプの修復
      if (!repairedData.timestamp || typeof repairedData.timestamp !== 'number') {
        repairedData.timestamp = Date.now();
        appliedFixes.push('タイムスタンプを現在時刻に設定');
      }

      // 章状態の修復
      if (repairedData.chapterState) {
        const chapterFixes = this.repairChapterState(repairedData.chapterState);
        appliedFixes.push(...chapterFixes);
      }

      // ステージ進行状況の修復
      if (repairedData.stageProgress) {
        const stageFixes = this.repairStageProgress(repairedData.stageProgress);
        appliedFixes.push(...stageFixes);
      }

      // パーティ編成の修復
      if (repairedData.partyComposition) {
        const partyFixes = this.repairPartyComposition(repairedData.partyComposition);
        appliedFixes.push(...partyFixes);
      }

      // 修復後の検証
      const validationResult = this.validateSaveData(repairedData);

      return {
        success: validationResult.isValid,
        repairedData,
        appliedFixes,
        remainingErrors: validationResult.errors,
      };
    } catch (error) {
      return {
        success: false,
        appliedFixes,
        remainingErrors: [
          {
            code: 'REPAIR_FAILED',
            message: `修復中にエラーが発生しました: ${error}`,
            severity: 'critical',
            path: 'root',
          },
        ],
      };
    }
  }

  /**
   * セーブデータの比較
   * @param saveData1 - 比較するセーブデータ1
   * @param saveData2 - 比較するセーブデータ2
   * @returns 差分情報
   */
  public compareSaveData(saveData1: any, saveData2: any): string[] {
    const differences: string[] = [];

    // 章の比較
    if (saveData1.chapterState?.chapterId !== saveData2.chapterState?.chapterId) {
      differences.push(
        `章が異なります: ${saveData1.chapterState?.chapterId} vs ${saveData2.chapterState?.chapterId}`
      );
    }

    // ステージの比較
    if (
      saveData1.chapterState?.currentStageIndex !== saveData2.chapterState?.currentStageIndex
    ) {
      differences.push(
        `現在ステージが異なります: ${saveData1.chapterState?.currentStageIndex} vs ${saveData2.chapterState?.currentStageIndex}`
      );
    }

    // ロストキャラクターの比較
    const lost1 = saveData1.chapterState?.lostCharacterIds || [];
    const lost2 = saveData2.chapterState?.lostCharacterIds || [];
    if (JSON.stringify(lost1.sort()) !== JSON.stringify(lost2.sort())) {
      differences.push('ロストキャラクターが異なります');
    }

    // パーティの比較
    const party1 = saveData1.partyComposition?.members || [];
    const party2 = saveData2.partyComposition?.members || [];
    if (JSON.stringify(party1.sort()) !== JSON.stringify(party2.sort())) {
      differences.push('パーティ編成が異なります');
    }

    // プレイ時間の比較
    const timeDiff = Math.abs(
      (saveData1.playTime || 0) - (saveData2.playTime || 0)
    );
    if (timeDiff > 60000) {
      // 1分以上の差
      differences.push(`プレイ時間が ${Math.floor(timeDiff / 60000)} 分異なります`);
    }

    return differences;
  }

  /**
   * 基本構造の検証
   */
  private validateBasicStructure(saveData: any, errors: ValidationError[]): void {
    if (!saveData) {
      errors.push({
        code: 'NULL_DATA',
        message: 'セーブデータがnullまたはundefinedです',
        severity: 'critical',
        path: 'root',
      });
      return;
    }

    if (typeof saveData !== 'object') {
      errors.push({
        code: 'INVALID_TYPE',
        message: 'セーブデータがオブジェクトではありません',
        severity: 'critical',
        path: 'root',
        value: typeof saveData,
      });
      return;
    }

    // 必須フィールドのチェック
    const requiredFields = ['version', 'timestamp', 'chapterState', 'stageProgress', 'partyComposition'];
    requiredFields.forEach(field => {
      if (!(field in saveData)) {
        errors.push({
          code: 'MISSING_FIELD',
          message: `必須フィールド '${field}' が存在しません`,
          severity: 'error',
          path: field,
        });
      }
    });
  }

  /**
   * バージョンの検証
   */
  private validateVersion(
    saveData: any,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!saveData.version) {
      errors.push({
        code: 'MISSING_VERSION',
        message: 'バージョン情報が存在しません',
        severity: 'error',
        path: 'version',
      });
      return;
    }

    if (!this.SUPPORTED_VERSIONS.includes(saveData.version)) {
      warnings.push({
        code: 'UNSUPPORTED_VERSION',
        message: `サポートされていないバージョンです: ${saveData.version}`,
        path: 'version',
        value: saveData.version,
      });
    }
  }

  /**
   * 章状態の検証
   */
  private validateChapterState(
    chapterState: any,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // 必須フィールドのチェック
    const requiredFields = [
      'chapterId',
      'currentStageIndex',
      'lostCharacterIds',
      'availableCharacterIds',
      'completedStageIds',
      'isCompleted',
    ];

    requiredFields.forEach(field => {
      if (!(field in chapterState)) {
        errors.push({
          code: 'MISSING_CHAPTER_FIELD',
          message: `章状態の必須フィールド '${field}' が存在しません`,
          severity: 'error',
          path: `chapterState.${field}`,
        });
      }
    });

    // 配列フィールドの検証
    const arrayFields = ['lostCharacterIds', 'availableCharacterIds', 'completedStageIds'];
    arrayFields.forEach(field => {
      if (chapterState[field] && !Array.isArray(chapterState[field])) {
        errors.push({
          code: 'INVALID_ARRAY_FIELD',
          message: `'${field}' が配列ではありません`,
          severity: 'error',
          path: `chapterState.${field}`,
          value: typeof chapterState[field],
        });
      }
    });

    // ステージインデックスの検証
    if (typeof chapterState.currentStageIndex !== 'number' || chapterState.currentStageIndex < 0) {
      errors.push({
        code: 'INVALID_STAGE_INDEX',
        message: '現在ステージインデックスが無効です',
        severity: 'error',
        path: 'chapterState.currentStageIndex',
        value: chapterState.currentStageIndex,
      });
    }

    // ロストキャラクターと利用可能キャラクターの重複チェック
    if (chapterState.lostCharacterIds && chapterState.availableCharacterIds) {
      const duplicates = chapterState.lostCharacterIds.filter((id: string) =>
        chapterState.availableCharacterIds.includes(id)
      );

      if (duplicates.length > 0) {
        warnings.push({
          code: 'CHARACTER_DUPLICATE',
          message: 'ロストキャラクターと利用可能キャラクターに重複があります',
          path: 'chapterState',
          value: duplicates,
        });
      }
    }
  }

  /**
   * ステージ進行状況の検証
   */
  private validateStageProgress(
    stageProgress: any,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!stageProgress.stages || !Array.isArray(stageProgress.stages)) {
      errors.push({
        code: 'INVALID_STAGE_PROGRESS',
        message: 'ステージ進行状況が配列ではありません',
        severity: 'error',
        path: 'stageProgress.stages',
      });
      return;
    }

    stageProgress.stages.forEach((stage: any, index: number) => {
      if (!stage.stageId) {
        errors.push({
          code: 'MISSING_STAGE_ID',
          message: `ステージID が存在しません (インデックス: ${index})`,
          severity: 'error',
          path: `stageProgress.stages[${index}].stageId`,
        });
      }

      if (typeof stage.isUnlocked !== 'boolean') {
        errors.push({
          code: 'INVALID_UNLOCK_STATUS',
          message: `解放状態が真偽値ではありません (ステージ: ${stage.stageId})`,
          severity: 'error',
          path: `stageProgress.stages[${index}].isUnlocked`,
        });
      }

      if (typeof stage.isCompleted !== 'boolean') {
        errors.push({
          code: 'INVALID_COMPLETION_STATUS',
          message: `完了状態が真偽値ではありません (ステージ: ${stage.stageId})`,
          severity: 'error',
          path: `stageProgress.stages[${index}].isCompleted`,
        });
      }

      // 完了しているのに未解放の矛盾チェック
      if (stage.isCompleted && !stage.isUnlocked) {
        warnings.push({
          code: 'INCONSISTENT_STAGE_STATUS',
          message: `ステージが完了しているのに未解放です (ステージ: ${stage.stageId})`,
          path: `stageProgress.stages[${index}]`,
        });
      }
    });
  }

  /**
   * パーティ編成の検証
   */
  private validatePartyComposition(
    partyComposition: any,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!partyComposition.members || !Array.isArray(partyComposition.members)) {
      errors.push({
        code: 'INVALID_PARTY_MEMBERS',
        message: 'パーティメンバーが配列ではありません',
        severity: 'error',
        path: 'partyComposition.members',
      });
      return;
    }

    // パーティサイズの検証
    if (partyComposition.members.length > 6) {
      errors.push({
        code: 'PARTY_SIZE_EXCEEDED',
        message: 'パーティサイズが最大値(6)を超えています',
        severity: 'error',
        path: 'partyComposition.members',
        value: partyComposition.members.length,
      });
    }

    // 重複チェック
    const uniqueMembers = new Set(partyComposition.members);
    if (uniqueMembers.size !== partyComposition.members.length) {
      warnings.push({
        code: 'DUPLICATE_PARTY_MEMBERS',
        message: 'パーティに重複したキャラクターが含まれています',
        path: 'partyComposition.members',
      });
    }
  }

  /**
   * データ整合性の検証
   */
  private validateDataConsistency(
    saveData: any,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // パーティメンバーがロストキャラクターに含まれていないかチェック
    if (saveData.partyComposition?.members && saveData.chapterState?.lostCharacterIds) {
      const lostInParty = saveData.partyComposition.members.filter((id: string) =>
        saveData.chapterState.lostCharacterIds.includes(id)
      );

      if (lostInParty.length > 0) {
        errors.push({
          code: 'LOST_CHARACTER_IN_PARTY',
          message: 'ロストキャラクターがパーティに含まれています',
          severity: 'error',
          path: 'partyComposition.members',
          value: lostInParty,
        });
      }
    }

    // パーティメンバーが利用可能キャラクターに含まれているかチェック
    if (saveData.partyComposition?.members && saveData.chapterState?.availableCharacterIds) {
      const unavailableInParty = saveData.partyComposition.members.filter(
        (id: string) => !saveData.chapterState.availableCharacterIds.includes(id)
      );

      if (unavailableInParty.length > 0) {
        warnings.push({
          code: 'UNAVAILABLE_CHARACTER_IN_PARTY',
          message: '利用不可能なキャラクターがパーティに含まれています',
          path: 'partyComposition.members',
          value: unavailableInParty,
        });
      }
    }
  }

  /**
   * 修復可能性の判定
   */
  private canRepairData(errors: ValidationError[]): boolean {
    // クリティカルエラーがある場合は修復不可
    const criticalErrors = errors.filter(e => e.severity === 'critical');
    if (criticalErrors.length > 0) {
      return false;
    }

    // 修復可能なエラーコード
    const repairableErrors = [
      'MISSING_VERSION',
      'MISSING_FIELD',
      'INVALID_ARRAY_FIELD',
      'INVALID_STAGE_INDEX',
      'PARTY_SIZE_EXCEEDED',
      'LOST_CHARACTER_IN_PARTY',
    ];

    // 全てのエラーが修復可能かチェック
    return errors.every(error => repairableErrors.includes(error.code));
  }

  /**
   * 章状態の修復
   */
  private repairChapterState(chapterState: any): string[] {
    const fixes: string[] = [];

    // 配列フィールドの修復
    const arrayFields = ['lostCharacterIds', 'availableCharacterIds', 'completedStageIds'];
    arrayFields.forEach(field => {
      if (!Array.isArray(chapterState[field])) {
        chapterState[field] = [];
        fixes.push(`${field}を空配列に初期化`);
      }
    });

    // ステージインデックスの修復
    if (typeof chapterState.currentStageIndex !== 'number' || chapterState.currentStageIndex < 0) {
      chapterState.currentStageIndex = 0;
      fixes.push('現在ステージインデックスを0に設定');
    }

    // ロストキャラクターと利用可能キャラクターの重複を解消
    if (chapterState.lostCharacterIds && chapterState.availableCharacterIds) {
      const originalAvailable = [...chapterState.availableCharacterIds];
      chapterState.availableCharacterIds = chapterState.availableCharacterIds.filter(
        (id: string) => !chapterState.lostCharacterIds.includes(id)
      );

      if (originalAvailable.length !== chapterState.availableCharacterIds.length) {
        fixes.push('ロストキャラクターを利用可能リストから除外');
      }
    }

    return fixes;
  }

  /**
   * ステージ進行状況の修復
   */
  private repairStageProgress(stageProgress: any): string[] {
    const fixes: string[] = [];

    if (!Array.isArray(stageProgress.stages)) {
      stageProgress.stages = [];
      fixes.push('ステージ配列を初期化');
      return fixes;
    }

    stageProgress.stages.forEach((stage: any, index: number) => {
      // 真偽値フィールドの修復
      if (typeof stage.isUnlocked !== 'boolean') {
        stage.isUnlocked = false;
        fixes.push(`ステージ${index}の解放状態を修復`);
      }

      if (typeof stage.isCompleted !== 'boolean') {
        stage.isCompleted = false;
        fixes.push(`ステージ${index}の完了状態を修復`);
      }

      // 完了しているのに未解放の矛盾を解消
      if (stage.isCompleted && !stage.isUnlocked) {
        stage.isUnlocked = true;
        fixes.push(`ステージ${index}を解放状態に修正`);
      }
    });

    return fixes;
  }

  /**
   * パーティ編成の修復
   */
  private repairPartyComposition(partyComposition: any): string[] {
    const fixes: string[] = [];

    if (!Array.isArray(partyComposition.members)) {
      partyComposition.members = [];
      fixes.push('パーティメンバーを空配列に初期化');
      return fixes;
    }

    // パーティサイズの修復
    if (partyComposition.members.length > 6) {
      partyComposition.members = partyComposition.members.slice(0, 6);
      fixes.push('パーティサイズを6人に制限');
    }

    // 重複の除去
    const uniqueMembers = [...new Set(partyComposition.members)];
    if (uniqueMembers.length !== partyComposition.members.length) {
      partyComposition.members = uniqueMembers;
      fixes.push('パーティから重複キャラクターを除去');
    }

    return fixes;
  }
}
