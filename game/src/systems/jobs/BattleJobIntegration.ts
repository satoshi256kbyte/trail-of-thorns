/**
 * BattleJobIntegration - 戦闘システムと職業システムの統合機能
 * 
 * このクラスは以下の機能を提供します：
 * - ボス撃破時の薔薇の力獲得処理
 * - 職業による戦闘能力修正
 * - 職業特性の戦闘への適用
 * - 薔薇の力獲得演出の統合
 * 
 * 要件4.1, 4.2, 7.1, 7.2, 7.3, 7.4, 7.5に対応
 */

import { Unit } from '../../types/gameplay';
import { BattleResult, DamageModifier, Weapon } from '../../types/battle';
import {
    StatModifiers,
    JobTrait,
    TraitEffectType,
    RoseEssenceSource,
    RoseEssenceSourceType
} from '../../types/job';
import { JobSystem } from './JobSystem';
import { Job } from './Job';

/**
 * ボス情報の定義
 */
export interface BossInfo {
    id: string;
    name: string;
    type: 'minor_boss' | 'major_boss' | 'chapter_boss' | 'final_boss';
    roseEssenceReward: number;
    isFirstTimeDefeat: boolean;
    stageId?: string;
    chapterId?: string;
}

/**
 * 職業戦闘修正の結果
 */
export interface JobBattleModification {
    statModifiers: StatModifiers;
    damageModifiers: DamageModifier[];
    accuracyModifier: number;
    criticalRateModifier: number;
    evasionModifier: number;
    specialEffects: string[];
}

/**
 * 薔薇の力獲得イベントの詳細
 */
export interface RoseEssenceGainEvent {
    amount: number;
    source: RoseEssenceSource;
    bossInfo: BossInfo;
    position?: { x: number; y: number };
    showAnimation: boolean;
}

/**
 * 戦闘システムと職業システムの統合クラス
 */
export class BattleJobIntegration extends Phaser.Events.EventEmitter {
    private jobSystem: JobSystem;
    private scene?: Phaser.Scene;

    constructor(jobSystem: JobSystem, scene?: Phaser.Scene) {
        super();
        this.jobSystem = jobSystem;
        this.scene = scene;
    }

    /**
     * ボス撃破時の薔薇の力獲得処理
     * 要件4.1, 4.2: ボス撃破時の薔薇の力獲得処理と獲得量表示
     * 
     * @param bossInfo 撃破されたボス情報
     * @param defeatingUnit ボスを撃破したユニット
     * @returns 獲得した薔薇の力の量
     */
    public async handleBossDefeat(bossInfo: BossInfo, defeatingUnit?: Unit): Promise<number> {
        try {
            // 薔薇の力獲得源を作成
            const roseEssenceSource: RoseEssenceSource = {
                type: RoseEssenceSourceType.BOSS_DEFEAT,
                sourceId: bossInfo.id,
                bossId: bossInfo.id,
                stageId: bossInfo.stageId
            };

            // 薔薇の力を獲得
            const gainedAmount = await this.jobSystem.awardRoseEssence(
                bossInfo.roseEssenceReward,
                roseEssenceSource.sourceId,
                defeatingUnit?.position
            );

            // 薔薇の力獲得イベントを発行
            const gainEvent: RoseEssenceGainEvent = {
                amount: gainedAmount,
                source: roseEssenceSource,
                bossInfo: bossInfo,
                position: defeatingUnit?.position,
                showAnimation: true
            };

            this.emit('rose_essence_gained', gainEvent);

            // ランクアップ可能性をチェック
            const rankUpCandidates = this.jobSystem.getRankUpCandidates();
            if (rankUpCandidates.length > 0) {
                this.emit('rank_up_available', {
                    candidates: rankUpCandidates,
                    newRoseEssence: gainedAmount
                });
            }

            console.log(`ボス「${bossInfo.name}」撃破により薔薇の力${gainedAmount}を獲得`);

            return gainedAmount;

        } catch (error) {
            console.error('ボス撃破時の薔薇の力獲得処理でエラー:', error);
            this.emit('rose_essence_gain_error', {
                bossInfo,
                error: error.message
            });
            return 0;
        }
    }

