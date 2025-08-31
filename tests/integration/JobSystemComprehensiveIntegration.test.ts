import { JobSystem } from '../../game/src/systems/jobs/JobSystem';
import { ExperienceSystem } from '../../game/src/systems/experience/ExperienceSystem';
import { SkillSystem } from '../../game/src/systems/skills/SkillSystem';
import { BattleSystem } from '../../game/src/systems/BattleSystem';
import { GameplayScene } from '../../game/src/scenes/GameplayScene';
import { JobData, RoseEssenceData } from '../../game/src/types/jobs';
import { Unit } from '../../game/src/types/gameplay';

// Mock Phaser
jest.mock('phaser', () => ({
    Scene: class MockScene {
        add = { text: jest.fn(), image: jest.fn(), container: jest.fn() };
        load = { json: jest.fn(), image: jest.fn() };
        input = { on: jest.fn() };
        events = { on: jest.fn(), emit: jest.fn() };
    }
}));

describe('JobSystem Comprehensive Integration', () => {
    let jobSystem: JobSystem;
    let experienceSystem: ExperienceSystem;
    let skillSystem: SkillSystem;
    let battleSystem: BattleSystem;
    let gameplayScene: GameplayScene;

    const mockJobData: JobData = {
        warrior: {
            id: 'warrior',
            name: '戦士',
            description: '近接戦闘の専門家',
            category: 'warrior',
            maxRank: 3,
            statModifiers: {
                1: { hp: 5, mp: 0, attack: 3, defense: 2, speed: -1, skill: 0, luck: 0 },
                2: { hp: 10, mp: 0, attack: 6, defense: 4, speed: -2, skill: 0, luck: 0 },
                3: { hp: 15, mp: 0, attack: 9, defense: 6, speed: -3, skill: 0, luck: 0 }
            },
            availableSkills: {
                1: ['sword_slash', 'guard'],
                2: ['sword_slash', 'guard', 'power_strike'],
                3: ['sword_slash', 'guard', 'power_strike', 'berserker_rage']
            },
            rankUpRequirements: {
                2: { roseEssenceCost: 10, levelRequirement: 5, prerequisiteSkills: [] },
                3: { roseEssenceCost: 20, levelRequirement: 10, prerequisiteSkills: ['power_strike'] }
            },
            growthRateModifiers: {
                1: { hp: 1.1, mp: 0.8, attack: 1.2, defense: 1.1, speed: 0.9, skill: 1.0, luck: 1.0 },
                2: { hp: 1.2, mp: 0.8, attack: 1.3, defense: 1.2, speed: 0.9, skill: 1.0, luck: 1.0 },
                3: { hp: 1.3, mp: 0.8, attack: 1.4, defense: 1.3, speed: 0.9, skill: 1.0, luck: 1.0 }
            },
            jobTraits: [],
            visual: {
                iconPath: 'warrior_icon.png',
                spriteModifications: [],
                colorScheme: { primary: '#ff0000', secondary: '#800000' }
            }
        },
        mage: {
            id: 'mage',
            name: '魔法使い',
            description: '魔法攻撃の専門家',
            category: 'mage',
            maxRank: 3,
            statModifiers: {
                1: { hp: 0, mp: 8, attack: 4, defense: -1, speed: 1, skill: 2, luck: 0 },
                2: { hp: 0, mp: 16, attack: 8, defense: -2, speed: 2, skill: 4, luck: 0 },
                3: { hp: 0, mp: 24, attack: 12, defense: -3, speed: 3, skill: 6, luck: 0 }
            },
            availableSkills: {
                1: ['fire_bolt', 'heal'],
                2: ['fire_bolt', 'heal', 'ice_shard', 'group_heal'],
                3: ['fire_bolt', 'heal', 'ice_shard', 'group_heal', 'meteor', 'resurrection']
            },
            rankUpRequirements: {
                2: { roseEssenceCost: 15, levelRequirement: 5, prerequisiteSkills: [] },
                3: { roseEssenceCost: 25, levelRequirement: 10, prerequisiteSkills: ['group_heal'] }
            },
            growthRateModifiers: {
                1: { hp: 0.9, mp: 1.3, attack: 1.2, defense: 0.8, speed: 1.1, skill: 1.3, luck: 1.0 },
                2: { hp: 0.9, mp: 1.4, attack: 1.3, defense: 0.8, speed: 1.2, skill: 1.4, luck: 1.0 },
                3: { hp: 0.9, mp: 1.5, attack: 1.4, defense: 0.8, speed: 1.3, skill: 1.5, luck: 1.0 }
            },
            jobTraits: [],
            visual: {
                iconPath: 'mage_icon.png',
                spriteModifications: [],
                colorScheme: { primary: '#0000ff', secondary: '#000080' }
            }
        }
    };

    const mockRoseEssenceData: RoseEssenceData = {
        currentAmount: 100,
        totalEarned: 100,
        totalSpent: 0,
        sources: {
            boss_defeat: { baseAmount: 20, difficultyMultiplier: 1.5, firstTimeBonus: 10 }
        },
        costs: {
            rankUp: {
                warrior: { 2: 10, 3: 20 },
                mage: { 2: 15, 3: 25 }
            },
            jobChange: 5,
            skillUnlock: 3
        }
    };

    const mockUnit: Unit = {
        id: 'player1',
        name: 'Test Player',
        position: { x: 0, y: 0 },
        stats: {
            level: 5,
            maxHP: 100,
            maxMP: 50,
            currentHP: 100,
            currentMP: 50,
            attack: 20,
            defense: 15,
            speed: 10,
            skill: 12,
            luck: 8,
            movement: 3,
            experience: 150
        },
        faction: 'player',
        hasActed: false,
        hasMoved: false,
        jobId: 'warrior',
        jobRank: 1,
        skills: ['sword_slash', 'guard']
    };

    beforeEach(() => {
        // Initialize systems
        jobSystem = new JobSystem();
        experienceSystem = new ExperienceSystem();
        skillSystem = new SkillSystem();
        battleSystem = new BattleSystem();
        gameplayScene = new GameplayScene();

        // Initialize job system
        jobSystem.initialize(mockJobData, mockRoseEssenceData);

        // Set up system integrations
        (experienceSystem as any).jobSystem = jobSystem;
        (skillSystem as any).jobSystem = jobSystem;
        (battleSystem as any).jobSystem = jobSystem;
    });

    describe('Job System and Experience System Integration', () => {
        it('should apply job growth rate modifiers during level up', async () => {
            // Arrange
            jobSystem.setCharacterJob('player1', 'warrior');
            const initialStats = { ...mockUnit.stats };

            // Mock experience system level up
            const mockLevelUpResult = {
                characterId: 'player1',
                oldLevel: 5,
                newLevel: 6,
                statGains: { hp: 5, attack: 3, defense: 2 },
                newSkills: []
            };

            // Act
            const modifiedResult = await experienceSystem.processLevelUpWithJobModifiers(
                mockUnit,
                mockLevelUpResult
            );

            // Assert
            expect(modifiedResult.statGains.hp).toBeGreaterThan(mockLevelUpResult.statGains.hp);
            expect(modifiedResult.statGains.attack).toBeGreaterThan(mockLevelUpResult.statGains.attack);
        });

        it('should handle job change during level up process', async () => {
            // Arrange
            jobSystem.setCharacterJob('player1', 'warrior');

            // Act - Change job and then level up
            const jobChangeResult = jobSystem.changeJob('player1', 'mage');
            expect(jobChangeResult.success).toBe(true);

            // Simulate level up with new job
            const levelUpResult = await experienceSystem.processLevelUp(mockUnit);

            // Assert
            expect(levelUpResult.characterId).toBe('player1');
            // Mage should have different growth patterns than warrior
        });

        it('should maintain experience when changing jobs', () => {
            // Arrange
            const initialExperience = mockUnit.stats.experience;
            jobSystem.setCharacterJob('player1', 'warrior');

            // Act
            const result = jobSystem.changeJob('player1', 'mage');

            // Assert
            expect(result.success).toBe(true);
            expect(mockUnit.stats.experience).toBe(initialExperience);
        });
    });

    describe('Job System and Skill System Integration', () => {
        it('should update available skills when job changes', () => {
            // Arrange
            jobSystem.setCharacterJob('player1', 'warrior');
            const warriorSkills = skillSystem.getAvailableSkills('player1');

            // Act
            jobSystem.changeJob('player1', 'mage');
            const mageSkills = skillSystem.getAvailableSkills('player1');

            // Assert
            expect(warriorSkills).toContain('sword_slash');
            expect(warriorSkills).toContain('guard');
            expect(mageSkills).toContain('fire_bolt');
            expect(mageSkills).toContain('heal');
            expect(mageSkills).not.toContain('sword_slash');
        });

        it('should unlock new skills when job rank increases', async () => {
            // Arrange
            jobSystem.setCharacterJob('player1', 'warrior');
            const initialSkills = skillSystem.getAvailableSkills('player1');

            // Act
            const rankUpResult = await jobSystem.rankUpJob('player1', 2);

            // Assert
            expect(rankUpResult.success).toBe(true);
            expect(rankUpResult.newSkills).toContain('power_strike');

            const newSkills = skillSystem.getAvailableSkills('player1');
            expect(newSkills).toContain('power_strike');
            expect(newSkills.length).toBeGreaterThan(initialSkills.length);
        });

        it('should validate skill prerequisites for job rank up', async () => {
            // Arrange
            jobSystem.setCharacterJob('player1', 'warrior');
            await jobSystem.rankUpJob('player1', 2); // Get power_strike

            // Act - Try to rank up to 3 (requires power_strike)
            const rankUpResult = await jobSystem.rankUpJob('player1', 3);

            // Assert
            expect(rankUpResult.success).toBe(true);
        });

        it('should prevent rank up when skill prerequisites are not met', async () => {
            // Arrange
            jobSystem.setCharacterJob('player1', 'mage');
            // Don't learn group_heal skill

            // Act - Try to rank up to 3 (requires group_heal)
            const rankUpResult = await jobSystem.rankUpJob('player1', 3);

            // Assert
            expect(rankUpResult.success).toBe(false);
            expect(rankUpResult.message).toContain('prerequisite');
        });
    });

    describe('Job System and Battle System Integration', () => {
        it('should award rose essence when boss is defeated', () => {
            // Arrange
            const initialEssence = jobSystem.getCurrentRoseEssence();
            const mockBoss = { ...mockUnit, id: 'boss1', faction: 'enemy' as const };

            // Act
            battleSystem.handleBossDefeat(mockBoss);

            // Assert
            const newEssence = jobSystem.getCurrentRoseEssence();
            expect(newEssence).toBeGreaterThan(initialEssence);
        });

        it('should apply job stat modifiers in battle calculations', () => {
            // Arrange
            jobSystem.setCharacterJob('player1', 'warrior');
            const baseStats = mockUnit.stats;

            // Act
            const modifiedStats = battleSystem.calculateEffectiveStats(mockUnit);

            // Assert
            expect(modifiedStats.attack).toBeGreaterThan(baseStats.attack);
            expect(modifiedStats.defense).toBeGreaterThan(baseStats.defense);
            expect(modifiedStats.hp).toBeGreaterThan(baseStats.maxHP);
        });

        it('should handle job-specific battle abilities', () => {
            // Arrange
            jobSystem.setCharacterJob('player1', 'mage');

            // Act
            const canUseMagic = battleSystem.canUseSkill(mockUnit, 'fire_bolt');
            const canUseSword = battleSystem.canUseSkill(mockUnit, 'sword_slash');

            // Assert
            expect(canUseMagic).toBe(true);
            expect(canUseSword).toBe(false);
        });
    });

    describe('Complete Workflow Integration', () => {
        it('should handle complete character progression workflow', async () => {
            // Arrange - Start with warrior
            jobSystem.setCharacterJob('player1', 'warrior');
            const initialLevel = mockUnit.stats.level;

            // Act 1 - Gain experience and level up
            experienceSystem.awardExperience('player1', 100, 'battle_victory');
            await experienceSystem.processLevelUp(mockUnit);

            // Act 2 - Defeat boss and gain rose essence
            const mockBoss = { ...mockUnit, id: 'boss1', faction: 'enemy' as const };
            battleSystem.handleBossDefeat(mockBoss);

            // Act 3 - Rank up job
            const rankUpResult = await jobSystem.rankUpJob('player1', 2);

            // Act 4 - Change job
            const jobChangeResult = jobSystem.changeJob('player1', 'mage');

            // Assert
            expect(mockUnit.stats.level).toBeGreaterThan(initialLevel);
            expect(rankUpResult.success).toBe(true);
            expect(jobChangeResult.success).toBe(true);

            const finalSkills = skillSystem.getAvailableSkills('player1');
            expect(finalSkills).toContain('fire_bolt');
            expect(finalSkills).toContain('heal');
        });

        it('should maintain data consistency across all systems', async () => {
            // Arrange
            const characterId = 'player1';
            jobSystem.setCharacterJob(characterId, 'warrior');

            // Act - Perform multiple operations
            experienceSystem.awardExperience(characterId, 50, 'enemy_defeat');
            jobSystem.awardRoseEssence(30, { type: 'boss_defeat', bossId: 'boss1' });
            await jobSystem.rankUpJob(characterId, 2);
            jobSystem.changeJob(characterId, 'mage');

            // Assert - Check consistency across systems
            const jobData = jobSystem.getCharacterJobData(characterId);
            const skillData = skillSystem.getCharacterSkills(characterId);
            const experienceData = experienceSystem.getCharacterExperience(characterId);

            expect(jobData.currentJobId).toBe('mage');
            expect(skillData).toContain('fire_bolt');
            expect(experienceData.totalExperience).toBeGreaterThan(0);
        });

        it('should handle error scenarios gracefully across systems', async () => {
            // Arrange
            const characterId = 'player1';
            jobSystem.setCharacterJob(characterId, 'warrior');

            // Act & Assert - Try invalid operations
            const invalidRankUp = await jobSystem.rankUpJob(characterId, 5); // Invalid rank
            expect(invalidRankUp.success).toBe(false);

            const invalidJobChange = jobSystem.changeJob(characterId, 'invalid_job');
            expect(invalidJobChange.success).toBe(false);

            // Verify systems remain in consistent state
            const jobData = jobSystem.getCharacterJobData(characterId);
            expect(jobData.currentJobId).toBe('warrior');
            expect(jobData.currentRank).toBe(1);
        });
    });

    describe('Performance Integration', () => {
        it('should handle multiple characters efficiently', async () => {
            // Arrange
            const numCharacters = 100;
            const characters: string[] = [];

            for (let i = 0; i < numCharacters; i++) {
                characters.push(`char${i}`);
                jobSystem.setCharacterJob(`char${i}`, i % 2 === 0 ? 'warrior' : 'mage');
            }

            // Act
            const startTime = performance.now();

            for (const charId of characters) {
                experienceSystem.awardExperience(charId, 10, 'enemy_defeat');
                skillSystem.getAvailableSkills(charId);
                jobSystem.calculateJobStats(charId);
            }

            const endTime = performance.now();

            // Assert
            expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
        });

        it('should maintain performance with frequent job changes', () => {
            // Arrange
            const characterId = 'player1';
            jobSystem.setCharacterJob(characterId, 'warrior');

            // Act
            const startTime = performance.now();

            for (let i = 0; i < 100; i++) {
                const newJob = i % 2 === 0 ? 'mage' : 'warrior';
                jobSystem.changeJob(characterId, newJob);
                skillSystem.getAvailableSkills(characterId);
            }

            const endTime = performance.now();

            // Assert
            expect(endTime - startTime).toBeLessThan(500); // Should complete within 0.5 seconds
        });
    });

    describe('Data Persistence Integration', () => {
        it('should save and load job system state correctly', () => {
            // Arrange
            const characterId = 'player1';
            jobSystem.setCharacterJob(characterId, 'warrior');
            jobSystem.awardRoseEssence(50, { type: 'boss_defeat', bossId: 'boss1' });

            // Act - Save state
            const savedState = jobSystem.exportState();

            // Create new job system and load state
            const newJobSystem = new JobSystem();
            newJobSystem.initialize(mockJobData, mockRoseEssenceData);
            newJobSystem.importState(savedState);

            // Assert
            expect(newJobSystem.getCharacterJobData(characterId).currentJobId).toBe('warrior');
            expect(newJobSystem.getCurrentRoseEssence()).toBeGreaterThan(100);
        });

        it('should handle corrupted save data gracefully', () => {
            // Arrange
            const corruptedState = { invalid: 'data' };

            // Act & Assert
            expect(() => jobSystem.importState(corruptedState as any)).not.toThrow();

            // System should remain in valid state
            expect(jobSystem.getCurrentRoseEssence()).toBe(100); // Initial amount
        });
    });
});