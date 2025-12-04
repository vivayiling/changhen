
import React, { useMemo } from 'react';
import { Item, EquipmentSlot } from '../types';
import { RARITY_COLORS, RARITY_BG_COLORS, GAME_SETS, ENCHANT_CONFIG, PET_EGG_ID } from '../constants';
import { Lock, Unlock, Gem, ArrowUpCircle, Egg } from 'lucide-react';

interface TooltipProps {
  item: Item;
  onEquip?: (item: Item) => void;
  onSell?: (item: Item) => void;
  onUnequip?: (item: Item) => void;
  onLock?: (item: Item) => void; 
  onEnchant?: (item: Item) => void;
  onUse?: (item: Item) => void; // New Handler for consumables
  onClose?: () => void;
  playerEquipment?: Partial<Record<EquipmentSlot, Item>>; 
  playerStones?: number; 
}

export const ItemTooltip: React.FC<TooltipProps> = ({ item, onEquip, onSell, onUnequip, onLock, onEnchant, onUse, onClose, playerEquipment, playerStones = 0 }) => {
  
  const setInfo = useMemo(() => {
    if (!item.isSet || !item.setId) return null;
    const gameSet = GAME_SETS.find(s => s.id === item.setId);
    if (!gameSet) return null;

    let equippedCount = 0;
    if (playerEquipment) {
        Object.values(playerEquipment).forEach((val) => {
            const eqItem = val as Item | undefined;
            if (eqItem && eqItem.setId === item.setId) equippedCount++;
        });
    } else {
        equippedCount = 1;
    }

    return { gameSet, equippedCount };
  }, [item, playerEquipment]);

  // Enchantment Data
  const currentMult = ENCHANT_CONFIG.STAT_MULTIPLIERS[item.enchantLevel] || 1;
  const nextMult = ENCHANT_CONFIG.STAT_MULTIPLIERS[item.enchantLevel + 1] || currentMult;
  const growth = ((nextMult - currentMult) / currentMult * 100).toFixed(0);
  const successRate = (ENCHANT_CONFIG.SUCCESS_RATES[item.enchantLevel] || 0) * 100;
  const canEnchant = item.usedEnchantSlots < item.maxEnchantSlots && item.enchantLevel < ENCHANT_CONFIG.MAX_LEVEL;
  const hasResource = playerStones >= ENCHANT_CONFIG.COST_PER_ATTEMPT;

  // Comparison Helpers
  const getComparisonItem = () => {
      if (!playerEquipment || !item.type || item.type === 'consumable') return null;
      return playerEquipment[item.type as EquipmentSlot];
  };
  const comparisonItem = getComparisonItem();

  const getStatDiff = (statType: string, val: number) => {
      if (!comparisonItem) return null;
      // find stat in comparison item
      let compVal = 0;
      if (comparisonItem.baseStat && ((comparisonItem.type === EquipmentSlot.WEAPON && statType === '攻击力') || (comparisonItem.type !== EquipmentSlot.WEAPON && statType === '护甲'))) {
          // Check base stat match
          // Simplified: Base stats are separate in UI, let's just match list
      }
      
      const compStat = comparisonItem.stats.find(s => s.type === statType);
      if (compStat) {
           const compMult = ENCHANT_CONFIG.STAT_MULTIPLIERS[comparisonItem.enchantLevel] || 1;
           compVal = compStat.isPercentage ? Number((compStat.value * compMult).toFixed(1)) : Math.floor(compStat.value * compMult);
      }
      
      const diff = val - compVal;
      if (diff === 0) return null;
      return diff;
  };

  const getBaseStatDiff = () => {
      if (!comparisonItem || !item.baseStat || !comparisonItem.baseStat) return null;
      const compMult = ENCHANT_CONFIG.STAT_MULTIPLIERS[comparisonItem.enchantLevel] || 1;
      const compBase = Math.floor(comparisonItem.baseStat * compMult);
      const currBase = Math.floor(item.baseStat * currentMult);
      return currBase - compBase;
  };
  
  const baseStatDiff = getBaseStatDiff();

  const getStatValue = (val: number, isPercent?: boolean) => {
      const effective = isPercent ? Number((val * currentMult).toFixed(1)) : Math.floor(val * currentMult);
      return effective;
  }

  const isEgg = item.consumableType === 'pet_egg';

  return (
    <div className={`p-3 rounded-lg border backdrop-blur-xl shadow-2xl w-72 max-w-[85vw] ${RARITY_BG_COLORS[item.rarity]} flex flex-col relative overflow-hidden transition-all duration-300`}>
      {/* Glossy Effect */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full blur-xl -translate-y-8 translate-x-6 pointer-events-none"></div>

      <div className={`font-bold text-base mb-1 tracking-wide ${RARITY_COLORS[item.rarity]} text-shadow-sm flex justify-between items-start`}>
        <span className="flex items-center gap-1.5 leading-tight truncate pr-4">
           {item.isLocked && <Lock size={12} className="text-yellow-500 flex-shrink-0" />}
           {item.name} {item.enchantLevel > 0 && <span className="text-pink-400">+{item.enchantLevel}</span>}
        </span>
        {onClose && (
            <button onClick={onClose} className="text-white/50 hover:text-white p-1 -mr-2 -mt-2">✕</button>
        )}
      </div>
      <div className="text-[10px] text-slate-400 mb-2 font-medium flex justify-between items-center border-b border-white/5 pb-1">
        <span>{item.rarity} {item.type === 'consumable' ? '消耗品' : item.type}</span>
        <span className="bg-black/40 px-1.5 py-0.5 rounded text-slate-300">Lv.{item.level}</span>
      </div>
      
      <div className="space-y-1 text-xs text-slate-200 mb-3 bg-black/40 p-2.5 rounded border border-white/5 shadow-inner">
        {isEgg && (
            <div className="text-center py-4 text-slate-300 italic">
                孵化此蛋可获得一只随机宠物。
            </div>
        )}

        {item.baseStat ? (
          <div className="text-white font-bold pb-1 border-b border-white/10 mb-1 flex justify-between items-center">
            <span>{item.type === EquipmentSlot.WEAPON ? `攻击力` : `护甲`}</span>
            <div className="flex items-center gap-1">
                <span className="text-emerald-300">+{Math.floor(item.baseStat * currentMult)}</span>
                {baseStatDiff !== null && (
                    <span className={`text-[10px] ${baseStatDiff > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        ({baseStatDiff > 0 ? '+' : ''}{baseStatDiff})
                    </span>
                )}
            </div>
          </div>
        ) : null}
        
        {item.stats.map((stat, idx) => {
           const finalVal = getStatValue(stat.value, stat.isPercentage);
           const diff = getStatDiff(stat.type, finalVal);
           
           return (
              <div key={idx} className="flex justify-between items-center">
                 <span className="text-slate-400 scale-90 origin-left">{stat.type}</span>
                 <div className="flex items-center gap-1">
                     <span className="text-blue-300 font-mono font-bold">
                       +{finalVal}
                       {['暴击率','闪避率','减伤','增伤','吸血','攻击速度', '生命值', '护甲', '攻击力'].includes(stat.type) && stat.isPercentage ? '%' : (['暴击率','闪避率','减伤','增伤','吸血','攻击速度'].includes(stat.type) ? '%' : '')}
                     </span>
                     {diff !== null && (
                        <span className={`text-[9px] font-mono ${diff > 0 ? 'text-green-500' : 'text-red-500'}`}>
                           {diff > 0 ? '↑' : '↓'} {Math.abs(Number(diff.toFixed(1)))}
                        </span>
                     )}
                 </div>
              </div>
           );
        })}
        {item.stats.length === 0 && !item.baseStat && !isEgg && <div className="text-slate-500 italic text-[10px]">暂无额外属性</div>}

        {/* Set Item Section */}
        {setInfo && (
          <div className="mt-2 pt-1 border-t border-emerald-500/30">
            <div className="font-bold text-emerald-400 mb-1 flex justify-between items-center text-[10px]">
                 <span>{setInfo.gameSet.name}</span>
                 <span>({setInfo.equippedCount}/6)</span>
            </div>
            <div className="space-y-0.5">
                {setInfo.gameSet.bonuses.map((bonus, idx) => {
                    const isActive = setInfo.equippedCount >= bonus.count;
                    return (
                        <div key={idx} className={`text-[10px] flex gap-1 ${isActive ? 'text-emerald-300 font-bold' : 'text-slate-600'}`}>
                            <span>({bonus.count})</span>
                            <span className="truncate">{bonus.description}</span>
                        </div>
                    );
                })}
            </div>
          </div>
        )}
      </div>

      {/* Enchant Workshop */}
      {!isEgg && (
      <div className="bg-gradient-to-br from-pink-950/40 to-slate-900/40 border border-pink-500/20 rounded p-2 mb-2">
         <div className="flex justify-between items-center mb-1">
             <span className="text-[10px] font-bold text-pink-300 flex items-center gap-1"><Gem size={10}/> 启灵工坊</span>
             <span className="text-[10px] text-slate-400">次数: {item.maxEnchantSlots - item.usedEnchantSlots}/{item.maxEnchantSlots}</span>
         </div>
         
         {item.enchantLevel < ENCHANT_CONFIG.MAX_LEVEL && canEnchant ? (
             <div className="flex justify-between items-end">
                <div className="text-[10px] space-y-0.5">
                    <div className="text-slate-400">成功率: <span className={`${successRate < 50 ? 'text-red-400' : 'text-green-400'}`}>{successRate.toFixed(0)}%</span></div>
                    <div className="text-slate-400">下级收益: <span className="text-green-300">+{growth}% 属性</span></div>
                    <div className="text-slate-500 text-[9px] mt-0.5">消耗: 1启灵石 + 1次数</div>
                </div>
                {onEnchant && (
                    <button 
                        onClick={() => onEnchant(item)}
                        disabled={!hasResource}
                        className={`text-[10px] px-2 py-1 rounded border flex items-center gap-1 ${hasResource ? 'bg-pink-900/50 hover:bg-pink-800 border-pink-500 text-pink-200' : 'bg-slate-800 border-slate-600 text-slate-500 cursor-not-allowed'}`}
                    >
                        <ArrowUpCircle size={10} /> {hasResource ? '启灵' : '材料不足'}
                    </button>
                )}
             </div>
         ) : (
            <div className="text-[10px] text-center text-slate-500 py-1">
                {item.enchantLevel >= ENCHANT_CONFIG.MAX_LEVEL ? '已达最大启灵等级' : '已耗尽启灵次数'}
            </div>
         )}
      </div>
      )}

      <div className="flex justify-between items-center mb-2">
          <div className="text-[10px] text-slate-500">稀有度: <span className={RARITY_COLORS[item.rarity]}>{item.rarity}</span></div>
          <div className="text-[10px] text-yellow-400 font-bold font-mono">售价: {item.value}</div>
      </div>

      <div className="flex gap-1.5 mt-auto">
        {onUse && isEgg && (
            <button
                onClick={() => onUse(item)}
                className="flex-[2] bg-green-600 hover:bg-green-500 border border-green-400/50 text-white text-xs py-1.5 rounded font-bold shadow-lg active:scale-95"
            >
                <Egg size={12} className="inline mr-1"/> 孵化
            </button>
        )}
        
        {onEquip && !isEgg && (
          <button 
            onClick={() => onEquip(item)}
            className="flex-[2] bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/50 text-white text-xs py-1.5 rounded font-bold shadow-lg active:scale-95"
          >
            装备
          </button>
        )}
        {onUnequip && (
          <button 
            onClick={() => onUnequip(item)}
            className="flex-[2] bg-slate-700 hover:bg-slate-600 border border-slate-500 text-white text-xs py-1.5 rounded font-bold shadow-lg active:scale-95"
          >
            卸下
          </button>
        )}
        
        {/* Lock Button */}
        {onLock && (
            <button
                onClick={() => onLock(item)}
                className={`flex-1 flex items-center justify-center border text-xs py-1.5 rounded font-bold shadow-lg active:scale-95 ${item.isLocked ? 'bg-yellow-900/50 border-yellow-600 text-yellow-400' : 'bg-slate-800 border-slate-600 text-slate-400 hover:text-white'}`}
                title={item.isLocked ? "解锁" : "锁定"}
            >
                {item.isLocked ? <Lock size={12} /> : <Unlock size={12} />}
            </button>
        )}

        {onSell && (
          <button 
            onClick={() => onSell(item)}
            disabled={item.isLocked}
            className={`flex-[2] border text-xs py-1.5 rounded font-bold shadow-lg active:scale-95 ${item.isLocked ? 'bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed' : 'bg-red-900/80 hover:bg-red-800 border-red-700 text-red-100'}`}
          >
            {item.isLocked ? '已锁定' : '出售'}
          </button>
        )}
      </div>
    </div>
  );
};