    /**
     * 職業による戦闘能力修正を適用
     * 要件7.1, 7.2: 職業による戦闘能力修正と職業特性の戦闘への適用
     * 
     * @param unit 対象ユニット
     * @param weapon 使用武器
     * @param target 攻撃対象（オプション）
     * @returns 職業による戦闘修正
     */
    public applyJobBattleModifications(
        unit: Unit,
        weapon: Weapon,
        target?: Unit
    ): JobBattleModification {
        const job = this.jobSystem.getCharacterJob(unit.id);
        if (!job) {
            // 職業が設定されていない場合はデフォルト値を返す
            return this.getDefaultBattleModification();
        }

        try {
            // 基本能力値修正を取得
            const statModifiers = this.jobSystem.getCharacterJobStats(unit.id);

            // 職業特性による修正を計算
            const traitModifications = this.calculateTraitModifications(job, unit, weapon, target);

            // ダメージ修正を計算
            const damageModifiers = this.calculateJobDamageModifiers(job, unit, weapon, target);

            // 命中率修正を計算
            const accuracyModifier = this.calculateAccuracyModifier(job, unit, weapon);

            // クリティカル率修正を計算
            const criticalRateModifier = this.calculateCriticalRateModifier(job, unit, weapon);

            // 回避率修正を計算
            const evasionModifier = this.calculateEvasionModifier(job, unit);

            // 特殊効果を取得
            const specialEffects = this.getJobSpecialEffects(job, unit, weapon);

            const modification: JobBattleModification = {
                statModifiers,
                damageModifiers,
                accuracyModifier,
                criticalRateModifier,
                evasionModifier,
                specialEffects
            };

            this.emit('job_battle_modification_applied', {
                unit,
                job,
                modification
            });

            return modification;

        } catch (error) {
            console.error('職業戦闘修正の適用でエラー:', error);
            return this.getDefaultBattleModification();
        }
    }

    /**
     * 戦闘結果に職業効果を適用
     * 要件7.3, 7.4: 職業特性の戦闘への適用
     * 
     * @param battleResult 戦闘結果
     * @returns 職業効果が適用された戦闘結果
     */
    public applyJobEffectsToBattleResult(battleResult: BattleResult): BattleResult {
        try {
            const attackerJob = this.jobSystem.getCharacterJob(battleResult.attacker.id);
            const targetJob = this.jobSystem.getCharacterJob(battleResult.target.id);

            // 攻撃者の職業効果を適用
            if (attackerJob) {
                battleResult = this.applyAttackerJobEffects(battleResult, attackerJob);
            }

            // 防御者の職業効果を適用
            if (targetJob) {
                battleResult = this.applyDefenderJobEffects(battleResult, targetJob);
            }

            this.emit('job_effects_applied_to_battle', {
                battleResult,
                attackerJob,
                targetJob
            });

            return battleResult;

        } catch (error) {
            console.error('戦闘結果への職業効果適用でエラー:', error);
            return battleResult;
        }
    }

    /**
     * 薔薇の力獲得演出を統合
     * 要件4.2, 7.5: 薔薇の力獲得演出の統合
     * 
     * @param gainEvent 薔薇の力獲得イベント
     */
    public async integrateRoseEssenceGainEffect(gainEvent: RoseEssenceGainEvent): Promise<void> {
        if (!gainEvent.showAnimation || !this.scene) {
            return;
        }

        try {
            // 薔薇の力獲得エフェクトを再生
            await this.jobSystem.awardRoseEssence(
                gainEvent.amount,
                gainEvent.source.sourceId,
                gainEvent.position
            );

            // 追加の視覚効果
            await this.playBossDefeatRoseEssenceEffect(gainEvent);

            this.emit('rose_essence_effect_completed', gainEvent);

        } catch (error) {
            console.error('薔薇の力獲得演出の統合でエラー:', error);
            this.emit('rose_essence_effect_error', {
                gainEvent,
                error: error.message
            });
        }
    }

