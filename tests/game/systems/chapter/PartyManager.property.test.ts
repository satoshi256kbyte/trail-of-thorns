/**
 * PartyManager Property-Based Tests
 * パーティマネージャーのプロパティベーステスト
 *
 * これらのテストは、設計書で定義されたプロパティを検証します。
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { PartyManager } from '../../../../game/src/systems/chapter/PartyManager';
import type { PartyComposition } from '../../../../game/src/types/chapter';

describe('PartyManager Property-Based Tests', () => {
  let partyManager: PartyManager;

  beforeEach(() => {
    partyManager = new PartyManager();
  });

  /**
   * プロパティ5: パーティサイズ制限
   *
   * 任意のパーティ編成に対して、キャラクターを追加する操作は、
   * パーティサイズが6人未満の場合のみ成功する
   *
   * 検証: 要件 2.1, 7.4
   */
  describe('プロパティ5: パーティサイズ制限', () => {
    it('パーティサイズが6人未満の場合のみキャラクター追加が成功する', () => {
      fc.assert(
        fc.property(
          // 0-5人のパーティを生成
          fc.array(fc.string().filter((s) => s.trim().length > 0), { minLength: 0, maxLength: 5 }),
          // 追加するキャラクターID
          fc.string().filter((s) => s.trim().length > 0),
          (existingMembers, newCharacterId) => {
            // 重複を除去
            const uniqueMembers = Array.from(new Set(existingMembers));
            if (uniqueMembers.length > 5) {
              uniqueMembers.length = 5; // 最大5人に制限
            }

            // パーティを設定
            const composition: PartyComposition = {
              members: uniqueMembers,
              formation: 'BALANCED',
            };
            partyManager.setParty(composition);

            // 新しいキャラクターを追加（既存メンバーでない場合）
            if (!uniqueMembers.includes(newCharacterId)) {
              const result = partyManager.addCharacter(newCharacterId);

              // パーティサイズが6人未満の場合のみ成功するはず
              const expectedSuccess = uniqueMembers.length < 6;
              expect(result).toBe(expectedSuccess);

              // 成功した場合、パーティサイズが増加しているはず
              if (expectedSuccess) {
                expect(partyManager.getPartySize()).toBe(uniqueMembers.length + 1);
              } else {
                expect(partyManager.getPartySize()).toBe(uniqueMembers.length);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('パーティが満員（6人）の場合、追加は常に失敗する', () => {
      fc.assert(
        fc.property(
          // 6人のパーティを生成
          fc
            .array(fc.string().filter((s) => s.trim().length > 0), { minLength: 6, maxLength: 6 })
            .map((arr) => Array.from(new Set(arr)).slice(0, 6)),
          // 追加するキャラクターID
          fc.string().filter((s) => s.trim().length > 0),
          (members, newCharacterId) => {
            // 6人のユニークなメンバーを確保
            while (members.length < 6) {
              members.push(`filler-${members.length}`);
            }

            const composition: PartyComposition = {
              members: members.slice(0, 6),
              formation: 'BALANCED',
            };
            partyManager.setParty(composition);

            // 新しいキャラクターを追加（既存メンバーでない場合）
            if (!members.includes(newCharacterId)) {
              const result = partyManager.addCharacter(newCharacterId);

              // 満員なので追加は失敗するはず
              expect(result).toBe(false);
              expect(partyManager.getPartySize()).toBe(6);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * プロパティ6: ロストキャラクター制限
   *
   * 任意のロストキャラクターに対して、そのキャラクターをパーティに追加しようとすると、
   * 検証は失敗し、適切なエラーメッセージが返される
   *
   * 検証: 要件 2.2, 7.5
   */
  describe('プロパティ6: ロストキャラクター制限', () => {
    it('ロストキャラクターがパーティにいる場合、検証は常に失敗する', () => {
      fc.assert(
        fc.property(
          // パーティメンバー（1-6人）
          fc
            .array(fc.string().filter((s) => s.trim().length > 0), { minLength: 1, maxLength: 6 })
            .map((arr) => Array.from(new Set(arr)).slice(0, 6)),
          // ロストキャラクターリスト（0-3人）
          fc
            .array(fc.string().filter((s) => s.trim().length > 0), { minLength: 0, maxLength: 3 })
            .map((arr) => Array.from(new Set(arr))),
          (members, lostCharacters) => {
            const composition: PartyComposition = {
              members,
              formation: 'BALANCED',
            };
            partyManager.setParty(composition);

            // 検証を実行
            const result = partyManager.validateParty(lostCharacters);

            // ロストキャラクターがパーティにいるかチェック
            const hasLostCharacter = members.some((id) => lostCharacters.includes(id));

            if (hasLostCharacter) {
              // ロストキャラクターがいる場合、検証は失敗するはず
              expect(result.isValid).toBe(false);
              expect(result.errors).toContain('CHARACTER_LOST');
            } else {
              // ロストキャラクターがいない場合、このエラーは含まれないはず
              expect(result.errors).not.toContain('CHARACTER_LOST');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('ロストキャラクターがパーティにいない場合、このエラーは発生しない', () => {
      fc.assert(
        fc.property(
          // パーティメンバー（1-6人）
          fc
            .array(fc.string().filter((s) => s.trim().length > 0), { minLength: 1, maxLength: 6 })
            .map((arr) => Array.from(new Set(arr)).slice(0, 6)),
          // ロストキャラクターリスト（パーティメンバーと重複しない）
          fc
            .array(fc.string().filter((s) => s.trim().length > 0), { minLength: 0, maxLength: 3 })
            .map((arr) => Array.from(new Set(arr))),
          (members, lostCharacters) => {
            // ロストキャラクターがパーティメンバーと重複しないようにする
            const nonOverlappingLost = lostCharacters.filter((id) => !members.includes(id));

            const composition: PartyComposition = {
              members,
              formation: 'BALANCED',
            };
            partyManager.setParty(composition);

            // 検証を実行
            const result = partyManager.validateParty(nonOverlappingLost);

            // ロストキャラクターエラーは含まれないはず
            expect(result.errors).not.toContain('CHARACTER_LOST');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * プロパティ7: パーティ編成の有効性
   *
   * 任意の有効なパーティ編成に対して、全てのキャラクターが利用可能であり、
   * 重複がなく、ロストキャラクターが含まれていない
   *
   * 検証: 要件 2.4
   */
  describe('プロパティ7: パーティ編成の有効性', () => {
    it('有効なパーティは全ての検証条件を満たす', () => {
      fc.assert(
        fc.property(
          // パーティメンバー（1-6人、重複なし）
          fc
            .array(fc.string().filter((s) => s.trim().length > 0), { minLength: 1, maxLength: 6 })
            .map((arr) => Array.from(new Set(arr)).slice(0, 6)),
          // 利用可能なキャラクターリスト（パーティメンバーを含む）
          fc
            .array(fc.string().filter((s) => s.trim().length > 0), { minLength: 1, maxLength: 10 })
            .map((arr) => Array.from(new Set(arr))),
          (members, availableBase) => {
            // 利用可能なキャラクターリストにパーティメンバーを含める
            const availableCharacters = Array.from(new Set([...members, ...availableBase]));

            // ロストキャラクターリスト（パーティメンバーと重複しない）
            const lostCharacters = availableCharacters.filter((id) => !members.includes(id)).slice(0, 3);

            const composition: PartyComposition = {
              members,
              formation: 'BALANCED',
            };
            partyManager.setParty(composition);

            // 検証を実行
            const result = partyManager.validateParty(lostCharacters, availableCharacters);

            // 有効なパーティのはず
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);

            // 追加の検証
            expect(partyManager.getPartySize()).toBeLessThanOrEqual(6);
            expect(partyManager.getPartySize()).toBeGreaterThan(0);

            // 全てのメンバーが利用可能であることを確認
            const party = partyManager.getParty();
            party.members.forEach((memberId) => {
              expect(availableCharacters).toContain(memberId);
              expect(lostCharacters).not.toContain(memberId);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('無効なパーティは少なくとも1つの検証エラーを持つ', () => {
      fc.assert(
        fc.property(
          // パーティメンバー（重複を含む可能性がある）
          fc.array(fc.string().filter((s) => s.trim().length > 0), { minLength: 1, maxLength: 8 }),
          // ロストキャラクターリスト
          fc
            .array(fc.string().filter((s) => s.trim().length > 0), { minLength: 0, maxLength: 3 })
            .map((arr) => Array.from(new Set(arr))),
          (members, lostCharacters) => {
            const composition: PartyComposition = {
              members,
              formation: 'BALANCED',
            };
            partyManager.setParty(composition);

            // 検証を実行
            const result = partyManager.validateParty(lostCharacters);

            // パーティサイズが6を超える、または重複がある、またはロストキャラクターがいる場合
            const hasDuplicates = new Set(members).size !== members.length;
            const hasLostCharacter = members.some((id) => lostCharacters.includes(id));
            const isTooLarge = members.length > 6;

            if (hasDuplicates || hasLostCharacter || isTooLarge) {
              // 無効なパーティのはず
              expect(result.isValid).toBe(false);
              expect(result.errors.length).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('パーティ編成のラウンドトリップ（設定→取得）は元の状態を保持する', () => {
      fc.assert(
        fc.property(
          // パーティメンバー（1-6人、重複なし）
          fc
            .array(fc.string().filter((s) => s.trim().length > 0), { minLength: 1, maxLength: 6 })
            .map((arr) => Array.from(new Set(arr)).slice(0, 6)),
          // 陣形タイプ
          fc.constantFrom('BALANCED', 'OFFENSIVE', 'DEFENSIVE', 'CUSTOM'),
          (members, formation) => {
            const originalComposition: PartyComposition = {
              members,
              formation,
            };

            // パーティを設定
            partyManager.setParty(originalComposition);

            // パーティを取得
            const retrievedComposition = partyManager.getParty();

            // 元の状態と一致するはず
            expect(retrievedComposition.members).toEqual(members);
            expect(retrievedComposition.formation).toBe(formation);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * 追加のプロパティ: パーティ操作の一貫性
   *
   * パーティ操作（追加、除外、クリア）の一貫性を検証
   */
  describe('追加プロパティ: パーティ操作の一貫性', () => {
    it('キャラクターを追加してから除外すると、元の状態に戻る', () => {
      fc.assert(
        fc.property(
          // 初期パーティメンバー（0-5人）
          fc
            .array(fc.string().filter((s) => s.trim().length > 0), { minLength: 0, maxLength: 5 })
            .map((arr) => Array.from(new Set(arr)).slice(0, 5)),
          // 追加するキャラクターID
          fc.string().filter((s) => s.trim().length > 0),
          (initialMembers, newCharacterId) => {
            // 初期パーティを設定
            const composition: PartyComposition = {
              members: initialMembers,
              formation: 'BALANCED',
            };
            partyManager.setParty(composition);

            const initialSize = partyManager.getPartySize();

            // 新しいキャラクターを追加（既存メンバーでない場合）
            if (!initialMembers.includes(newCharacterId)) {
              const addResult = partyManager.addCharacter(newCharacterId);

              if (addResult) {
                // 追加に成功した場合、サイズが増加しているはず
                expect(partyManager.getPartySize()).toBe(initialSize + 1);
                expect(partyManager.hasCharacter(newCharacterId)).toBe(true);

                // キャラクターを除外
                const removeResult = partyManager.removeCharacter(newCharacterId);
                expect(removeResult).toBe(true);

                // 元のサイズに戻っているはず
                expect(partyManager.getPartySize()).toBe(initialSize);
                expect(partyManager.hasCharacter(newCharacterId)).toBe(false);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('パーティをクリアすると、全てのメンバーが削除される', () => {
      fc.assert(
        fc.property(
          // パーティメンバー（1-6人）
          fc
            .array(fc.string().filter((s) => s.trim().length > 0), { minLength: 1, maxLength: 6 })
            .map((arr) => Array.from(new Set(arr)).slice(0, 6)),
          (members) => {
            const composition: PartyComposition = {
              members,
              formation: 'BALANCED',
            };
            partyManager.setParty(composition);

            // パーティをクリア
            partyManager.clearParty();

            // 全てのメンバーが削除されているはず
            expect(partyManager.getPartySize()).toBe(0);
            expect(partyManager.getParty().members).toHaveLength(0);
            expect(partyManager.isPartyFull()).toBe(false);

            // 元のメンバーは全て削除されているはず
            members.forEach((memberId) => {
              expect(partyManager.hasCharacter(memberId)).toBe(false);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
