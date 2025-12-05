import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sword, Shield, Brain, Heart, Zap, Play, Pause, Backpack, TrendingUp, RefreshCcw, User, Gem, Sparkles, Map, ChevronUp, ArrowLeft, Info, Activity, Skull, ShieldCheck, X, Footprints, Crown, Shirt, Hand, Settings, Lock, Trash2, CheckSquare, Square, Axe, Hammer, Wand, Crosshair, Columns, ScrollText, Save, RotateCcw, Clock, Users, Egg, Dog, Bird, PlusCircle, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { Player, Enemy, GameLog, Item, EquipmentSlot, PlayerStats, ItemRarity, CombatUnit, Hero, DerivedStats, Pet, PetBreed } from './types';
import { EXP_TABLE, MAX_INVENTORY, RARITY_COLORS, LEVEL_CAP, RARITY_BG_COLORS, ENCHANT_CONFIG, PET_BREEDS } from './constants';
import { calculateDerivedStats, calculateDamage, generateEnemies, generateItem, generatePet, calculatePetCombatStats } from './services/gameEngine';
import { ItemTooltip } from './components/Tooltip';

// --- Helper Components ---
const StatRow = ({ label, value, icon: Icon, color, canUpgrade, onUpgrade, isAnimating }: any) => (
  <div className={`flex items-center justify-between py-2 border-b border-white/5 last:border-0 hover:bg-white/5 px-2 rounded transition-colors group relative overflow-hidden ${isAnimating ? 'bg-yellow-500/10' : ''}`}>
    <div className="flex items-center gap-3">
      <div className={`p-1.5 rounded-lg bg-slate-900 shadow-inner ${color}`}>
        {Icon && <Icon size={16} />}
      </div>
      <span className="text-slate-300 text-sm font-bold">{label}</span>
    </div>
    <div className="flex items-center gap-3">
      <span className={`font-mono font-bold text-slate-100 text-base transition-all duration-300 origin-right ${isAnimating ? 'animate-stat-pop' : ''}`}>
        {value}
      </span>
      {canUpgrade && (
        <button 
          onClick={onUpgrade}
          className="bg-yellow-500 hover:bg-yellow-400 text-yellow-950 text-xs w-6 h-6 flex items-center justify-center rounded-full font-bold shadow-lg shadow-yellow-500/20 active:scale-90 transition-transform"
        >
          +
        </button>
      )}
    </div>
  </div>
);

const DetailRow = ({ label, value, sub, icon: Icon, colorClass = "text-slate-300" }: any) => (
  <div className="flex justify-between items-center py-1.5">
    <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
       {Icon && <Icon size={12} className={colorClass} />}
       <span>{label}</span>
    </div>
    <div className="flex items-center gap-1.5">
       {sub && <span className="text-[10px] text-slate-600">{sub}</span>}
       <span className="text-slate-200 font-mono text-sm font-bold">{value}</span>
    </div>
  </div>
);

const ProgressBar = ({ current, max, colorClass, label, height = "h-3", showText = true }: { current: number, max: number, colorClass: string, label?: string, height?: string, showText?: boolean }) => {
  const percent = Math.min(100, Math.max(0, (current / max) * 100));
  return (
    <div className={`relative w-full ${height} bg-black/60 rounded-full overflow-hidden border border-white/10 shadow-inner`}>
      <div 
        className={`h-full transition-all duration-300 ease-out ${colorClass} shadow-[0_0_10px_currentColor]`} 
        style={{ width: `${percent}%` }}
      />
      {showText && (
        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white shadow-black drop-shadow-md z-10 tracking-wider">
          {label || `${Math.floor(current)} / ${Math.floor(max)}`}
        </div>
      )}
    </div>
  );
};

// --- Storage Helper ---
const STORAGE_KEYS = {
  PLAYER: 'changhen_player',
  LEVEL: 'changhen_currentLevel',
  HIGH_LEVEL: 'changhen_highestLevel',
  KILL_COUNT: 'changhen_killCount',
  LAST_SAVE: 'changhen_lastSaveTime'
};

const loadState = <T,>(key: string, fallback: T): T => {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error(`Failed to load ${key}`, e);
  }
  return fallback;
};

// --- Resource Bar Component ---
const TopResourceBar = ({ player, isLevelingUp }: { player: Player, isLevelingUp: boolean }) => (
    <div className="flex justify-between items-center p-4 bg-slate-950/80 backdrop-blur border-b border-white/10 sticky top-0 z-20">
        <div className="flex items-center gap-3">
             <div className={`flex flex-col items-center bg-purple-500/10 border border-purple-500/20 px-2 py-1 rounded text-xs font-bold font-mono transition-all duration-500 ${isLevelingUp ? 'text-yellow-400 border-yellow-500' : 'text-purple-400'}`}>
                 <span className="text-[9px] uppercase opacity-70">Level</span>
                 <span>{player.level}</span>
             </div>
             <div className="flex flex-col gap-1">
                 <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded text-xs font-bold font-mono flex items-center gap-1 w-fit">
                    <Gem size={10} /> {player.gold}
                 </span>
                 <span className="bg-pink-500/10 text-pink-300 border border-pink-500/20 px-2 py-0.5 rounded text-xs font-bold font-mono flex items-center gap-1 w-fit">
                    <Sparkles size={10} /> {player.enchantStones}
                 </span>
             </div>
        </div>
        <div className="w-24">
            <ProgressBar current={player.currentExp} max={player.maxExp} colorClass="bg-purple-500" height="h-1.5" showText={false} />
            <div className="text-[9px] text-right text-slate-500 mt-1">EXP {((player.currentExp / player.maxExp) * 100).toFixed(1)}%</div>
        </div>
    </div>
);

// --- Types for Visuals ---
interface FloatingText {
  id: string;
  value: string;
  x: number;
  y: number;
  color: string;
  scale?: boolean;
}

// --- Helpers Moved Outside App ---
const getItemIcon = (item: Item | null, slot?: EquipmentSlot) => {
  if (item?.consumableType === 'pet_egg') return Egg;
  if (!item) {
      if (slot === EquipmentSlot.WEAPON) return Sword;
      if (slot === EquipmentSlot.HELMET) return Crown;
      if (slot === EquipmentSlot.CHEST) return Shirt;
      if (slot === EquipmentSlot.LEGS) return Columns;
      if (slot === EquipmentSlot.GLOVES) return Hand;
      if (slot === EquipmentSlot.BOOTS) return Footprints;
      if ([EquipmentSlot.RING1, EquipmentSlot.RING2, EquipmentSlot.NECKLACE, EquipmentSlot.AMULET].includes(slot || '' as any)) return Gem;
      return Shield;
  }
  
  if (item.type === EquipmentSlot.WEAPON) return Sword;
  if (item.type === EquipmentSlot.HELMET) return Crown;
  if (item.type === EquipmentSlot.CHEST) return Shirt;
  if (item.type === EquipmentSlot.LEGS) return Columns; 
  if (item.type === EquipmentSlot.GLOVES) return Hand;
  if (item.type === EquipmentSlot.BOOTS) return Footprints;
  return Gem;
};

