import { JobSystem } from '../../game/src/systems/jobs/JobSystem';
import { JobData, RoseEssenceData } from '../../game/src/types/jobs';

/**
 * 職業システム アクセシビリティテスト
 * 
 * このテストスイートは、職業システムのUIとユーザーインターフェースが
 * アクセシビリティ要件を満たしていることを検証します。
 */
describe('Job System Accessibility', () => {
    let jobSystem: JobSystem;

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

    beforeEach(() => {
        jobSystem = new JobSystem();
        jobSystem.initialize(mockJobData, mockRoseEssenceData);
    });

    describe('Text and Content Accessibility', () => {
        it('should provide descriptive text for all job information', () => {
            // Act
            const warriorJob = jobSystem.getJob('warrior');
            const mageJob = jobSystem.getJob('mage');

            // Assert
            expect(warriorJob?.name).toBeDefined();
            expect(warriorJob?.name).toBe('戦士');
            expect(warriorJob?.description).toBeDefined();
            expect(warriorJob?.description).toBe('近接戦闘の専門家');

            expect(mageJob?.name).toBeDefined();
            expect(mageJob?.name).toBe('魔法使い');
            expect(mageJob?.description).toBeDefined();
            expect(mageJob?.description).toBe('魔法攻撃の専門家');
        });

        it('should provide accessible text for stat modifiers', () => {
            // Arrange
            jobSystem.setCharacterJob('char1', 'warrior');

            // Act
            const statModifiers = jobSystem.calculateJobStats('char1');
            const accessibleStatText = jobSystem.getAccessibleStatDescription('char1');

            // Assert
            expect(accessibleStatText).toBeDefined();
            expect(accessibleStatText).toContain('HP');
            expect(accessibleStatText).toContain('攻撃力');
            expect(accessibleStatText).toContain('防御力');

            // Should include actual values
            expect(accessibleStatText).toContain(statModifiers.hp.toString());
            expect(accessibleStatText).toContain(statModifiers.attack.toString());
            expect(accessibleStatText).toContain(statModifiers.defense.toString());
        });

        it('should provide accessible text for skill descriptions', () => {
            // Arrange
            jobSystem.setCharacterJob('char1', 'warrior');

            // Act
            const skills = jobSystem.getJobSkills('char1');
            const accessibleSkillText = jobSystem.getAccessibleSkillDescription('char1');

            // Assert
            expect(accessibleSkillText).toBeDefined();
            expect(skills.length).toBeGreaterThan(0);

            skills.forEach(skill => {
                expect(accessibleSkillText).toContain(skill);
            });
        });

        it('should provide clear error messages for accessibility', () => {
            // Act & Assert
            try {
                jobSystem.setCharacterJob('char1', 'invalid_job');
            } catch (error) {
                expect(error.message).toBeDefined();
                expect(error.message).toContain('Job not found');
                expect(error.message).toContain('invalid_job');
            }

            try {
                jobSystem.changeJob('non_existent_char', 'warrior');
            } catch (error) {
                expect(error.message).toBeDefined();
                expect(error.message).toContain('Character not found');
            }
        });
    });

    describe('Visual Accessibility', () => {
        it('should provide high contrast color schemes for job visuals', () => {
            // Act
            const warriorVisual = jobSystem.getJobVisual('warrior');
            const mageVisual = jobSystem.getJobVisual('mage');

            // Assert
            expect(warriorVisual.colorScheme).toBeDefined();
            expect(warriorVisual.colorScheme.primary).toBeDefined();
            expect(warriorVisual.colorScheme.secondary).toBeDefined();

            expect(mageVisual.colorScheme).toBeDefined();
            expect(mageVisual.colorScheme.primary).toBeDefined();
            expect(mageVisual.colorScheme.secondary).toBeDefined();

            // Colors should be different for distinction
            expect(warriorVisual.colorScheme.primary).not.toBe(mageVisual.colorScheme.primary);
        });

        it('should provide alternative text for job icons', () => {
            // Act
            const warriorVisual = jobSystem.getJobVisual('warrior');
            const mageVisual = jobSystem.getJobVisual('mage');

            // Assert
            expect(warriorVisual.iconPath).toBeDefined();
            expect(mageVisual.iconPath).toBeDefined();

            // Should have descriptive alt text
            const warriorAltText = jobSystem.getJobIconAltText('warrior');
            const mageAltText = jobSystem.getJobIconAltText('mage');

            expect(warriorAltText).toBeDefined();
            expect(warriorAltText).toContain('戦士');
            expect(mageAltText).toBeDefined();
            expect(mageAltText).toContain('魔法使い');
        });

        it('should support color-blind friendly indicators', () => {
            // Act
            const jobIndicators = jobSystem.getColorBlindFriendlyIndicators();

            // Assert
            expect(jobIndicators).toBeDefined();
            expect(jobIndicators.warrior).toBeDefined();
            expect(jobIndicators.mage).toBeDefined();

            // Should have non-color indicators (shapes, patterns, etc.)
            expect(jobIndicators.warrior.shape).toBeDefined();
            expect(jobIndicators.warrior.pattern).toBeDefined();
            expect(jobIndicators.mage.shape).toBeDefined();
            expect(jobIndicators.mage.pattern).toBeDefined();

            // Shapes should be different
            expect(jobIndicators.warrior.shape).not.toBe(jobIndicators.mage.shape);
        });
    });

    describe('Keyboard Navigation Accessibility', () => {
        it('should support keyboard navigation for job selection', () => {
            // Act
            const keyboardNavigation = jobSystem.getKeyboardNavigationSupport();

            // Assert
            expect(keyboardNavigation).toBeDefined();
            expect(keyboardNavigation.jobSelection).toBeDefined();
            expect(keyboardNavigation.jobSelection.nextJob).toBeDefined();
            expect(keyboardNavigation.jobSelection.previousJob).toBeDefined();
            expect(keyboardNavigation.jobSelection.selectJob).toBeDefined();
            expect(keyboardNavigation.jobSelection.cancelSelection).toBeDefined();
        });

        it('should support keyboard navigation for rank up interface', () => {
            // Arrange
            jobSystem.setCharacterJob('char1', 'warrior');

            // Act
            const rankUpNavigation = jobSystem.getRankUpKeyboardNavigation('char1');

            // Assert
            expect(rankUpNavigation).toBeDefined();
            expect(rankUpNavigation.confirmRankUp).toBeDefined();
            expect(rankUpNavigation.cancelRankUp).toBeDefined();
            expect(rankUpNavigation.viewRequirements).toBeDefined();
            expect(rankUpNavigation.viewPreview).toBeDefined();
        });

        it('should provide keyboard shortcuts for common actions', () => {
            // Act
            const shortcuts = jobSystem.getKeyboardShortcuts();

            // Assert
            expect(shortcuts).toBeDefined();
            expect(shortcuts.openJobMenu).toBeDefined();
            expect(shortcuts.quickJobChange).toBeDefined();
            expect(shortcuts.viewJobStats).toBeDefined();
            expect(shortcuts.viewSkills).toBeDefined();
            expect(shortcuts.checkRankUp).toBeDefined();
        });
    });

    describe('Screen Reader Accessibility', () => {
        it('should provide ARIA labels for job interface elements', () => {
            // Act
            const ariaLabels = jobSystem.getAriaLabels();

            // Assert
            expect(ariaLabels).toBeDefined();
            expect(ariaLabels.jobSelectionButton).toBeDefined();
            expect(ariaLabels.rankUpButton).toBeDefined();
            expect(ariaLabels.jobStatsPanel).toBeDefined();
            expect(ariaLabels.skillsPanel).toBeDefined();
            expect(ariaLabels.roseEssenceDisplay).toBeDefined();

            // Labels should be descriptive
            expect(ariaLabels.jobSelectionButton).toContain('職業選択');
            expect(ariaLabels.rankUpButton).toContain('ランクアップ');
            expect(ariaLabels.jobStatsPanel).toContain('職業能力値');
        });

        it('should provide screen reader announcements for job changes', () => {
            // Arrange
            jobSystem.setCharacterJob('char1', 'warrior');

            // Act
            const changeResult = jobSystem.changeJob('char1', 'mage');
            const announcement = jobSystem.getScreenReaderAnnouncement('job_change', changeResult);

            // Assert
            expect(announcement).toBeDefined();
            expect(announcement).toContain('職業が変更されました');
            expect(announcement).toContain('戦士');
            expect(announcement).toContain('魔法使い');
        });

        it('should provide screen reader announcements for rank ups', async () => {
            // Arrange
            jobSystem.setCharacterJob('char1', 'warrior');
            jobSystem.awardRoseEssence(50, { type: 'boss_defeat', bossId: 'test_boss' });

            // Act
            const rankUpResult = await jobSystem.rankUpJob('char1', 2);
            const announcement = jobSystem.getScreenReaderAnnouncement('rank_up', rankUpResult);

            // Assert
            expect(announcement).toBeDefined();
            expect(announcement).toContain('ランクアップしました');
            expect(announcement).toContain('戦士');
            expect(announcement).toContain('ランク2');

            if (rankUpResult.newSkills.length > 0) {
                expect(announcement).toContain('新しいスキル');
                rankUpResult.newSkills.forEach(skill => {
                    expect(announcement).toContain(skill);
                });
            }
        });

        it('should provide live region updates for rose essence changes', () => {
            // Arrange
            const initialEssence = jobSystem.getCurrentRoseEssence();

            // Act
            jobSystem.awardRoseEssence(25, { type: 'boss_defeat', bossId: 'test_boss' });
            const liveUpdate = jobSystem.getLiveRegionUpdate('rose_essence_gain');

            // Assert
            expect(liveUpdate).toBeDefined();
            expect(liveUpdate).toContain('薔薇の力を獲得');
            expect(liveUpdate).toContain('25');
            expect(liveUpdate).toContain((initialEssence + 25).toString());
        });
    });

    describe('Motor Accessibility', () => {
        it('should support large click targets for job selection', () => {
            // Act
            const clickTargets = jobSystem.getClickTargetSizes();

            // Assert
            expect(clickTargets).toBeDefined();
            expect(clickTargets.jobSelectionButton.width).toBeGreaterThanOrEqual(44); // WCAG minimum
            expect(clickTargets.jobSelectionButton.height).toBeGreaterThanOrEqual(44);
            expect(clickTargets.rankUpButton.width).toBeGreaterThanOrEqual(44);
            expect(clickTargets.rankUpButton.height).toBeGreaterThanOrEqual(44);
        });

        it('should provide hover states with sufficient timing', () => {
            // Act
            const hoverSettings = jobSystem.getHoverSettings();

            // Assert
            expect(hoverSettings).toBeDefined();
            expect(hoverSettings.hoverDelay).toBeGreaterThanOrEqual(500); // 0.5 second minimum
            expect(hoverSettings.hoverTimeout).toBeGreaterThanOrEqual(2000); // 2 second minimum
            expect(hoverSettings.allowHoverCancel).toBe(true);
        });

        it('should support drag and drop alternatives', () => {
            // Act
            const dragAlternatives = jobSystem.getDragAlternatives();

            // Assert
            expect(dragAlternatives).toBeDefined();
            expect(dragAlternatives.keyboardDragSupport).toBe(true);
            expect(dragAlternatives.clickToDragSupport).toBe(true);
            expect(dragAlternatives.doubleClickSupport).toBe(true);
        });
    });

    describe('Cognitive Accessibility', () => {
        it('should provide clear progress indicators for rank up process', () => {
            // Arrange
            jobSystem.setCharacterJob('char1', 'warrior');

            // Act
            const progressInfo = jobSystem.getRankUpProgressInfo('char1');

            // Assert
            expect(progressInfo).toBeDefined();
            expect(progressInfo.currentStep).toBeDefined();
            expect(progressInfo.totalSteps).toBeDefined();
            expect(progressInfo.stepDescription).toBeDefined();
            expect(progressInfo.nextStepDescription).toBeDefined();
        });

        it('should provide confirmation dialogs for important actions', () => {
            // Arrange
            jobSystem.setCharacterJob('char1', 'warrior');

            // Act
            const confirmationInfo = jobSystem.getConfirmationInfo('job_change', {
                characterId: 'char1',
                newJobId: 'mage'
            });

            // Assert
            expect(confirmationInfo).toBeDefined();
            expect(confirmationInfo.title).toBeDefined();
            expect(confirmationInfo.message).toBeDefined();
            expect(confirmationInfo.consequences).toBeDefined();
            expect(confirmationInfo.confirmText).toBeDefined();
            expect(confirmationInfo.cancelText).toBeDefined();

            expect(confirmationInfo.message).toContain('職業を変更');
            expect(confirmationInfo.consequences).toContain('スキルが変更');
        });

        it('should provide help text and tooltips for complex features', () => {
            // Act
            const helpText = jobSystem.getHelpText();

            // Assert
            expect(helpText).toBeDefined();
            expect(helpText.jobSystem).toBeDefined();
            expect(helpText.rankUp).toBeDefined();
            expect(helpText.roseEssence).toBeDefined();
            expect(helpText.jobChange).toBeDefined();

            // Help text should be clear and concise
            expect(helpText.jobSystem.length).toBeGreaterThan(50);
            expect(helpText.rankUp.length).toBeGreaterThan(50);
            expect(helpText.roseEssence.length).toBeGreaterThan(50);
        });

        it('should provide undo functionality for reversible actions', () => {
            // Arrange
            jobSystem.setCharacterJob('char1', 'warrior');
            jobSystem.awardRoseEssence(50, { type: 'boss_defeat', bossId: 'test_boss' });

            // Act
            const changeResult = jobSystem.changeJob('char1', 'mage');
            const undoInfo = jobSystem.getUndoInfo('job_change', changeResult);

            // Assert
            expect(undoInfo).toBeDefined();
            expect(undoInfo.canUndo).toBe(true);
            expect(undoInfo.undoDescription).toBeDefined();
            expect(undoInfo.undoTimeLimit).toBeDefined();
            expect(undoInfo.undoDescription).toContain('戦士に戻す');
        });
    });

    describe('Internationalization and Localization Accessibility', () => {
        it('should support right-to-left text direction', () => {
            // Act
            const i18nSupport = jobSystem.getInternationalizationSupport();

            // Assert
            expect(i18nSupport).toBeDefined();
            expect(i18nSupport.rtlSupport).toBe(true);
            expect(i18nSupport.textDirectionDetection).toBe(true);
            expect(i18nSupport.bidiTextSupport).toBe(true);
        });

        it('should provide proper text scaling support', () => {
            // Act
            const textScaling = jobSystem.getTextScalingSupport();

            // Assert
            expect(textScaling).toBeDefined();
            expect(textScaling.maxScaleFactor).toBeGreaterThanOrEqual(2.0); // 200% minimum
            expect(textScaling.preserveLayout).toBe(true);
            expect(textScaling.reflowContent).toBe(true);
        });

        it('should handle long text gracefully', () => {
            // Arrange - Create job with very long name and description
            const longJobData = {
                ...mockJobData,
                longNameJob: {
                    ...mockJobData.warrior,
                    id: 'longNameJob',
                    name: 'とても長い職業名でテキストの折り返しとレイアウトの調整をテストするための職業',
                    description: 'これは非常に長い説明文で、テキストが適切に表示され、レイアウトが崩れないことを確認するためのテストです。アクセシビリティの観点から、長いテキストでも読みやすく表示される必要があります。'
                }
            };

            jobSystem.initialize(longJobData, mockRoseEssenceData);

            // Act
            const longJob = jobSystem.getJob('longNameJob');
            const textHandling = jobSystem.getTextHandlingInfo('longNameJob');

            // Assert
            expect(longJob).toBeDefined();
            expect(textHandling).toBeDefined();
            expect(textHandling.textWrapping).toBe(true);
            expect(textHandling.ellipsisSupport).toBe(true);
            expect(textHandling.expandableText).toBe(true);
        });
    });

    describe('Error Handling Accessibility', () => {
        it('should provide accessible error messages', () => {
            // Act & Assert - Test various error scenarios
            try {
                jobSystem.setCharacterJob('', 'warrior');
            } catch (error) {
                const errorInfo = jobSystem.getAccessibleErrorInfo(error);
                expect(errorInfo).toBeDefined();
                expect(errorInfo.message).toBeDefined();
                expect(errorInfo.severity).toBeDefined();
                expect(errorInfo.suggestions).toBeDefined();
                expect(errorInfo.ariaRole).toBe('alert');
            }

            try {
                jobSystem.consumeRoseEssence(1000, 'test'); // More than available
            } catch (error) {
                const errorInfo = jobSystem.getAccessibleErrorInfo(error);
                expect(errorInfo.suggestions).toContain('薔薇の力が不足');
            }
        });

        it('should provide recovery suggestions for errors', () => {
            // Arrange
            jobSystem.setCharacterJob('char1', 'warrior');

            // Act
            try {
                jobSystem.rankUpJob('char1', 2); // Insufficient level
            } catch (error) {
                const recoveryInfo = jobSystem.getErrorRecoveryInfo(error);

                // Assert
                expect(recoveryInfo).toBeDefined();
                expect(recoveryInfo.suggestions).toBeDefined();
                expect(recoveryInfo.suggestions.length).toBeGreaterThan(0);
                expect(recoveryInfo.suggestions[0]).toContain('レベル');
            }
        });
    });

    describe('Performance Accessibility', () => {
        it('should maintain accessibility features under load', () => {
            // Arrange - Create many characters
            for (let i = 0; i < 50; i++) {
                jobSystem.setCharacterJob(`char${i}`, i % 2 === 0 ? 'warrior' : 'mage');
            }

            // Act
            const startTime = performance.now();

            for (let i = 0; i < 50; i++) {
                jobSystem.getAccessibleStatDescription(`char${i}`);
                jobSystem.getAccessibleSkillDescription(`char${i}`);
            }

            const endTime = performance.now();
            const executionTime = endTime - startTime;

            // Assert
            expect(executionTime).toBeLessThan(1000); // Should remain responsive
        });

        it('should provide reduced motion options', () => {
            // Act
            const motionSettings = jobSystem.getMotionSettings();

            // Assert
            expect(motionSettings).toBeDefined();
            expect(motionSettings.respectReducedMotion).toBe(true);
            expect(motionSettings.alternativeAnimations).toBeDefined();
            expect(motionSettings.instantTransitions).toBe(true);
        });
    });
});