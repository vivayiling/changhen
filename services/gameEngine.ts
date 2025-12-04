
import { 
  Player, 
  Hero,
  DerivedStats, 
  Item, 
  ItemRarity, 
  EquipmentSlot, 
  ItemStat,
  Enemy
} from '../types';
import { BASE_ITEM_NAMES, ADJECTIVES, GAME_SETS, ENCHANT_CONFIG } from '../constants';

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// --- Stats Calculation (Now takes Hero instead of Player) ---
export const calculateDerivedStats = (hero: Hero): DerivedStats => {
  let stats: DerivedStats = {
    attack: 0,
    armor: 0,
    hp: 100, 
    maxHp: 100,
    critRate: 5,
    critDmg: 0, 
    dodge: 0,
    hpRegen: 0,
    speed: 1,
    lifesteal: 0,
    armorPen: 0,
    dmgRed: 0,
    dmgInc: 0,
    atkSpeed: 0,
  };

  // 1. Base Stats
  stats.attack += hero.baseStats.str * 3;
  stats.critDmg += hero.baseStats.str * 0.5;

  stats.critRate += hero.baseStats.dex * 0.2;
  stats.dodge += hero.baseStats.dex * 0.1;
  stats.atkSpeed += hero.baseStats.dex * 0.05;

  stats.attack += hero.baseStats.int * 2;
  stats.dmgInc += hero.baseStats.int * 0.2; 

  stats.maxHp += hero.baseStats.vit * 20;
  stats.hpRegen += hero.baseStats.vit * 1.0;
  stats.dmgRed += hero.baseStats.vit * 0.05;

  stats.hpRegen += hero.baseStats.spi * 1.5;
  stats.armor += hero.baseStats.spi * 1;
  stats.armorPen += hero.baseStats.spi * 0.2;

  // 2. Equipment Stats
  const setCounts: Record<string, number> = {};

  Object.values(hero.equipment).forEach((item) => {
    if (!item) return;
    
    // Calculate Enchant Multiplier
    const enchantMult = ENCHANT_CONFIG.STAT_MULTIPLIERS[Math.min(item.enchantLevel, ENCHANT_CONFIG.MAX_LEVEL)] || 1.0;

    // Count Set Items
    if (item.isSet && item.setId) {
      setCounts[item.setId] = (setCounts[item.setId] || 0) + 1;
    }

    // Implicit Stats
    if (item.type === EquipmentSlot.WEAPON) {
        stats.attack += Math.floor((item.baseStat || 0) * enchantMult);
    }
    else if ([EquipmentSlot.CHEST, EquipmentSlot.HELMET, EquipmentSlot.LEGS, EquipmentSlot.BOOTS, EquipmentSlot.GLOVES].includes(item.type)) {
      stats.armor += Math.floor((item.baseStat || 0) * enchantMult);
    }

    // Affixes
    item.stats.forEach(stat => {
        let val = stat.value;
        if (!stat.isPercentage) {
            val = Math.floor(val * enchantMult);
        } else {
             val = Number((val * enchantMult).toFixed(1));
        }
        applyStat(stats, { ...stat, value: val });
    });
  });

  // 3. Set Bonuses
  Object.entries(setCounts).forEach(([setId, count]) => {
    const gameSet = GAME_SETS.find(s => s.id === setId);
    if (gameSet) {
      gameSet.bonuses.forEach(bonus => {
        if (count >= bonus.count) {
          bonus.stats.forEach(stat => applyStat(stats, stat));
        }
      });
    }
  });

  // Strength/Int Multipliers (Final)
  stats.attack = Math.floor(stats.attack * (1 + hero.baseStats.str / 100));
  stats.attack = Math.floor(stats.attack * (1 + stats.dmgInc / 100));

  // Caps
  stats.critRate = Math.min(stats.critRate, 80);
  stats.dodge = Math.min(stats.dodge, 75);
  stats.dmgRed = Math.min(stats.dmgRed, 80); 

  stats.hp = stats.maxHp; 
  
  return stats;
};