// --- RenderCombatUnit Component ---
interface RenderCombatUnitProps {
  unit: CombatUnit;
  index: number;
  isLeft: boolean;
  onSelect: (unit: CombatUnit) => void;
}

const RenderCombatUnit: React.FC<RenderCombatUnitProps> = ({ unit, index, isLeft, onSelect }) => (
    <div className={`relative flex flex-col items-center gap-1 transition-transform duration-200 ${unit.animState}`}>
        {/* Health Bar */}
        <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700 mb-1">
             <div className={`h-full ${isLeft ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${(unit.currentHp / unit.maxHp) * 100}%` }}></div>
        </div>
        
        {/* Avatar */}
        <div 
           onClick={() => !isLeft && onSelect(unit)}
           className={`w-14 h-14 rounded-lg border-2 bg-slate-900/80 shadow-lg relative ${unit.currentHp <= 0 ? 'grayscale opacity-50' : ''} ${isLeft ? 'border-indigo-500' : (unit.isBoss ? 'border-red-500 shadow-red-500/50' : 'border-slate-600')} ${!isLeft ? 'cursor-pointer hover:scale-105' : ''}`}
        >
            <img 
               src={`https://api.dicebear.com/9.x/${unit.isPet ? 'bottts' : (isLeft ? 'adventurer' : 'bottts-neutral')}/svg?seed=${unit.avatarSeed}&backgroundColor=transparent`}
               alt={unit.name}
               className="w-full h-full object-cover transform scale-110 rounded-lg"
            />
            {/* Pet Indicator for Pet Units */}
            {unit.isPet && <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[8px] px-1 rounded-bl">灵兽</div>}
        </div>

        {/* Damage Flash */}
        {unit.animState === 'animate-hit' && (
            <div className="absolute inset-0 bg-red-500/40 rounded-lg animate-ping pointer-events-none"></div>
        )}
        
        <div className="text-[9px] bg-black/60 px-1 rounded text-slate-300 truncate max-w-[60px] text-center">
           Lv.{unit.level} {unit.name}
        </div>
    </div>
);


