/**
 * PartyManager - パーティ管理システム
 * 
 * 最大6人のパーティ編成とバリデーションを管理します。
 * 
 * 主な機能:
 * - キャラクターの追加・除外
 * - パーティのクリア
 * - パーティサイズの確認
 * - パーティ編成の検証
 * 
 * 要件: 2.1, 2.2, 2.3, 2.4
 */

import {
  PartyComposition,
  PartyCompositionError,
  PartyCompositionValidationResult,
  FormationType,
} from '../../types/chapterStage';

/**
 * パーティ操作結果
 * Party Operation Result
 */
export interface PartyResult {
  success: boolean;
  error?: PartyCompositionError;
  message?: string;
  details?: any;
}

/**
 * PartyManager class
 * パーティ管理システムのメインクラス
 */
export class PartyManager {
  private party: PartyComposition;
  private readonly maxPartySize: number = 6;

  /**
   * Constructor
   * 
   * @param initialFormation - 初期フォーメーション（デフォルト: BALANCED）
   */
  constructor(initialFormation: FormationType = 'BALANCED') {
    this.party = {
      members: [],
      formation: initialFormation,
    };
    this.log('PartyManager initialized');
  }

  /**
   * キャラクターの追加
   * Add character to party
   * 
   * @param characterId - 追加するキャラクターID
   * @param lostCharacterIds - ロストキャラクターIDリスト（検証用）
   * @param availableCharacterIds - 利用可能なキャラクターIDリスト（検証用）
   * @returns PartyResult
   * 
   * 要件: 2.1, 2.3
   */
  public addCharacter(
    characterId: string,
    lostCharacterIds: string[] = [],
    availableCharacterIds: string[] = []
  ): PartyResult {
    try {
      this.log(`Adding character to party: ${characterId}`);

      // パーティが満員かチェック
      if (this.isPartyFull()) {
        return {
          success: false,
          error: PartyCompositionError.PARTY_FULL,
          message: 'パーティが満員です（最大6人）',
          details: { characterId, currentSize: this.party.members.length },
        };
      }

      // キャラクターが既にパーティに存在するかチェック
      if (this.party.members.includes(characterId)) {
        return {
          success: false,
          error: PartyCompositionError.CHARACTER_DUPLICATE,
          message: 'このキャラクターは既にパーティに含まれています',
          details: { characterId },
        };
      }

      // キャラクターがロストしているかチェック
      if (lostCharacterIds.includes(characterId)) {
        return {
          success: false,
          error: PartyCompositionError.CHARACTER_LOST,
          message: 'このキャラクターは章内で使用不可です',
          details: { characterId },
        };
      }

      // キャラクターが利用可能かチェック（リストが提供されている場合）
      if (availableCharacterIds.length > 0 && !availableCharacterIds.includes(characterId)) {
        return {
          success: false,
          error: PartyCompositionError.CHARACTER_NOT_AVAILABLE,
          message: 'このキャラクターは利用できません',
          details: { characterId },
        };
      }

      // パーティに追加
      this.party.members.push(characterId);

      this.log(`Character added to party successfully: ${characterId}`);
      return {
        success: true,
        message: `キャラクターをパーティに追加しました: ${characterId}`,
        details: {
          characterId,
          currentSize: this.party.members.length,
        },
      };
    } catch (error) {
      this.logError('Failed to add character to party', error);
      return {
        success: false,
        message: `キャラクターの追加に失敗しました: ${characterId}`,
        details: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  /**
   * キャラクターの除外
   * Remove character from party
   * 
   * @param characterId - 除外するキャラクターID
   * @returns PartyResult
   * 
   * 要件: 2.3
   */
  public removeCharacter(characterId: string): PartyResult {
    try {
      this.log(`Removing character from party: ${characterId}`);

      // キャラクターがパーティに存在するかチェック
      const index = this.party.members.indexOf(characterId);
      if (index === -1) {
        return {
          success: false,
          message: 'このキャラクターはパーティに含まれていません',
          details: { characterId },
        };
      }

      // パーティから除外
      this.party.members.splice(index, 1);

      this.log(`Character removed from party successfully: ${characterId}`);
      return {
        success: true,
        message: `キャラクターをパーティから除外しました: ${characterId}`,
        details: {
          characterId,
          currentSize: this.party.members.length,
        },
      };
    } catch (error) {
      this.logError('Failed to remove character from party', error);
      return {
        success: false,
        message: `キャラクターの除外に失敗しました: ${characterId}`,
        details: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  /**
   * パーティのクリア
   * Clear all party members
   * 
   * @returns PartyResult
   * 
   * 要件: 2.3
   */
  public clearParty(): PartyResult {
    try {
      this.log('Clearing party');

      const previousSize = this.party.members.length;
      this.party.members = [];

      this.log('Party cleared successfully');
      return {
        success: true,
        message: 'パーティをクリアしました',
        details: {
          previousSize,
          currentSize: 0,
        },
      };
    } catch (error) {
      this.logError('Failed to clear party', error);
      return {
        success: false,
        message: 'パーティのクリアに失敗しました',
        details: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  /**
   * パーティサイズの確認
   * Check if party is full
   * 
   * @returns boolean
   * 
   * 要件: 2.1
   */
  public isPartyFull(): boolean {
    return this.party.members.length >= this.maxPartySize;
  }

  /**
   * パーティサイズの取得
   * Get current party size
   * 
   * @returns number
   */
  public getPartySize(): number {
    return this.party.members.length;
  }

  /**
   * パーティの取得
   * Get current party composition
   * 
   * @returns PartyComposition
   */
  public getParty(): PartyComposition {
    return {
      members: [...this.party.members],
      formation: this.party.formation,
    };
  }

  /**
   * パーティの設定
   * Set party composition
   * 
   * @param composition - 設定するパーティ編成
   * @returns PartyResult
   */
  public setParty(composition: PartyComposition): PartyResult {
    try {
      this.log('Setting party composition');

      // パーティサイズをチェック
      if (composition.members.length > this.maxPartySize) {
        return {
          success: false,
          error: PartyCompositionError.PARTY_FULL,
          message: `パーティサイズが最大値を超えています（最大${this.maxPartySize}人）`,
          details: {
            providedSize: composition.members.length,
            maxSize: this.maxPartySize,
          },
        };
      }

      // 重複チェック
      const uniqueMembers = new Set(composition.members);
      if (uniqueMembers.size !== composition.members.length) {
        return {
          success: false,
          error: PartyCompositionError.CHARACTER_DUPLICATE,
          message: 'パーティに重複したキャラクターが含まれています',
        };
      }

      // パーティを設定
      this.party = {
        members: [...composition.members],
        formation: composition.formation,
      };

      this.log('Party composition set successfully');
      return {
        success: true,
        message: 'パーティ編成を設定しました',
        details: {
          size: this.party.members.length,
          formation: this.party.formation,
        },
      };
    } catch (error) {
      this.logError('Failed to set party composition', error);
      return {
        success: false,
        message: 'パーティ編成の設定に失敗しました',
        details: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  /**
   * フォーメーションの設定
   * Set party formation
   * 
   * @param formation - 設定するフォーメーション
   * @returns PartyResult
   */
  public setFormation(formation: FormationType): PartyResult {
    try {
      this.log(`Setting formation: ${formation}`);

      this.party.formation = formation;

      this.log('Formation set successfully');
      return {
        success: true,
        message: `フォーメーションを設定しました: ${formation}`,
        details: { formation },
      };
    } catch (error) {
      this.logError('Failed to set formation', error);
      return {
        success: false,
        message: 'フォーメーションの設定に失敗しました',
        details: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  /**
   * フォーメーションの取得
   * Get current formation
   * 
   * @returns FormationType
   */
  public getFormation(): FormationType {
    return this.party.formation;
  }

  /**
   * パーティメンバーの取得
   * Get party member IDs
   * 
   * @returns string[]
   */
  public getMembers(): string[] {
    return [...this.party.members];
  }

  /**
   * キャラクターがパーティに含まれているかチェック
   * Check if character is in party
   * 
   * @param characterId - チェックするキャラクターID
   * @returns boolean
   */
  public hasCharacter(characterId: string): boolean {
    return this.party.members.includes(characterId);
  }

  /**
   * パーティが空かチェック
   * Check if party is empty
   * 
   * @returns boolean
   */
  public isEmpty(): boolean {
    return this.party.members.length === 0;
  }

  /**
   * パーティの検証
   * Validate party composition
   * 
   * @param lostCharacterIds - ロストキャラクターIDリスト
   * @param availableCharacterIds - 利用可能なキャラクターIDリスト（オプション）
   * @returns PartyCompositionValidationResult
   * 
   * 要件: 2.1, 2.2, 2.4
   */
  public validateParty(
    lostCharacterIds: string[],
    availableCharacterIds?: string[]
  ): PartyCompositionValidationResult {
    const errors: PartyCompositionError[] = [];

    this.log('Validating party composition');

    // パーティサイズ制限の検証（最大6人）
    if (this.party.members.length > this.maxPartySize) {
      errors.push(PartyCompositionError.PARTY_FULL);
      this.log(`Validation error: Party size exceeds maximum (${this.party.members.length}/${this.maxPartySize})`);
    }

    // キャラクター重複チェック
    const uniqueMembers = new Set(this.party.members);
    if (uniqueMembers.size !== this.party.members.length) {
      errors.push(PartyCompositionError.CHARACTER_DUPLICATE);
      this.log('Validation error: Duplicate characters found in party');
    }

    // ロストキャラクター制限の検証
    for (const characterId of this.party.members) {
      if (lostCharacterIds.includes(characterId)) {
        errors.push(PartyCompositionError.CHARACTER_LOST);
        this.log(`Validation error: Lost character in party: ${characterId}`);
        break; // 1つでも見つかればエラー
      }
    }

    // 利用可能性チェック（リストが提供されている場合）
    if (availableCharacterIds) {
      for (const characterId of this.party.members) {
        if (!availableCharacterIds.includes(characterId)) {
          errors.push(PartyCompositionError.CHARACTER_NOT_AVAILABLE);
          this.log(`Validation error: Unavailable character in party: ${characterId}`);
          break; // 1つでも見つかればエラー
        }
      }
    }

    const isValid = errors.length === 0;

    if (isValid) {
      this.log('Party validation passed');
    } else {
      this.log(`Party validation failed with ${errors.length} error(s)`);
    }

    return {
      isValid,
      errors,
    };
  }

  /**
   * パーティサイズが有効かチェック
   * Check if party size is valid
   * 
   * @returns boolean
   * 
   * 要件: 2.1
   */
  public isPartySizeValid(): boolean {
    return this.party.members.length <= this.maxPartySize;
  }

  /**
   * ロストキャラクターが含まれていないかチェック
   * Check if party contains no lost characters
   * 
   * @param lostCharacterIds - ロストキャラクターIDリスト
   * @returns boolean
   * 
   * 要件: 2.2
   */
  public hasNoLostCharacters(lostCharacterIds: string[]): boolean {
    for (const characterId of this.party.members) {
      if (lostCharacterIds.includes(characterId)) {
        return false;
      }
    }
    return true;
  }

  /**
   * 重複キャラクターが含まれていないかチェック
   * Check if party contains no duplicate characters
   * 
   * @returns boolean
   * 
   * 要件: 2.4
   */
  public hasNoDuplicates(): boolean {
    const uniqueMembers = new Set(this.party.members);
    return uniqueMembers.size === this.party.members.length;
  }

  /**
   * 全てのキャラクターが利用可能かチェック
   * Check if all characters are available
   * 
   * @param availableCharacterIds - 利用可能なキャラクターIDリスト
   * @returns boolean
   * 
   * 要件: 2.4
   */
  public areAllCharactersAvailable(availableCharacterIds: string[]): boolean {
    for (const characterId of this.party.members) {
      if (!availableCharacterIds.includes(characterId)) {
        return false;
      }
    }
    return true;
  }

  /**
   * エラーメッセージの取得
   * Get error message for validation error
   * 
   * @param error - パーティ編成エラー
   * @returns string
   * 
   * 要件: 9.2
   */
  public getErrorMessage(error: PartyCompositionError): string {
    switch (error) {
      case PartyCompositionError.PARTY_FULL:
        return 'パーティが満員です（最大6人）';
      case PartyCompositionError.CHARACTER_LOST:
        return 'このキャラクターは章内で使用不可です';
      case PartyCompositionError.CHARACTER_DUPLICATE:
        return 'パーティに重複したキャラクターが含まれています';
      case PartyCompositionError.CHARACTER_NOT_AVAILABLE:
        return 'このキャラクターは利用できません';
      default:
        return '不明なエラーが発生しました';
    }
  }

  /**
   * 検証エラーの詳細メッセージを取得
   * Get detailed error messages from validation result
   * 
   * @param validationResult - パーティ検証結果
   * @returns string[]
   * 
   * 要件: 9.2
   */
  public getValidationErrorMessages(validationResult: PartyCompositionValidationResult): string[] {
    return validationResult.errors.map((error) => this.getErrorMessage(error));
  }

  /**
   * エラー状態の取得
   * Get current error state
   * 
   * @param lostCharacterIds - ロストキャラクターIDリスト
   * @param availableCharacterIds - 利用可能なキャラクターIDリスト（オプション）
   * @returns PartyCompositionError[]
   * 
   * 要件: 9.2
   */
  public getErrorState(
    lostCharacterIds: string[],
    availableCharacterIds?: string[]
  ): PartyCompositionError[] {
    const validationResult = this.validateParty(lostCharacterIds, availableCharacterIds);
    return validationResult.errors;
  }

  /**
   * エラーがあるかチェック
   * Check if there are any errors
   * 
   * @param lostCharacterIds - ロストキャラクターIDリスト
   * @param availableCharacterIds - 利用可能なキャラクターIDリスト（オプション）
   * @returns boolean
   * 
   * 要件: 9.2
   */
  public hasErrors(lostCharacterIds: string[], availableCharacterIds?: string[]): boolean {
    const validationResult = this.validateParty(lostCharacterIds, availableCharacterIds);
    return !validationResult.isValid;
  }

  /**
   * 特定のエラーが存在するかチェック
   * Check if specific error exists
   * 
   * @param error - チェックするエラー
   * @param lostCharacterIds - ロストキャラクターIDリスト
   * @param availableCharacterIds - 利用可能なキャラクターIDリスト（オプション）
   * @returns boolean
   * 
   * 要件: 9.2
   */
  public hasError(
    error: PartyCompositionError,
    lostCharacterIds: string[],
    availableCharacterIds?: string[]
  ): boolean {
    const validationResult = this.validateParty(lostCharacterIds, availableCharacterIds);
    return validationResult.errors.includes(error);
  }

  /**
   * ログ出力
   * Log message
   * 
   * @param message - ログメッセージ
   */
  private log(message: string): void {
    console.log(`[PartyManager] ${message}`);
  }

  /**
   * エラーログ出力
   * Log error message
   * 
   * @param message - エラーメッセージ
   * @param error - エラーオブジェクト
   */
  private logError(message: string, error: unknown): void {
    console.error(`[PartyManager] ${message}`, error);
  }
}
