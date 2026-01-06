/**
 * PartyManager Unit Tests
 * パーティマネージャーのユニットテスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PartyManager } from '../../../../game/src/systems/chapter/PartyManager';
import type { PartyComposition } from '../../../../game/src/types/chapter';

describe('PartyManager', () => {
  let partyManager: PartyManager;

  beforeEach(() => {
    partyManager = new PartyManager();
  });

  describe('初期化', () => {
    it('空のパーティで初期化される', () => {
      const party = partyManager.getParty();
      expect(party.members).toHaveLength(0);
      expect(party.formation).toBe('BALANCED');
    });

    it('パーティサイズは0である', () => {
      expect(partyManager.getPartySize()).toBe(0);
    });

    it('パーティは満員ではない', () => {
      expect(partyManager.isPartyFull()).toBe(false);
    });
  });

  describe('addCharacter - キャラクターの追加', () => {
    it('キャラクターを追加できる', () => {
      const result = partyManager.addCharacter('char-001');
      expect(result).toBe(true);
      expect(partyManager.getPartySize()).toBe(1);
      expect(partyManager.hasCharacter('char-001')).toBe(true);
    });

    it('複数のキャラクターを追加できる', () => {
      partyManager.addCharacter('char-001');
      partyManager.addCharacter('char-002');
      partyManager.addCharacter('char-003');

      expect(partyManager.getPartySize()).toBe(3);
      expect(partyManager.hasCharacter('char-001')).toBe(true);
      expect(partyManager.hasCharacter('char-002')).toBe(true);
      expect(partyManager.hasCharacter('char-003')).toBe(true);
    });

    it('最大6人まで追加できる', () => {
      for (let i = 1; i <= 6; i++) {
        const result = partyManager.addCharacter(`char-00${i}`);
        expect(result).toBe(true);
      }
      expect(partyManager.getPartySize()).toBe(6);
      expect(partyManager.isPartyFull()).toBe(true);
    });

    it('7人目の追加は拒否される', () => {
      // 6人追加
      for (let i = 1; i <= 6; i++) {
        partyManager.addCharacter(`char-00${i}`);
      }

      // 7人目の追加を試みる
      const result = partyManager.addCharacter('char-007');
      expect(result).toBe(false);
      expect(partyManager.getPartySize()).toBe(6);
    });

    it('重複したキャラクターの追加は拒否される', () => {
      partyManager.addCharacter('char-001');
      const result = partyManager.addCharacter('char-001');

      expect(result).toBe(false);
      expect(partyManager.getPartySize()).toBe(1);
    });
  });

  describe('removeCharacter - キャラクターの除外', () => {
    beforeEach(() => {
      partyManager.addCharacter('char-001');
      partyManager.addCharacter('char-002');
      partyManager.addCharacter('char-003');
    });

    it('キャラクターを除外できる', () => {
      const result = partyManager.removeCharacter('char-002');
      expect(result).toBe(true);
      expect(partyManager.getPartySize()).toBe(2);
      expect(partyManager.hasCharacter('char-002')).toBe(false);
    });

    it('存在しないキャラクターの除外は失敗する', () => {
      const result = partyManager.removeCharacter('char-999');
      expect(result).toBe(false);
      expect(partyManager.getPartySize()).toBe(3);
    });

    it('全てのキャラクターを除外できる', () => {
      partyManager.removeCharacter('char-001');
      partyManager.removeCharacter('char-002');
      partyManager.removeCharacter('char-003');

      expect(partyManager.getPartySize()).toBe(0);
    });
  });

  describe('clearParty - パーティのクリア', () => {
    it('パーティをクリアできる', () => {
      partyManager.addCharacter('char-001');
      partyManager.addCharacter('char-002');
      partyManager.addCharacter('char-003');

      partyManager.clearParty();

      expect(partyManager.getPartySize()).toBe(0);
      expect(partyManager.getParty().members).toHaveLength(0);
    });

    it('空のパーティをクリアしてもエラーにならない', () => {
      expect(() => partyManager.clearParty()).not.toThrow();
      expect(partyManager.getPartySize()).toBe(0);
    });
  });

  describe('isPartyFull - パーティサイズの確認', () => {
    it('空のパーティは満員ではない', () => {
      expect(partyManager.isPartyFull()).toBe(false);
    });

    it('5人のパーティは満員ではない', () => {
      for (let i = 1; i <= 5; i++) {
        partyManager.addCharacter(`char-00${i}`);
      }
      expect(partyManager.isPartyFull()).toBe(false);
    });

    it('6人のパーティは満員である', () => {
      for (let i = 1; i <= 6; i++) {
        partyManager.addCharacter(`char-00${i}`);
      }
      expect(partyManager.isPartyFull()).toBe(true);
    });
  });

  describe('getParty / setParty - パーティの取得と設定', () => {
    it('パーティ編成を取得できる', () => {
      partyManager.addCharacter('char-001');
      partyManager.addCharacter('char-002');

      const party = partyManager.getParty();
      expect(party.members).toEqual(['char-001', 'char-002']);
      expect(party.formation).toBe('BALANCED');
    });

    it('パーティ編成を設定できる', () => {
      const composition: PartyComposition = {
        members: ['char-001', 'char-002', 'char-003'],
        formation: 'OFFENSIVE',
      };

      partyManager.setParty(composition);

      const party = partyManager.getParty();
      expect(party.members).toEqual(['char-001', 'char-002', 'char-003']);
      expect(party.formation).toBe('OFFENSIVE');
    });

    it('getPartyは新しい配列を返す（元の配列を変更しない）', () => {
      partyManager.addCharacter('char-001');
      const party1 = partyManager.getParty();
      party1.members.push('char-002');

      const party2 = partyManager.getParty();
      expect(party2.members).toEqual(['char-001']);
    });
  });

  describe('setFormation / getFormation - 陣形の設定と取得', () => {
    it('陣形を設定できる', () => {
      partyManager.setFormation('DEFENSIVE');
      expect(partyManager.getFormation()).toBe('DEFENSIVE');
    });

    it('陣形を変更できる', () => {
      partyManager.setFormation('OFFENSIVE');
      expect(partyManager.getFormation()).toBe('OFFENSIVE');

      partyManager.setFormation('CUSTOM');
      expect(partyManager.getFormation()).toBe('CUSTOM');
    });
  });

  describe('hasCharacter - キャラクターの存在確認', () => {
    beforeEach(() => {
      partyManager.addCharacter('char-001');
      partyManager.addCharacter('char-002');
    });

    it('パーティにいるキャラクターはtrueを返す', () => {
      expect(partyManager.hasCharacter('char-001')).toBe(true);
      expect(partyManager.hasCharacter('char-002')).toBe(true);
    });

    it('パーティにいないキャラクターはfalseを返す', () => {
      expect(partyManager.hasCharacter('char-003')).toBe(false);
      expect(partyManager.hasCharacter('char-999')).toBe(false);
    });
  });

  describe('統合シナリオ', () => {
    it('パーティ編成の完全なフロー', () => {
      // 1. キャラクターを追加
      partyManager.addCharacter('char-001');
      partyManager.addCharacter('char-002');
      partyManager.addCharacter('char-003');
      expect(partyManager.getPartySize()).toBe(3);

      // 2. 陣形を設定
      partyManager.setFormation('OFFENSIVE');
      expect(partyManager.getFormation()).toBe('OFFENSIVE');

      // 3. キャラクターを除外
      partyManager.removeCharacter('char-002');
      expect(partyManager.getPartySize()).toBe(2);

      // 4. 新しいキャラクターを追加
      partyManager.addCharacter('char-004');
      expect(partyManager.getPartySize()).toBe(3);

      // 5. パーティを取得
      const party = partyManager.getParty();
      expect(party.members).toEqual(['char-001', 'char-003', 'char-004']);
      expect(party.formation).toBe('OFFENSIVE');
    });

    it('満員のパーティから除外して再度追加', () => {
      // 満員まで追加
      for (let i = 1; i <= 6; i++) {
        partyManager.addCharacter(`char-00${i}`);
      }
      expect(partyManager.isPartyFull()).toBe(true);

      // 7人目の追加は失敗
      expect(partyManager.addCharacter('char-007')).toBe(false);

      // 1人除外
      partyManager.removeCharacter('char-003');
      expect(partyManager.isPartyFull()).toBe(false);

      // 新しいキャラクターを追加
      expect(partyManager.addCharacter('char-007')).toBe(true);
      expect(partyManager.isPartyFull()).toBe(true);
    });
  });

  describe('validateParty - パーティ検証システム', () => {
    describe('パーティサイズ制限の検証', () => {
      it('空のパーティは無効である', () => {
        const result = partyManager.validateParty([]);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('PARTY_EMPTY');
      });

      it('1-6人のパーティは有効である', () => {
        for (let i = 1; i <= 6; i++) {
          const pm = new PartyManager();
          for (let j = 1; j <= i; j++) {
            pm.addCharacter(`char-00${j}`);
          }
          const result = pm.validateParty([]);
          expect(result.isValid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }
      });

      it('7人以上のパーティは無効である（手動設定の場合）', () => {
        // 通常はaddCharacterで7人目は追加できないが、
        // setPartyで直接設定した場合を想定
        const composition: PartyComposition = {
          members: ['char-001', 'char-002', 'char-003', 'char-004', 'char-005', 'char-006', 'char-007'],
          formation: 'BALANCED',
        };
        partyManager.setParty(composition);

        const result = partyManager.validateParty([]);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('PARTY_FULL');
      });
    });

    describe('ロストキャラクター制限の検証', () => {
      beforeEach(() => {
        partyManager.addCharacter('char-001');
        partyManager.addCharacter('char-002');
        partyManager.addCharacter('char-003');
      });

      it('ロストキャラクターがいない場合は有効である', () => {
        const result = partyManager.validateParty([]);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('ロストキャラクターがパーティにいる場合は無効である', () => {
        const lostCharacters = ['char-002'];
        const result = partyManager.validateParty(lostCharacters);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('CHARACTER_LOST');
      });

      it('複数のロストキャラクターがパーティにいる場合も無効である', () => {
        const lostCharacters = ['char-001', 'char-003'];
        const result = partyManager.validateParty(lostCharacters);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('CHARACTER_LOST');
      });

      it('ロストキャラクターがパーティにいない場合は有効である', () => {
        const lostCharacters = ['char-004', 'char-005'];
        const result = partyManager.validateParty(lostCharacters);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('キャラクター重複チェック', () => {
      it('重複がない場合は有効である', () => {
        partyManager.addCharacter('char-001');
        partyManager.addCharacter('char-002');
        partyManager.addCharacter('char-003');

        const result = partyManager.validateParty([]);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('重複がある場合は無効である（手動設定の場合）', () => {
        const composition: PartyComposition = {
          members: ['char-001', 'char-002', 'char-001'],
          formation: 'BALANCED',
        };
        partyManager.setParty(composition);

        const result = partyManager.validateParty([]);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('CHARACTER_DUPLICATE');
      });
    });

    describe('利用可能性チェック', () => {
      beforeEach(() => {
        partyManager.addCharacter('char-001');
        partyManager.addCharacter('char-002');
        partyManager.addCharacter('char-003');
      });

      it('全てのキャラクターが利用可能な場合は有効である', () => {
        const availableCharacters = ['char-001', 'char-002', 'char-003', 'char-004'];
        const result = partyManager.validateParty([], availableCharacters);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('利用不可能なキャラクターがいる場合は無効である', () => {
        const availableCharacters = ['char-001', 'char-002'];
        const result = partyManager.validateParty([], availableCharacters);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('CHARACTER_NOT_AVAILABLE');
      });

      it('availableCharacterIdsが未指定の場合は利用可能性チェックをスキップする', () => {
        const result = partyManager.validateParty([]);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('複合的な検証', () => {
      it('複数のエラーを同時に検出できる', () => {
        // 重複とロストキャラクターを含むパーティを手動設定
        const composition: PartyComposition = {
          members: ['char-001', 'char-002', 'char-001', 'char-003'],
          formation: 'BALANCED',
        };
        partyManager.setParty(composition);

        const lostCharacters = ['char-002'];
        const result = partyManager.validateParty(lostCharacters);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('CHARACTER_DUPLICATE');
        expect(result.errors).toContain('CHARACTER_LOST');
      });

      it('全ての条件を満たす場合は有効である', () => {
        partyManager.clearParty();
        partyManager.addCharacter('char-001');
        partyManager.addCharacter('char-002');
        partyManager.addCharacter('char-003');

        const lostCharacters = ['char-004', 'char-005'];
        const availableCharacters = ['char-001', 'char-002', 'char-003', 'char-006'];

        const result = partyManager.validateParty(lostCharacters, availableCharacters);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('統合シナリオ - パーティ編成と検証', () => {
      it('正常なパーティ編成フロー', () => {
        const availableCharacters = ['char-001', 'char-002', 'char-003', 'char-004'];
        const lostCharacters: string[] = [];

        // キャラクターを追加
        partyManager.addCharacter('char-001');
        partyManager.addCharacter('char-002');
        partyManager.addCharacter('char-003');

        // 検証
        const result = partyManager.validateParty(lostCharacters, availableCharacters);
        expect(result.isValid).toBe(true);
      });

      it('ロストキャラクターを含むパーティの検証失敗', () => {
        const availableCharacters = ['char-001', 'char-002', 'char-003', 'char-004'];
        const lostCharacters = ['char-002'];

        // キャラクターを追加（ロストキャラクターを含む）
        partyManager.addCharacter('char-001');
        partyManager.addCharacter('char-002'); // ロスト
        partyManager.addCharacter('char-003');

        // 検証
        const result = partyManager.validateParty(lostCharacters, availableCharacters);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('CHARACTER_LOST');
      });

      it('ロストキャラクターを除外して再検証', () => {
        const availableCharacters = ['char-001', 'char-002', 'char-003', 'char-004'];
        const lostCharacters = ['char-002'];

        // キャラクターを追加
        partyManager.addCharacter('char-001');
        partyManager.addCharacter('char-002');
        partyManager.addCharacter('char-003');

        // 最初の検証（失敗）
        let result = partyManager.validateParty(lostCharacters, availableCharacters);
        expect(result.isValid).toBe(false);

        // ロストキャラクターを除外
        partyManager.removeCharacter('char-002');

        // 再検証（成功）
        result = partyManager.validateParty(lostCharacters, availableCharacters);
        expect(result.isValid).toBe(true);
      });
    });
  });
});