export default function App() {
  // --- State ---
  const [activeTab, setActiveTab] = useState<'stage' | 'role' | 'pet' | 'bag'>('stage');
  // Removed autoBattle state - combat is always active
  const [invincible, setInvincible] = useState(false); 
  const [isSearching, setIsSearching] = useState(false); 
  const [showEnemyDetail, setShowEnemyDetail] = useState<CombatUnit | null>(null); 
  const [showBagSettings, setShowBagSettings] = useState(false); 
  const [showLogModal, setShowLogModal] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false); // Collapsible Log Panel
  const [petDetail, setPetDetail] = useState<Pet | null>(null); // New Pet Detail Modal
  const [offlineReport, setOfflineReport] = useState<{ gold: number, exp: number, timeSpan: string, levelsGained: number } | null>(null);
  
  // Item Inspection State (Modal)
  const [viewingItem, setViewingItem] = useState<{ item: Item, source: 'bag' | 'equip' } | null>(null);

  // Progression (Persistent)
  const [currentLevel, setCurrentLevel] = useState(() => loadState(STORAGE_KEYS.LEVEL, 1));
  const [highestLevel, setHighestLevel] = useState(() => loadState(STORAGE_KEYS.HIGH_LEVEL, 1));
  const [killCount, setKillCount] = useState(() => loadState(STORAGE_KEYS.KILL_COUNT, 0)); 
  
  // Player State (Persistent)
  const [player, setPlayer] = useState<Player>(() => {
    // Migration Logic
    const saved = localStorage.getItem(STORAGE_KEYS.PLAYER);
    let loadedData: any = {};
    if (saved) {
        try {
            loadedData = JSON.parse(saved);
        } catch(e) {}
    }

    const defaultBaseStats = { str: 5, dex: 5, int: 5, vit: 5, spi: 5, freePoints: 5 };
    const defaultHero: Hero = {
        id: 'hero_main',
        name: '主角',
        avatarSeed: 'Alexander',
        level: 1,
        baseStats: defaultBaseStats,
        equipment: {},
        isLeader: true
    };

    const initialPlayer = {
        gold: 0,
        enchantStones: 0,
        currentExp: 0,
        maxExp: EXP_TABLE(1),
        level: 1,
        heroes: [defaultHero],
        pets: [],
        inventory: [],
        maxInventorySize: MAX_INVENTORY,
        autoSellSettings: {}
    };

    if (loadedData) {
        // Migration: Ensure Pets have baseStats
        if (loadedData.pets && Array.isArray(loadedData.pets)) {
            loadedData.pets = loadedData.pets.map((p: any) => ({
                ...p,
                baseStats: p.baseStats || { str: 0, dex: 0, int: 0, vit: 0, spi: 0 },
                freePoints: p.freePoints ?? 0
            }));
        }

        // Migration: Ensure Heroes valid
        if (loadedData.heroes && Array.isArray(loadedData.heroes)) {
            loadedData.heroes = loadedData.heroes.map((h: any, idx: number) => {
                if (idx === 0) {
                     return {
                         ...h,
                         baseStats: h.baseStats ? { ...defaultBaseStats, ...h.baseStats } : defaultBaseStats,
                         equipment: h.equipment || {}
                     };
                }
                return h;
            });
        }
        return { ...initialPlayer, ...loadedData };
    }

    return initialPlayer;
  });

  // Capture last save time on init
  const lastSaveTimeRef = useRef<string | null>(localStorage.getItem(STORAGE_KEYS.LAST_SAVE));

  // Combat Runtime State (Multi-vs-Multi + ATB)
  const [combatAllies, setCombatAllies] = useState<CombatUnit[]>([]);
  const [combatEnemies, setCombatEnemies] = useState<CombatUnit[]>([]);

  const [logs, setLogs] = useState<GameLog[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  // Removed damageFlash state
  
  // UI FX State
  const [upgradingStat, setUpgradingStat] = useState<string | null>(null);
  const [isLevelingUp, setIsLevelingUp] = useState(false);

  // Refs for loop
  const playerRef = useRef(player);
  const combatAlliesRef = useRef(combatAllies);
  const combatEnemiesRef = useRef(combatEnemies);
  const invincibleRef = useRef(invincible);
  const killCountRef = useRef(killCount);
  const isSearchingRef = useRef(isSearching);
  // Ref for addLog to use in loop
  const addLogRef = useRef<(message: string, type?: 'combat' | 'loot' | 'system') => void>(() => {});

  // Update refs
  useEffect(() => { playerRef.current = player; }, [player]);
  useEffect(() => { combatAlliesRef.current = combatAllies; }, [combatAllies]);
  useEffect(() => { combatEnemiesRef.current = combatEnemies; }, [combatEnemies]);
  useEffect(() => { invincibleRef.current = invincible; }, [invincible]);
  useEffect(() => { killCountRef.current = killCount; }, [killCount]);
  useEffect(() => { isSearchingRef.current = isSearching; }, [isSearching]);

  // --- Persistence Effect ---
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PLAYER, JSON.stringify(player));
    localStorage.setItem(STORAGE_KEYS.LEVEL, JSON.stringify(currentLevel));
    localStorage.setItem(STORAGE_KEYS.HIGH_LEVEL, JSON.stringify(highestLevel));
    localStorage.setItem(STORAGE_KEYS.KILL_COUNT, JSON.stringify(killCount));
    localStorage.setItem(STORAGE_KEYS.LAST_SAVE, Date.now().toString());
  }, [player, currentLevel, highestLevel, killCount]);

  // --- Initialize Combat State ---
  const initCombatUnits = useCallback(() => {
      const allies: CombatUnit[] = [];

      // 1. Add Heroes
      player.heroes.forEach(hero => {
          const safeHero = {
              ...hero,
              baseStats: hero.baseStats || { str: 5, dex: 5, int: 5, vit: 5, spi: 5, freePoints: 0 }
          };
          const stats = calculateDerivedStats(safeHero, player.pets);
          
          allies.push({
              id: hero.id,
              isAlly: true,
              name: hero.name,
              level: hero.level,
              currentHp: stats.maxHp,
              maxHp: stats.maxHp,
              stats: stats,
              avatarSeed: hero.avatarSeed,
              actionGauge: 0,
              maxActionGauge: 100
          });

          // 2. Add Equipped Pet as Independent Unit
          if (hero.activePetId) {
              const pet = player.pets.find(p => p.id === hero.activePetId);
              if (pet) {
                  const petStats = calculatePetCombatStats(pet);
                  allies.push({
                      id: `combat_pet_${pet.id}`,
                      isAlly: true,
                      name: pet.name,
                      level: pet.level,
                      currentHp: petStats.maxHp,
                      maxHp: petStats.maxHp,
                      stats: petStats,
                      avatarSeed: pet.avatarSeed,
                      actionGauge: 0,
                      maxActionGauge: 100,
                      isPet: true,
                      ownerId: hero.id
                  });
              }
          }
      });

      setCombatAllies(allies);
  }, [player.heroes, player.pets]);

  useEffect(() => {
      if (combatAllies.length === 0) {
          initCombatUnits();
      }
  }, [initCombatUnits]);

  // --- Offline Calculation Effect ---
  useEffect(() => {
    const lastSaveStr = lastSaveTimeRef.current;
    if (lastSaveStr) {
      const lastSaveTime = parseInt(lastSaveStr, 10);
      const now = Date.now();
      const diffSeconds = (now - lastSaveTime) / 1000;

      if (diffSeconds > 60) {
         const efficiency = 0.8;
         const secondsPerKill = 6;
         const kills = Math.floor((diffSeconds / secondsPerKill) * efficiency);

         if (kills > 0) {
            setPlayer(prev => {
               const estGoldPerKill = 15 + prev.level * 3;
               const estExpPerKill = 30 + prev.level * 8;

               const totalGold = kills * estGoldPerKill;
               const totalExp = kills * estExpPerKill;

               let nextExp = prev.currentExp + totalExp;
               let nextLvl = prev.level;
               let nextMaxExp = prev.maxExp;
               let newHeroes = [...prev.heroes];
               let levelsGained = 0;

               while (nextExp >= nextMaxExp && nextLvl < LEVEL_CAP) {
                   nextExp -= nextMaxExp;
                   nextLvl++;
                   nextMaxExp = EXP_TABLE(nextLvl);
                   levelsGained++;
                   if (newHeroes[0]) {
                       newHeroes[0] = {
                           ...newHeroes[0],
                           level: nextLvl,
                           baseStats: {
                               ...newHeroes[0].baseStats,
                               freePoints: (newHeroes[0].baseStats?.freePoints || 0) + 5
                           }
                       };
                   }
               }
               // Also level pets simply
               const newPets = prev.pets.map(p => {
                    // Give pets 50% of exp
                    return { ...p, exp: p.exp + Math.floor(totalExp * 0.5) }; 
                    // (Real pet leveling logic would check thresholds too, kept simple for offline)
               });

               let timeSpan = "";
               if (diffSeconds < 3600) timeSpan = `${Math.floor(diffSeconds / 60)} 分钟`;
               else timeSpan = `${(diffSeconds / 3600).toFixed(1)} 小时`;

               setOfflineReport({ gold: totalGold, exp: totalExp, timeSpan, levelsGained });

               return {
                   ...prev,
                   gold: prev.gold + totalGold,
                   currentExp: nextExp,
                   maxExp: nextMaxExp,
                   level: nextLvl,
                   heroes: newHeroes,
                   pets: newPets
               };
            });
         }
      }
    }
  }, []); 

  // --- Helpers ---
  const addLog = useCallback((message: string, type: 'combat' | 'loot' | 'system' = 'system') => {
    setLogs(prev => [{ id: Math.random().toString(), message, type, timestamp: Date.now() }, ...prev].slice(100)); 
  }, []);
  
  useEffect(() => {
    addLogRef.current = addLog;
  }, [addLog]);

  const addFloatingText = (value: string, unitIndex: number, isAlly: boolean, type: 'damage' | 'gold' | 'exp' | 'heal' | 'loot', isCrit: boolean = false, rarity?: ItemRarity) => {
    const id = Math.random().toString();
    // Simplified positioning for 5v5 grid
    // Ally grid: 0,1,2,3,4. Enemy grid: 0,1,2,3,4
    const baseX = isAlly ? 20 : 80;
    const baseY = 20 + (unitIndex * 12); // Spread vertically
    
    const x = baseX + (Math.random() * 4 - 2);
    const y = baseY + (Math.random() * 4 - 2);
    
    let color = 'text-white';
    if (type === 'gold') color = 'text-yellow-400 font-black text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] z-50';
    else if (type === 'exp') color = 'text-purple-400 font-bold text-xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] z-50';
    else if (type === 'heal') color = 'text-green-500 font-bold text-xl';
    else if (type === 'loot') {
        color = rarity ? `${RARITY_COLORS[rarity]} font-bold text-lg drop-shadow-md z-50` : 'text-slate-300 font-bold';
    }
    else if (type === 'damage') {
        if (isCrit) color = 'text-yellow-300 font-black text-3xl drop-shadow-[0_4px_0_rgba(0,0,0,1)]';
        else color = isAlly ? 'text-red-500 font-bold text-xl' : 'text-white font-bold text-xl';
    }
    setFloatingTexts(prev => [...prev, { id, value, x, y, color, scale: isCrit }]);
    const duration = type === 'loot' ? 2000 : 1000;
    setTimeout(() => setFloatingTexts(prev => prev.filter(ft => ft.id !== id)), duration);
  };

  const getMainHero = (): Hero => {
    const h = player.heroes[0];
    if (!h || !h.baseStats) {
        return {
            id: 'hero_main', name: '主角', avatarSeed: 'Alexander', level: 1,
            baseStats: { str: 5, dex: 5, int: 5, vit: 5, spi: 5, freePoints: 0 },
            equipment: {}, isLeader: true
        };
    }
    return h;
  };

  // --- Upgrade Stats ---
  const upgradeStat = (stat: keyof PlayerStats, isPet: boolean = false, petId?: string) => {
      setUpgradingStat(stat);
      setTimeout(() => setUpgradingStat(null), 500); 

      setPlayer((prev: Player) => {
          if (isPet && petId) {
             const newPets: Pet[] = prev.pets.map((p: Pet) => {
                 if (p.id === petId && p.freePoints > 0) {
                     return {
                         ...p,
                         baseStats: { ...p.baseStats, [stat]: p.baseStats[stat] + 1 },
                         freePoints: p.freePoints - 1
                     };
                 }
                 return p;
             });
             // Update detail view if open
             const updatedPet = newPets.find((p: Pet) => p.id === petId);
             if (updatedPet) setPetDetail(updatedPet);
             return { ...prev, pets: newPets };
          } else {
             const newHeroes = [...prev.heroes];
             if (newHeroes[0] && newHeroes[0].baseStats.freePoints > 0) {
                 newHeroes[0] = {
                     ...newHeroes[0],
                     baseStats: {
                         ...newHeroes[0].baseStats,
                         [stat]: newHeroes[0].baseStats[stat] + 1,
                         freePoints: newHeroes[0].baseStats.freePoints - 1
                     }
                 };
             }
             return { ...prev, heroes: newHeroes };
          }
      });
      // Re-init units next tick
      setTimeout(() => initCombatUnits(), 10);
  };

  // --- Actions ---
  const equipItem = (item: Item) => { /* ... existing equip logic ... */ 
    setPlayer(prev => {
      const heroIdx = 0; 
      const slot = item.type as EquipmentSlot;
      const oldItem = prev.heroes[heroIdx].equipment[slot];
      const newInventory = prev.inventory.filter(i => i.id !== item.id);
      if (oldItem) newInventory.push(oldItem);
      const newHeroes = [...prev.heroes];
      newHeroes[heroIdx] = { ...newHeroes[heroIdx], equipment: { ...newHeroes[heroIdx].equipment, [slot]: item } };
      return { ...prev, heroes: newHeroes, inventory: newInventory };
    });
    setViewingItem(null); setTimeout(() => initCombatUnits(), 10);
  };
  const unequipItem = (item: Item) => { /* ... existing logic ... */ 
      if (player.inventory.length >= player.maxInventorySize) return;
      setPlayer(prev => {
        const heroIdx = 0; const newHeroes = [...prev.heroes]; const newEq = { ...newHeroes[heroIdx].equipment }; delete newEq[item.type as EquipmentSlot]; newHeroes[heroIdx] = { ...newHeroes[heroIdx], equipment: newEq }; return { ...prev, heroes: newHeroes, inventory: [...prev.inventory, item] }
      });
      setViewingItem(null); setTimeout(() => initCombatUnits(), 10);
  };
  const sellItem = (item: Item) => { /* ... existing logic ... */ 
     if(item.isLocked) return;
     setPlayer(prev => ({ ...prev, gold: prev.gold + item.value, inventory: prev.inventory.filter(i => i.id !== item.id) }));
     setViewingItem(null);
  };
  const handleHatchEgg = (item: Item) => {
     const newPet = generatePet(1);
     setPlayer(prev => ({ ...prev, inventory: prev.inventory.filter(i => i.id !== item.id), pets: [...prev.pets, newPet] }));
     addLog(`孵化成功！获得了宠物: ${newPet.name}`, 'loot');
     setViewingItem(null);
  };
  const equipPet = (petId: string) => {
      setPlayer(prev => {
          const newHeroes = [...prev.heroes];
          if (newHeroes[0]) {
              newHeroes[0] = { ...newHeroes[0], activePetId: newHeroes[0].activePetId === petId ? undefined : petId };
          }
          return { ...prev, heroes: newHeroes };
      });
      setTimeout(() => initCombatUnits(), 10);
  };
  const toggleLock = (item: Item) => { /* ... existing logic ... */ 
     setPlayer(prev => {
         const newInv = prev.inventory.map(i => i.id === item.id ? { ...i, isLocked: !i.isLocked } : i);
         // also check equipped...
         return { ...prev, inventory: newInv };
     });
     if (viewingItem && viewingItem.item.id === item.id) setViewingItem(prev => prev ? { ...prev, item: { ...prev.item, isLocked: !prev.item.isLocked } } : null);
  };
  const handleEnchant = (item: Item) => { /* ... existing logic ... */ 
     if (player.enchantStones < 1) return;
     const success = Math.random() < (ENCHANT_CONFIG.SUCCESS_RATES[item.enchantLevel]||0);
     const newItem = { ...item, usedEnchantSlots: item.usedEnchantSlots+1, enchantLevel: success ? item.enchantLevel+1 : item.enchantLevel };
     setPlayer(prev => {
         const newInv = prev.inventory.map(i => i.id === item.id ? newItem : i);
         const newHeroes = prev.heroes.map(h => {
             const newEq = {...h.equipment};
             let chg=false;
             Object.entries(h.equipment).forEach(([k,v]) => { 
               const val = v as Item;
               if(val?.id===item.id){newEq[k as EquipmentSlot]=newItem; chg=true;} 
             });
             return chg?{...h, equipment:newEq}:h;
         });
         return { ...prev, enchantStones: prev.enchantStones-1, inventory: newInv, heroes: newHeroes };
     });
     if(viewingItem?.item.id===item.id) setViewingItem({...viewingItem, item: newItem});
     setTimeout(() => initCombatUnits(), 10);
  };

  const handleLevelChange = (delta: number) => {
      const nextLevel = currentLevel + delta;
      if (nextLevel < 1 || nextLevel > highestLevel) return;
      setCurrentLevel(nextLevel);
      setKillCount(0);
      setCombatEnemies([]); // Will trigger respawn
      setIsSearching(true);
      setTimeout(() => setIsSearching(false), 500);
      initCombatUnits(); // Heal allies? Maybe just reset positions.
      // Better to full reset combat state on level change
      setCombatAllies(prev => prev.map(a => ({ ...a, currentHp: a.maxHp, actionGauge: 0 })));
  };

  // --- ATB COMBAT SYSTEM ---
  useEffect(() => {
    // Spawn Logic
    if (combatEnemiesRef.current.length === 0 && !isSearchingRef.current) {
        const isBossStage = killCountRef.current >= 4;
        const rawEnemies = generateEnemies(currentLevel, combatAlliesRef.current.filter(u=>!u.isPet).length, isBossStage);
        const newEnemies: CombatUnit[] = rawEnemies.map(e => ({
            id: e.id, isAlly: false, name: e.name, level: e.level, maxHp: e.maxHp, currentHp: e.currentHp, isBoss: e.isBoss,
            stats: { 
                 hp: e.maxHp, maxHp: e.maxHp, attack: e.attack, armor: e.armor,
                 speed: 1.0 + (e.level * 0.005), // Slightly faster with levels
                 critRate: 5, critDmg: 50, dodge: 0, hpRegen: 0, lifesteal: 0, armorPen: 0, dmgRed: 0, dmgInc: 0, atkSpeed: 0
            } as DerivedStats,
            avatarSeed: e.avatarSeed,
            petAvatarSeed: e.petAvatarSeed,
            actionGauge: 0, maxActionGauge: 100
        }));
        setCombatEnemies(newEnemies);
        addLogRef.current(`遭遇了 ${rawEnemies.length} 个敌人!`, 'combat');
    }

    const TICK_RATE = 50; // 50ms per tick
    const interval = setInterval(() => {
        if (isSearchingRef.current || combatEnemiesRef.current.length === 0) return;
        
        const allies = [...combatAlliesRef.current];
        const enemies = [...combatEnemiesRef.current];
        const allUnits = [...allies, ...enemies];
        let stateChanged = false;

        // 1. Update Action Gauges
        allUnits.forEach(unit => {
            if (unit.currentHp <= 0) return;
            // Base speed 1 = 100 gauge in 1000ms (20 ticks). So +5 per tick.
            // Speed 2 = +10 per tick.
            const gaugeGain = unit.stats.speed * 5; 
            unit.actionGauge += gaugeGain;

            if (unit.actionGauge >= unit.maxActionGauge) {
                // ATTACK TRIGGER
                unit.actionGauge -= unit.maxActionGauge; // Consume gauge
                
                // Select Target
                const targets = unit.isAlly ? enemies.filter(e => e.currentHp > 0) : allies.filter(a => a.currentHp > 0);
                if (targets.length > 0) {
                    const target = targets[Math.floor(Math.random() * targets.length)];
                    
                    // Animate
                    unit.animState = unit.isAlly ? 'animate-lunge-right' : 'animate-lunge-left';
                    
                    // Damage Calc
                    let dmg = 0; 
                    let isCrit = false;

                    if (unit.isAlly && invincibleRef.current) {
                        dmg = 999999; isCrit = true;
                    } else {
                        const res = calculateDamage(
                            unit.stats.attack, unit.stats.critRate, unit.stats.critDmg, unit.stats.armorPen,
                            target.stats.armor, target.level, target.stats.dmgRed
                        );
                        dmg = res.damage; isCrit = res.isCrit;
                    }

                    target.currentHp = Math.max(0, target.currentHp - dmg);
                    target.animState = 'animate-hit';
                    
                    // Add Log
                    addLogRef.current(`${unit.name} 对 ${target.name} 造成 ${dmg} 伤害${isCrit ? ' (暴击!)' : ''}`, 'combat');

                    // Find Index for Floating Text
                    const targetIdx = unit.isAlly ? enemies.findIndex(e => e.id === target.id) : allies.findIndex(a => a.id === target.id);
                    // Delay floating text slightly to match anim
                    setTimeout(() => {
                        addFloatingText(`${dmg}${isCrit?'!':''}`, targetIdx, !unit.isAlly, 'damage', isCrit);
                    }, 150);

                    // Lifesteal
                    if (unit.isAlly && unit.stats.lifesteal > 0 && dmg > 0) {
                        const heal = Math.floor(dmg * unit.stats.lifesteal / 100);
                        if (heal > 0) {
                            unit.currentHp = Math.min(unit.maxHp, unit.currentHp + heal);
                        }
                    }
                }
                stateChanged = true;
            }
        });

        if (stateChanged) {
            setCombatAllies([...allies]);
            setCombatEnemies([...enemies]);

            // Clear Animations after short delay
            setTimeout(() => {
                setCombatAllies(prev => prev.map(u => ({ ...u, animState: '' })));
                setCombatEnemies(prev => prev.map(u => ({ ...u, animState: '' })));
            }, 300);

            // Check Deaths
            if (enemies.filter(e => e.currentHp > 0).length === 0) {
                 handleVictory(enemies);
            } else if (allies.filter(a => a.currentHp > 0).length === 0) {
                handleDefeat();
            }
        }

    }, TICK_RATE);

    return () => clearInterval(interval);
  }, [currentLevel, invincible, isSearching]);

  // Victory Logic
  const handleVictory = (defeatedEnemies: CombatUnit[]) => {
      // Calculate Rewards
      let gold = 0; let exp = 0; let items: Item[] = []; let stones = 0;
      let isBossEncounter = false;
      defeatedEnemies.forEach(e => {
          const scale = e.isBoss ? 10 : 1;
          gold += Math.floor((15 + e.level * 3) * scale);
          exp += Math.floor((30 + e.level * 8) * scale);
          if (e.isBoss) { isBossEncounter = true; stones += 1; }
          if (Math.random() < (e.isBoss ? 1.0 : 0.3)) items.push(generateItem(e.level));
      });
      
      addFloatingText(`+${gold}G`, 0, true, 'gold');
      setTimeout(() => addFloatingText(`+${exp}Exp`, 0, true, 'exp'), 300);

      // Update Player
      setPlayer(prev => {
          let nextExp = prev.currentExp + exp;
          let nextLvl = prev.level;
          let newHeroes = [...prev.heroes];
          // Level up logic...
          while(nextExp >= prev.maxExp) {
              nextExp -= prev.maxExp; nextLvl++; 
              newHeroes.forEach(h => { h.level = nextLvl; h.baseStats.freePoints += 5; });
          }
          const nextInv = [...prev.inventory, ...items].slice(0, prev.maxInventorySize);
          
          return { ...prev, gold: prev.gold + gold, currentExp: nextExp, level: nextLvl, heroes: newHeroes, inventory: nextInv, enchantStones: prev.enchantStones + stones };
      });
      
      addLogRef.current(`战斗胜利! 获得 ${gold}金币, ${exp}经验`, 'combat');
      items.forEach(i => addLogRef.current(`获得战利品: [${i.name}]`, 'loot'));

      // Progression
      if (isBossEncounter) {
          if (currentLevel < 100) {
             const nextL = currentLevel + 1;
             setCurrentLevel(nextL);
             setHighestLevel(h => Math.max(h, nextL));
          }
          setKillCount(0);
      } else {
          setKillCount(k => k + 1);
      }

      // Reset
      setCombatEnemies([]);
      setCombatAllies(prev => prev.map(a => ({ ...a, currentHp: Math.min(a.maxHp, a.currentHp + a.maxHp*0.3), actionGauge: 0 })));
      setIsSearching(true);
      setTimeout(() => setIsSearching(false), 2000);
  };

  const handleDefeat = () => {
      // Auto Retreat Logic
      if (currentLevel > 1) {
          const prevLevel = currentLevel - 1;
          addLogRef.current(`战斗失败！退回第 ${prevLevel} 层`, 'combat');
          setCurrentLevel(prevLevel);
      } else {
          addLogRef.current(`战斗失败！重整旗鼓...`, 'combat');
      }
      setKillCount(0);
      setCombatEnemies([]);
      setCombatAllies(prev => prev.map(a => ({ ...a, currentHp: a.maxHp, actionGauge: 0 })));
      setIsSearching(true);
      setTimeout(() => setIsSearching(false), 2000);
      initCombatUnits(); 
  };

  const renderItemSlot = (slot: EquipmentSlot) => {
    const hero = getMainHero();
    const item = hero.equipment[slot];
    const ItemIcon = getItemIcon(item || null, slot);
    
    return (
      <div key={slot} onClick={() => item && setViewingItem({ item, source: 'equip' })} className={`aspect-square bg-slate-800 border ${item ? RARITY_BG_COLORS[item.rarity] : 'border-slate-700'} rounded-lg flex items-center justify-center relative cursor-pointer active:scale-95 transition-all`}>
        <ItemIcon size={24} className={item ? RARITY_COLORS[item.rarity] : 'text-slate-600'} />
        {!item && <span className="absolute bottom-1 text-[8px] text-slate-500">{slot}</span>}
        {item && item.enchantLevel > 0 && <span className="absolute top-0 right-0 text-[8px] bg-pink-600 text-white px-1">+{item.enchantLevel}</span>}
      </div>
    );
  };

  return (
    <div className={`h-full w-full bg-black flex flex-col relative overflow-hidden`}>

      {/* --- MODALS --- */}
      {/* Pet Detail Modal */}
      {petDetail && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={() => setPetDetail(null)}>
              <div onClick={e => e.stopPropagation()} className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl relative">
                  <button onClick={() => setPetDetail(null)} className="absolute top-4 right-4 text-slate-500"><X size={20}/></button>
                  <div className="flex gap-4 mb-6">
                      <img src={`https://api.dicebear.com/9.x/bottts/svg?seed=${petDetail.avatarSeed}`} className="w-20 h-20 bg-black rounded-xl border border-white/10" />
                      <div>
                          <h2 className="text-xl font-bold text-white">{petDetail.name}</h2>
                          <p className="text-purple-400 font-bold">Lv.{petDetail.level}</p>
                          <p className="text-slate-500 text-xs mt-1">成长率: {petDetail.qualities.grow}</p>
                      </div>
                  </div>
                  
                  <div className="space-y-4">
                      <div>
                          <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">资质</h3>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="flex justify-between"><span>攻击</span> <span className="text-white">{petDetail.qualities.atk}</span></div>
                              <div className="flex justify-between"><span>防御</span> <span className="text-white">{petDetail.qualities.def}</span></div>
                              <div className="flex justify-between"><span>体力</span> <span className="text-white">{petDetail.qualities.hp}</span></div>
                              <div className="flex justify-between"><span>速度</span> <span className="text-white">{petDetail.qualities.spd}</span></div>
                          </div>
                      </div>
                      
                      <div>
                          <div className="flex justify-between items-center mb-2">
                              <h3 className="text-xs font-bold text-slate-500 uppercase">加点</h3>
                              {petDetail.freePoints > 0 && <span className="text-green-400 text-xs font-bold animate-pulse">可用: {petDetail.freePoints}</span>}
                          </div>
                          <div className="space-y-1">
                              <StatRow label="力量" value={petDetail.baseStats.str} icon={Sword} color="text-red-400" canUpgrade={petDetail.freePoints > 0} onUpgrade={() => upgradeStat('str', true, petDetail.id)} />
                              <StatRow label="敏捷" value={petDetail.baseStats.dex} icon={Zap} color="text-yellow-300" canUpgrade={petDetail.freePoints > 0} onUpgrade={() => upgradeStat('dex', true, petDetail.id)} />
                              <StatRow label="智力" value={petDetail.baseStats.int} icon={Brain} color="text-blue-400" canUpgrade={petDetail.freePoints > 0} onUpgrade={() => upgradeStat('int', true, petDetail.id)} />
                              <StatRow label="耐力" value={petDetail.baseStats.vit} icon={Shield} color="text-green-400" canUpgrade={petDetail.freePoints > 0} onUpgrade={() => upgradeStat('vit', true, petDetail.id)} />
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Enemy Detail Modal */}
      {showEnemyDetail && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={() => setShowEnemyDetail(null)}>
              <div onClick={e => e.stopPropagation()} className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl relative">
                  <button onClick={() => setShowEnemyDetail(null)} className="absolute top-4 right-4 text-slate-500"><X size={20}/></button>
                  <div className="flex gap-4 mb-6">
                      <img 
                          src={`https://api.dicebear.com/9.x/${showEnemyDetail.isPet ? 'bottts' : 'bottts-neutral'}/svg?seed=${showEnemyDetail.avatarSeed}&backgroundColor=transparent`}
                          className="w-20 h-20 bg-slate-800 rounded-xl border border-red-500/30" 
                      />
                      <div>
                          <h2 className="text-xl font-bold text-red-400">{showEnemyDetail.name}</h2>
                          <div className="flex gap-2 mt-1">
                             <span className="bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded">Lv.{showEnemyDetail.level}</span>
                             {showEnemyDetail.isBoss && <span className="bg-red-900 text-red-200 text-xs px-2 py-0.5 rounded font-bold">BOSS</span>}
                          </div>
                      </div>
                  </div>
                  
                  <div className="space-y-3">
                      <div>
                          <div className="flex justify-between text-xs text-slate-400 mb-1">
                              <span>生命值</span>
                              <span>{showEnemyDetail.currentHp} / {showEnemyDetail.maxHp}</span>
                          </div>
                          <ProgressBar current={showEnemyDetail.currentHp} max={showEnemyDetail.maxHp} colorClass="bg-red-600" showText={false} />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mt-4">
                          <div className="bg-slate-800 p-2 rounded">
                              <div className="text-[10px] text-slate-500">攻击力</div>
                              <div className="text-white font-bold">{showEnemyDetail.stats.attack}</div>
                          </div>
                          <div className="bg-slate-800 p-2 rounded">
                              <div className="text-[10px] text-slate-500">护甲</div>
                              <div className="text-white font-bold">{showEnemyDetail.stats.armor}</div>
                          </div>
                          <div className="bg-slate-800 p-2 rounded">
                              <div className="text-[10px] text-slate-500">速度 (攻速)</div>
                              <div className="text-white font-bold">{showEnemyDetail.stats.speed.toFixed(2)}</div>
                          </div>
                          <div className="bg-slate-800 p-2 rounded">
                              <div className="text-[10px] text-slate-500">暴击伤害</div>
                              <div className="text-white font-bold">{showEnemyDetail.stats.critDmg}%</div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- MAIN CONTENT SWITCHER --- */}
      <div className="flex-1 relative overflow-hidden flex flex-col">
          
          {/* 1. STAGE VIEW (Full Screen Combat) */}
          {activeTab === 'stage' && (
              <div className="absolute inset-0 z-0">
                   {/* Background */}
                   <div className="absolute inset-0">
                       <img src="https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?q=80&w=2544" className={`w-full h-full object-cover opacity-30 ${isSearching ? 'animate-bg-scroll' : ''}`} />
                       <div className="absolute inset-0 bg-black/60"></div>
                   </div>
                   
                   {/* Combat Layer */}
                   <div className="absolute inset-0 z-10 flex flex-col">
                        <div className="p-4 flex justify-between items-center z-20">
                             <div className="flex items-center gap-4 bg-black/40 p-2 rounded-xl backdrop-blur-md border border-white/10">
                                 <button 
                                     onClick={() => handleLevelChange(-1)} 
                                     disabled={currentLevel <= 1}
                                     className={`p-1 rounded hover:bg-white/10 ${currentLevel <= 1 ? 'opacity-30' : ''}`}
                                 >
                                    <ChevronLeft size={20} className="text-white"/>
                                 </button>
                                 <div className="text-white font-bold text-xl drop-shadow-lg min-w-[80px] text-center">
                                    第 {currentLevel} 层
                                 </div>
                                 <button 
                                     onClick={() => handleLevelChange(1)} 
                                     disabled={currentLevel >= highestLevel}
                                     className={`p-1 rounded hover:bg-white/10 ${currentLevel >= highestLevel ? 'opacity-30' : ''}`}
                                 >
                                    <ChevronRight size={20} className="text-white"/>
                                 </button>
                             </div>
                             
                             <div className="flex gap-2">
                                <button onClick={() => setIsLogOpen(!isLogOpen)} className={`p-3 rounded-full border-2 transition-colors ${isLogOpen ? 'bg-indigo-600 border-indigo-400' : 'bg-slate-800 border-slate-600'}`}>
                                    <ScrollText size={20} className="text-white"/>
                                </button>
                                <button onClick={() => setInvincible(!invincible)} className={`p-3 rounded-full border-2 transition-colors ${invincible ? 'bg-blue-600 border-blue-400' : 'bg-slate-800 border-slate-600'}`}>
                                    <ShieldCheck size={20} className="text-white"/>
                                </button>
                             </div>
                        </div>
                        
                        {/* Battlefield */}
                        <div className="flex-1 flex justify-between px-2 items-center relative z-10">
                             {/* Allies Grid */}
                             <div className="grid grid-cols-2 gap-4 w-[45%] place-items-center">
                                 {combatAllies.map((u, i) => (
                                     <RenderCombatUnit key={u.id} unit={u} index={i} isLeft={true} onSelect={setShowEnemyDetail} />
                                 ))}
                             </div>
                             {/* VS/Searching */}
                             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                 {isSearching && <div className="text-slate-400 font-bold animate-pulse bg-black/50 px-4 py-2 rounded-xl">寻找敌人...</div>}
                             </div>
                             {/* Enemies Grid */}
                             <div className="grid grid-cols-2 gap-4 w-[45%] place-items-center">
                                 {combatEnemies.map((u, i) => (
                                     <RenderCombatUnit key={u.id} unit={u} index={i} isLeft={false} onSelect={setShowEnemyDetail} />
                                 ))}
                             </div>
                             
                             {/* Floating Texts Layer */}
                             <div className="absolute inset-0 pointer-events-none">
                                 {floatingTexts.map(ft => (
                                    <div key={ft.id} className={`absolute ${ft.color} ${ft.scale ? 'scale-150' : 'scale-100'}`} style={{ left: `${ft.x}%`, top: `${ft.y}%` }}>
                                        <div className="animate-float-up">{ft.value}</div>
                                    </div>
                                 ))}
                             </div>
                        </div>
                        
                        {/* Collapsible Log Panel - Now Absolute Bottom */}
                        <div className={`absolute bottom-0 left-0 right-0 z-40 transition-all duration-300 ease-out bg-black/90 backdrop-blur-md border-t border-white/20 ${isLogOpen ? 'h-64' : 'h-0'} overflow-hidden shadow-2xl`}>
                             <div className="p-3 h-full overflow-y-auto custom-scrollbar flex flex-col-reverse">
                                  {logs.map(log => (
                                      <div key={log.id} className="text-[11px] mb-1.5 leading-tight font-mono border-b border-white/5 pb-1">
                                          <span className="text-slate-600 mr-2">[{new Date(log.timestamp).toLocaleTimeString([], {hour12:false, hour:'2-digit', minute:'2-digit', second:'2-digit'})}]</span>
                                          <span className={`${log.type === 'combat' ? 'text-slate-300' : log.type === 'loot' ? 'text-yellow-400 font-bold' : 'text-blue-300'}`}>
                                              {log.message}
                                          </span>
                                      </div>
                                  ))}
                             </div>
                        </div>

                   </div>
              </div>
          )}

          {/* 2. TEAM VIEW */}
          {activeTab === 'role' && (
              <div className="h-full flex flex-col bg-slate-900">
                  <TopResourceBar player={player} isLevelingUp={isLevelingUp} />
                  <div className="flex-1 overflow-y-auto p-4 custom-scrollbar pb-24">
                      {/* Using existing stat/equip render logic simplified */}
                      <div className="bg-black/40 border border-white/5 rounded-2xl p-4 mb-4">
                          <h2 className="text-lg font-bold text-white mb-4">主角属性</h2>
                          <div className="space-y-1">
                              <StatRow label="力量" value={getMainHero().baseStats.str} icon={Sword} color="text-red-400" canUpgrade={getMainHero().baseStats.freePoints > 0} onUpgrade={() => upgradeStat('str')} />
                              <StatRow label="敏捷" value={getMainHero().baseStats.dex} icon={Zap} color="text-yellow-300" canUpgrade={getMainHero().baseStats.freePoints > 0} onUpgrade={() => upgradeStat('dex')} />
                              <StatRow label="智力" value={getMainHero().baseStats.int} icon={Brain} color="text-blue-400" canUpgrade={getMainHero().baseStats.freePoints > 0} onUpgrade={() => upgradeStat('int')} />
                              <StatRow label="耐力" value={getMainHero().baseStats.vit} icon={Shield} color="text-green-400" canUpgrade={getMainHero().baseStats.freePoints > 0} onUpgrade={() => upgradeStat('vit')} />
                          </div>
                      </div>
                      
                      <div className="grid grid-cols-5 gap-2">
                           {Object.values(EquipmentSlot).map(slot => renderItemSlot(slot))}
                      </div>
                  </div>
              </div>
          )}

          {/* 3. PET VIEW */}
          {activeTab === 'pet' && (
              <div className="h-full flex flex-col bg-slate-900">
                  <TopResourceBar player={player} isLevelingUp={isLevelingUp} />
                  <div className="flex-1 overflow-y-auto p-4 custom-scrollbar pb-24 grid grid-cols-1 gap-3 content-start">
                      {player.pets.map(pet => (
                          <div key={pet.id} onClick={() => setPetDetail(pet)} className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex gap-3 relative cursor-pointer active:scale-95 transition-transform">
                              <img src={`https://api.dicebear.com/9.x/bottts/svg?seed=${pet.avatarSeed}`} className="w-16 h-16 bg-black/50 rounded-lg" />
                              <div className="flex-1">
                                  <div className="flex justify-between">
                                      <h3 className="font-bold text-white">{pet.name}</h3>
                                      <span className="text-purple-400 text-xs font-bold">Lv.{pet.level}</span>
                                  </div>
                                  <div className="text-xs text-slate-400 mt-1">成长: {pet.qualities.grow}</div>
                                  {pet.freePoints > 0 && <div className="text-green-400 text-[10px] animate-pulse">可加点</div>}
                              </div>
                              <button onClick={(e) => { e.stopPropagation(); equipPet(pet.id); }} className={`absolute bottom-3 right-3 px-3 py-1 text-xs rounded font-bold ${getMainHero().activePetId === pet.id ? 'bg-red-500 text-white' : 'bg-green-600 text-white'}`}>
                                  {getMainHero().activePetId === pet.id ? '休息' : '出战'}
                              </button>
                          </div>
                      ))}
                      {player.pets.length === 0 && <div className="text-center text-slate-500 mt-10">暂无灵兽，请去背包使用宠物蛋</div>}
                  </div>
              </div>
          )}

          {/* 4. BAG VIEW */}
          {activeTab === 'bag' && (
               <div className="h-full flex flex-col bg-slate-900">
                   <TopResourceBar player={player} isLevelingUp={isLevelingUp} />
                   <div className="flex-1 overflow-y-auto p-4 custom-scrollbar pb-24">
                        <div className="grid grid-cols-5 gap-2">
                            {player.inventory.map(item => {
                                const ItemIcon = getItemIcon(item);
                                return (
                                    <div key={item.id} onClick={() => setViewingItem({ item, source: 'bag' })} className={`aspect-square ${RARITY_BG_COLORS[item.rarity]} border rounded flex items-center justify-center relative`}>
                                        <ItemIcon size={20} className={RARITY_COLORS[item.rarity]} />
                                        {item.enchantLevel > 0 && <span className="absolute top-0 right-0 text-[8px] bg-pink-600 text-white px-1">+{item.enchantLevel}</span>}
                                    </div>
                                )
                            })}
                        </div>
                   </div>
               </div>
          )}
      </div>

      {/* --- BOTTOM NAVIGATION --- */}
      <div className="h-16 bg-slate-950 border-t border-slate-800 flex justify-around items-center px-2 z-50">
          {[
              { id: 'stage', icon: Map, label: '关卡' },
              { id: 'role', icon: Users, label: '队伍' },
              { id: 'pet', icon: Dog, label: '灵兽' },
              { id: 'bag', icon: Backpack, label: '背包' },
          ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl w-16 transition-all ${activeTab === tab.id ? 'text-indigo-400 bg-indigo-500/10 scale-110' : 'text-slate-500'}`}
              >
                  <tab.icon size={20} />
                  <span className="text-[10px] font-bold">{tab.label}</span>
              </button>
          ))}
      </div>
      
      {/* Item Modal (Global) */}
      {viewingItem && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setViewingItem(null)}>
           <div onClick={e => e.stopPropagation()}>
               <ItemTooltip 
                 item={viewingItem.item} 
                 onEquip={viewingItem.source === 'bag' ? equipItem : undefined}
                 onUnequip={viewingItem.source === 'equip' ? unequipItem : undefined}
                 onSell={viewingItem.source === 'bag' ? sellItem : undefined}
                 onLock={toggleLock}
                 onEnchant={handleEnchant}
                 onUse={viewingItem.item.type === 'consumable' ? handleHatchEgg : undefined}
                 onClose={() => setViewingItem(null)}
                 playerEquipment={getMainHero().equipment}
                 playerStones={player.enchantStones}
               />
           </div>
        </div>
      )}

    </div>
  );
}