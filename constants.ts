
import { ItemRarity, EquipmentSlot, GameSet, PetBreed } from './types';

export const LEVEL_CAP = 100;
export const MAX_INVENTORY = 120;
export const PET_EGG_ID = 'item_pet_egg';

// White -> Yellow -> Green -> Blue -> Purple -> Gold -> Orange -> Red
export const RARITY_COLORS: Record<ItemRarity, string> = {
  [ItemRarity.COMMON]: 'text-slate-300', // White
  [ItemRarity.MAGIC]: 'text-yellow-300 drop-shadow-[0_0_2px_rgba(253,224,71,0.5)]', // Yellow
  [ItemRarity.RARE]: 'text-green-400 drop-shadow-[0_0_2px_rgba(74,222,128,0.5)]', // Green
  [ItemRarity.UNCOMMON]: 'text-blue-400 drop-shadow-[0_0_3px_rgba(96,165,250,0.8)]', // Blue
  [ItemRarity.EPIC]: 'text-purple-400 drop-shadow-[0_0_4px_rgba(192,132,252,0.8)]', // Purple
  [ItemRarity.IMMORTAL]: 'text-yellow-500 drop-shadow-[0_0_5px_rgba(234,179,8,1)]', // Gold
  [ItemRarity.LEGENDARY]: 'text-orange-500 drop-shadow-[0_0_6px_rgba(249,115,22,1)]', // Orange
  [ItemRarity.DIVINE]: 'text-red-600 drop-shadow-[0_0_8px_rgba(220,38,38,1)]', // Red
};

export const RARITY_BG_COLORS: Record<ItemRarity, string> = {
  [ItemRarity.COMMON]: 'bg-slate-800/80 border-slate-600',
  [ItemRarity.MAGIC]: 'bg-yellow-950/40 border-yellow-500/50',
  [ItemRarity.RARE]: 'bg-green-950/40 border-green-500/50',
  [ItemRarity.UNCOMMON]: 'bg-blue-950/40 border-blue-500/50',
  [ItemRarity.EPIC]: 'bg-purple-950/40 border-purple-500/50',
  [ItemRarity.IMMORTAL]: 'bg-yellow-900/60 border-yellow-400',
  [ItemRarity.LEGENDARY]: 'bg-orange-950/60 border-orange-500',
  [ItemRarity.DIVINE]: 'bg-red-950/80 border-red-600 animate-pulse',
};

export const BASE_ITEM_NAMES: Record<EquipmentSlot, string[]> = {
  [EquipmentSlot.WEAPON]: ['长剑', '战斧', '匕首', '重锤', '镰刀', '太刀', '魔杖', '长枪', '巨剑'],
  [EquipmentSlot.HELMET]: ['战盔', '面甲', '头冠', '兜帽', '额饰', '角盔'],
  [EquipmentSlot.CHEST]: ['板甲', '法袍', '锁甲', '胸铠', '战衣', '灵甲'],
  [EquipmentSlot.LEGS]: ['护腿', '战裙', '长裤', '腿甲', '法裤'],
  [EquipmentSlot.GLOVES]: ['护手', '拳套', '手套', '臂铠', '灵腕'],
  [EquipmentSlot.BOOTS]: ['战靴', '胫甲', '长靴', '履', '踏云靴'],
  [EquipmentSlot.NECKLACE]: ['项链', '挂坠', '颈饰', '璎珞'],
  [EquipmentSlot.RING1]: ['指环', '戒指', '指套', '扳指'],
  [EquipmentSlot.RING2]: ['指环', '戒指', '指套', '扳指'],
  [EquipmentSlot.AMULET]: ['护身符', '宝珠', '印章', '魂石', '令箭'],
};

export const ADJECTIVES = ['黑暗', '远古', '诅咒', '鲜血', '幽灵', '深渊', '冰霜', '烈焰', '虚空', '神圣', '破碎', '梦魇', '龙骨', '星辰', '混沌', '永恒'];

export const EXP_TABLE = (level: number) => Math.floor(100 * Math.pow(level, 2.2));