const applyStat = (stats: DerivedStats, stat: ItemStat) => {
  switch (stat.type) {
    case '攻击力': 
      if (stat.isPercentage) stats.attack = Math.floor(stats.attack * (1 + stat.value / 100)); 
      else stats.attack += stat.value; 
      break;
    case '护甲': 
      if (stat.isPercentage) stats.armor = Math.floor(stats.armor * (1 + stat.value / 100));
      else stats.armor += stat.value; 
      break;
    case '生命值': 
      if (stat.isPercentage) stats.maxHp = Math.floor(stats.maxHp * (1 + stat.value / 100));
      else stats.maxHp += stat.value; 
      break;
    case '暴击率': stats.critRate += stat.value; break;
    case '暴击伤害': stats.critDmg += stat.value; break;
    case '闪避率': stats.dodge += stat.value; break;
    case '生命恢复': stats.hpRegen += stat.value; break;
    case '吸血': stats.lifesteal += stat.value; break;
    case '减防': stats.armorPen += stat.value; break;
    case '减伤': stats.dmgRed += stat.value; break;
    case '增伤': stats.dmgInc += stat.value; break;
    case '攻击速度': stats.atkSpeed += stat.value; break;
  }
};

// --- Combat Logic ---
export const calculateDamage = (
  attackerAtk: number, 
  attackerCrit: number, 
  attackerCritDmg: number, 
  attackerPen: number,
  defenderArmor: number, 
  defenderLevel: number,
  defenderDmgRed: number = 0
) => {
  const effectiveArmor = Math.max(0, defenderArmor - attackerPen);
  const armorReduction = effectiveArmor / (effectiveArmor + defenderLevel * 15);
  
  let isCrit = Math.random() * 100 < attackerCrit;
  let rawDamage = attackerAtk;

  if (isCrit) {
    rawDamage = rawDamage * (1.5 + (attackerCritDmg / 100));
  }

  let damage = rawDamage * (1 - armorReduction);
  damage = damage * (1 - defenderDmgRed / 100);

  return { damage: Math.max(1, Math.floor(damage)), isCrit };
};

// --- Item Generation ---
export const generateItem = (level: number): Item => {
  const slots = Object.values(EquipmentSlot);
  const slot = randomItem(slots);
  
  const roll = Math.random();
  let rarity = ItemRarity.COMMON;
  let affixCount = 0;
  let maxEnchant = 0;
  
  if (roll < 0.005) { rarity = ItemRarity.DIVINE; affixCount = randomInt(8, 9); maxEnchant = randomInt(8, 12); } 
  else if (roll < 0.015) { rarity = ItemRarity.LEGENDARY; affixCount = randomInt(7, 8); maxEnchant = randomInt(6, 10); } 
  else if (roll < 0.04) { rarity = ItemRarity.IMMORTAL; affixCount = randomInt(6, 7); maxEnchant = randomInt(5, 8); } 
  else if (roll < 0.10) { rarity = ItemRarity.EPIC; affixCount = randomInt(5, 6); maxEnchant = randomInt(4, 7); } 
  else if (roll < 0.25) { rarity = ItemRarity.UNCOMMON; affixCount = randomInt(4, 5); maxEnchant = randomInt(3, 5); } 
  else if (roll < 0.50) { rarity = ItemRarity.RARE; affixCount = randomInt(3, 5); maxEnchant = randomInt(2, 4); } 
  else if (roll < 0.80) { rarity = ItemRarity.MAGIC; affixCount = randomInt(2, 3); maxEnchant = randomInt(1, 3); } 
  else { rarity = ItemRarity.COMMON; affixCount = randomInt(1, 2); maxEnchant = randomInt(0, 2); } 
  
  const canBeSet = [ItemRarity.UNCOMMON, ItemRarity.EPIC, ItemRarity.IMMORTAL, ItemRarity.LEGENDARY, ItemRarity.DIVINE].includes(rarity);
  const isSet = canBeSet && Math.random() < 0.3; 

  let setId: string | undefined;
  let setNamePrefix = '';

  if (isSet) {
    const targetSet = randomItem(GAME_SETS);
    setId = targetSet.id;
    setNamePrefix = targetSet.name.split('的')[0] + '的'; 
  }

  let baseStat = 0;
  if (slot === EquipmentSlot.WEAPON) baseStat = level * 5 + randomInt(5, 15);
  else if (![EquipmentSlot.NECKLACE, EquipmentSlot.RING1, EquipmentSlot.RING2, EquipmentSlot.AMULET].includes(slot)) {
    baseStat = level * 3 + randomInt(2, 8); 
  }

  const potentialStats = [
    '攻击力', '护甲', '生命值', '暴击率', '暴击伤害', 
    '生命恢复', '吸血', '减防', '攻击速度', '减伤', '增伤'
  ];
  const itemStats: ItemStat[] = [];
  
  for (let i = 0; i < affixCount; i++) {
    const type = randomItem(potentialStats);
    let val = 0;
    const mult = 1 + (level / 50); 

    switch(type) {
      case '攻击力': val = randomInt(2, 10) * mult; break;
      case '护甲': val = randomInt(2, 10) * mult; break;
      case '生命值': val = randomInt(20, 100) * mult; break;
      case '暴击率': val = randomInt(1, 3); break; 
      case '暴击伤害': val = randomInt(5, 15); break;
      case '生命恢复': val = randomInt(1, 5) * mult; break;
      case '吸血': val = randomInt(1, 3); break;
      case '减防': val = randomInt(2, 10) * mult; break;
      case '攻击速度': val = randomInt(1, 5); break;
      case '减伤': val = randomInt(1, 3); break;
      case '增伤': val = randomInt(1, 5); break;
    }
    
    if (rarity === ItemRarity.LEGENDARY || rarity === ItemRarity.IMMORTAL) val = Math.floor(val * 1.5);
    if (rarity === ItemRarity.DIVINE) val = Math.floor(val * 2.0);

    itemStats.push({ type, value: Math.max(1, Math.floor(val)) });
  }

  const baseName = randomItem(BASE_ITEM_NAMES[slot] || ['未知物品']);
  let name = '';
  
  if (isSet) {
    name = `${setNamePrefix}${baseName}`;
  } else {
    const adj = randomItem(ADJECTIVES);
    name = `${adj}的${baseName}`;
  }

  return {
    id: Math.random().toString(36).substr(2, 9),
    name,
    type: slot,
    rarity,
    level,
    stats: itemStats,
    baseStat,
    value: level * (affixCount + 1) * 20,
    isSet,
    setId,
    enchantLevel: 0,
    maxEnchantSlots: maxEnchant,
    usedEnchantSlots: 0
  };
};