    /**
     * 職業オーラエフェクトを戦闘中に表示
     * 要件7.5: 薔薇の力獲得演出の統合（職業オーラ含む）
     * 
     * @param unit 対象ユニット
     * @param duration 表示時間（ミリ秒）
     */
    public showJobAuraInBattle(unit: Unit, duration: number = 3000): void {
        try {
            // 職業オーラを表示
            this.jobSystem.showJobAura(unit.id);

            // 指定時間後に非表示
            if (this.scene) {
                this.scene.time.delayedCall(duration, () => {
                    this.jobSystem.hideJobAura(unit.id);
                });
            }

            this.emit('job_aura_shown_in_battle', {
                unit,
                duration
            });

        } catch (error) {
            console.error('戦闘中の職業オーラ表示でエラー:', error);
        }
    }

    // =============================================================================
    // プライベートメソッド
    // =============================================================================

    /**
     * デフォルトの戦闘修正を取得
     */
    private getDefaultBattleModification(): JobBattleModification {
        return {
            statModifiers: {
                hp: 0,
                mp: 0,
                attack: 0,
                defense: 0,
                speed: 0,
                skill: 0,
                luck: 0
            },
            damageModifiers: [],
            accuracyModifier: 0,
            criticalRateModifier: 0,
            evasionModifier: 0,
            specialEffects: []
        };
    }

    /**
     * 職業特性による修正を計算
     */
    private calculateTraitModifications(
        job: Job,
        unit: Unit,
        weapon: Weapon,
        target?: Unit
    ): Partial<JobBattleModification> {
        const modifications: Partial<JobBattleModification> = {};
        const traits = job.getJobTraits();

        for (const trait of traits) {
            switch (trait.effect.type) {
                case TraitEffectType.DAMAGE_BONUS:
                    // ダメージボーナス特性
                    if (this.checkTraitCondition(trait, unit, weapon, target)) {
                        modifications.damageModifiers = modifications.damageModifiers || [];
                        modifications.damageModifiers.push({
                            type: 'skill',
                            multiplier: 1 + (trait.effect.value / 100),
                            description: `職業特性「${trait.name}」によるダメージボーナス`,
                            source: job.name
                        });
                    }
                    break;

                case TraitEffectType.STAT_BONUS:
                    // 能力値ボーナス特性（戦闘中のみ適用される追加ボーナス）
                    if (this.checkTraitCondition(trait, unit, weapon, target)) {
                        // 基本能力値修正に追加のボーナスを適用
                        // これは既に getCharacterJobStats で適用されているため、
                        // ここでは戦闘中のみの特別なボーナスを適用
                    }
                    break;

                case TraitEffectType.SKILL_BONUS:
                    // スキルボーナス特性
                    if (this.checkTraitCondition(trait, unit, weapon, target)) {
                        modifications.accuracyModifier = (modifications.accuracyModifier || 0) + trait.effect.value;
                    }
                    break;

                case TraitEffectType.RESISTANCE:
                    // 抵抗特性（防御側で適用）
                    if (this.checkTraitCondition(trait, unit, weapon, target)) {
                        modifications.damageModifiers = modifications.damageModifiers || [];
                        modifications.damageModifiers.push({
                            type: 'skill',
                            multiplier: 1 - (trait.effect.value / 100),
                            description: `職業特性「${trait.name}」による抵抗`,
                            source: job.name
                        });
                    }
                    break;

                case TraitEffectType.SPECIAL_ABILITY:
                    // 特殊能力特性
                    if (this.checkTraitCondition(trait, unit, weapon, target)) {
                        modifications.specialEffects = modifications.specialEffects || [];
                        modifications.specialEffects.push(trait.name);
                    }
                    break;
            }
        }

        return modifications;
    }

    /**
     * 職業によるダメージ修正を計算
     */
    private calculateJobDamageModifiers(
        job: Job,
        unit: Unit,
        weapon: Weapon,
        target?: Unit
    ): DamageModifier[] {
        const modifiers: DamageModifier[] = [];

        // 職業カテゴリーによる武器相性
        const weaponCompatibility = this.getWeaponCompatibility(job, weapon);
        if (weaponCompatibility !== 1.0) {
            modifiers.push({
                type: 'weapon',
                multiplier: weaponCompatibility,
                description: `職業「${job.name}」の武器相性`,
                source: job.name
            });
        }

        // 職業ランクによるダメージボーナス
        const rankBonus = this.getRankDamageBonus(job);
        if (rankBonus > 0) {
            modifiers.push({
                type: 'skill',
                multiplier: 1 + (rankBonus / 100),
                description: `職業ランク${job.rank}によるダメージボーナス`,
                source: job.name
            });
        }

        return modifiers;
    }

