# Item Icons

This directory contains icon images for the inventory system.

## Directory Structure

```
assets/items/
├── weapons/          # Weapon icons
├── armor/            # Armor icons
├── accessories/      # Accessory icons
├── consumables/      # Consumable item icons
├── materials/        # Material icons
├── keys/             # Key item icons
└── default.png       # Default placeholder icon
```

## Icon Specifications

- **Format**: PNG with transparency
- **Size**: 64x64 pixels (recommended)
- **Color Depth**: 32-bit RGBA
- **Naming**: Use lowercase with underscores (e.g., `iron_sword.png`)

## Placeholder Icons

Currently, all items use placeholder icons. Replace these with actual artwork:

### Weapons
- `iron_sword.png`
- `flame_blade.png`
- `hunters_bow.png`
- `healing_staff.png`
- `steel_spear.png`
- `legendary_sword.png`

### Armor
- `leather_armor.png`
- `chain_mail.png`
- `plate_armor.png`
- `fire_cloak.png`
- `dragon_scale.png`

### Accessories
- `power_ring.png`
- `shield_amulet.png`
- `speed_boots.png`
- `hp_pendant.png`
- `lucky_charm.png`

### Consumables
- `health_potion.png`
- `mana_potion.png`
- `elixir.png`
- `strength_tonic.png`
- `defense_tonic.png`
- `speed_tonic.png`
- `antidote.png`
- `revive_herb.png`
- `group_heal.png`
- `bomb.png`

### Materials
- `iron_ore.png`
- `leather.png`
- `magic_crystal.png`
- `dragon_scale.png`

### Key Items
- `old_key.png`
- `rose_fragment.png`

## Creating Icons

When creating actual icons:

1. Use consistent art style across all items
2. Ensure icons are recognizable at small sizes
3. Use appropriate colors for rarity levels:
   - Common: White/Gray
   - Uncommon: Green
   - Rare: Blue
   - Epic: Purple
   - Legendary: Orange/Gold

4. Add subtle glow or border effects for higher rarities
5. Keep backgrounds transparent
6. Optimize file sizes for web delivery

## Temporary Placeholders

Until actual artwork is created, the system will use:
- `default.png` - A generic item icon placeholder
- Colored squares representing rarity levels

## Asset Pipeline

1. Create icons in your preferred graphics software
2. Export as PNG with transparency
3. Place in appropriate subdirectory
4. Update `data/items.json` if icon paths change
5. Test in-game to ensure proper display