// --- Enemy Generation ---
export const generateEnemies = (level: number, partySize: number, forceBoss: boolean = false): Enemy[] => {
  // Determine enemy count: At least 1, max 5.
  // Generally match party size +/- 1, capped at 5.
  let enemyCount = Math.max(1, Math.min(5, partySize + randomInt(-1, 1)));
  if (forceBoss) enemyCount = 1; // Boss usually fights alone or with minimal minions (Let's make Boss alone for now for impact)

  const enemies: Enemy[] = [];
  
  const minionNames = ['暗影爬行者', '深渊骷髅', '虚空行者', '被诅咒的卫兵', '黑暗魔狼', '幽灵射手', '腐烂僵尸', '血色蝙蝠'];
  const bossNames = ['深渊领主', '虚空主宰', '堕落骑士王', '黑暗吞噬者', '鲜血女王', '骸骨巨龙'];

  for (let i = 0; i < enemyCount; i++) {
    const isBoss = forceBoss && i === 0; // Only the first one is Boss if forced
    const scale = isBoss ? 5.0 : 1.0; 
    
    const baseName = isBoss ? randomItem(bossNames) : randomItem(minionNames);
    
    // Add letters A, B, C if duplicates names exist (simplified: just random seed handles visuals)
    enemies.push({
      id: Math.random().toString(36).substr(2, 9),
      name: baseName,
      level: level,
      maxHp: Math.floor((150 + level * 30) * scale),
      currentHp: Math.floor((150 + level * 30) * scale),
      attack: Math.floor((15 + level * 4) * scale),
      armor: Math.floor(level * 3),
      expReward: Math.floor((30 + level * 8) * (isBoss ? 10 : 1)), 
      goldReward: Math.floor((15 + level * 3) * (isBoss ? 10 : 1)), 
      isBoss,
      avatarSeed: `${baseName}-${randomInt(1, 9999)}`
    });
  }

  return enemies;
};