    /**
     * 命中率修正を計算
     */
    private calculateAccuracyModifier(job: Job, unit: Unit, weapon: Weapon): number {
        let modifier = 0;

        // 職業による基本命中率修正
        const jobAccuracyBonus = this.getJobAccuracyBonus(job);
        modifier += jobAccuracyBonus;

        // 武器相性による命中率修正
        const weaponCompatibility = this.getWeaponCompatibility(job, weapon);
        if (weaponCompatibility > 1.0) {
            modifier += 10; // 相性が良い武器は命中率+10
        } else if (weaponCompatibility < 1.0) {
            modifier -= 5; // 相性が悪い武器は命中率-5
        }

        return modifier;
    }

    /**
     * クリティカル率修正を計算
     */
    private calculateCriticalRateModifier(job: Job, unit: Unit, weapon: Weapon): number {
        let modifier = 0;

        // 職業による基本クリティカル率修正
        const jobCriticalBonus = this.getJobCriticalBonus(job);
        modifier += jobCriticalBonus;

        // ランクによるクリティカル率ボーナス
        modifier += job.rank * 2; // ランク1につき+2%

        return modifier;
    }

    /**
     * 回避率修正を計算
     */
    private calculateEvasionModifier(job: Job, unit: Unit): number {
        let modifier = 0;

        // 職業による基本回避率修正
        const jobEvasionBonus = this.getJobEvasionBonus(job);
        modifier += jobEvasionBonus;

        return modifier;
    }

    /**
     * 職業の特殊効果を取得
     */
    private getJobSpecialEffects(job: Job, unit: Unit, weapon: Weapon): string[] {
        const effects: string[] = [];

        // 職業特性から特殊効果を抽出
        const traits = job.getJobTraits();
        for (const trait of traits) {
            if (trait.effect.type === TraitEffectType.SPECIAL_ABILITY) {
                effects.push(trait.name);
            }
        }

        return effects;
    }

    /**
     * 攻撃者の職業効果を戦闘結果に適用
     */
    private applyAttackerJobEffects(battleResult: BattleResult, job: Job): BattleResult {
        // 職業による追加経験値
        const jobExpBonus = this.getJobExperienceBonus(job);
        battleResult.experienceGained += jobExpBonus;

        // 職業特性による特殊効果
        const traits = job.getJobTraits();
        for (const trait of traits) {
            if (trait.effect.type === TraitEffectType.SPECIAL_ABILITY) {
                // 特殊能力の効果を適用
                this.applySpecialAbilityEffect(battleResult, trait);
            }
        }

        return battleResult;
    }

    /**
     * 防御者の職業効果を戦闘結果に適用
     */
    private applyDefenderJobEffects(battleResult: BattleResult, job: Job): BattleResult {
        // 防御職業による被ダメージ軽減
        const defenseBonus = this.getJobDefenseBonus(job);
        if (defenseBonus > 0) {
            const reduction = Math.floor(battleResult.finalDamage * (defenseBonus / 100));
            battleResult.finalDamage = Math.max(0, battleResult.finalDamage - reduction);

            battleResult.modifiers.push({
                type: 'skill',
                multiplier: 1 - (defenseBonus / 100),
                description: `職業「${job.name}」による防御ボーナス`,
                source: job.name
            });
        }

        return battleResult;
    }

    /**
     * ボス撃破時の薔薇の力獲得エフェクトを再生
     */
    private async playBossDefeatRoseEssenceEffect(gainEvent: RoseEssenceGainEvent): Promise<void> {
        if (!this.scene) return;

        try {
            // ボス撃破専用の特別なエフェクト
            const effectDuration = 2000; // 2秒間

            // 薔薇の花びらエフェクト
            const petalCount = Math.min(20, gainEvent.amount); // 獲得量に応じて花びらの数を調整

            for (let i = 0; i < petalCount; i++) {
                this.scene.time.delayedCall(i * 100, () => {
                    this.createRosePetalEffect(gainEvent.position);
                });
            }

            // 薔薇の力獲得テキスト表示
            this.showRoseEssenceGainText(gainEvent);

            // 効果音再生（実装されている場合）
            this.playRoseEssenceGainSound(gainEvent);

        } catch (error) {
            console.error('ボス撃破薔薇の力エフェクト再生でエラー:', error);
        }
    }

