import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sword, Shield, Brain, Heart, Zap, Play, Pause, Backpack, TrendingUp, RefreshCcw, User, Gem, Sparkles, Map, ChevronUp, ArrowLeft, Info, Activity, Skull, ShieldCheck, X, Footprints, Crown, Shirt, Hand, Settings, Lock, Trash2, CheckSquare, Square, Axe, Hammer, Wand, Crosshair, Columns, ScrollText, Save, RotateCcw } from 'lucide-react';
import { Player, Enemy, GameLog, Item, EquipmentSlot, PlayerStats, ItemRarity } from './types';
import { EXP_TABLE, MAX_INVENTORY, RARITY_COLORS, LEVEL_CAP, RARITY_BG_COLORS, ENCHANT_CONFIG } from './constants';
import { calculateDerivedStats, calculateDamage, generateEnemy, generateItem } from './services/gameEngine';
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
  KILL_COUNT: 'changhen_killCount'
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
  const [activeTab, setActiveTab] = useState<'role' | 'bag' | 'stage'>('role');
  const [showRoleDetail, setShowRoleDetail] = useState(false);
  const [autoBattle, setAutoBattle] = useState(false);
  const [invincible, setInvincible] = useState(false); 
  const [isSearching, setIsSearching] = useState(false); 
  const [showEnemyDetail, setShowEnemyDetail] = useState(false); 
  const [showBagSettings, setShowBagSettings] = useState(false); 
  const [showLogModal, setShowLogModal] = useState(false);
  
  // Item Inspection State (Modal)
  const [viewingItem, setViewingItem] = useState<{ item: Item, source: 'bag' | 'equip' } | null>(null);

  // Progression (Persistent)
  const [currentLevel, setCurrentLevel] = useState(() => loadState(STORAGE_KEYS.LEVEL, 1));
  const [highestLevel, setHighestLevel] = useState(() => loadState(STORAGE_KEYS.HIGH_LEVEL, 1));
  const [killCount, setKillCount] = useState(() => loadState(STORAGE_KEYS.KILL_COUNT, 0)); 
  
  // Player State (Persistent)
  const [player, setPlayer] = useState<Player>(() => {
    const fallback: Player = {
      level: 1,
      currentExp: 0,
      maxExp: EXP_TABLE(1),
      gold: 0,
      enchantStones: 0,
      baseStats: { str: 5, dex: 5, int: 5, vit: 5, spi: 5, freePoints: 5 },
      equipment: {},
      inventory: [],
      maxInventorySize: MAX_INVENTORY,
      autoSellSettings: {} 
    };
    
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PLAYER);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge to ensure new fields are present if loading old save
        return { ...fallback, ...parsed };
      }
    } catch (e) { console.error("Failed to load player", e); }
    
    return fallback;
  });

  // Combat State
  const [currentHp, setCurrentHp] = useState(100);
  const [enemy, setEnemy] = useState<Enemy | null>(null);
  const [logs, setLogs] = useState<GameLog[]>([]);
  
  // Animation State
  const [animState, setAnimState] = useState({ player: '', enemy: '' });
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [damageFlash, setDamageFlash] = useState(false);
  
  // UI FX State
  const [upgradingStat, setUpgradingStat] = useState<string | null>(null);
  const [isLevelingUp, setIsLevelingUp] = useState(false);

  // Refs for loop
  const playerRef = useRef(player);
  const enemyRef = useRef(enemy);
  const currentHpRef = useRef(currentHp);
  const autoBattleRef = useRef(autoBattle);
  const invincibleRef = useRef(invincible);
  const killCountRef = useRef(killCount);
  const isSearchingRef = useRef(isSearching);

  // Update refs
  useEffect(() => { playerRef.current = player; }, [player]);
  useEffect(() => { enemyRef.current = enemy; }, [enemy]);
  useEffect(() => { currentHpRef.current = currentHp; }, [currentHp]);
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
  }, [player, currentLevel, highestLevel, killCount]);

  // Init HP on load
  useEffect(() => {
     // Initialize HP to max on first load to avoid confusion, or could load from storage if we saved it
     // For now, let's just sync it to max on mount if we want "fresh" session start feels,
     // OR strictly, we should probably save it. 
     // Let's set it to max for now to be nice to the player on reload.
     const stats = calculateDerivedStats(player);
     setCurrentHp(stats.maxHp);
  }, []);

  // --- Helpers ---
  const addLog = useCallback((message: string, type: 'combat' | 'loot' | 'system' = 'system') => {
    setLogs(prev => [{ id: Math.random().toString(), message, type, timestamp: Date.now() }, ...prev].slice(100)); // Store more logs
  }, []);

  const addFloatingText = (value: string, target: 'player' | 'enemy', type: 'damage' | 'gold' | 'exp' | 'heal' | 'loot', isCrit: boolean = false, rarity?: ItemRarity) => {
    const id = Math.random().toString();
    const baseX = target === 'player' ? 30 : 70;
    const x = baseX + (Math.random() * 10 - 5);
    const y = 50 + (Math.random() * 15 - 7.5);
    
    let color = 'text-white';
    
    if (type === 'gold') color = 'text-yellow-400 font-black text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] z-50';
    else if (type === 'exp') color = 'text-purple-400 font-bold text-xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] z-50';
    else if (type === 'heal') color = 'text-green-500 font-bold text-xl';
    else if (type === 'loot') {
        color = rarity ? `${RARITY_COLORS[rarity]} font-bold text-lg drop-shadow-md z-50` : 'text-slate-300 font-bold';
    }
    else if (type === 'damage') {
        if (isCrit) color = 'text-yellow-300 font-black text-4xl drop-shadow-[0_4px_0_rgba(0,0,0,1)]';
        else color = target === 'player' ? 'text-red-500 font-bold text-2xl' : 'text-white font-bold text-2xl';
    }
    
    setFloatingTexts(prev => [...prev, { id, value, x, y, color, scale: isCrit }]);
    const duration = type === 'loot' ? 2000 : 1000;
    setTimeout(() => setFloatingTexts(prev => prev.filter(ft => ft.id !== id)), duration);
  };

  const derivedStats = calculateDerivedStats(player);

  const getItemIcon = (item: Item | null, slot?: EquipmentSlot) => {
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
    if ([EquipmentSlot.RING1, EquipmentSlot.RING2, EquipmentSlot.NECKLACE, EquipmentSlot.AMULET].includes(item.type)) return Gem;

    return Shield;
  };

  // --- Actions ---
  const upgradeStat = (stat: keyof PlayerStats) => {
    if (player.baseStats.freePoints > 0) {
      setUpgradingStat(stat);
      setTimeout(() => setUpgradingStat(null), 500); 

      setPlayer(prev => ({
        ...prev,
        baseStats: {
          ...prev.baseStats,
          [stat]: prev.baseStats[stat] + 1,
          freePoints: prev.baseStats.freePoints - 1
        }
      }));
    }
  };

  const equipItem = (item: Item) => {
    setPlayer(prev => {
      const slot = item.type;
      const oldItem = prev.equipment[slot];
      const newInventory = prev.inventory.filter(i => i.id !== item.id);
      if (oldItem) newInventory.push(oldItem);
      return { ...prev, equipment: { ...prev.equipment, [slot]: item }, inventory: newInventory };
    });
    addLog(`装备了 ${item.name}`, 'system');
    setViewingItem(null); 
  };

  const unequipItem = (item: Item) => {
    if (player.inventory.length >= player.maxInventorySize) {
      addLog("背包已满！", "system");
      return;
    }
    setPlayer(prev => {
       const newEquipment = { ...prev.equipment };
       delete newEquipment[item.type];
       return { ...prev, equipment: newEquipment, inventory: [...prev.inventory, item] }
    });
    setViewingItem(null);
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

  const toggleLock = (item: Item) => {
    setPlayer(prev => ({
        ...prev,
        inventory: prev.inventory.map(i => i.id === item.id ? { ...i, isLocked: !i.isLocked } : i),
        equipment: Object.entries(prev.equipment).reduce((acc, [key, val]) => {
            const equipmentItem = val as Item | undefined;
            if (equipmentItem && equipmentItem.id === item.id) {
                acc[key as EquipmentSlot] = { ...equipmentItem, isLocked: !equipmentItem.isLocked };
            } else if (equipmentItem) {
                acc[key as EquipmentSlot] = equipmentItem;
            }
            return acc;
        }, {} as Partial<Record<EquipmentSlot, Item>>)
    }));
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

  // Enchant (Qi Ling) Logic
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

     // Update Item
     const updatedItem = {
         ...item,
         usedEnchantSlots: item.usedEnchantSlots + 1,
         enchantLevel: isSuccess ? item.enchantLevel + 1 : item.enchantLevel
     };

     // Update Player
     setPlayer(prev => {
         const isEquipped = prev.equipment[item.type]?.id === item.id;
         
         const newEquipment = { ...prev.equipment };
         if (isEquipped) newEquipment[item.type] = updatedItem;

         const newInventory = prev.inventory.map(i => i.id === item.id ? updatedItem : i);

         return {
             ...prev,
             enchantStones: prev.enchantStones - 1,
             equipment: newEquipment,
             inventory: newInventory
         };
     });

     if (isSuccess) {
         addLog(`启灵成功！${item.name} 强化至 +${updatedItem.enchantLevel}`, 'loot');
         addFloatingText("启灵成功!", 'player', 'heal'); // Reuse green text
     } else {
         addLog(`启灵失败... ${item.name} 消耗了一次机会`, 'combat');
         addFloatingText("启灵失败", 'player', 'damage'); // Reuse red text
     }

     // Update Modal View
     if (viewingItem && viewingItem.item.id === item.id) {
         setViewingItem({ ...viewingItem, item: updatedItem });
     }
  };

  // --- Game Loop ---
  useEffect(() => {
    if (!autoBattle) return;

    if (!enemyRef.current && !isSearchingRef.current) {
      const isBossStage = killCountRef.current >= 4;
      const newEnemy = generateEnemy(currentLevel, isBossStage);
      setEnemy(newEnemy);
      enemyRef.current = newEnemy;
      addLog(`遭遇了 ${newEnemy.name}${isBossStage ? ' (BOSS)' : ''}!`, 'combat');
    }

    const intervalId = setInterval(() => {
      if (!autoBattleRef.current) return;
      if (isSearchingRef.current) return; 

      const pStats = calculateDerivedStats(playerRef.current);
      const curEnemy = enemyRef.current;
      if (!curEnemy) return;

      // Player Attack
      setAnimState(prev => ({ ...prev, player: 'animate-lunge-right' }));

      let { damage: pDmg, isCrit: pCrit } = calculateDamage(
        pStats.attack, pStats.critRate, pStats.critDmg, pStats.armorPen, curEnemy.armor, curEnemy.level
      );
      
      if (invincibleRef.current) {
        pDmg = 999999;
        pCrit = true;
      }

      setTimeout(() => {
        addFloatingText(pCrit ? `${pDmg}!` : `${pDmg}`, 'enemy', 'damage', pCrit);
        setAnimState(prev => ({ ...prev, enemy: pCrit ? 'animate-hit' : 'animate-shake' }));
        
        if (pStats.lifesteal > 0 && !invincibleRef.current) {
            const heal = Math.floor(pDmg * (pStats.lifesteal / 100));
            if (heal > 0) {
                setCurrentHp(h => Math.min(pStats.maxHp, h + heal));
                addFloatingText(`+${heal}`, 'player', 'heal');
            }
        }

        const newEnemyHp = Math.max(0, curEnemy.currentHp - pDmg);
        const updatedEnemy = { ...curEnemy, currentHp: newEnemyHp };
        setEnemy(updatedEnemy);
        enemyRef.current = updatedEnemy;

        if (newEnemyHp <= 0) {
           handleEnemyDeath(curEnemy, pStats);
           return;
        }
      }, 150);

      setTimeout(() => {
         if (enemyRef.current && enemyRef.current.currentHp > 0) {
             setAnimState(prev => ({ ...prev, enemy: 'animate-lunge-left' }));
             
             let eDmg = 0;
             let eCrit = false;
             
             if (!invincibleRef.current) {
                const res = calculateDamage(
                    curEnemy.attack, 5, 50, 0, pStats.armor, playerRef.current.level, pStats.dmgRed
                );
                eDmg = res.damage;
                eCrit = res.isCrit;
             } else {
                 eDmg = 0;
             }

             setTimeout(() => {
                if (eDmg > 0) {
                    addFloatingText(`${eDmg}`, 'player', 'damage', eCrit);
                    setAnimState(prev => ({ ...prev, player: 'animate-shake' }));
                    setDamageFlash(true);
                    setTimeout(() => setDamageFlash(false), 300);

                    const newPlayerHp = Math.max(0, currentHpRef.current - eDmg);
                    setCurrentHp(newPlayerHp);
                    if (newPlayerHp <= 0) handlePlayerDeath(pStats);
                } else {
                    addFloatingText("无敌", 'player', 'heal');
                }
                
                if (currentHpRef.current > 0) {
                    const hpRegen = pStats.hpRegen / 2; 
                    if (hpRegen > 0) setCurrentHp(h => Math.min(pStats.maxHp, h + hpRegen));
                }
             }, 150);
         }
      }, 250); 

      setTimeout(() => { setAnimState({ player: '', enemy: '' }); }, 500);

    }, 1000 / (1 + (derivedStats.atkSpeed / 100))); 

    return () => clearInterval(intervalId);
  }, [autoBattle, currentLevel, highestLevel, addLog, invincible, isSearching]); 

  // --- Handlers ---
  const handleEnemyDeath = (curEnemy: Enemy, pStats: any) => {
    addLog(`击败 ${curEnemy.name}`, 'combat');
    setShowEnemyDetail(false); 

    addFloatingText(`+${curEnemy.goldReward}G`, 'player', 'gold');
    setTimeout(() => addFloatingText(`+${curEnemy.expReward}Exp`, 'player', 'exp'), 300);
    
    // Boss Drops Enchant Stone
    if (curEnemy.isBoss) {
        const stones = Math.floor(Math.random() * 2) + 1; // 1-2 stones
        setPlayer(p => ({ ...p, enchantStones: p.enchantStones + stones }));
        addLog(`掉落: 启灵石 x${stones}`, 'loot');
        setTimeout(() => addFloatingText(`启灵石 x${stones}`, 'player', 'loot', false, ItemRarity.EPIC), 600);
    }

    let newItem: Item | null = null;
    const dropChance = curEnemy.isBoss ? 1.0 : 0.4; 
    if (Math.random() < dropChance) { 
       newItem = generateItem(curEnemy.level);
    }

    setPlayer(prev => {
      let nextExp = prev.currentExp + curEnemy.expReward;
      let nextLvl = prev.level;
      let nextMaxExp = prev.maxExp;
      let points = prev.baseStats.freePoints;
      
      let nextInv = prev.inventory;
      let addedGold = prev.gold + curEnemy.goldReward;
      let leveledUp = false;

      if (newItem) {
          if (prev.autoSellSettings[newItem.rarity]) {
              addedGold += newItem.value;
              addLog(`出售: ${newItem.name} (+${newItem.value}G)`, 'system');
          } else {
              if (prev.inventory.length < prev.maxInventorySize) {
                  nextInv = [...prev.inventory, newItem];
                  addLog(`掉落: ${newItem.name}`, 'loot');
                  addFloatingText(`掉落: ${newItem.name}`, 'player', 'loot', false, newItem.rarity);
              } else {
                  addLog(`背包已满，丢弃了 ${newItem.name}`, 'system');
              }
          }
      }
      
      while (nextExp >= nextMaxExp && nextLvl < LEVEL_CAP) {
        nextExp -= nextMaxExp;
        nextLvl++;
        nextMaxExp = EXP_TABLE(nextLvl);
        points += 5;
        leveledUp = true;
        addLog(`升级! 等级 ${nextLvl}`, 'system');
      }
      
      if (leveledUp) {
          setIsLevelingUp(true);
          setTimeout(() => setIsLevelingUp(false), 2000);
          addFloatingText("Level Up!", 'player', 'exp');
      }

      return {
        ...prev,
        currentExp: nextExp,
        maxExp: nextMaxExp,
        level: nextLvl,
        gold: addedGold,
        baseStats: { ...prev.baseStats, freePoints: points },
        inventory: nextInv
      };
    });

    if (curEnemy.isBoss) {
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
    
    const regenAmount = Math.floor(pStats.maxHp * 0.2);
    setCurrentHp(h => Math.min(pStats.maxHp, h + regenAmount));

    setEnemy(null);
    setIsSearching(true);
    // addLog("搜索中...", 'system');
    
    setTimeout(() => {
        setIsSearching(false);
    }, 2500); 
  };

  const handlePlayerDeath = (pStats: any) => {
    setAutoBattle(false);
    addLog("你被击败了! 重生中...", 'system');
    setCurrentHp(pStats.maxHp);
    setEnemy(null);
    setIsSearching(false);
    setKillCount(0); 
  };

  const renderItemSlot = (slot: EquipmentSlot) => {
    const item = player.equipment[slot];
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
        return player.equipment[viewingItem.item.type];
    }
    return null;
  };

  const comparisonItem = getEquippedItemForComparison();

  return (
    <div className={`h-full w-full bg-black flex flex-col relative overflow-hidden`}>
      
      {/* Damage Flash Overlay */}
      {damageFlash && <div className="absolute inset-0 pointer-events-none z-[60] animate-flash-red"></div>}

      {/* LOG HISTORY MODAL */}
      {showLogModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200" onClick={() => setShowLogModal(false)}>
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

      {/* BAG SETTINGS MODAL */}
      {showBagSettings && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200" onClick={() => setShowBagSettings(false)}>
              <div onClick={e => e.stopPropagation()} className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2"><Settings size={20}/> 游戏设置</h2>
                      <button onClick={() => setShowBagSettings(false)} className="bg-slate-800 p-1 rounded-full hover:bg-slate-700"><X size={18}/></button>
                  </div>
                  
                  <div className="space-y-4 mb-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                      <div className="space-y-2">
                          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">自动出售与清理</h3>
                          <div className="grid grid-cols-[1.5fr_1fr_1fr] gap-2 mb-2 text-xs text-slate-500 font-bold uppercase tracking-wider px-2">
                              <div>稀有度</div>
                              <div className="text-center">自动出售</div>
                              <div className="text-right">一键清理</div>
                          </div>
                          
                          {Object.values(ItemRarity).map(rarity => (
                              <div key={rarity} className={`grid grid-cols-[1.5fr_1fr_1fr] gap-2 items-center bg-slate-800/50 p-3 rounded-lg border border-slate-800 ${RARITY_COLORS[rarity].replace('text-', 'border-l-4 border-l-')}`}>
                                  <span className={`font-bold text-sm ${RARITY_COLORS[rarity]}`}>{rarity}</span>
                                  
                                  {/* Auto Sell Toggle */}
                                  <div className="flex justify-center">
                                      <button 
                                        onClick={() => toggleAutoSell(rarity)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${player.autoSellSettings[rarity] ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-slate-700 text-slate-500 border border-slate-600'}`}
                                      >
                                          {player.autoSellSettings[rarity] ? <CheckSquare size={14} /> : <Square size={14} />}
                                          {player.autoSellSettings[rarity] ? '开启' : '关闭'}
                                      </button>
                                  </div>

                                  {/* Manual Batch Sell */}
                                  <div className="flex justify-end">
                                      <button 
                                        onClick={() => batchSell(rarity)}
                                        className="bg-slate-700 hover:bg-red-900/50 text-slate-300 hover:text-red-200 p-1.5 rounded-lg transition-colors border border-slate-600 hover:border-red-800"
                                        title={`出售背包中所有非锁定的${rarity}装备`}
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
                          <p className="text-[10px] text-slate-600 text-center mt-2">
                             警告: 此操作将删除所有进度且无法恢复。
                          </p>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* GLOBAL MODAL FOR ITEM DETAILS */}
      {viewingItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto" onClick={() => setViewingItem(null)}>
           <div onClick={e => e.stopPropagation()} className="min-h-full flex flex-col items-center justify-center p-4 w-full cursor-default">
               <div className="flex flex-col-reverse md:flex-row gap-4 items-center md:items-start relative z-10 w-full md:w-auto">
              
                  {/* Comparison: Equipped Item */}
                  {comparisonItem && (
                     <div className="w-full md:w-auto flex flex-col items-center opacity-90 hover:opacity-100 transition-opacity">
                        <div className="text-center text-slate-500 font-bold mb-2 text-[10px] uppercase tracking-widest bg-black/50 py-1 rounded w-full md:w-32">当前装备</div>
                        <ItemTooltip 
                            item={comparisonItem} 
                            onLock={toggleLock}
                            onEnchant={handleEnchant}
                            playerEquipment={player.equipment}
                            playerStones={player.enchantStones}
                        />
                     </div>
                  )}

                  {/* Main Item */}
                  <div className="w-full md:w-auto flex flex-col items-center shadow-[0_0_30px_rgba(0,0,0,0.5)] z-20">
                      {comparisonItem && <div className="text-center text-green-500 font-bold mb-2 text-[10px] uppercase tracking-widest bg-black/50 py-1 rounded w-full md:w-32">新物品</div>}
                      <ItemTooltip 
                        item={viewingItem.item} 
                        onEquip={viewingItem.source === 'bag' ? equipItem : undefined}
                        onUnequip={viewingItem.source === 'equip' ? unequipItem : undefined}
                        onSell={viewingItem.source === 'bag' ? sellItem : undefined}
                        onLock={toggleLock}
                        onEnchant={handleEnchant}
                        onClose={() => setViewingItem(null)}
                        playerEquipment={player.equipment}
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

        {/* Combat Area */}
        <div className="relative z-10 flex-1 flex items-end justify-center pb-12 px-6">
           
           {/* Floating Texts */}
           <div className="absolute inset-0 pointer-events-none overflow-hidden">
             {floatingTexts.map(ft => (
                <div 
                  key={ft.id}
                  className={`absolute z-50 whitespace-nowrap ${ft.color} ${ft.scale ? 'scale-125' : 'scale-100'}`}
                  style={{ left: `${ft.x}%`, top: `${ft.y}%`, transform: 'translate(-50%, -50%)' }}
                >
                  <div className="animate-float-up">{ft.value}</div>
                </div>
              ))}
           </div>

           {/* Characters */}
           <div className="flex w-full justify-between items-end max-w-lg mx-auto">
              
              {/* Player */}
              <div className={`relative flex flex-col items-center gap-2 transition-transform duration-100 ${animState.player} ${isSearching ? 'animate-run' : ''}`}>
                 <div className="relative group">
                   <div className={`w-24 h-24 rounded-full bg-gradient-to-b from-indigo-900 to-black border-2 ${invincible ? 'border-blue-400 shadow-[0_0_20px_rgba(96,165,250,0.6)]' : 'border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.4)]'} overflow-hidden`}>
                     <img 
                      src={`https://api.dicebear.com/9.x/adventurer/svg?seed=Alexander&backgroundColor=transparent`}
                      alt="Hero"
                      className="w-full h-full object-cover transform scale-125 translate-y-2"
                     />
                   </div>
                   {invincible && <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-pulse z-20"></div>}
                   <div className="absolute -inset-4 bg-indigo-500/20 blur-xl rounded-full -z-10 animate-pulse"></div>
                   
                   {/* Level Up Effect */}
                   {isLevelingUp && (
                     <div className="absolute inset-0 rounded-full animate-gold-flash z-30 pointer-events-none"></div>
                   )}
                 </div>
                 <div className="w-24">
                   <ProgressBar current={currentHp} max={derivedStats.maxHp} colorClass="bg-green-500" height="h-2" showText={false}/>
                 </div>
              </div>

              {/* Status / Searching Indicator */}
              {isSearching ? (
                 <div className="mb-20 text-center animate-pulse">
                    <div className="text-sm font-bold text-slate-300 mb-1">正在前往下一区域</div>
                    <div className="flex justify-center gap-1">
                       <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce delay-0"></span>
                       <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce delay-100"></span>
                       <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce delay-200"></span>
                    </div>
                 </div>
              ) : (
                <div className="mb-10 flex flex-col items-center gap-2 opacity-50">
                    <div className="flex gap-1">
                    {[0,1,2,3,4].map(idx => (
                        <div key={idx} className={`w-2 h-2 rounded-full ${killCount > idx ? 'bg-red-500' : idx === 4 ? 'bg-red-900 border border-red-500' : 'bg-slate-700'}`}></div>
                    ))}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">{killCount >= 4 ? 'BOSS' : `${killCount}/4`}</div>
                </div>
              )}

              {/* Enemy */}
              <div className={`relative flex flex-col items-center gap-2 transition-transform duration-100 ${animState.enemy}`}>
                 {enemy ? (
                   <>
                    {/* Enemy Avatar Container with Click */}
                    <div 
                      className="relative cursor-pointer group"
                      onClick={() => setShowEnemyDetail(true)}
                    >
                      <div className={`w-24 h-24 rounded-full bg-gradient-to-b from-slate-800 to-black border-2 flex items-center justify-center overflow-hidden transition-transform active:scale-95 ${enemy.isBoss ? 'border-red-600 shadow-[0_0_25px_rgba(220,38,68,0.5)] scale-110' : 'border-slate-600'}`}>
                         <img 
                          src={`https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${enemy.name}`} 
                          alt="Enemy"
                          className="w-full h-full object-cover transform scale-90"
                         />
                      </div>
                      {/* Hint Pulse */}
                      <div className="absolute top-0 right-0 w-3 h-3 bg-white/20 rounded-full animate-ping pointer-events-none"></div>
                    </div>

                    {/* Enemy Detail Popup */}
                    {showEnemyDetail && (
                       <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-48 bg-slate-900/90 border border-slate-600 rounded-xl p-3 z-50 backdrop-blur-md shadow-2xl animate-in fade-in zoom-in duration-200">
                          <button onClick={(e) => { e.stopPropagation(); setShowEnemyDetail(false); }} className="absolute -top-2 -right-2 bg-slate-700 rounded-full p-0.5 text-slate-300 hover:text-white"><X size={12}/></button>
                          <div className="text-center font-bold text-slate-200 text-sm mb-2 border-b border-white/10 pb-1">{enemy.name}</div>
                          <div className="space-y-1 text-xs">
                             <div className="flex justify-between"><span className="text-slate-400">生命</span> <span className="text-red-400 font-mono">{enemy.currentHp}/{enemy.maxHp}</span></div>
                             <div className="flex justify-between"><span className="text-slate-400">攻击</span> <span className="text-yellow-400 font-mono">{enemy.attack}</span></div>
                             <div className="flex justify-between"><span className="text-slate-400">护甲</span> <span className="text-blue-400 font-mono">{enemy.armor}</span></div>
                             <div className="flex justify-between mt-2 pt-1 border-t border-white/5"><span className="text-slate-400">经验</span> <span className="text-purple-400 font-mono">+{enemy.expReward}</span></div>
                             <div className="flex justify-between"><span className="text-slate-400">金币</span> <span className="text-yellow-400 font-mono">+{enemy.goldReward}</span></div>
                          </div>
                       </div>
                    )}

                    <div className="w-24">
                      <ProgressBar current={enemy.currentHp} max={enemy.maxHp} colorClass="bg-red-600" height="h-2" showText={false} />
                    </div>
                    <div className={`absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] px-2 py-0.5 rounded whitespace-nowrap border ${enemy.isBoss ? 'text-red-300 bg-red-950/80 border-red-600' : 'text-slate-300 bg-black/70 border-slate-700'}`}>
                      Lv.{enemy.level} {enemy.name.split(' ')[0]}
                    </div>
                   </>
                 ) : (
                   !isSearching && (
                    <div className="w-24 h-24 flex items-center justify-center">
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
                       <h2 className="text-lg font-bold text-white mb-4 tracking-wider">角色状态</h2>
                       <div className="space-y-3 mb-4">
                           {/* HP */}
                           <div className="bg-black/40 p-3 rounded-lg border border-white/5">
                             <div className="text-slate-500 text-xs uppercase mb-1 flex justify-between">
                                <span>生命值</span>
                                <span className="text-green-500 font-mono">{Math.floor((currentHp / derivedStats.maxHp) * 100)}%</span>
                             </div>
                             <div className="text-base font-bold text-green-400 flex items-center gap-2 mb-1">
                               <Heart size={16} fill="currentColor" className="opacity-80"/> 
                               {Math.floor(currentHp)} <span className="text-slate-600 text-xs">/ {derivedStats.maxHp}</span>
                             </div>
                             <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 transition-all duration-500" style={{width: `${(currentHp/derivedStats.maxHp)*100}%`}}></div>
                             </div>
                           </div>

                           {/* Stats Grid */}
                           <div className="grid grid-cols-2 gap-2">
                              <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                                <div className="text-slate-500 text-[10px] uppercase mb-0.5">攻击力</div>
                                <div className="text-sm font-bold text-red-400 flex items-center gap-2"><Sword size={12}/> {invincible ? '999999' : derivedStats.attack}</div>
                              </div>
                              <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                                <div className="text-slate-500 text-[10px] uppercase mb-0.5">防御力</div>
                                <div className="text-sm font-bold text-blue-400 flex items-center gap-2"><Shield size={12}/> {derivedStats.armor}</div>
                              </div>
                              <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                                <div className="text-slate-500 text-[10px] uppercase mb-0.5">暴击率</div>
                                <div className="text-sm font-bold text-yellow-400 flex items-center gap-2"><Zap size={12}/> {derivedStats.critRate.toFixed(1)}%</div>
                              </div>
                              <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                                <div className="text-slate-500 text-[10px] uppercase mb-0.5">暴击伤害</div>
                                <div className="text-sm font-bold text-orange-400 flex items-center gap-2"><Sparkles size={12}/> {150 + derivedStats.critDmg}%</div>
                              </div>
                           </div>
                       </div>
                       
                       <button onClick={() => setShowRoleDetail(true)} className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all text-sm">
                         <Info size={16} /> 查看详情与装备
                       </button>

                       {player.baseStats.freePoints > 0 && <div className="absolute top-4 right-4 flex items-center gap-1"><span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span></div>}
                    </div>
                  </div>
                ) : (
                  // Detail View
                  <div className="h-full flex flex-col animate-in slide-in-from-right duration-300">
                    <button onClick={() => setShowRoleDetail(false)} className="flex items-center gap-1 text-slate-400 hover:text-white mb-4 text-sm font-bold w-fit">
                      <ArrowLeft size={16} /> 返回概览
                    </button>

                    <div className="flex-1 flex gap-4 overflow-hidden">
                       {/* Stats Column */}
                       <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar pb-24">
                          <div>
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 sticky top-0 bg-slate-950 z-10 py-2">基础属性</h3>
                            <div className="space-y-1">
                              <StatRow label="力量" value={player.baseStats.str} icon={Sword} color="text-red-400" canUpgrade={player.baseStats.freePoints > 0} onUpgrade={() => upgradeStat('str')} isAnimating={upgradingStat === 'str'} />
                              <StatRow label="敏捷" value={player.baseStats.dex} icon={Zap} color="text-yellow-300" canUpgrade={player.baseStats.freePoints > 0} onUpgrade={() => upgradeStat('dex')} isAnimating={upgradingStat === 'dex'} />
                              <StatRow label="智力" value={player.baseStats.int} icon={Brain} color="text-blue-400" canUpgrade={player.baseStats.freePoints > 0} onUpgrade={() => upgradeStat('int')} isAnimating={upgradingStat === 'int'} />
                              <StatRow label="耐力" value={player.baseStats.vit} icon={Shield} color="text-green-400" canUpgrade={player.baseStats.freePoints > 0} onUpgrade={() => upgradeStat('vit')} isAnimating={upgradingStat === 'vit'} />
                              <StatRow label="精神" value={player.baseStats.spi} icon={Heart} color="text-purple-400" canUpgrade={player.baseStats.freePoints > 0} onUpgrade={() => upgradeStat('spi')} isAnimating={upgradingStat === 'spi'} />
                            </div>
                            {player.baseStats.freePoints > 0 && <div className="text-center mt-2"><span className="text-green-400 text-xs font-bold animate-pulse">可用点数: {player.baseStats.freePoints}</span></div>}
                          </div>

                          <div>
                             <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 sticky top-0 bg-slate-950 z-10 py-2">高级战斗属性</h3>
                             <div className="bg-white/5 rounded-lg p-3 space-y-1">
                                <DetailRow label="生命上限" value={derivedStats.maxHp} icon={Heart} colorClass="text-green-400" />
                                <DetailRow label="生命恢复" value={`${derivedStats.hpRegen.toFixed(1)}/秒`} icon={Activity} colorClass="text-green-400" />
                                <DetailRow label="生命吸取" value={`${derivedStats.lifesteal}%`} icon={Heart} colorClass="text-red-500" />
                                <div className="h-px bg-white/10 my-2"></div>
                                <DetailRow label="攻击力" value={derivedStats.attack} icon={Sword} colorClass="text-red-400" />
                                <DetailRow label="增伤" value={`${derivedStats.dmgInc.toFixed(1)}%`} icon={Sword} />
                                <DetailRow label="护甲穿透" value={derivedStats.armorPen.toFixed(0)} icon={Sword} />
                                <div className="h-px bg-white/10 my-2"></div>
                                <DetailRow label="物理防御" value={derivedStats.armor} icon={Shield} colorClass="text-blue-400" />
                                <DetailRow label="伤害减免" value={`${derivedStats.dmgRed.toFixed(1)}%`} icon={Shield} />
                                <DetailRow label="闪避率" value={`${derivedStats.dodge.toFixed(1)}%`} icon={TrendingUp} />
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
                      onClick={() => { setCurrentLevel(c => c - 1); setEnemy(null); setKillCount(0); }}
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
                      onClick={() => { setCurrentLevel(c => c + 1); setEnemy(null); setKillCount(0); }}
                      className="p-4 bg-slate-800 rounded-xl border border-slate-700 disabled:opacity-20 active:scale-95 transition-transform"
                    >
                      <ChevronUp className="rotate-90" />
                    </button>
                 </div>

                 {/* Invincible Toggle */}
                 <button 
                    onClick={() => setInvincible(!invincible)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${invincible ? 'bg-blue-900/50 border-blue-500 text-blue-300' : 'bg-slate-900 border-slate-700 text-slate-500'}`}
                 >
                    <ShieldCheck size={16} />
                    <span className="text-xs font-bold">{invincible ? '无敌模式: ON' : '无敌模式: OFF'}</span>
                 </button>
                 
                 <div className="text-xs text-slate-500 font-mono">
                    最高记录: 第 {highestLevel} 层
                 </div>
              </div>
            )}
         </div>

         {/* 3. NAVIGATION BAR */}
         <div className="h-16 bg-slate-950/80 backdrop-blur-md border-t border-white/10 flex justify-around items-center px-2">
            <button 
               onClick={() => { setActiveTab('role'); setShowRoleDetail(false); }}
               className={`flex flex-col items-center gap-1 p-2 rounded-xl w-20 transition-all ${activeTab === 'role' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500 hover:text-slate-300'}`}
            >
               <User size={20} />
               <span className="text-[10px] font-bold">角色</span>
            </button>
            <button 
               onClick={() => setActiveTab('bag')}
               className={`flex flex-col items-center gap-1 p-2 rounded-xl w-20 transition-all ${activeTab === 'bag' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500 hover:text-slate-300'}`}
            >
               <Backpack size={20} />
               <span className="text-[10px] font-bold">背包</span>
            </button>
            <button 
               onClick={() => setActiveTab('stage')}
               className={`flex flex-col items-center gap-1 p-2 rounded-xl w-20 transition-all ${activeTab === 'stage' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500 hover:text-slate-300'}`}
            >
               <Map size={20} />
               <span className="text-[10px] font-bold">关卡</span>
            </button>
         </div>
      </div>
    </div>
  );
}