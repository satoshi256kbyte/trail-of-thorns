/**
 * PartyManager Property-Based Tests
 * 
 * プロパティベーステストによるパーティ管理システムの検証
 * 
 * Feature: 3.4-chapter-stage-management
 * Properties:
 * - Property 5: パーティサイズ制限
 * - Property 6: ロストキャラクター制限
 * - Property 7: パーティ編成の有効性
 * 
 * 検証: 要件 2.1, 2.2, 2.4
 */

import { describe, test, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { PartyManager } from '../../../../game/src/systems/party/PartyManager';
import { PartyCompositionError } from '../../../../game/src/types/chapterStage';

describe('PartyManager Property-Based Tests', () => {
  let partyManager: PartyManager;

  beforeEach(() => {
    partyManager = new PartyManager();
  });

  /**
   * Property 5: パーティサイズ制限
   * 
   * 任意のパーティ編成に対して、キャラクターを追加する操作は、
   * パーティサイズが6人未満の場合のみ成功する
   * 
   * **Validates: Requirements 2.1, 7.4**
   */
  describe('Property 5: パーティサイズ制限', () => {
    test('パーティサイズが6人未満の場合のみキャラクター追加が成功する', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0), { minLength: 0, maxLength: 10 }), // initialMembers
          fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0), // newCharacterId
          (initialMembers, newCharacterId) => {
            // 重複を除去
            const uniqueMembers = [...new Set(initialMembers)];
            
            // 新しいキャラクターが既存メンバーに含まれていないことを確認
            if (uniqueMembers.includes(newCharacterId)) {
              return; // スキップ
            }

            // パーティマネージャーを初期化
            partyManager = new PartyManager();

            // 初期メンバーを追加（最大6人まで）
            const membersToAdd = uniqueMembers.slice(0, 6);
            membersToAdd.forEach((charId) => {
              partyManager.addCharacter(charId);
            });

            const currentSize = partyManager.getPartySize();

            // 新しいキャラクターを追加
            const result = partyManager.addCharacter(newCharacterId);

            // 検証: パーティサイズが6人未満の場合のみ成功
            if (currentSize < 6) {
              expect(result.success).toBe(true);
              expect(partyManager.getPartySize()).toBe(currentSize + 1);
              expect(partyManager.hasCharacter(newCharacterId)).toBe(true);
            } else {
              expect(result.success).toBe(false);
              expect(result.error).toBe(PartyCompositionError.PARTY_FULL);
              expect(partyManager.getPartySize()).toBe(6);
              expect(partyManager.hasCharacter(newCharacterId)).toBe(false);
            }

            // パーティサイズは常に6以下
            expect(partyManager.getPartySize()).toBeLessThanOrEqual(6);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('パーティが満員の場合、isPartyFull()がtrueを返す', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0), { minLength: 6, maxLength: 10 }), // characterIds
          (characterIds) => {
            const uniqueCharacterIds = [...new Set(characterIds)];
            if (uniqueCharacterIds.length < 6) return;

            partyManager = new PartyManager();

            // 6人追加
            for (let i = 0; i < 6; i++) {
              partyManager.addCharacter(uniqueCharacterIds[i]);
            }

            // 検証
            expect(partyManager.isPartyFull()).toBe(true);
            expect(partyManager.getPartySize()).toBe(6);

            // 7人目を追加しようとすると失敗
            if (uniqueCharacterIds.length > 6) {
              const result = partyManager.addCharacter(uniqueCharacterIds[6]);
              expect(result.success).toBe(false);
              expect(result.error).toBe(PartyCompositionError.PARTY_FULL);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('パーティサイズが6人未満の場合、isPartyFull()がfalseを返す', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0), { minLength: 0, maxLength: 5 }), // characterIds
          (characterIds) => {
            const uniqueCharacterIds = [...new Set(characterIds)];

            partyManager = new PartyManager();

            // キャラクターを追加（最大5人）
            uniqueCharacterIds.forEach((charId) => {
              partyManager.addCharacter(charId);
            });

            // 検証
            expect(partyManager.isPartyFull()).toBe(false);
            expect(partyManager.getPartySize()).toBeLessThan(6);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 6: ロストキャラクター制限
   * 
   * 任意のロストキャラクターに対して、そのキャラクターをパーティに追加しようとすると、
   * 操作は拒否され、適切なエラーメッセージが返される
   * 
   * **Validates: Requirements 2.2, 7.5**
   */
  describe('Property 6: ロストキャラクター制限', () => {
    test('ロストキャラクターをパーティに追加しようとすると拒否される', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0), { minLength: 1, maxLength: 10 }), // allCharacterIds
          fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 1, maxLength: 5 }), // lostCharacterIndices
          (allCharacterIds, lostCharacterIndices) => {
            const uniqueCharacterIds = [...new Set(allCharacterIds)];
            if (uniqueCharacterIds.length < 2) return;

            // ロストキャラクターを選択
            const lostCharacterIds = lostCharacterIndices
              .map((index) => uniqueCharacterIds[index % uniqueCharacterIds.length])
              .filter((id, idx, arr) => arr.indexOf(id) === idx); // 重複除去

            if (lostCharacterIds.length === 0) return;

            partyManager = new PartyManager();

            // ロストキャラクターを追加しようとする
            lostCharacterIds.forEach((lostCharId) => {
              const result = partyManager.addCharacter(lostCharId, lostCharacterIds);

              // 検証: 追加は拒否される
              expect(result.success).toBe(false);
              expect(result.error).toBe(PartyCompositionError.CHARACTER_LOST);
              expect(partyManager.hasCharacter(lostCharId)).toBe(false);
            });

            // パーティは空のまま
            expect(partyManager.isEmpty()).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('ロストキャラクターが含まれるパーティは検証に失敗する', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0), { minLength: 3, maxLength: 10 }), // allCharacterIds
          fc.integer({ min: 0, max: 2 }), // lostCharacterIndex
          (allCharacterIds, lostCharacterIndex) => {
            const uniqueCharacterIds = [...new Set(allCharacterIds)];
            if (uniqueCharacterIds.length < 3) return;

            partyManager = new PartyManager();

            // 通常のキャラクターを追加
            const normalCharIds = uniqueCharacterIds.slice(0, 3);
            normalCharIds.forEach((charId) => {
              partyManager.addCharacter(charId);
            });

            // 1人をロストキャラクターとして指定
            const lostCharacterId = normalCharIds[lostCharacterIndex];
            const lostCharacterIds = [lostCharacterId];

            // 検証
            const validationResult = partyManager.validateParty(lostCharacterIds);

            expect(validationResult.isValid).toBe(false);
            expect(validationResult.errors).toContain(PartyCompositionError.CHARACTER_LOST);
            expect(partyManager.hasNoLostCharacters(lostCharacterIds)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('ロストキャラクターが含まれないパーティは検証に成功する', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0), { minLength: 5, maxLength: 10 }), // allCharacterIds
          fc.array(fc.integer({ min: 0, max: 4 }), { minLength: 1, maxLength: 3 }), // partyIndices
          fc.array(fc.integer({ min: 0, max: 4 }), { minLength: 1, maxLength: 3 }), // lostIndices
          (allCharacterIds, partyIndices, lostIndices) => {
            const uniqueCharacterIds = [...new Set(allCharacterIds)];
            if (uniqueCharacterIds.length < 5) return;

            // パーティメンバーを選択
            const partyMemberIds = partyIndices
              .map((index) => uniqueCharacterIds[index % uniqueCharacterIds.length])
              .filter((id, idx, arr) => arr.indexOf(id) === idx)
              .slice(0, 6);

            // ロストキャラクターを選択（パーティメンバーと重複しないように）
            const lostCharacterIds = lostIndices
              .map((index) => uniqueCharacterIds[index % uniqueCharacterIds.length])
              .filter((id) => !partyMemberIds.includes(id))
              .filter((id, idx, arr) => arr.indexOf(id) === idx);

            if (partyMemberIds.length === 0 || lostCharacterIds.length === 0) return;

            partyManager = new PartyManager();

            // パーティメンバーを追加
            partyMemberIds.forEach((charId) => {
              partyManager.addCharacter(charId);
            });

            // 検証
            const validationResult = partyManager.validateParty(lostCharacterIds);

            // ロストキャラクターが含まれていないので、CHARACTER_LOSTエラーは発生しない
            expect(validationResult.errors).not.toContain(PartyCompositionError.CHARACTER_LOST);
            expect(partyManager.hasNoLostCharacters(lostCharacterIds)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 7: パーティ編成の有効性
   * 
   * 任意の有効なパーティ編成に対して、全てのキャラクターが利用可能であり、
   * 重複がなく、ロストキャラクターが含まれていない
   * 
   * **Validates: Requirements 2.4**
   */
  describe('Property 7: パーティ編成の有効性', () => {
    test('有効なパーティ編成は検証に成功する', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0), { minLength: 6, maxLength: 15 }), // allCharacterIds
          fc.array(fc.integer({ min: 0, max: 5 }), { minLength: 1, maxLength: 6 }), // partyIndices
          (allCharacterIds, partyIndices) => {
            const uniqueCharacterIds = [...new Set(allCharacterIds)];
            if (uniqueCharacterIds.length < 6) return;

            // パーティメンバーを選択（重複なし、最大6人）
            const partyMemberIds = partyIndices
              .map((index) => uniqueCharacterIds[index % uniqueCharacterIds.length])
              .filter((id, idx, arr) => arr.indexOf(id) === idx)
              .slice(0, 6);

            if (partyMemberIds.length === 0) return;

            partyManager = new PartyManager();

            // パーティメンバーを追加
            partyMemberIds.forEach((charId) => {
              partyManager.addCharacter(charId, [], uniqueCharacterIds);
            });

            // 検証
            const validationResult = partyManager.validateParty([], uniqueCharacterIds);

            expect(validationResult.isValid).toBe(true);
            expect(validationResult.errors).toEqual([]);

            // 個別チェック
            expect(partyManager.isPartySizeValid()).toBe(true);
            expect(partyManager.hasNoDuplicates()).toBe(true);
            expect(partyManager.hasNoLostCharacters([])).toBe(true);
            expect(partyManager.areAllCharactersAvailable(uniqueCharacterIds)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('重複キャラクターが含まれるパーティは検証に失敗する', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0), { minLength: 3, maxLength: 10 }), // allCharacterIds
          fc.integer({ min: 0, max: 2 }), // duplicateIndex
          (allCharacterIds, duplicateIndex) => {
            const uniqueCharacterIds = [...new Set(allCharacterIds)];
            if (uniqueCharacterIds.length < 3) return;

            partyManager = new PartyManager();

            // 通常のキャラクターを追加
            const charIds = uniqueCharacterIds.slice(0, 3);
            charIds.forEach((charId) => {
              partyManager.addCharacter(charId);
            });

            // 重複を手動で追加（内部状態を直接操作）
            const duplicateCharId = charIds[duplicateIndex];
            (partyManager as any).party.members.push(duplicateCharId);

            // 検証
            expect(partyManager.hasNoDuplicates()).toBe(false);

            const validationResult = partyManager.validateParty([]);
            expect(validationResult.isValid).toBe(false);
            expect(validationResult.errors).toContain(PartyCompositionError.CHARACTER_DUPLICATE);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('利用不可能なキャラクターが含まれるパーティは検証に失敗する', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0), { minLength: 5, maxLength: 10 }), // allCharacterIds
          fc.array(fc.integer({ min: 0, max: 4 }), { minLength: 1, maxLength: 3 }), // partyIndices
          fc.array(fc.integer({ min: 0, max: 4 }), { minLength: 1, maxLength: 3 }), // availableIndices
          (allCharacterIds, partyIndices, availableIndices) => {
            const uniqueCharacterIds = [...new Set(allCharacterIds)];
            if (uniqueCharacterIds.length < 5) return;

            // パーティメンバーを選択
            const partyMemberIds = partyIndices
              .map((index) => uniqueCharacterIds[index % uniqueCharacterIds.length])
              .filter((id, idx, arr) => arr.indexOf(id) === idx)
              .slice(0, 6);

            // 利用可能なキャラクターを選択（パーティメンバーの一部を除外）
            const availableCharacterIds = availableIndices
              .map((index) => uniqueCharacterIds[index % uniqueCharacterIds.length])
              .filter((id, idx, arr) => arr.indexOf(id) === idx);

            // パーティメンバーの中に利用不可能なキャラクターが含まれるようにする
            const hasUnavailableCharacter = partyMemberIds.some(
              (id) => !availableCharacterIds.includes(id)
            );

            if (!hasUnavailableCharacter || partyMemberIds.length === 0) return;

            partyManager = new PartyManager();

            // パーティメンバーを追加
            partyMemberIds.forEach((charId) => {
              partyManager.addCharacter(charId);
            });

            // 検証
            expect(partyManager.areAllCharactersAvailable(availableCharacterIds)).toBe(false);

            const validationResult = partyManager.validateParty([], availableCharacterIds);
            expect(validationResult.isValid).toBe(false);
            expect(validationResult.errors).toContain(PartyCompositionError.CHARACTER_NOT_AVAILABLE);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('パーティサイズが7人以上の場合は検証に失敗する', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0), { minLength: 7, maxLength: 10 }), // characterIds
          (characterIds) => {
            const uniqueCharacterIds = [...new Set(characterIds)];
            if (uniqueCharacterIds.length < 7) return;

            partyManager = new PartyManager();

            // 7人以上を手動で追加（内部状態を直接操作）
            (partyManager as any).party.members = uniqueCharacterIds.slice(0, 7);

            // 検証
            expect(partyManager.isPartySizeValid()).toBe(false);

            const validationResult = partyManager.validateParty([]);
            expect(validationResult.isValid).toBe(false);
            expect(validationResult.errors).toContain(PartyCompositionError.PARTY_FULL);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