    /**
     * 薔薇の花びらエフェクトを作成
     */
    private createRosePetalEffect(position?: { x: number; y: number }): void {
        if (!this.scene) return;

        const startX = position?.x || this.scene.cameras.main.centerX;
        const startY = position?.y || this.scene.cameras.main.centerY;

        // 簡単な花びらエフェクト（実際の実装では画像やパーティクルを使用）
        const petal = this.scene.add.circle(startX, startY, 3, 0xff69b4, 0.8);

        // 花びらの動きをアニメーション
        this.scene.tweens.add({
            targets: petal,
            x: startX + Phaser.Math.Between(-100, 100),
            y: startY + Phaser.Math.Between(-50, -150),
            alpha: 0,
            duration: 1500,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                petal.destroy();
            }
        });
    }

    /**
     * 薔薇の力獲得テキストを表示
     */
    private showRoseEssenceGainText(gainEvent: RoseEssenceGainEvent): void {
        if (!this.scene) return;

        const centerX = this.scene.cameras.main.centerX;
        const centerY = this.scene.cameras.main.centerY;

        const text = this.scene.add.text(
            centerX,
            centerY - 50,
            `薔薇の力 +${gainEvent.amount}`,
            {
                fontSize: '24px',
                color: '#ff1493',
                stroke: '#000000',
                strokeThickness: 2
            }
        ).setOrigin(0.5);

        // テキストアニメーション
        this.scene.tweens.add({
            targets: text,
            y: centerY - 100,
            alpha: 0,
            duration: 2000,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                text.destroy();
            }
        });
    }

    /**
     * 薔薇の力獲得効果音を再生
     */
    private playRoseEssenceGainSound(gainEvent: RoseEssenceGainEvent): void {
        if (!this.scene) return;

        try {
            // 効果音再生（音声ファイルが存在する場合）
            if (this.scene.sound.exists('rose_essence_gain')) {
                this.scene.sound.play('rose_essence_gain', { volume: 0.7 });
            }
        } catch (error) {
            console.warn('薔薇の力獲得効果音の再生に失敗:', error);
        }
    }

    // =============================================================================
    // ヘルパーメソッド
    // =============================================================================

    /**
     * 特性の条件をチェック
     */
    private checkTraitCondition(
        trait: JobTrait,
        unit: Unit,
        weapon: Weapon,
        target?: Unit
    ): boolean {
        if (!trait.effect.condition) {
            return true; // 条件がない場合は常に適用
        }

        // 条件の解析と判定（簡単な実装例）
        const condition = trait.effect.condition.toLowerCase();

        if (condition.includes('weapon_type')) {
            const requiredType = condition.split(':')[1];
            return weapon.type === requiredType;
        }

        if (condition.includes('target_faction')) {
            const requiredFaction = condition.split(':')[1];
            return target?.faction === requiredFaction;
        }

        if (condition.includes('hp_below')) {
            const threshold = parseInt(condition.split(':')[1]);
            return (unit.currentHP / unit.stats.maxHP) * 100 < threshold;
        }

        return true;
    }

    /**
     * 武器相性を取得
     */
    private getWeaponCompatibility(job: Job, weapon: Weapon): number {
        // 職業カテゴリーと武器タイプの相性マトリックス
        const compatibilityMatrix: { [jobCategory: string]: { [weaponType: string]: number } } = {
            'warrior': {
                'sword': 1.2,
                'axe': 1.1,
                'spear': 1.0,
                'bow': 0.8,
                'staff': 0.7,
                'dagger': 0.9
            },
            'mage': {
                'staff': 1.2,
                'dagger': 1.0,
                'sword': 0.8,
                'axe': 0.7,
                'spear': 0.7,
                'bow': 0.9
            },
            'archer': {
                'bow': 1.2,
                'dagger': 1.1,
                'spear': 1.0,
                'sword': 0.9,
                'axe': 0.8,
                'staff': 0.8
            },
            'healer': {
                'staff': 1.1,
                'dagger': 1.0,
                'sword': 0.9,
                'axe': 0.8,
                'spear': 0.8,
                'bow': 0.9
            },
            'thief': {
                'dagger': 1.2,
                'bow': 1.1,
                'sword': 1.0,
                'spear': 0.9,
                'axe': 0.8,
                'staff': 0.8
            }
        };

        const jobCategory = job.category.toLowerCase();
        const weaponType = weapon.type.toLowerCase();

        return compatibilityMatrix[jobCategory]?.[weaponType] || 1.0;
    }

    /**
     * ランクによるダメージボーナスを取得
     */
    private getRankDamageBonus(job: Job): number {
        // ランク1につき5%のダメージボーナス
        return (job.rank - 1) * 5;
    }

    /**
     * 職業による命中率ボーナスを取得
     */
    private getJobAccuracyBonus(job: Job): number {
        const bonuses: { [category: string]: number } = {
            'archer': 10,
            'thief': 5,
            'warrior': 0,
            'mage': -5,
            'healer': -5
        };

        return bonuses[job.category.toLowerCase()] || 0;
    }

    /**
     * 職業によるクリティカル率ボーナスを取得
     */
    private getJobCriticalBonus(job: Job): number {
        const bonuses: { [category: string]: number } = {
            'thief': 15,
            'archer': 10,
            'warrior': 5,
            'mage': 0,
            'healer': 0
        };

        return bonuses[job.category.toLowerCase()] || 0;
    }

    /**
     * 職業による回避率ボーナスを取得
     */
    private getJobEvasionBonus(job: Job): number {
        const bonuses: { [category: string]: number } = {
            'thief': 15,
            'archer': 5,
            'mage': 5,
            'warrior': 0,
            'healer': 0
        };

        return bonuses[job.category.toLowerCase()] || 0;
    }

    /**
     * 職業による経験値ボーナスを取得
     */
    private getJobExperienceBonus(job: Job): number {
        // ランクが高いほど経験値ボーナスが増加
        return job.rank * 2;
    }

    /**
     * 職業による防御ボーナスを取得
     */
    private getJobDefenseBonus(job: Job): number {
        const bonuses: { [category: string]: number } = {
            'warrior': 10,
            'healer': 5,
            'mage': 0,
            'archer': 0,
            'thief': 0
        };

        return bonuses[job.category.toLowerCase()] || 0;
    }

    /**
     * 特殊能力効果を適用
     */
    private applySpecialAbilityEffect(battleResult: BattleResult, trait: JobTrait): void {
        // 特殊能力の種類に応じて効果を適用
        switch (trait.name.toLowerCase()) {
            case 'vampire':
                // 吸血効果：与えたダメージの一部を回復
                const healAmount = Math.floor(battleResult.finalDamage * 0.2);
                battleResult.attacker.currentHP = Math.min(
                    battleResult.attacker.stats.maxHP,
                    battleResult.attacker.currentHP + healAmount
                );
                break;

            case 'berserker':
                // バーサーカー効果：HPが低いほどダメージ増加
                const hpRatio = battleResult.attacker.currentHP / battleResult.attacker.stats.maxHP;
                if (hpRatio < 0.5) {
                    const damageBonus = Math.floor(battleResult.finalDamage * 0.3);
                    battleResult.finalDamage += damageBonus;
                }
                break;

            case 'counter':
                // カウンター効果：反撃ダメージ
                if (battleResult.finalDamage > 0) {
                    const counterDamage = Math.floor(battleResult.finalDamage * 0.1);
                    battleResult.attacker.currentHP = Math.max(
                        0,
                        battleResult.attacker.currentHP - counterDamage
                    );
                }
                break;
        }
    }

    /**
     * シーンを設定
     */
    public setScene(scene: Phaser.Scene): void {
        this.scene = scene;
    }

    /**
     * リソースを破棄
     */
    public destroy(): void {
        this.removeAllListeners();
        this.scene = undefined;
    }
}