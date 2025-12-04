import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sword, Shield, Brain, Heart, Zap, Play, Pause, Backpack, TrendingUp, RefreshCcw, User, Gem, Sparkles, Map, ChevronUp, ArrowLeft, Info, Activity, Skull, ShieldCheck, X, Footprints, Crown, Shirt, Hand, Settings, Lock, Trash2, CheckSquare, Square, Axe, Hammer, Wand, Crosshair, Columns, ScrollText, Save, RotateCcw, Clock, Users, Egg, Dog, Bird } from 'lucide-react';
import { Player, Enemy, GameLog, Item, EquipmentSlot, PlayerStats, ItemRarity, CombatUnit, Hero, DerivedStats, Pet, PetBreed } from './types';
import { EXP_TABLE, MAX_INVENTORY, RARITY_COLORS, LEVEL_CAP, RARITY_BG_COLORS, ENCHANT_CONFIG, PET_BREEDS } from './constants';
import { calculateDerivedStats, calculateDamage, generateEnemies, generateItem, generatePet } from './services/gameEngine';
import { ItemTooltip } from './components/Tooltip';

// --- Types for Visuals ---
interface FloatingText {
  id: string;
  value: string;
  x: number;
  y: number;
  color: string;
  scale?: boolean;
}

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

export default function App() {
  // --- State ---
  const [activeTab, setActiveTab] = useState<'role' | 'bag' | 'stage' | 'pet'>('role');
  const [showRoleDetail, setShowRoleDetail] = useState(false);
  const [autoBattle, setAutoBattle] = useState(false);
  const [invincible, setInvincible] = useState(false); 
  const [isSearching, setIsSearching] = useState(false); 
  const [showEnemyDetail, setShowEnemyDetail] = useState<CombatUnit | null>(null); 
  const [showBagSettings, setShowBagSettings] = useState(false); 
  const [showLogModal, setShowLogModal] = useState(false);
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
        pets: [], // Default empty pets
        inventory: [],
        maxInventorySize: MAX_INVENTORY,
        autoSellSettings: {}
    };

    if (loadedData) {
        // Ensure pets array exists in old save
        if (!loadedData.pets) loadedData.pets = [];
        
        // Ensure heroes exists and is valid
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
        } else if (loadedData.baseStats) {
             // Old single hero migration
             initialPlayer.heroes[0].baseStats = { ...defaultBaseStats, ...loadedData.baseStats };
             initialPlayer.heroes[0].equipment = loadedData.equipment || {};
             initialPlayer.heroes[0].level = loadedData.level || 1;
             return { ...initialPlayer, ...loadedData, heroes: initialPlayer.heroes };
        }
        
        return { ...initialPlayer, ...loadedData };
    }

    return initialPlayer;
  });

  // Capture last save time on init (before effects run)
  const lastSaveTimeRef = useRef<string | null>(localStorage.getItem(STORAGE_KEYS.LAST_SAVE));

  // Combat Runtime State (Multi-vs-Multi)
  const [combatAllies, setCombatAllies] = useState<CombatUnit[]>([]);
  const [combatEnemies, setCombatEnemies] = useState<CombatUnit[]>([]);

  const [logs, setLogs] = useState<GameLog[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [damageFlash, setDamageFlash] = useState(false);
  
  // UI FX State
  const [upgradingStat, setUpgradingStat] = useState<string | null>(null);
  const [isLevelingUp, setIsLevelingUp] = useState(false);

  // Refs for loop
  const playerRef = useRef(player);
  const combatAlliesRef = useRef(combatAllies);
  const combatEnemiesRef = useRef(combatEnemies);
  const autoBattleRef = useRef(autoBattle);
  const invincibleRef = useRef(invincible);
  const killCountRef = useRef(killCount);
  const isSearchingRef = useRef(isSearching);

  // Update refs
  useEffect(() => { playerRef.current = player; }, [player]);
  useEffect(() => { combatAlliesRef.current = combatAllies; }, [combatAllies]);
  useEffect(() => { combatEnemiesRef.current = combatEnemies; }, [combatEnemies]);
  useEffect(() => { autoBattleRef.current = autoBattle; }, [autoBattle]);
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
      const allies: CombatUnit[] = player.heroes.map(hero => {
          const safeHero = {
              ...hero,
              baseStats: hero.baseStats || { str: 5, dex: 5, int: 5, vit: 5, spi: 5, freePoints: 0 }
          };
          const stats = calculateDerivedStats(safeHero, player.pets);
          
          let petAvatarSeed: string | undefined = undefined;
          if (hero.activePetId) {
             const pet = player.pets.find(p => p.id === hero.activePetId);
             if (pet) petAvatarSeed = pet.avatarSeed;
          }

          return {
              id: hero.id,
              isAlly: true,
              name: hero.name,
              level: hero.level,
              currentHp: stats.maxHp,
              maxHp: stats.maxHp,
              stats: stats,
              avatarSeed: hero.avatarSeed,
              petAvatarSeed // Add visual pet
          };
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

               let timeSpan = "";
               if (diffSeconds < 3600) timeSpan = `${Math.floor(diffSeconds / 60)} 分钟`;
               else timeSpan = `${(diffSeconds / 3600).toFixed(1)} 小时`;

               setOfflineReport({
                   gold: totalGold,
                   exp: totalExp,
                   timeSpan,
                   levelsGained
               });

               return {
                   ...prev,
                   gold: prev.gold + totalGold,
                   currentExp: nextExp,
                   maxExp: nextMaxExp,
                   level: nextLvl,
                   heroes: newHeroes
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

  const addFloatingText = (value: string, unitIndex: number, isAlly: boolean, type: 'damage' | 'gold' | 'exp' | 'heal' | 'loot', isCrit: boolean = false, rarity?: ItemRarity) => {
    const id = Math.random().toString();
    const rowHeight = 15; // %
    const startY = 30; // %
    const baseX = isAlly ? 25 : 75;
    const baseY = startY + (unitIndex * rowHeight);
    const x = baseX + (Math.random() * 6 - 3);
    const y = baseY + (Math.random() * 6 - 3);
    
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
            id: h?.id || 'hero_main',
            name: h?.name || '主角',
            avatarSeed: h?.avatarSeed || 'Alexander',
            level: h?.level || 1,
            baseStats: { str: 5, dex: 5, int: 5, vit: 5, spi: 5, freePoints: 0 },
            equipment: h?.equipment || {},
            isLeader: true
        };
    }
    return h;
  };

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

    if (item.type === EquipmentSlot.WEAPON) {
        if (item.name.includes('斧')) return Axe;
        if (item.name.includes('锤')) return Hammer;
        if (item.name.includes('杖') || item.name.includes('法')) return Wand;
        if (item.name.includes('弓') || item.name.includes('枪')) return Crosshair;
        return Sword;
    }
    if (item.type === EquipmentSlot.HELMET) return Crown;
    if (item.type === EquipmentSlot.CHEST) return Shirt;
    if (item.type === EquipmentSlot.LEGS) return Columns; 
    if (item.type === EquipmentSlot.GLOVES) return Hand;
    if (item.type === EquipmentSlot.BOOTS) return Footprints;
    if ([EquipmentSlot.RING1, EquipmentSlot.RING2, EquipmentSlot.NECKLACE, EquipmentSlot.AMULET].includes(item.type as EquipmentSlot)) return Gem;

    return Shield;
  };

  // --- Actions ---
  const upgradeStat = (stat: keyof PlayerStats) => {
    const hero = player.heroes[0]; 
    if (hero?.baseStats?.freePoints > 0) {
      setUpgradingStat(stat);
      setTimeout(() => setUpgradingStat(null), 500); 

      setPlayer(prev => {
          const newHeroes = [...prev.heroes];
          if (newHeroes[0]) {
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
      });
      initCombatUnits(); 
    }
  };

  const equipItem = (item: Item) => {
    setPlayer(prev => {
      const heroIdx = 0; 
      const slot = item.type as EquipmentSlot;
      const oldItem = prev.heroes[heroIdx].equipment[slot];
      
      const newInventory = prev.inventory.filter(i => i.id !== item.id);
      if (oldItem) newInventory.push(oldItem);
      
      const newHeroes = [...prev.heroes];
      newHeroes[heroIdx] = {
          ...newHeroes[heroIdx],
          equipment: { ...newHeroes[heroIdx].equipment, [slot]: item }
      };

      return { ...prev, heroes: newHeroes, inventory: newInventory };
    });
    addLog(`装备了 ${item.name}`, 'system');
    setViewingItem(null); 
    setTimeout(() => initCombatUnits(), 10);
  };

  const unequipItem = (item: Item) => {
    if (player.inventory.length >= player.maxInventorySize) {
      addLog("背包已满！", "system");
      return;
    }
    setPlayer(prev => {
       const heroIdx = 0;
       const newHeroes = [...prev.heroes];
       const newEquipment = { ...newHeroes[heroIdx].equipment };
       delete newEquipment[item.type as EquipmentSlot];
       newHeroes[heroIdx] = { ...newHeroes[heroIdx], equipment: newEquipment };

       return { ...prev, heroes: newHeroes, inventory: [...prev.inventory, item] }
    });
    setViewingItem(null);
    setTimeout(() => initCombatUnits(), 10);
  };

  const sellItem = (item: Item) => {
    if (item.isLocked) return;
    setPlayer(prev => ({
      ...prev,
      gold: prev.gold + item.value,
      inventory: prev.inventory.filter(i => i.id !== item.id)
    }));
    addLog(`出售了 ${item.name} 获得 ${item.value} 金币`, 'system');
    setViewingItem(null);
  };

  // Pet Actions
  const handleHatchEgg = (item: Item) => {
     const newPet = generatePet(1);
     setPlayer(prev => ({
         ...prev,
         inventory: prev.inventory.filter(i => i.id !== item.id),
         pets: [...prev.pets, newPet]
     }));
     addLog(`孵化成功！获得了宠物: ${newPet.name}`, 'loot');
     setViewingItem(null);
  };

  const equipPet = (petId: string) => {
      setPlayer(prev => {
          const newHeroes = [...prev.heroes];
          if (newHeroes[0]) {
              newHeroes[0] = {
                  ...newHeroes[0],
                  activePetId: newHeroes[0].activePetId === petId ? undefined : petId
              };
          }
          return { ...prev, heroes: newHeroes };
      });
      setTimeout(() => initCombatUnits(), 10);
  };

  const toggleLock = (item: Item) => {
    setPlayer(prev => {
        const newInventory = prev.inventory.map((i: Item) => i.id === item.id ? { ...i, isLocked: !i.isLocked } : i);
        const newHeroes = prev.heroes.map(hero => {
             const newEq = { ...hero.equipment };
             Object.entries(hero.equipment).forEach(([slot, eqItem]) => {
                 const eItem = eqItem as Item | undefined;
                 if (eItem && eItem.id === item.id) {
                     newEq[slot as EquipmentSlot] = { ...eItem, isLocked: !eItem.isLocked };
                 }
             });
             return { ...hero, equipment: newEq };
        });

        return { ...prev, inventory: newInventory, heroes: newHeroes };
    });

    if (viewingItem && viewingItem.item.id === item.id) {
        setViewingItem(prev => prev ? { ...prev, item: { ...prev.item, isLocked: !prev.item.isLocked } } : null);
    }
  };

  const toggleAutoSell = (rarity: ItemRarity) => {
      setPlayer(prev => ({
          ...prev,
          autoSellSettings: {
              ...prev.autoSellSettings,
              [rarity]: !prev.autoSellSettings[rarity]
          }
      }));
  };

  const batchSell = (rarity: ItemRarity) => {
      let soldCount = 0;
      let totalGold = 0;

      setPlayer(prev => {
          const itemsToSell = prev.inventory.filter(i => i.rarity === rarity && !i.isLocked);
          if (itemsToSell.length === 0) return prev;

          soldCount = itemsToSell.length;
          totalGold = itemsToSell.reduce((sum, item) => sum + item.value, 0);

          return {
              ...prev,
              gold: prev.gold + totalGold,
              inventory: prev.inventory.filter(i => i.rarity !== rarity || i.isLocked)
          };
      });

      if (soldCount > 0) {
          addLog(`一键出售了 ${soldCount} 件 ${rarity} 装备，获得 ${totalGold} 金币`, 'system');
      }
  };

  const resetGameData = () => {
    if (confirm('确定要重置所有游戏存档吗？这将无法恢复。')) {
        localStorage.clear();
        window.location.reload();
    }
  };

  const handleEnchant = (item: Item) => {
     if (player.enchantStones < ENCHANT_CONFIG.COST_PER_ATTEMPT) {
         addLog("启灵石不足！", "system");
         return;
     }
     if (item.usedEnchantSlots >= item.maxEnchantSlots) {
         addLog("启灵次数已用尽！", "system");
         return;
     }

     const successRate = ENCHANT_CONFIG.SUCCESS_RATES[item.enchantLevel] || 0;
     const isSuccess = Math.random() < successRate;

     const updatedItem = {
         ...item,
         usedEnchantSlots: item.usedEnchantSlots + 1,
         enchantLevel: isSuccess ? item.enchantLevel + 1 : item.enchantLevel
     };

     setPlayer(prev => {
         const newHeroes = prev.heroes.map(hero => {
             const newEq = { ...hero.equipment };
             let changed = false;
             Object.entries(hero.equipment).forEach(([slot, eqItem]) => {
                 const eItem = eqItem as Item | undefined;
                 if (eItem && eItem.id === item.id) {
                     newEq[slot as EquipmentSlot] = updatedItem;
                     changed = true;
                 }
             });
             return changed ? { ...hero, equipment: newEq } : hero;
         });

         const newInventory = prev.inventory.map((i: Item) => i.id === item.id ? updatedItem : i);

         return {
             ...prev,
             enchantStones: prev.enchantStones - 1,
             heroes: newHeroes,
             inventory: newInventory
         };
     });

     if (isSuccess) {
         addLog(`启灵成功！${item.name} 强化至 +${updatedItem.enchantLevel}`, 'loot');
         addFloatingText("启灵成功!", 0, true, 'heal'); 
     } else {
         addLog(`启灵失败... ${item.name} 消耗了一次机会`, 'combat');
         addFloatingText("启灵失败", 0, true, 'damage');
     }

     if (viewingItem && viewingItem.item.id === item.id) {
         setViewingItem({ ...viewingItem, item: updatedItem });
     }
     setTimeout(() => initCombatUnits(), 10);
  };

  const calculateEstimatedIncome = () => {
      const avgKillTimeSeconds = 6; 
      const killsPerHour = 3600 / avgKillTimeSeconds;
      
      const enemyLevel = currentLevel;
      const scale = 1.0;
      const gold = Math.floor((15 + enemyLevel * 3) * scale);
      const exp = Math.floor((30 + enemyLevel * 8) * scale);
      
      return {
          goldPerHour: Math.floor(gold * killsPerHour * 0.8), 
          expPerHour: Math.floor(exp * killsPerHour * 0.8)
      };
  };

  useEffect(() => {
    if (!autoBattle) return;

    if (combatEnemiesRef.current.length === 0 && !isSearchingRef.current) {
      const isBossStage = killCountRef.current >= 4;
      const rawEnemies = generateEnemies(currentLevel, combatAlliesRef.current.length, isBossStage);
      const newCombatEnemies: CombatUnit[] = rawEnemies.map(e => ({
          id: e.id,
          isAlly: false,
          name: e.name,
          level: e.level,
          maxHp: e.maxHp,
          currentHp: e.currentHp,
          isBoss: e.isBoss,
          stats: { 
             hp: e.maxHp, maxHp: e.maxHp,
             attack: e.attack, armor: e.armor,
             critRate: 5, critDmg: 50, dodge: 0,
             hpRegen: 0, speed: 1, lifesteal: 0,
             armorPen: 0, dmgRed: 0, dmgInc: 0, atkSpeed: 0
          } as DerivedStats,
          avatarSeed: e.avatarSeed,
          petAvatarSeed: e.petAvatarSeed // Map the generated pet visual to the combat unit
      }));

      setCombatEnemies(newCombatEnemies);
      addLog(`遭遇了 ${rawEnemies.length} 个敌人${isBossStage ? ' (BOSS)' : ''}!`, 'combat');
    }

    const intervalId = setInterval(() => {
      if (!autoBattleRef.current) return;
      if (isSearchingRef.current) return; 
      if (combatEnemiesRef.current.length === 0) return;

      const aliveAllies = combatAlliesRef.current.filter(u => u.currentHp > 0);
      const aliveEnemies = combatEnemiesRef.current.filter(u => u.currentHp > 0);

      if (aliveAllies.length === 0) {
          handleDefeat();
          return;
      }

      const newEnemyState = [...combatEnemiesRef.current];
      const newAllyState = [...combatAlliesRef.current];

      aliveAllies.forEach((ally) => {
          const allyIdx = newAllyState.findIndex(u => u.id === ally.id);
          if (allyIdx === -1) return;

          const validTargets = newEnemyState.filter(e => e.currentHp > 0);
          if (validTargets.length === 0) return;
          const target = validTargets[Math.floor(Math.random() * validTargets.length)];
          const targetIdx = newEnemyState.findIndex(u => u.id === target.id);

          newAllyState[allyIdx].animState = 'animate-lunge-right';
          
          let pDmg = 0;
          let pCrit = false;
          
          if (invincibleRef.current) {
              pDmg = 999999;
              pCrit = true;
          } else {
             const res = calculateDamage(
                 ally.stats.attack, ally.stats.critRate, ally.stats.critDmg, ally.stats.armorPen,
                 target.stats.armor, target.level
             );
             pDmg = res.damage;
             pCrit = res.isCrit;
          }

          const newHp = Math.max(0, target.currentHp - pDmg);
          newEnemyState[targetIdx].currentHp = newHp;
          newEnemyState[targetIdx].animState = 'animate-hit';

          setTimeout(() => {
             addFloatingText(pCrit ? `${pDmg}!` : `${pDmg}`, targetIdx, false, 'damage', pCrit);
          }, 150);

          if (ally.stats.lifesteal > 0 && pDmg > 0 && !invincibleRef.current) {
               const heal = Math.floor(pDmg * (ally.stats.lifesteal / 100));
               if (heal > 0) {
                   const healedHp = Math.min(ally.stats.maxHp, ally.currentHp + heal);
                   newAllyState[allyIdx].currentHp = healedHp;
                   setTimeout(() => addFloatingText(`+${heal}`, allyIdx, true, 'heal'), 200);
               }
          }
      });

      const currentlyAliveEnemies = newEnemyState.filter(e => e.currentHp > 0);

      currentlyAliveEnemies.forEach((enemy) => {
          const enemyIdx = newEnemyState.findIndex(u => u.id === enemy.id);
          
          const validTargets = newAllyState.filter(a => a.currentHp > 0);
          if (validTargets.length === 0) return;
          const target = validTargets[Math.floor(Math.random() * validTargets.length)];
          const targetIdx = newAllyState.findIndex(u => u.id === target.id);

          newEnemyState[enemyIdx].animState = 'animate-lunge-left';

           let eDmg = 0;
           let eCrit = false;
           
           if (!invincibleRef.current) {
              const res = calculateDamage(
                  enemy.stats.attack, 5, 50, 0, target.stats.armor, target.level, target.stats.dmgRed
              );
              eDmg = res.damage;
              eCrit = res.isCrit;
           }

           const newHp = Math.max(0, target.currentHp - eDmg);
           newAllyState[targetIdx].currentHp = newHp;
           
           if (eDmg > 0) {
              setTimeout(() => {
                  newAllyState[targetIdx].animState = 'animate-shake';
                  addFloatingText(`${eDmg}`, targetIdx, true, 'damage', eCrit);
                  setDamageFlash(true);
                  setTimeout(() => setDamageFlash(false), 300);
              }, 400); 
           } else {
               setTimeout(() => addFloatingText("无敌", targetIdx, true, 'heal'), 400);
           }
      });

      setCombatAllies([...newAllyState]);
      setCombatEnemies([...newEnemyState]);

      setTimeout(() => {
          setCombatAllies(prev => prev.map(u => ({ ...u, animState: '' })));
          setCombatEnemies(prev => prev.map(u => ({ ...u, animState: '' })));
      }, 700);

      const aliveEnemiesCount = newEnemyState.filter(e => e.currentHp > 0).length;
      if (aliveEnemiesCount === 0) {
          handleVictory(newEnemyState); 
      }

      const aliveAlliesCount = newAllyState.filter(a => a.currentHp > 0).length;
      if (aliveAlliesCount === 0) {
          handleDefeat();
      }

    }, 1500); 

    return () => clearInterval(intervalId);
  }, [autoBattle, currentLevel, highestLevel, addLog, invincible, isSearching]); 

  const handleVictory = (defeatedEnemies: CombatUnit[]) => {
    let totalGold = 0;
    let totalExp = 0;
    let drops: Item[] = [];
    let stones = 0;
    let isBossEncounter = false;

    defeatedEnemies.forEach(e => {
        const scale = e.isBoss ? 10 : 1;
        const gold = Math.floor((15 + e.level * 3) * scale);
        const exp = Math.floor((30 + e.level * 8) * scale);
        
        totalGold += gold;
        totalExp += exp;
        
        if (e.isBoss) {
            isBossEncounter = true;
            stones += Math.floor(Math.random() * 2) + 1;
        }

        const dropChance = e.isBoss ? 1.0 : 0.3;
        if (Math.random() < dropChance) {
            drops.push(generateItem(e.level));
        }
    });

    addLog(`战斗胜利！击败了 ${defeatedEnemies.length} 个敌人`, 'combat');
    addFloatingText(`+${totalGold}G`, 0, true, 'gold');
    setTimeout(() => addFloatingText(`+${totalExp}Exp`, 0, true, 'exp'), 300);

    if (stones > 0) {
        setPlayer(p => ({ ...p, enchantStones: p.enchantStones + stones }));
        addLog(`掉落: 启灵石 x${stones}`, 'loot');
    }

    setPlayer(prev => {
      let nextExp = prev.currentExp + totalExp;
      let nextLvl = prev.level;
      let nextMaxExp = prev.maxExp;
      
      let nextInv = prev.inventory;
      let addedGold = prev.gold + totalGold;
      let leveledUp = false;

      drops.forEach(item => {
          if (prev.autoSellSettings[item.rarity]) {
              addedGold += item.value;
              addLog(`出售: ${item.name} (+${item.value}G)`, 'system');
          } else {
              if (nextInv.length < prev.maxInventorySize) {
                  nextInv.push(item);
                  addLog(`掉落: ${item.name}`, 'loot');
              } else {
                  addLog(`背包已满，丢弃了 ${item.name}`, 'system');
              }
          }
      });
      
      while (nextExp >= nextMaxExp && nextLvl < LEVEL_CAP) {
        nextExp -= nextMaxExp;
        nextLvl++;
        nextMaxExp = EXP_TABLE(nextLvl);
        
        prev.heroes.forEach(h => {
            h.level = nextLvl;
            if (!h.baseStats) {
                h.baseStats = { str: 5, dex: 5, int: 5, vit: 5, spi: 5, freePoints: 0 };
            }
            h.baseStats.freePoints += 5; 
        });
        leveledUp = true;
        addLog(`队伍升级! 等级 ${nextLvl}`, 'system');
      }
      
      if (leveledUp) {
          setIsLevelingUp(true);
          setTimeout(() => setIsLevelingUp(false), 2000);
          addFloatingText("Level Up!", 0, true, 'exp');
      }

      return {
        ...prev,
        currentExp: nextExp,
        maxExp: nextMaxExp,
        level: nextLvl,
        gold: addedGold,
        heroes: [...prev.heroes], 
        inventory: nextInv
      };
    });

    if (isBossEncounter) {
        addLog("BOSS被击败! 下一层开启", 'system');
        setKillCount(0);
        if (currentLevel === highestLevel && highestLevel < 100) {
            setHighestLevel(h => h + 1);
        }
        if (currentLevel < 100) {
            setCurrentLevel(l => l + 1);
        }
    } else {
        setKillCount(k => k + 1);
    }

    setCombatAllies(prev => prev.map(a => ({ ...a, currentHp: Math.min(a.maxHp, a.currentHp + Math.floor(a.maxHp * 0.3)) })));
    setCombatEnemies([]);
    
    setIsSearching(true);
    setTimeout(() => {
        setIsSearching(false);
    }, 2500); 
  };

  const handleDefeat = () => {
    setAutoBattle(false);
    addLog("队伍被击败! 正在撤退...", 'system');
    initCombatUnits(); 
    setCombatEnemies([]);
    setIsSearching(false);
    setKillCount(0); 
  };

  const renderItemSlot = (slot: EquipmentSlot) => {
    const item = getMainHero().equipment[slot];
    const SlotIcon = getItemIcon(item || null, slot);
    
    return (
      <div 
        onClick={() => item && setViewingItem({ item, source: 'equip' })}
        className={`relative group w-12 h-12 bg-slate-900 border rounded-lg flex flex-col items-center justify-center shadow-inner hover:border-slate-500 transition-colors cursor-pointer active:scale-95 ${item ? RARITY_COLORS[item.rarity].replace('text-', 'border-') : 'border-slate-700'}`}
      >
        {item ? (
          <>
             <div className={`text-xl ${RARITY_COLORS[item.rarity]} filter drop-shadow-md z-10`}>
               <SlotIcon size={20} />
             </div>
             {item.isSet && <div className="absolute top-0 right-0 w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_5px_rgba(52,211,153,1)]"></div>}
             {item.enchantLevel > 0 && (
                 <div className="absolute top-0 right-0 z-20 bg-pink-600/90 text-white text-[9px] px-1 rounded-bl-lg font-bold leading-tight">+{item.enchantLevel}</div>
             )}
          </>
        ) : (
          <div className="text-slate-800 opacity-50"><SlotIcon size={18} /></div>
        )}
      </div>
    );
  };

  const getEquippedItemForComparison = () => {
    if (viewingItem?.source === 'bag') {
        if (viewingItem.item.type === 'consumable') return null;
        return getMainHero().equipment[viewingItem.item.type as EquipmentSlot];
    }
    return null;
  };

  const comparisonItem = getEquippedItemForComparison();
  const mainHeroDerived = calculateDerivedStats(getMainHero(), player.pets);
  const estIncome = calculateEstimatedIncome();

  // --- Render Battlefield Unit ---
  const RenderCombatUnit = ({ unit, index, isLeft }: { unit: CombatUnit, index: number, isLeft: boolean }) => (
      <div className={`relative flex flex-col items-center gap-1 transition-transform duration-200 ${unit.animState}`}>
          {/* Health Bar */}
          <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700 mb-1">
               <div className={`h-full ${isLeft ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${(unit.currentHp / unit.maxHp) * 100}%` }}></div>
          </div>
          
          {/* Avatar */}
          <div 
             onClick={() => !isLeft && setShowEnemyDetail(unit)}
             className={`w-16 h-16 rounded-lg border-2 bg-slate-900/80 shadow-lg relative ${unit.currentHp <= 0 ? 'grayscale opacity-50' : ''} ${isLeft ? 'border-indigo-500' : (unit.isBoss ? 'border-red-500 shadow-red-500/50' : 'border-slate-600')} ${!isLeft ? 'cursor-pointer hover:scale-105' : ''}`}
          >
              <img 
                 src={`https://api.dicebear.com/9.x/${isLeft ? 'adventurer' : 'bottts-neutral'}/svg?seed=${unit.avatarSeed}&backgroundColor=transparent`}
                 alt={unit.name}
                 className="w-full h-full object-cover transform scale-110 rounded-lg"
              />
              
              {/* Pet Overlay (Visual Integration) */}
              {unit.petAvatarSeed && (
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-2 border-slate-800 bg-slate-900 overflow-hidden shadow-md z-10">
                      <img 
                          src={`https://api.dicebear.com/9.x/bottts/svg?seed=${unit.petAvatarSeed}&backgroundColor=transparent`}
                          alt="Pet"
                          className="w-full h-full object-cover"
                      />
                  </div>
              )}
          </div>

          {/* Damage Flash */}
          {unit.animState === 'animate-hit' && (
              <div className="absolute inset-0 bg-red-500/40 rounded-lg animate-ping pointer-events-none"></div>
          )}

          {/* Name/Level */}
          <div className="text-[9px] bg-black/60 px-1 rounded text-slate-300 truncate max-w-[60px]">
              Lv.{unit.level}
          </div>
      </div>
  );

  return (
    <div className={`h-full w-full bg-black flex flex-col relative overflow-hidden`}>
      
      {/* Damage Flash Overlay */}
      {damageFlash && <div className="absolute inset-0 pointer-events-none z-[60] animate-flash-red"></div>}

      {/* OFFLINE REPORT MODAL */}
      {offlineReport && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-300">
              <div className="w-full max-w-sm bg-slate-900 border border-yellow-500/30 rounded-2xl p-6 shadow-[0_0_50px_rgba(234,179,8,0.2)] text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent"></div>
                  <div className="mx-auto w-16 h-16 bg-yellow-900/30 rounded-full flex items-center justify-center mb-4 border border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.3)]">
                      <Clock size={32} className="text-yellow-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">欢迎回来</h2>
                  <p className="text-slate-400 text-sm mb-6">英雄在你离开的 <span className="text-slate-200 font-bold">{offlineReport.timeSpan}</span> 里仍在英勇战斗。</p>
                  <div className="bg-black/40 rounded-xl p-4 space-y-3 border border-white/5 mb-6">
                      <div className="flex justify-between items-center"><span className="text-slate-400 text-sm">获得金币</span><span className="text-yellow-400 font-bold font-mono text-lg flex items-center gap-1">+{offlineReport.gold} <Gem size={14}/></span></div>
                      <div className="flex justify-between items-center"><span className="text-slate-400 text-sm">获得经验</span><span className="text-purple-400 font-bold font-mono text-lg flex items-center gap-1">+{offlineReport.exp} <Sparkles size={14}/></span></div>
                      {offlineReport.levelsGained > 0 && <div className="flex justify-between items-center pt-2 border-t border-white/10 mt-2"><span className="text-slate-300 text-sm">等级提升</span><span className="text-green-400 font-bold font-mono text-lg animate-pulse">+{offlineReport.levelsGained}</span></div>}
                  </div>
                  <button onClick={() => setOfflineReport(null)} className="w-full py-3 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded-xl shadow-lg shadow-yellow-900/50 active:scale-95 transition-transform">收入囊中</button>
              </div>
          </div>
      )}

      {/* LOG HISTORY MODAL */}
      {showLogModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={() => setShowLogModal(false)}>
            <div onClick={e => e.stopPropagation()} className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-0 flex flex-col max-h-[70vh] shadow-2xl overflow-hidden">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2"><ScrollText size={18}/> 战斗日志</h2>
                    <button onClick={() => setShowLogModal(false)} className="bg-slate-800 p-1.5 rounded-full hover:bg-slate-700"><X size={16}/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-1.5 bg-slate-900">
                    {logs.map(log => (
                        <div key={log.id} className="text-xs font-mono border-b border-white/5 pb-1 last:border-0 flex gap-2">
                             <span className="text-slate-600">[{new Date(log.timestamp).toLocaleTimeString([], {hour12: false, hour:'2-digit', minute:'2-digit', second:'2-digit'})}]</span>
                             <span className={`${log.type === 'combat' ? 'text-slate-400' : log.type === 'loot' ? 'text-yellow-400 font-bold' : 'text-blue-300'}`}>{log.message}</span>
                        </div>
                    ))}
                    {logs.length === 0 && <div className="text-center text-slate-600 py-10">暂无日志记录</div>}
                </div>
            </div>
        </div>
      )}

      {/* ENEMY DETAIL MODAL */}
      {showEnemyDetail && (
         <div className="fixed inset-0 z-[115] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowEnemyDetail(null)}>
             <div onClick={(e) => e.stopPropagation()} className="w-64 bg-slate-900 border border-slate-600 rounded-xl p-4 shadow-2xl animate-in zoom-in duration-200">
                  <div className="flex justify-between items-start mb-4">
                      <h3 className="text-white font-bold">{showEnemyDetail.name}</h3>
                      <button onClick={() => setShowEnemyDetail(null)} className="text-slate-400 hover:text-white"><X size={16}/></button>
                  </div>
                  <div className="space-y-2 text-xs">
                        <div className="flex justify-between"><span className="text-slate-400">生命</span> <span className="text-red-400 font-mono">{showEnemyDetail.currentHp}/{showEnemyDetail.maxHp}</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">攻击</span> <span className="text-yellow-400 font-mono">{showEnemyDetail.stats.attack}</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">护甲</span> <span className="text-blue-400 font-mono">{showEnemyDetail.stats.armor}</span></div>
                  </div>
             </div>
         </div>
      )}

      {/* BAG SETTINGS MODAL */}
      {showBagSettings && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={() => setShowBagSettings(false)}>
              <div onClick={e => e.stopPropagation()} className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2"><Settings size={20}/> 游戏设置</h2>
                      <button onClick={() => setShowBagSettings(false)} className="bg-slate-800 p-1 rounded-full hover:bg-slate-700"><X size={18}/></button>
                  </div>
                  <div className="space-y-4 mb-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                      <div className="space-y-2">
                          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">自动出售与清理</h3>
                          {Object.values(ItemRarity).map(rarity => (
                              <div key={rarity} className={`grid grid-cols-[1.5fr_1fr_1fr] gap-2 items-center bg-slate-800/50 p-3 rounded-lg border border-slate-800 ${RARITY_COLORS[rarity].replace('text-', 'border-l-4 border-l-')}`}>
                                  <span className={`font-bold text-sm ${RARITY_COLORS[rarity]}`}>{rarity}</span>
                                  <div className="flex justify-center">
                                      <button 
                                        onClick={() => toggleAutoSell(rarity)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${player.autoSellSettings[rarity] ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-slate-700 text-slate-500 border border-slate-600'}`}
                                      >
                                          {player.autoSellSettings[rarity] ? <CheckSquare size={14} /> : <Square size={14} />}
                                          {player.autoSellSettings[rarity] ? '开启' : '关闭'}
                                      </button>
                                  </div>
                                  <div className="flex justify-end">
                                      <button 
                                        onClick={() => batchSell(rarity)}
                                        className="bg-slate-700 hover:bg-red-900/50 text-slate-300 hover:text-red-200 p-1.5 rounded-lg transition-colors border border-slate-600 hover:border-red-800"
                                      >
                                          <Trash2 size={16} />
                                      </button>
                                  </div>
                              </div>
                          ))}
                      </div>
                      <div className="pt-4 border-t border-slate-800">
                          <button 
                            onClick={resetGameData}
                            className="w-full flex items-center justify-center gap-2 bg-red-950/50 hover:bg-red-900 border border-red-900 hover:border-red-700 text-red-500 hover:text-red-300 py-3 rounded-lg font-bold transition-colors"
                          >
                             <RotateCcw size={16} /> 重置所有存档
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* GLOBAL MODAL FOR ITEM DETAILS */}
      {viewingItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm overflow-y-auto" onClick={() => setViewingItem(null)}>
           <div onClick={e => e.stopPropagation()} className="min-h-full flex flex-col items-center justify-center p-4 w-full cursor-default">
               <div className="flex flex-col-reverse md:flex-row gap-4 items-center md:items-start relative z-10 w-full md:w-auto">
                  {comparisonItem && (
                     <div className="w-full md:w-auto flex flex-col items-center opacity-90 hover:opacity-100 transition-opacity">
                        <div className="text-center text-slate-500 font-bold mb-2 text-[10px] uppercase tracking-widest bg-black/50 py-1 rounded w-full md:w-32">当前装备</div>
                        <ItemTooltip 
                            item={comparisonItem} 
                            onLock={toggleLock}
                            onEnchant={handleEnchant}
                            playerEquipment={getMainHero().equipment}
                            playerStones={player.enchantStones}
                        />
                     </div>
                  )}
                  <div className="w-full md:w-auto flex flex-col items-center shadow-[0_0_30px_rgba(0,0,0,0.5)] z-20">
                      {comparisonItem && <div className="text-center text-green-500 font-bold mb-2 text-[10px] uppercase tracking-widest bg-black/50 py-1 rounded w-full md:w-32">新物品</div>}
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
           </div>
        </div>
      )}

      {/* 1. UPPER SECTION: COMBAT STAGE */}
      <div className="flex-[5] relative bg-slate-900 overflow-hidden flex flex-col">
        {/* Background */}
        <div className="absolute inset-0 z-0 overflow-hidden">
           <img 
            src="https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?q=80&w=2544&auto=format&fit=crop" 
            className={`w-[200%] h-full object-cover opacity-30 ${isSearching ? 'animate-bg-scroll' : ''}`}
            alt="dungeon"
           />
           <div className="absolute inset-0 bg-gradient-to-t from-black via-slate-900/50 to-transparent"></div>
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#000000_100%)]"></div>
        </div>

        {/* Top Info Bar */}
        <div className="relative z-20 flex justify-between items-start p-4">
           <div className="flex flex-col gap-1">
             <div className="flex items-center gap-2">
                <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded text-xs font-bold font-mono flex items-center gap-1">
                  <Gem size={10} /> {player.gold}
                </span>
                <span className="bg-pink-500/10 text-pink-300 border border-pink-500/20 px-2 py-0.5 rounded text-xs font-bold font-mono flex items-center gap-1">
                  <Sparkles size={10} /> {player.enchantStones}
                </span>
                <span className={`bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded text-xs font-bold font-mono transition-all duration-500 ${isLevelingUp ? 'text-yellow-400 scale-125 animate-gold-flash border-yellow-500' : 'text-purple-400'}`}>
                  Lv.{player.level}
                </span>
             </div>
             <div className="w-32">
                <ProgressBar current={player.currentExp} max={player.maxExp} colorClass="bg-purple-500" height="h-1.5" showText={false} />
             </div>
           </div>
           
           <div className="flex flex-col items-end">
              <div className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
                当前层数
                {invincible && <ShieldCheck size={14} className="text-blue-400 animate-pulse" />}
              </div>
              <div className="text-3xl font-black text-slate-200 leading-none flex items-center gap-2 drop-shadow-lg">
                <span className="text-slate-600 text-lg">#</span> {currentLevel}
              </div>
           </div>
        </div>

        {/* Combat Battlefield (Grid System) */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-4 pb-12">
           
           {/* Floating Texts */}
           <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
             {floatingTexts.map(ft => (
                <div 
                  key={ft.id}
                  className={`absolute whitespace-nowrap ${ft.color} ${ft.scale ? 'scale-125' : 'scale-100'}`}
                  style={{ left: `${ft.x}%`, top: `${ft.y}%`, transform: 'translate(-50%, -50%)' }}
                >
                  <div className="animate-float-up">{ft.value}</div>
                </div>
              ))}
           </div>

           {/* Searching State */}
           {isSearching ? (
               <div className="absolute inset-0 flex flex-col items-center justify-center z-40">
                    <div className="text-sm font-bold text-slate-300 mb-2 animate-pulse">正在前往下一区域</div>
                    <div className="flex gap-2">
                       <Footprints className="text-slate-500 animate-bounce delay-0" />
                       <Footprints className="text-slate-500 animate-bounce delay-100" />
                       <Footprints className="text-slate-500 animate-bounce delay-200" />
                    </div>
               </div>
           ) : null}
           
           {/* Battlefield Grid: Allies (Left) vs Enemies (Right) */}
           <div className={`flex justify-between items-center w-full max-w-4xl mx-auto h-[60%] ${isSearching ? 'opacity-0' : 'opacity-100'} transition-opacity duration-500`}>
                {/* Left Side: Allies (Up to 5) */}
                <div className="flex flex-col gap-4 w-[40%] items-start pl-4 justify-center">
                    {combatAllies.map((unit, idx) => (
                        <div key={unit.id} className="relative">
                            <RenderCombatUnit unit={unit} index={idx} isLeft={true} />
                        </div>
                    ))}
                </div>

                {/* Right Side: Enemies (Up to 5) */}
                <div className="flex flex-col gap-4 w-[40%] items-end pr-4 justify-center">
                     {combatEnemies.length > 0 ? (
                         combatEnemies.map((unit, idx) => (
                            <div key={unit.id} className="relative">
                                <RenderCombatUnit unit={unit} index={idx} isLeft={false} />
                            </div>
                         ))
                     ) : (
                         !isSearching && (
                            <div className="flex items-center justify-center h-24 w-24">
                                <RefreshCcw className="animate-spin text-slate-700" />
                            </div>
                         )
                     )}
                </div>
           </div>

        </div>

        {/* Mini Log */}
        <div 
           className="h-24 bg-gradient-to-t from-black to-transparent relative z-20 px-4 pb-2 flex flex-col justify-end cursor-pointer group hover:bg-white/5 transition-colors"
           onClick={() => setShowLogModal(true)}
        >
           <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 text-[10px] flex items-center gap-1">
              <ScrollText size={12}/> 查看详情
           </div>
           <div className="text-[10px] font-mono space-y-1 opacity-80 mask-image-linear-gradient-to-b">
             {logs.slice(0, 4).map(log => (
               <div key={log.id} className={`truncate ${log.type === 'combat' ? 'text-slate-400' : log.type === 'loot' ? 'text-yellow-400' : 'text-blue-300'}`}>
                 {log.message}
               </div>
             ))}
           </div>
        </div>
      </div>

      {/* 2. LOWER SECTION: DASHBOARD */}
      <div className="flex-[4] bg-slate-950 border-t border-white/10 flex flex-col relative z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.8)] min-h-0">
         
         <div className="flex-1 overflow-y-auto custom-scrollbar p-4 relative">
            {/* ROLE TAB */}
            {activeTab === 'role' && (
              <div className="h-full">
                {!showRoleDetail ? (
                  <div className="flex flex-col h-full items-center justify-center animate-in fade-in zoom-in duration-300 pb-10">
                    <div className="w-full max-w-sm bg-slate-900/50 border border-white/5 rounded-2xl p-4 relative overflow-hidden backdrop-blur-sm shadow-2xl">
                       <h2 className="text-lg font-bold text-white mb-4 tracking-wider">队长状态 (队伍: {player.heroes.length}人)</h2>
                       <div className="space-y-3 mb-4">
                           {/* HP (Of Main Hero) */}
                           <div className="bg-black/40 p-3 rounded-lg border border-white/5">
                             <div className="text-slate-500 text-xs uppercase mb-1 flex justify-between">
                                <span>生命值</span>
                                <span className="text-green-500 font-mono">
                                    {Math.floor(((combatAllies[0]?.currentHp || mainHeroDerived.maxHp) / mainHeroDerived.maxHp) * 100)}%
                                </span>
                             </div>
                             <div className="text-base font-bold text-green-400 flex items-center gap-2 mb-1">
                               <Heart size={16} fill="currentColor" className="opacity-80"/> 
                               {Math.floor(combatAllies[0]?.currentHp || mainHeroDerived.maxHp)} <span className="text-slate-600 text-xs">/ {mainHeroDerived.maxHp}</span>
                             </div>
                             <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 transition-all duration-500" style={{width: `${((combatAllies[0]?.currentHp || mainHeroDerived.maxHp)/mainHeroDerived.maxHp)*100}%`}}></div>
                             </div>
                           </div>

                           {/* Stats Grid */}
                           <div className="grid grid-cols-2 gap-2">
                              <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                                <div className="text-slate-500 text-[10px] uppercase mb-0.5">攻击力</div>
                                <div className="text-sm font-bold text-red-400 flex items-center gap-2"><Sword size={12}/> {invincible ? '999999' : mainHeroDerived.attack}</div>
                              </div>
                              <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                                <div className="text-slate-500 text-[10px] uppercase mb-0.5">防御力</div>
                                <div className="text-sm font-bold text-blue-400 flex items-center gap-2"><Shield size={12}/> {mainHeroDerived.armor}</div>
                              </div>
                              <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                                <div className="text-slate-500 text-[10px] uppercase mb-0.5">暴击率</div>
                                <div className="text-sm font-bold text-yellow-400 flex items-center gap-2"><Zap size={12}/> {mainHeroDerived.critRate.toFixed(1)}%</div>
                              </div>
                              <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                                <div className="text-slate-500 text-[10px] uppercase mb-0.5">暴击伤害</div>
                                <div className="text-sm font-bold text-orange-400 flex items-center gap-2"><Sparkles size={12}/> {150 + mainHeroDerived.critDmg}%</div>
                              </div>
                           </div>
                       </div>
                       
                       <button onClick={() => setShowRoleDetail(true)} className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all text-sm">
                         <Info size={16} /> 查看详情与装备
                       </button>

                       {getMainHero().baseStats.freePoints > 0 && <div className="absolute top-4 right-4 flex items-center gap-1"><span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span></div>}
                    </div>
                  </div>
                ) : (
                  // Detail View (Main Hero)
                  <div className="h-full flex flex-col animate-in slide-in-from-right duration-300">
                    <button onClick={() => setShowRoleDetail(false)} className="flex items-center gap-1 text-slate-400 hover:text-white mb-4 text-sm font-bold w-fit">
                      <ArrowLeft size={16} /> 返回概览
                    </button>

                    <div className="flex-1 flex gap-4 overflow-hidden">
                       {/* Stats Column */}
                       <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar pb-24">
                          <div>
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 sticky top-0 bg-slate-950 z-10 py-2">基础属性 (队长)</h3>
                            <div className="space-y-1">
                              <StatRow label="力量" value={getMainHero().baseStats.str} icon={Sword} color="text-red-400" canUpgrade={getMainHero().baseStats.freePoints > 0} onUpgrade={() => upgradeStat('str')} isAnimating={upgradingStat === 'str'} />
                              <StatRow label="敏捷" value={getMainHero().baseStats.dex} icon={Zap} color="text-yellow-300" canUpgrade={getMainHero().baseStats.freePoints > 0} onUpgrade={() => upgradeStat('dex')} isAnimating={upgradingStat === 'dex'} />
                              <StatRow label="智力" value={getMainHero().baseStats.int} icon={Brain} color="text-blue-400" canUpgrade={getMainHero().baseStats.freePoints > 0} onUpgrade={() => upgradeStat('int')} isAnimating={upgradingStat === 'int'} />
                              <StatRow label="耐力" value={getMainHero().baseStats.vit} icon={Shield} color="text-green-400" canUpgrade={getMainHero().baseStats.freePoints > 0} onUpgrade={() => upgradeStat('vit')} isAnimating={upgradingStat === 'vit'} />
                              <StatRow label="精神" value={getMainHero().baseStats.spi} icon={Heart} color="text-purple-400" canUpgrade={getMainHero().baseStats.freePoints > 0} onUpgrade={() => upgradeStat('spi')} isAnimating={upgradingStat === 'spi'} />
                            </div>
                            {getMainHero().baseStats.freePoints > 0 && <div className="text-center mt-2"><span className="text-green-400 text-xs font-bold animate-pulse">可用点数: {getMainHero().baseStats.freePoints}</span></div>}
                          </div>
                          
                          {getMainHero().activePetId && (
                              <div className="mt-4 p-3 bg-indigo-900/20 border border-indigo-500/30 rounded-lg">
                                  <div className="text-xs font-bold text-indigo-300 mb-1 flex items-center gap-2"><Dog size={12}/> 参战宠物</div>
                                  <div className="text-sm text-indigo-100 font-bold">{player.pets.find(p=>p.id===getMainHero().activePetId)?.name}</div>
                              </div>
                          )}

                          <div>
                             <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 sticky top-0 bg-slate-950 z-10 py-2">高级战斗属性</h3>
                             <div className="bg-white/5 rounded-lg p-3 space-y-1">
                                <DetailRow label="生命上限" value={mainHeroDerived.maxHp} icon={Heart} colorClass="text-green-400" />
                                <DetailRow label="生命恢复" value={`${mainHeroDerived.hpRegen.toFixed(1)}/秒`} icon={Activity} colorClass="text-green-400" />
                                <DetailRow label="生命吸取" value={`${mainHeroDerived.lifesteal}%`} icon={Heart} colorClass="text-red-500" />
                                <div className="h-px bg-white/10 my-2"></div>
                                <DetailRow label="攻击力" value={mainHeroDerived.attack} icon={Sword} colorClass="text-red-400" />
                                <DetailRow label="增伤" value={`${mainHeroDerived.dmgInc.toFixed(1)}%`} icon={Sword} />
                                <DetailRow label="护甲穿透" value={mainHeroDerived.armorPen.toFixed(0)} icon={Sword} />
                                <div className="h-px bg-white/10 my-2"></div>
                                <DetailRow label="物理防御" value={mainHeroDerived.armor} icon={Shield} colorClass="text-blue-400" />
                                <DetailRow label="伤害减免" value={`${mainHeroDerived.dmgRed.toFixed(1)}%`} icon={Shield} />
                                <DetailRow label="闪避率" value={`${mainHeroDerived.dodge.toFixed(1)}%`} icon={TrendingUp} />
                             </div>
                          </div>
                       </div>
                       {/* Equip Column */}
                       <div className="flex-1 overflow-y-auto custom-scrollbar pb-24">
                          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 text-right sticky top-0 bg-slate-950 z-10 py-2">装备</h3>
                          <div className="grid grid-cols-2 gap-2 justify-items-end pb-4">
                             {renderItemSlot(EquipmentSlot.HELMET)}
                             {renderItemSlot(EquipmentSlot.NECKLACE)}
                             {renderItemSlot(EquipmentSlot.CHEST)}
                             {renderItemSlot(EquipmentSlot.AMULET)}
                             {renderItemSlot(EquipmentSlot.LEGS)}
                             {renderItemSlot(EquipmentSlot.RING1)}
                             {renderItemSlot(EquipmentSlot.BOOTS)}
                             {renderItemSlot(EquipmentSlot.RING2)}
                             {renderItemSlot(EquipmentSlot.GLOVES)}
                             {renderItemSlot(EquipmentSlot.WEAPON)}
                          </div>
                       </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PET TAB */}
            {activeTab === 'pet' && (
                <div className="h-full flex flex-col animate-in fade-in duration-300 pb-24">
                    <div className="flex justify-between items-center mb-4 sticky top-0 bg-slate-950 z-10 py-2">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">灵兽栏 ({player.pets.length})</h3>
                    </div>
                    {player.pets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-2">
                            <Bird size={48} className="opacity-20"/>
                            <p>暂无宠物，请去背包孵化宠物蛋</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {player.pets.map(pet => {
                                const isEquipped = getMainHero().activePetId === pet.id;
                                const breed = PET_BREEDS.find(b => b.id === pet.breedId);
                                
                                return (
                                    <div key={pet.id} className="bg-slate-900 border border-slate-700 rounded-xl p-3 flex gap-3 shadow-lg">
                                        <div className="w-16 h-16 rounded-lg bg-black/50 border border-slate-600 flex-shrink-0 relative overflow-hidden">
                                            <img src={`https://api.dicebear.com/9.x/bottts/svg?seed=${pet.avatarSeed}`} className="w-full h-full object-cover"/>
                                            {isEquipped && <div className="absolute top-0 right-0 bg-green-500 text-black text-[9px] font-bold px-1 rounded-bl">参战</div>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <div>
                                                    <h4 className="font-bold text-white text-sm">{pet.name}</h4>
                                                    <div className="text-[10px] text-slate-400">{breed?.name}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[10px] text-purple-400 font-bold">成长: {pet.qualities.grow}</div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-slate-400">
                                                <div className="flex justify-between"><span>攻击</span> <span className="text-slate-200">{pet.qualities.atk}</span></div>
                                                <div className="flex justify-between"><span>防御</span> <span className="text-slate-200">{pet.qualities.def}</span></div>
                                                <div className="flex justify-between"><span>体力</span> <span className="text-slate-200">{pet.qualities.hp}</span></div>
                                                <div className="flex justify-between"><span>速度</span> <span className="text-slate-200">{pet.qualities.spd}</span></div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col justify-center border-l border-white/5 pl-3">
                                            <button 
                                                onClick={() => equipPet(pet.id)}
                                                className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${isEquipped ? 'bg-red-900/50 text-red-300 border border-red-800' : 'bg-green-600 hover:bg-green-500 text-white'}`}
                                            >
                                                {isEquipped ? '休息' : '出战'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* BAG TAB */}
            {activeTab === 'bag' && (
              <div className="h-full flex flex-col animate-in fade-in duration-300">
                <div className="flex justify-between items-center mb-4 sticky top-0 bg-slate-950 z-10 py-2">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">背包 ({player.inventory.length}/{player.maxInventorySize})</h3>
                  <div className="flex gap-2">
                     <button 
                        onClick={() => setShowBagSettings(true)}
                        className="flex items-center gap-1 text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 transition-colors"
                     >
                        <Settings size={12} /> 设置
                     </button>
                     <button onClick={() => setPlayer(p => ({...p, inventory: p.inventory.sort((a,b) => b.value - a.value)}))} className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 transition-colors">整理</button>
                  </div>
                </div>
                <div className="grid grid-cols-6 gap-2 content-start pb-24">
                  {player.inventory.map(item => {
                     const ItemIcon = getItemIcon(item);
                     return (
                        <div 
                           key={item.id} 
                           onClick={() => setViewingItem({ item, source: 'bag' })}
                           className={`group relative w-full aspect-square ${RARITY_BG_COLORS[item.rarity]} border rounded-lg cursor-pointer flex items-center justify-center active:scale-95 transition-transform ${item.isSet ? 'ring-1 ring-emerald-500' : ''}`}
                        >
                           <ItemIcon size={16} className={RARITY_COLORS[item.rarity]} />
                           {item.isLocked && <div className="absolute top-1 left-1 text-yellow-500/80"><Lock size={10} /></div>}
                           <div className={`absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full ${RARITY_COLORS[item.rarity].split(' ')[0].replace('text', 'bg')}`}></div>
                           {item.enchantLevel > 0 && (
                             <div className="absolute top-0 right-0 z-10 bg-pink-600/90 text-white text-[9px] px-0.5 rounded-bl font-bold leading-tight">+{item.enchantLevel}</div>
                           )}
                        </div>
                     );
                  })}
                  {Array.from({ length: Math.max(0, player.maxInventorySize - player.inventory.length) }).map((_, i) => (
                    <div key={i} className="w-full aspect-square bg-white/5 rounded-lg border border-white/5"></div>
                  ))}
                </div>
              </div>
            )}

            {/* STAGE TAB */}
            {activeTab === 'stage' && (
              <div className="h-full flex flex-col items-center justify-center space-y-6 animate-in fade-in duration-300">
                 <div className="text-center space-y-2">
                    <h2 className="text-xl font-bold text-white">深渊第 {currentLevel} 层</h2>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">
                       击败 <span className="text-red-400">BOSS</span> 以开启下一层。
                       <br/>当前进度: {killCount >= 4 ? 'BOSS战' : `小兵 ${killCount}/4`}
                    </p>
                 </div>

                 <div className="flex gap-4 items-center">
                    <button 
                      disabled={currentLevel <= 1 || autoBattle}
                      onClick={() => { setCurrentLevel(c => c - 1); setCombatEnemies([]); setKillCount(0); }}
                      className="p-4 bg-slate-800 rounded-xl border border-slate-700 disabled:opacity-20 active:scale-95 transition-transform"
                    >
                      <ChevronUp className="-rotate-90" />
                    </button>
                    
                    <button 
                      onClick={() => setAutoBattle(!autoBattle)}
                      className={`w-32 h-32 rounded-full border-4 flex flex-col items-center justify-center gap-2 transition-all shadow-[0_0_30px_rgba(0,0,0,0.5)] active:scale-95 ${autoBattle ? 'bg-red-950/50 border-red-500 text-red-500 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.4)]' : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-green-500 hover:text-green-500'}`}
                    >
                      {autoBattle ? <Pause size={32} fill="currentColor"/> : <Play size={32} fill="currentColor" className="ml-1"/>}
                      <span className="text-sm font-black uppercase tracking-widest">{autoBattle ? 'FIGHTING' : 'START'}</span>
                    </button>

                    <button 
                      disabled={currentLevel >= highestLevel || autoBattle}
                      onClick={() => { setCurrentLevel(c => c + 1); setCombatEnemies([]); setKillCount(0); }}
                      className="p-4 bg-slate-800 rounded-xl border border-slate-700 disabled:opacity-20 active:scale-95 transition-transform"
                    >
                      <ChevronUp className="rotate-90" />
                    </button>
                 </div>

                 <div className="flex flex-col gap-2 items-center">
                    <button 
                        onClick={() => setInvincible(!invincible)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${invincible ? 'bg-blue-900/50 border-blue-500 text-blue-300' : 'bg-slate-900 border-slate-700 text-slate-500'}`}
                    >
                        <ShieldCheck size={16} />
                        <span className="text-xs font-bold">{invincible ? '无敌模式: ON' : '无敌模式: OFF'}</span>
                    </button>

                    {/* Estimated Income Display */}
                    <div className="mt-4 bg-slate-900/80 border border-slate-700 rounded-xl p-3 flex flex-col items-center gap-1 w-64">
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">预计挂机效率 / 小时</div>
                        <div className="flex justify-between w-full px-4 pt-1">
                            <div className="flex items-center gap-1 text-yellow-400 font-mono font-bold text-xs">
                                <Gem size={12}/> {estIncome.goldPerHour.toLocaleString()}
                            </div>
                            <div className="flex items-center gap-1 text-purple-400 font-mono font-bold text-xs">
                                <Sparkles size={12}/> {estIncome.expPerHour.toLocaleString()}
                            </div>
                        </div>
                    </div>
                 </div>
              </div>
            )}
         </div>

         {/* 3. NAVIGATION BAR */}
         <div className="h-16 bg-slate-950/80 backdrop-blur-md border-t border-white/10 flex justify-around items-center px-2">
            <button 
               onClick={() => { setActiveTab('role'); setShowRoleDetail(false); }}
               className={`flex flex-col items-center gap-1 p-2 rounded-xl w-16 transition-all ${activeTab === 'role' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500 hover:text-slate-300'}`}
            >
               <Users size={20} />
               <span className="text-[10px] font-bold">队伍</span>
            </button>
            <button 
               onClick={() => setActiveTab('pet')}
               className={`flex flex-col items-center gap-1 p-2 rounded-xl w-16 transition-all ${activeTab === 'pet' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500 hover:text-slate-300'}`}
            >
               <Dog size={20} />
               <span className="text-[10px] font-bold">灵兽</span>
            </button>
            <button 
               onClick={() => setActiveTab('bag')}
               className={`flex flex-col items-center gap-1 p-2 rounded-xl w-16 transition-all ${activeTab === 'bag' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500 hover:text-slate-300'}`}
            >
               <Backpack size={20} />
               <span className="text-[10px] font-bold">背包</span>
            </button>
            <button 
               onClick={() => setActiveTab('stage')}
               className={`flex flex-col items-center gap-1 p-2 rounded-xl w-16 transition-all ${activeTab === 'stage' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500 hover:text-slate-300'}`}
            >
               <Map size={20} />
               <span className="text-[10px] font-bold">关卡</span>
            </button>
         </div>
      </div>
    </div>
  );
}