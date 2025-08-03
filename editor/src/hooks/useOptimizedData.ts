import { useMemo, useCallback } from 'react';
import { Character, Item, Stage } from '../types';

interface UseOptimizedDataProps {
    characters: Character[];
    items: Item[];
    stages: Stage[];
}

interface UseOptimizedDataReturn {
    // Memoized data
    charactersByFaction: Record<string, Character[]>;
    itemsByType: Record<string, Item[]>;
    stagesByDifficulty: Record<string, Stage[]>;

    // Optimized search functions
    searchCharacters: (query: string) => Character[];
    searchItems: (query: string) => Item[];
    searchStages: (query: string) => Stage[];

    // Optimized filter functions
    filterCharactersByStats: (minHp?: number, maxHp?: number) => Character[];
    filterItemsByRarity: (rarity: string) => Item[];

    // Reference validation
    validateCharacterReferences: (character: Character) => string[];
    validateItemReferences: (item: Item) => string[];
    validateStageReferences: (stage: Stage) => string[];
}

export const useOptimizedData = ({
    characters,
    items,
    stages,
}: UseOptimizedDataProps): UseOptimizedDataReturn => {
    // Memoized grouped data
    const charactersByFaction = useMemo(() => {
        return characters.reduce((acc, character) => {
            const faction = character.faction || 'unknown';
            if (!acc[faction]) {
                acc[faction] = [];
            }
            acc[faction].push(character);
            return acc;
        }, {} as Record<string, Character[]>);
    }, [characters]);

    const itemsByType = useMemo(() => {
        return items.reduce((acc, item) => {
            const type = item.type || 'unknown';
            if (!acc[type]) {
                acc[type] = [];
            }
            acc[type].push(item);
            return acc;
        }, {} as Record<string, Item[]>);
    }, [items]);

    const stagesByDifficulty = useMemo(() => {
        return stages.reduce((acc, stage) => {
            const difficulty = stage.difficulty || 'normal';
            if (!acc[difficulty]) {
                acc[difficulty] = [];
            }
            acc[difficulty].push(stage);
            return acc;
        }, {} as Record<string, Stage[]>);
    }, [stages]);

    // Optimized search functions with memoization
    const searchCharacters = useCallback((query: string) => {
        if (!query.trim()) return characters;

        const lowercaseQuery = query.toLowerCase();
        return characters.filter(character =>
            character.name.toLowerCase().includes(lowercaseQuery) ||
            character.description?.toLowerCase().includes(lowercaseQuery) ||
            character.jobId?.toLowerCase().includes(lowercaseQuery)
        );
    }, [characters]);

    const searchItems = useCallback((query: string) => {
        if (!query.trim()) return items;

        const lowercaseQuery = query.toLowerCase();
        return items.filter(item =>
            item.name.toLowerCase().includes(lowercaseQuery) ||
            item.description?.toLowerCase().includes(lowercaseQuery) ||
            item.type.toLowerCase().includes(lowercaseQuery) ||
            item.category?.toLowerCase().includes(lowercaseQuery)
        );
    }, [items]);

    const searchStages = useCallback((query: string) => {
        if (!query.trim()) return stages;

        const lowercaseQuery = query.toLowerCase();
        return stages.filter(stage =>
            stage.name.toLowerCase().includes(lowercaseQuery) ||
            stage.description?.toLowerCase().includes(lowercaseQuery)
        );
    }, [stages]);

    // Optimized filter functions
    const filterCharactersByStats = useCallback((minHp?: number, maxHp?: number) => {
        return characters.filter(character => {
            const hp = character.stats.hp;
            if (minHp !== undefined && hp < minHp) return false;
            if (maxHp !== undefined && hp > maxHp) return false;
            return true;
        });
    }, [characters]);

    const filterItemsByRarity = useCallback((rarity: string) => {
        return items.filter(item => item.rarity === rarity);
    }, [items]);

    // Reference validation functions
    const validateCharacterReferences = useCallback((character: Character) => {
        const errors: string[] = [];

        // Check job reference
        if (character.jobId) {
            // This would check against a jobs array if available
            // For now, just check if it's a non-empty string
            if (!character.jobId.trim()) {
                errors.push('Job ID cannot be empty');
            }
        }

        // Check ability references
        if (character.abilities) {
            character.abilities.forEach((abilityId, index) => {
                if (!abilityId.trim()) {
                    errors.push(`Ability ${index + 1} ID cannot be empty`);
                }
            });
        }

        return errors;
    }, []);

    const validateItemReferences = useCallback((item: Item) => {
        const errors: string[] = [];

        // Check if item effects reference valid abilities or other items
        if (item.effects) {
            item.effects.forEach((effect, index) => {
                if (effect.type === 'ability_grant' && effect.abilityId) {
                    if (!effect.abilityId.trim()) {
                        errors.push(`Effect ${index + 1} ability ID cannot be empty`);
                    }
                }
            });
        }

        return errors;
    }, []);

    const validateStageReferences = useCallback((stage: Stage) => {
        const errors: string[] = [];

        // Check character references in enemy spawns
        if (stage.enemies) {
            stage.enemies.forEach((enemy, index) => {
                if (!enemy.characterId.trim()) {
                    errors.push(`Enemy ${index + 1} character ID cannot be empty`);
                }

                // Check if character exists
                const characterExists = characters.some(char => char.id === enemy.characterId);
                if (!characterExists) {
                    errors.push(`Enemy ${index + 1} references non-existent character: ${enemy.characterId}`);
                }
            });
        }

        // Check item references in rewards
        if (stage.rewards?.items) {
            stage.rewards.items.forEach((reward, index) => {
                if (!reward.itemId.trim()) {
                    errors.push(`Reward item ${index + 1} ID cannot be empty`);
                }

                // Check if item exists
                const itemExists = items.some(item => item.id === reward.itemId);
                if (!itemExists) {
                    errors.push(`Reward item ${index + 1} references non-existent item: ${reward.itemId}`);
                }
            });
        }

        return errors;
    }, [characters, items]);

    return {
        charactersByFaction,
        itemsByType,
        stagesByDifficulty,
        searchCharacters,
        searchItems,
        searchStages,
        filterCharactersByStats,
        filterItemsByRarity,
        validateCharacterReferences,
        validateItemReferences,
        validateStageReferences,
    };
};