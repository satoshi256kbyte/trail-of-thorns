/**
 * 章・ステージ管理システムの型定義テスト
 * Chapter-Stage Management System Type Definitions Test
 */

import { describe, test, expect } from 'vitest';
import {
  ChapterData,
  ChapterState,
  StageMetadata,
  StageProgress,
  PartyComposition,
  SaveData,
  ChapterStageError,
  PartyCompositionError,
  PartyCompositionValidationResult,
  StageUnlockCondition,
  StageReward,
  ChapterUnlockCondition,
} from '../../game/src/types/chapterStage';

describe('ChapterStage Type Definitions', () => {
  describe('ChapterData', () => {
    test('should create valid ChapterData object', () => {
      const chapterData: ChapterData = {
        id: 'chapter-1',
        name: '薔薇の目覚め',
        storyDescription: '平和な村に突如現れた魔性の薔薇...',
        stageIds: ['stage-1-1', 'stage-1-2'],
        recommendedLevel: 1,
      };

      expect(chapterData.id).toBe('chapter-1');
      expect(chapterData.stageIds).toHaveLength(2);
    });

    test('should support optional unlockCondition', () => {
      const unlockCondition: ChapterUnlockCondition = {
        type: 'CHAPTER_COMPLETE',
        requiredChapterId: 'chapter-0',
      };

      const chapterData: ChapterData = {
        id: 'chapter-2',
        name: '薔薇の深淵',
        storyDescription: 'さらなる脅威が...',
        stageIds: ['stage-2-1'],
        recommendedLevel: 10,
        unlockCondition,
      };

      expect(chapterData.unlockCondition).toBeDefined();
      expect(chapterData.unlockCondition?.type).toBe('CHAPTER_COMPLETE');
    });
  });

  describe('ChapterState', () => {
    test('should create valid ChapterState object', () => {
      const chapterState: ChapterState = {
        chapterId: 'chapter-1',
        currentStageIndex: 0,
        lostCharacterIds: [],
        availableCharacterIds: ['char-001', 'char-002', 'char-003'],
        completedStageIds: [],
        isCompleted: false,
        startTime: Date.now(),
        playTime: 0,
      };

      expect(chapterState.chapterId).toBe('chapter-1');
      expect(chapterState.availableCharacterIds).toHaveLength(3);
      expect(chapterState.isCompleted).toBe(false);
    });

    test('should track lost characters', () => {
      const chapterState: ChapterState = {
        chapterId: 'chapter-1',
        currentStageIndex: 2,
        lostCharacterIds: ['char-003'],
        availableCharacterIds: ['char-001', 'char-002'],
        completedStageIds: ['stage-1-1', 'stage-1-2'],
        isCompleted: false,
        startTime: Date.now() - 3600000,
        playTime: 3600000,
      };

      expect(chapterState.lostCharacterIds).toContain('char-003');
      expect(chapterState.availableCharacterIds).not.toContain('char-003');
    });
  });

  describe('StageMetadata', () => {
    test('should create valid StageMetadata object', () => {
      const unlockCondition: StageUnlockCondition = {
        type: 'PREVIOUS_STAGE',
        requiredStageIds: [],
      };

      const rewards: StageReward[] = [
        { type: 'EXPERIENCE', amount: 100 },
        { type: 'ROSE_ESSENCE', amount: 1 },
      ];

      const stageMetadata: StageMetadata = {
        id: 'stage-1-1',
        name: '村の異変',
        chapterId: 'chapter-1',
        difficulty: 1,
        recommendedLevel: 1,
        unlockCondition,
        rewards,
      };

      expect(stageMetadata.id).toBe('stage-1-1');
      expect(stageMetadata.rewards).toHaveLength(2);
    });
  });

  describe('StageProgress', () => {
    test('should create valid StageProgress object', () => {
      const stageProgress: StageProgress = {
        stageId: 'stage-1-1',
        isUnlocked: true,
        isCompleted: false,
        rewards: [],
      };

      expect(stageProgress.isUnlocked).toBe(true);
      expect(stageProgress.isCompleted).toBe(false);
    });

    test('should track completion time', () => {
      const completionTime = Date.now();
      const stageProgress: StageProgress = {
        stageId: 'stage-1-1',
        isUnlocked: true,
        isCompleted: true,
        completionTime,
        rewards: [{ type: 'EXPERIENCE', amount: 100 }],
      };

      expect(stageProgress.completionTime).toBe(completionTime);
      expect(stageProgress.rewards).toHaveLength(1);
    });
  });

  describe('PartyComposition', () => {
    test('should create valid PartyComposition object', () => {
      const party: PartyComposition = {
        members: ['char-001', 'char-002', 'char-003'],
        formation: 'BALANCED',
      };

      expect(party.members).toHaveLength(3);
      expect(party.formation).toBe('BALANCED');
    });

    test('should support maximum 6 members', () => {
      const party: PartyComposition = {
        members: ['char-001', 'char-002', 'char-003', 'char-004', 'char-005', 'char-006'],
        formation: 'OFFENSIVE',
      };

      expect(party.members).toHaveLength(6);
    });
  });

  describe('PartyCompositionValidationResult', () => {
    test('should create valid validation result', () => {
      const result: PartyCompositionValidationResult = {
        isValid: true,
        errors: [],
      };

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should track validation errors', () => {
      const result: PartyCompositionValidationResult = {
        isValid: false,
        errors: [PartyCompositionError.PARTY_FULL, PartyCompositionError.CHARACTER_LOST],
      };

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(PartyCompositionError.PARTY_FULL);
      expect(result.errors).toContain(PartyCompositionError.CHARACTER_LOST);
    });
  });

  describe('SaveData', () => {
    test('should create valid SaveData object', () => {
      const saveData: SaveData = {
        version: '1.0.0',
        timestamp: Date.now(),
        chapterState: {
          chapterId: 'chapter-1',
          currentStageIndex: 0,
          lostCharacterIds: [],
          availableCharacterIds: ['char-001'],
          completedStageIds: [],
          isCompleted: false,
          playTime: 0,
        },
        stageProgress: {
          stages: [],
        },
        partyComposition: {
          members: ['char-001'],
          formation: 'BALANCED',
        },
        playTime: 0,
      };

      expect(saveData.version).toBe('1.0.0');
      expect(saveData.chapterState.chapterId).toBe('chapter-1');
    });
  });

  describe('ChapterStageError', () => {
    test('should have all error types defined', () => {
      expect(ChapterStageError.CHAPTER_NOT_FOUND).toBe('CHAPTER_NOT_FOUND');
      expect(ChapterStageError.PARTY_FULL).toBe('PARTY_FULL');
      expect(ChapterStageError.STAGE_NOT_UNLOCKED).toBe('STAGE_NOT_UNLOCKED');
      expect(ChapterStageError.SAVE_DATA_CORRUPTED).toBe('SAVE_DATA_CORRUPTED');
    });
  });

  describe('PartyCompositionError', () => {
    test('should have all error types defined', () => {
      expect(PartyCompositionError.PARTY_FULL).toBe('PARTY_FULL');
      expect(PartyCompositionError.CHARACTER_LOST).toBe('CHARACTER_LOST');
      expect(PartyCompositionError.CHARACTER_DUPLICATE).toBe('CHARACTER_DUPLICATE');
      expect(PartyCompositionError.CHARACTER_NOT_AVAILABLE).toBe('CHARACTER_NOT_AVAILABLE');
    });
  });
});
