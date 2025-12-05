
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
  type: EquipmentSlot | 'consumable';
  rarity: ItemRarity;
  level: number;
  stats: ItemStat[];
  baseStat?: number;
  value: number;
  isSet?: boolean; 
  setId?: string; 
  isLocked?: boolean; 
  
  // Enchantment
  enchantLevel: number;
  maxEnchantSlots: number;
  usedEnchantSlots: number;
  
  // Consumable
  consumableType?: 'pet_egg';
}

export interface PlayerStats {
  str: number;
  dex: number;
  int: number;
  vit: number;
  spi: number;
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
  armorPen: number; 
  dmgRed: number; // %
  dmgInc: number; // %
  atkSpeed: number; // % bonus
}

export type AutoSellSettings = Partial<Record<ItemRarity, boolean>>;

// --- PET SYSTEM ---

export interface PetQualities {
  atk: number; // 1000 - 1600
  def: number; // 1000 - 1600
  hp: number;  // 3000 - 6000
  spd: number; // 1000 - 1600
  grow: number; // 1.0 - 1.3
}

export interface PetBreed {
  id: string;
  name: string;
  avatarStyle: string; 
  minQualities: Partial<PetQualities>;
  maxQualities: Partial<PetQualities>;
  desc: string;
}

export interface Pet {
  id: string;
  breedId: string;
  name: string;
  level: number;
  exp: number;
  qualities: PetQualities;
  baseStats: PlayerStats; // Allocatable points
  freePoints: number;     // Points to allocate
  skills: string[];
  avatarSeed: string;
  isLocked?: boolean;
}

// --- PARTY SYSTEM TYPES ---

export interface Hero {
  id: string;
  name: string;
  avatarSeed: string;
  level: number;
  baseStats: PlayerStats & { freePoints: number };
  equipment: Partial<Record<EquipmentSlot, Item>>;
  isLeader: boolean;
  activePetId?: string; // Equipped Pet
}

export interface Player {
  // Global resources
  gold: number;
  enchantStones: number;
  currentExp: number; 
  maxExp: number;
  level: number; 
  
  heroes: Hero[]; 
  pets: Pet[]; 
  
  inventory: Item[];
  maxInventorySize: number;
  autoSellSettings: AutoSellSettings;
}

export interface Enemy {
  id: string; 
  name: string;
  level: number;
  maxHp: number;
  currentHp: number; 
  attack: number;
  armor: number;
  expReward: number;
  goldReward: number;
  isBoss: boolean;
  avatarSeed: string;
  petAvatarSeed?: string;
}

// Runtime Combat Object (ATB System)
export interface CombatUnit {
  id: string;
  isAlly: boolean;
  name: string;
  level: number;
  currentHp: number;
  maxHp: number;
  stats: DerivedStats; 
  isBoss?: boolean;
  avatarSeed: string;
  
  // ATB System
  actionGauge: number; // 0 to 100+
  maxActionGauge: number; // Usually 100

  // Pet Visual (Only for Hero units that have pets attached visually, though pets fight separately now)
  petAvatarSeed?: string; 
  
  // Visual state
  animState?: string;
  
  // Flag to identify if this unit IS a pet
  isPet?: boolean;
  ownerId?: string;
}

export interface GameLog {
  id: string;
  message: string;
  type: 'combat' | 'loot' | 'system';
  timestamp: number;
}
