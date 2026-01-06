/**
 * PartyManager - Party Composition Management System
 * パーティ管理システム
 *
 * Manages party composition with up to 6 characters, validates party members,
 * and ensures characters are available and not lost.
 * 最大6人のパーティ編成を管理し、パーティメンバーを検証し、
 * キャラクターが利用可能でロストしていないことを確認します。
 */

import {
  PartyComposition,
  PartyValidationResult,
  PartyValidationError,
  FormationType,
} from '../../types/chapter';

/**
 * PartyManager class
 * パーティマネージャークラス
 */
export class PartyManager {
  private party: PartyComposition;
  private readonly maxPartySize: number = 6;

  /**
   * Constructor
   * コンストラクタ
   */
  constructor() {
    this.party = {
      members: [],
      formation: 'BALANCED',
    };
  }

  /**
   * Add a character to the party
   * パーティにキャラクターを追加
   *
   * @param characterId - Character ID to add
   * @returns true if added successfully, false otherwise
   */
  addCharacter(characterId: string): boolean {
    // Check if party is full
    if (this.isPartyFull()) {
      return false;
    }

    // Check if character is already in party
    if (this.party.members.includes(characterId)) {
      return false;
    }

    // Add character to party
    this.party.members.push(characterId);
    return true;
  }

  /**
   * Remove a character from the party
   * パーティからキャラクターを除外
   *
   * @param characterId - Character ID to remove
   * @returns true if removed successfully, false otherwise
   */
  removeCharacter(characterId: string): boolean {
    const index = this.party.members.indexOf(characterId);
    if (index === -1) {
      return false;
    }

    this.party.members.splice(index, 1);
    return true;
  }

  /**
   * Clear the party
   * パーティをクリア
   */
  clearParty(): void {
    this.party.members = [];
  }

  /**
   * Check if party is full
   * パーティが満員かどうかを確認
   *
   * @returns true if party has 6 members, false otherwise
   */
  isPartyFull(): boolean {
    return this.party.members.length >= this.maxPartySize;
  }

  /**
   * Get current party size
   * 現在のパーティサイズを取得
   *
   * @returns Number of characters in party
   */
  getPartySize(): number {
    return this.party.members.length;
  }

  /**
   * Get the current party composition
   * 現在のパーティ編成を取得
   *
   * @returns Current party composition
   */
  getParty(): PartyComposition {
    return {
      members: [...this.party.members],
      formation: this.party.formation,
    };
  }

  /**
   * Set the party composition
   * パーティ編成を設定
   *
   * @param composition - Party composition to set
   */
  setParty(composition: PartyComposition): void {
    this.party = {
      members: [...composition.members],
      formation: composition.formation,
    };
  }

  /**
   * Set the formation type
   * 陣形タイプを設定
   *
   * @param formation - Formation type to set
   */
  setFormation(formation: FormationType): void {
    this.party.formation = formation;
  }

  /**
   * Get the formation type
   * 陣形タイプを取得
   *
   * @returns Current formation type
   */
  getFormation(): FormationType {
    return this.party.formation;
  }

  /**
   * Check if a character is in the party
   * キャラクターがパーティにいるかどうかを確認
   *
   * @param characterId - Character ID to check
   * @returns true if character is in party, false otherwise
   */
  hasCharacter(characterId: string): boolean {
    return this.party.members.includes(characterId);
  }

  /**
   * Validate the party composition
   * パーティ編成を検証
   *
   * @param lostCharacterIds - List of lost character IDs
   * @param availableCharacterIds - List of available character IDs (optional)
   * @returns Validation result
   */
  validateParty(
    lostCharacterIds: string[],
    availableCharacterIds?: string[]
  ): PartyValidationResult {
    const errors: PartyValidationError[] = [];

    // Check if party is empty
    if (this.party.members.length === 0) {
      errors.push(PartyValidationError.PARTY_EMPTY);
    }

    // Check party size limit (maximum 6 members)
    if (this.party.members.length > this.maxPartySize) {
      errors.push(PartyValidationError.PARTY_FULL);
    }

    // Check for duplicate characters
    const uniqueMembers = new Set(this.party.members);
    if (uniqueMembers.size !== this.party.members.length) {
      errors.push(PartyValidationError.CHARACTER_DUPLICATE);
    }

    // Check for lost characters in party
    for (const characterId of this.party.members) {
      if (lostCharacterIds.includes(characterId)) {
        errors.push(PartyValidationError.CHARACTER_LOST);
        break; // Only add error once
      }
    }

    // Check if all characters are available (if availableCharacterIds is provided)
    if (availableCharacterIds) {
      for (const characterId of this.party.members) {
        if (!availableCharacterIds.includes(characterId)) {
          errors.push(PartyValidationError.CHARACTER_NOT_AVAILABLE);
          break; // Only add error once
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