export const GAME_SETS: GameSet[] = [
  {
    id: 'set_archangel',
    name: '大天使的荣光',
    bonuses: [
      { count: 2, description: '攻击力 +15%', stats: [{ type: '增伤', value: 15 }] },
      { count: 4, description: '暴击率 +20%', stats: [{ type: '暴击率', value: 20 }] },
      { count: 6, description: '神圣伤害：暴击伤害 +100%', stats: [{ type: '暴击伤害', value: 100 }] }
    ]
  },
  {
    id: 'set_demon',
    name: '恶魔的低语',
    bonuses: [
      { count: 2, description: '吸血 +5%', stats: [{ type: '吸血', value: 5 }] },
      { count: 4, description: '攻击速度 +20%', stats: [{ type: '攻击速度', value: 20 }] },
      { count: 6, description: '地狱狂暴：伤害加成 +50%', stats: [{ type: '增伤', value: 50 }] }
    ]
  },
  {
    id: 'set_guardian',
    name: '泰坦守护者',
    bonuses: [
      { count: 2, description: '生命上限 +20%', stats: [{ type: '生命值', value: 20, isPercentage: true }] }, 
      { count: 4, description: '伤害减免 +15%', stats: [{ type: '减伤', value: 15 }] },
      { count: 6, description: '不动如山：护甲 +50%', stats: [{ type: '护甲', value: 50, isPercentage: true }] }
    ]
  },
  {
    id: 'set_assassin',
    name: '幻影刺客',
    bonuses: [
      { count: 2, description: '闪避率 +10%', stats: [{ type: '闪避率', value: 10 }] },
      { count: 4, description: '护甲穿透 +50', stats: [{ type: '减防', value: 50 }] },
      { count: 6, description: '致命一击：暴击率 +30%', stats: [{ type: '暴击率', value: 30 }] }
    ]
  },
  {
    id: 'set_sage',
    name: '贤者的真理',
    bonuses: [
      { count: 2, description: '生命恢复 +50', stats: [{ type: '生命恢复', value: 50 }] },
      { count: 4, description: '全属性抗性(减伤) +10%', stats: [{ type: '减伤', value: 10 }] },
      { count: 6, description: '元素过载：攻击力 +40%', stats: [{ type: '攻击力', value: 40, isPercentage: true }] }
    ]
  }
];

export const ENCHANT_CONFIG = {
  MAX_LEVEL: 10,
  SUCCESS_RATES: [1.0, 0.90, 0.80, 0.70, 0.60, 0.50, 0.40, 0.30, 0.20, 0.10],
  STAT_MULTIPLIERS: [1.0, 1.1, 1.25, 1.45, 1.70, 2.0, 2.4, 2.9, 3.5, 4.5, 6.0],
  COST_PER_ATTEMPT: 1,
};

export const PET_BREEDS: PetBreed[] = [
  {
    id: 'breed_turtle',
    name: '大海龟',
    avatarStyle: 'thumbs', // Placeholder, we use seed prefix
    desc: '防御资质优秀的入门宠物。',
    minQualities: { atk: 900, def: 1300, hp: 3500, spd: 800, grow: 1.05 },
    maxQualities: { atk: 1100, def: 1550, hp: 4500, spd: 1000, grow: 1.15 }
  },
  {
    id: 'breed_wolf',
    name: '幽灵狼',
    avatarStyle: 'avataaars', 
    desc: '攻击与速度并存的猎手。',
    minQualities: { atk: 1300, def: 900, hp: 3000, spd: 1300, grow: 1.10 },
    maxQualities: { atk: 1500, def: 1100, hp: 3800, spd: 1500, grow: 1.20 }
  },
  {
    id: 'breed_vampire',
    name: '吸血鬼',
    avatarStyle: 'bottts', 
    desc: '拥有极高攻击资质的强力宠物。',
    minQualities: { atk: 1400, def: 1000, hp: 3200, spd: 1200, grow: 1.15 },
    maxQualities: { atk: 1600, def: 1200, hp: 4000, spd: 1400, grow: 1.25 }
  },
  {
    id: 'breed_angel',
    name: '灵鹤',
    avatarStyle: 'croodles', 
    desc: '法力高深，速度极快。',
    minQualities: { atk: 1100, def: 1100, hp: 3200, spd: 1400, grow: 1.18 },
    maxQualities: { atk: 1300, def: 1300, hp: 4200, spd: 1600, grow: 1.26 }
  },
  {
    id: 'breed_golem',
    name: '熔岩巨兽',
    avatarStyle: 'shapes', 
    desc: '拥有令人绝望的体力和防御。',
    minQualities: { atk: 1000, def: 1500, hp: 5000, spd: 800, grow: 1.12 },
    maxQualities: { atk: 1200, def: 1700, hp: 6500, spd: 900, grow: 1.22 }
  },
  {
    id: 'breed_dragon',
    name: '超级神龙',
    avatarStyle: 'lorelei', 
    desc: '传说中的神兽，各项资质完美。',
    minQualities: { atk: 1500, def: 1400, hp: 5000, spd: 1400, grow: 1.25 },
    maxQualities: { atk: 1700, def: 1600, hp: 6000, spd: 1600, grow: 1.30 }
  }
];
