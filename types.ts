
export enum StatType {
  STR = '力量',
  DEX = '敏捷',
  INT = '智力',
  VIT = '耐力',
  SPI = '精神'
}

export enum ItemRarity {
  COMMON = '普通',   // White
  MAGIC = '魔法',    // Yellow
  RARE = '稀有',     // Green
  UNCOMMON = '罕见', // Blue
  EPIC = '史诗',     // Purple
  IMMORTAL = '不朽', // Gold
  LEGENDARY = '传说',// Orange
  DIVINE = '神圣'    // Red
}

export enum EquipmentSlot {
  WEAPON = '武器',
  HELMET = '头盔',
  CHEST = '胸甲',
  LEGS = '护腿',
  GLOVES = '手套',
  BOOTS = '靴子',
  NECKLACE = '项链',
  RING1 = '戒指一',
  RING2 = '戒指二',
  AMULET = '护符'
}

export interface ItemStat {
  type: string;
  value: number;
  isPercentage?: boolean;
}

export interface SetBonus {
  count: number;
  description: string;
  stats: ItemStat[];
}

export interface GameSet {
  id: string;
  name: string;
  bonuses: SetBonus[];
}

export interface Item {
  id: string;
  name: string;
  type: EquipmentSlot;
  rarity: ItemRarity;
  level: number;
  stats: ItemStat[];
  baseStat?: number;
  value: number;
  isSet?: boolean; 
  setId?: string; 
  isLocked?: boolean; 
  
  // Enchantment (Qi Ling)
  enchantLevel: number;
  maxEnchantSlots: number;
  usedEnchantSlots: number;
}

export interface PlayerStats {
  str: number;
  dex: number;
  int: number;
  vit: number;
  spi: number;
  freePoints: number;
}

export interface DerivedStats {
  attack: number;
  armor: number;
  hp: number;
  maxHp: number;
  critRate: number;
  critDmg: number;
  dodge: number;
  hpRegen: number;
  speed: number;
  // New Stats
  lifesteal: number; // %
  armorPen: number; // Flat or %
  dmgRed: number; // %
  dmgInc: number; // %
  atkSpeed: number; // % bonus
}

export type AutoSellSettings = Partial<Record<ItemRarity, boolean>>;

export interface Player {
  level: number;
  currentExp: number;
  maxExp: number;
  gold: number;
  enchantStones: number; // Currency for enchanting
  baseStats: PlayerStats;
  equipment: Partial<Record<EquipmentSlot, Item>>;
  inventory: Item[];
  maxInventorySize: number;
  autoSellSettings: AutoSellSettings;
}

export interface Enemy {
  name: string;
  level: number;
  currentHp: number;
  maxHp: number;
  attack: number;
  armor: number;
  expReward: number;
  goldReward: number;
  isBoss: boolean;
}

export interface GameLog {
  id: string;
  message: string;
  type: 'combat' | 'loot' | 'system';
  timestamp: number;
}
