import {validAmount, compareAmounts, addAmounts, subtractAmounts, multiplyAmounts, divideAmounts, powerAmount, amountLog10, amountRatio, minAmount, maxAmount, sumAmounts, canAfford} from './numbers.mjs';
export const MAX_STAGE=500;
export const friends=[{name:'イヌ',job:'先制かみつき',base:25,power:8},{name:'サル',job:'分身きびだんご拳',base:500,power:180},{name:'キジ',job:'天空メテオ',base:10000,power:4400}];
export function fresh(){return {gameOver:false,teamHP:100,cycleScale:1,retreats:0,encounterStage:0,attackClock:3,windup:0,bossSeal:false,healCooldown:0,mobHP:[],mobStage:0,waveLoot:0,completed:false,version:6,stage:1,hp:18,coins:0,total:0,kills:0,sword:0,allies:[0,0,0],souls:0,rebirths:0,best:1};}
export const boss=s=>s.stage%10===0;
export function maxHP(s) {
  const base = 18 * Math.pow(1.60, s.stage - 1) * (boss(s) ? 7 : 1) * (1 + Math.floor(s.stage / 25) * .8);
  return multiplyAmounts(base, s.cycleScale);
}
export const multiplier = s => addAmounts(1, s.souls);
export function tapPower(s) {
  return multiplyAmounts(multiplyAmounts(6, powerAmount(2, s.sword)), multiplyAmounts(evolution(s.sword), multiplier(s)));
}
export function allyPower(s, i) {
  const support = multiplyAmounts(tapPower(s), [.12, .16, .22][i]);
  if (s.allies[i] === 0) return support;
  const trained = multiplyAmounts(friends[i].power, powerAmount(2, s.allies[i] - 1));
  return addAmounts(support, multiplyAmounts(trained, multiplyAmounts(evolution(s.allies[i]), multiplier(s))));
}
export const dps = s => sumAmounts(friends.map((_, i) => allyPower(s, i)));
export const swordCost = s => multiplyAmounts(multiplyAmounts(12, powerAmount(2.05, s.sword)), evolution(s.sword));
export const allyCost = (s, i) => multiplyAmounts(multiplyAmounts(friends[i].base, powerAmount(2.08, s.allies[i])), evolution(s.allies[i]));
export const reward = s => multiplyAmounts(10 * Math.pow(1.65, s.stage - 1) * (boss(s) ? 8 : 1), s.cycleScale);
export const BURST_POWER=1e8;
export const BURST_LOOT=1e4;
export const enemyCount=s=>boss(s)?7:Math.min(8,3+Math.floor((s.stage-1)/20));
export const enemyWeight=(s,i)=>boss(s)&&i===0?4:1+(i%3)*.18;
export function mobMaxHP(s, i) {
  let weight = 0;
  for (let j = 0; j < enemyCount(s); j++) weight += enemyWeight(s, j);
  return multiplyAmounts(maxHP(s), enemyWeight(s, i) / weight);
}
export function ensureSwarm(s) {
  const sum = sumAmounts(s.mobHP || []);
  const sameHP = compareAmounts(sum, s.hp) === 0 || Math.abs(amountRatio(sum, s.hp || 1) - 1) < 1e-10;
  if (s.mobStage !== s.stage || s.mobHP?.length !== enemyCount(s) || !sameHP) {
    const remaining = Math.min(1, amountRatio(s.hp, maxHP(s)));
    s.mobHP = Array.from({length:enemyCount(s)}, (_, i) => multiplyAmounts(mobMaxHP(s, i), remaining));
    s.mobStage = s.stage;
    s.waveLoot = 0;
  }
  return s.mobHP;
}
export function damage(s, amount, lootBoost = 1) {
  if (s.completed || s.gameOver || !validAmount(amount) || compareAmounts(amount, 0) <= 0) return null;
  ensureSwarm(s);
  if (s.bossSeal && s.encounterStage === s.stage) {
    amount = minAmount(amount, subtractAmounts(s.hp, multiplyAmounts(maxHP(s), .4)));
  }
  const boost = Number.isFinite(lootBoost) ? Math.max(1, Math.min(BURST_LOOT, lootBoost)) : 1;
  let left = amount;
  const wasAlive = s.mobHP.map(hp => compareAmounts(hp, 0) > 0);
  for (let pass = 0; pass < enemyCount(s) && compareAmounts(left, 0) > 0; pass++) {
    const live = s.mobHP.map((hp, i) => compareAmounts(hp, 0) > 0 ? i : -1).filter(i => i >= 0);
    if (!live.length) break;
    const share = divideAmounts(left, live.length);
    let spent = 0;
    for (const i of live) {
      const hit = minAmount(s.mobHP[i], share);
      s.mobHP[i] = subtractAmounts(s.mobHP[i], hit);
      spent = addAmounts(spent, hit);
      if (amountRatio(s.mobHP[i], mobMaxHP(s, i)) < 1e-12) s.mobHP[i] = 0;
    }
    if (compareAmounts(spent, 0) <= 0) break;
    left = subtractAmounts(left, spent);
  }
  let defeated = 0;
  for (let i = 0; i < s.mobHP.length; i++) {
    if (wasAlive[i] && s.mobHP[i] === 0) { s.kills++; defeated++; }
  }
  const loot = multiplyAmounts(reward(s), defeated / enemyCount(s) * boost);
  s.coins = addAmounts(s.coins, loot);
  s.total = addAmounts(s.total, loot);
  s.waveLoot = addAmounts(s.waveLoot, loot);
  s.hp = sumAmounts(s.mobHP);
  if (compareAmounts(s.hp, 0) > 0) return null;
  const waveLoot = s.waveLoot, wasBoss = boss(s), cleared = s.stage, won = cleared === MAX_STAGE;
  s.completed = won;
  if (!won) s.stage++;
  s.best = Math.max(s.best, s.stage);
  s.hp = maxHP(s);
  s.mobHP = [];
  s.mobStage = 0;
  s.waveLoot = 0;
  return {loot:waveLoot, boss:wasBoss, cleared, won};
}
export function buy(s, type, index = 0) {
  if (s.gameOver || !['sword', 'ally'].includes(type)) return false;
  if (type === 'ally' && (!Number.isInteger(index) || index < 0 || index >= friends.length)) return false;
  const level = type === 'sword' ? s.sword : s.allies[index];
  if (!Number.isSafeInteger(level + 1)) return false;
  const cost = type === 'sword' ? swordCost(s) : allyCost(s, index);
  if (!canAfford(s.coins, cost)) return false;
  s.coins = subtractAmounts(s.coins, cost);
  if (type === 'sword') s.sword++;
  else s.allies[index]++;
  return true;
}
export const soulGain=s=>s.stage>=30?Math.floor(Math.pow(s.stage/10,1.7)):0;
export function rebirth(s) {
  if (s.gameOver) return false;
  const gain = soulGain(s);
  if (!gain) return false;
  const scale = maxAmount(1, divideAmounts(tapPower(s), 18));
  const keep = {
    sword:s.sword, allies:s.allies.slice(), coins:s.coins, total:s.total,
    kills:s.kills, best:s.best, souls:s.souls + gain,
    rebirths:s.rebirths + 1, retreats:s.retreats, cycleScale:scale
  };
  Object.assign(s, fresh(), keep);
  s.hp = maxHP(s);
  return true;
}
export const threatTier=s=>Math.min(3,Math.floor(s.stage/50));
export const attackDelay=s=>boss(s)?2.4:Math.max(2.5,4.5-threatTier(s)*.5);
export function prepareCombat(s){if(s.encounterStage!==s.stage){s.encounterStage=s.stage;s.attackClock=boss(s)?.6:attackDelay(s);s.windup=0;s.bossSeal=boss(s);}}
export function tickCombat(s,dt){if(s.completed||s.gameOver)return null;prepareCombat(s);dt=Math.max(0,Math.min(.25,dt));s.healCooldown=Math.max(0,s.healCooldown-dt);if(s.stage<5)return null;
 if(s.windup>0){s.windup=Math.max(0,s.windup-dt);if(s.windup>0)return null;s.bossSeal=false;const hit=(boss(s)?35:18)+threatTier(s)*7;s.teamHP=Math.max(0,s.teamHP-hit);s.attackClock=attackDelay(s);if(s.teamHP<=0){s.gameOver=true;s.completed=false;s.windup=0;s.bossSeal=false;return {type:'gameover',hit,from:s.stage};}return {type:'hit',hit};}
 s.attackClock-=dt;if(s.attackClock<=0){s.windup=boss(s)?1.2:1.5;return {type:'warning'};}return null;
}
export function parry(s){if(s.gameOver||s.windup<=0||s.windup>.55)return false;s.windup=0;s.attackClock=attackDelay(s);s.bossSeal=false;s.teamHP=Math.min(100,s.teamHP+8);return true;}
export function heal(s){if(s.gameOver||s.healCooldown>0||s.teamHP>=100)return false;s.teamHP=Math.min(100,s.teamHP+35);s.healCooldown=20;return true;}
export function restore(raw) {
  try {
    const saved = JSON.parse(raw);
    if (!saved || ![1,2,3,4,5,6].includes(saved.version)) return fresh();
    const s = fresh();
    for (const key of ['stage','kills','sword','souls','rebirths','best']) {
      if (Number.isFinite(saved[key]) && saved[key] >= 0) s[key] = saved[key];
    }
    s.stage = Math.max(1, Math.min(MAX_STAGE, Math.floor(s.stage)));
    s.sword = Number.isSafeInteger(Math.floor(s.sword)) ? Math.floor(s.sword) : 0;
    s.allies = [0,1,2].map(i => Number.isSafeInteger(Math.floor(saved.allies?.[i])) && saved.allies[i] >= 0 ? Math.floor(saved.allies[i]) : 0);
    for (const key of ['coins','total']) if (validAmount(saved[key])) s[key] = saved[key];
    s.completed = saved.completed === true && s.stage === MAX_STAGE;
    if (saved.version >= 4) {
      if (validAmount(saved.cycleScale) && compareAmounts(saved.cycleScale, 1) >= 0) s.cycleScale = saved.cycleScale;
      s.teamHP = Number.isFinite(saved.teamHP) ? Math.max(0, Math.min(100, saved.teamHP)) : 100;
      s.retreats = Number.isFinite(saved.retreats) ? Math.max(0, saved.retreats) : 0;
      s.healCooldown = Number.isFinite(saved.healCooldown) ? Math.max(0, Math.min(20, saved.healCooldown)) : 0;
    }
    // Legacy saturated saves keep their current enemy difficulty, then grow normally.
    if (saved.version < 6 && compareAmounts(maxHP(s), 1e220) > 0) {
      s.cycleScale = multiplyAmounts(s.cycleScale, divideAmounts(1e220, maxHP(s)));
    }
    const oldMax = 18 * Math.pow(saved.version === 1 ? 1.30 : 1.60, s.stage - 1) * (boss(s) ? 7 : 1);
    const savedHP = saved.version < 4 && Number.isFinite(saved.hp)
      ? multiplyAmounts(maxHP(s), saved.hp / oldMax) : saved.hp;
    s.hp = validAmount(savedHP) && compareAmounts(savedHP, 0) > 0 ? minAmount(savedHP, maxHP(s)) : maxHP(s);
    if (saved.version >= 4 && saved.mobStage === s.stage && Array.isArray(saved.mobHP)
      && saved.mobHP.length === enemyCount(s)
      && saved.mobHP.every((hp, i) => validAmount(hp) && compareAmounts(hp, mobMaxHP(s, i)) <= 0)) {
      const sum = sumAmounts(saved.mobHP);
      if (compareAmounts(sum, 0) > 0) {
        s.mobHP = saved.mobHP.slice(); s.hp = sum; s.mobStage = s.stage;
        s.waveLoot = validAmount(saved.waveLoot) ? saved.waveLoot : 0;
      }
    }
    s.gameOver = (saved.version >= 5 && saved.gameOver === true) || s.teamHP <= 0;
    if (s.gameOver) { s.teamHP = 0; s.completed = false; }
    return s;
  } catch { return fresh(); }
}
export const units=['','万','億','兆','京','垓','秭','穣','溝','澗','正','載','極','恒河沙','阿僧祇','那由他','不可思議','無量大数','超無量','極無量','桃源','鬼神','天元','宇宙','多元','全知','終極'];
export const unitRank=n=>compareAmounts(n,1e4)<0?0:Math.floor(amountLog10(n)/4);
export const unitLabel=rank=>units[rank]||(rank===0?'一':'終極'+(rank-units.length+2)+'乗');
export function fmt(value) {
  if (!validAmount(value)) return '0';
  if (compareAmounts(value, 1e4) < 0) return Math.floor(value).toLocaleString('ja-JP');
  let rank = unitRank(value);
  let scaled = Number(amountRatio(value, powerAmount(10, rank * 4)).toFixed(1));
  if (scaled >= 10000) { rank++; scaled = 1; }
  return scaled.toFixed(1) + unitLabel(rank);
}
export const weaponNames=['桃の木刀','桃鉄・鬼斬丸','雷神・桃一閃','獄炎・鬼滅丸','星砕きの桃剣','銀河断ち','次元裂き・桃源','因果逆転の太刀','不可思議の神剣','無量大数・桃皇剣','宇宙創生・太郎','終極・桃源開闢'];
export const weaponTier=s=>Math.floor(s.sword/5);
export const weaponName=s=>weaponNames[Math.min(weaponNames.length-1,weaponTier(s))]+(weaponTier(s)>=weaponNames.length?' 第'+(weaponTier(s)-weaponNames.length+2)+'解放':'');
export const evolution=level=>powerAmount(10,Math.floor(level/5));
export const oniScale=s=>Math.min(2.05,.72+Math.log10(s.stage)*.48+(boss(s)?.20:0));

export const allyRank=(s,i)=>Math.min(3,Math.floor(s.allies[i]/5));
export const allyMove=(s,i)=>[['突撃','二連牙','残像牙','獣王乱舞'],['連弾','分身拳','四影乱舞','千手神拳'],['光弾','双翼弾','流星群','鳳凰レーザー']][i][allyRank(s,i)];
// The hype meter is transient combat state; existing progress saves stay compatible.
export const freshHype=()=>({charge:0,left:0,pulses:0,pulseClock:0,casts:0});
export function addHype(h,n){if(h.left<=0&&Number.isFinite(n)&&n>0)h.charge=Math.min(100,h.charge+n);}
export function castHype(h){if(h.charge<100||h.left>0)return false;h.charge=0;h.left=8;h.pulses=3;h.pulseClock=.65;h.casts++;return true;}
export const hypePower=h=>h.left>0?10:1;
export function tickHype(h,dt){dt=Math.max(0,Math.min(.25,dt));if(h.left<=0)return false;h.left=Math.max(0,h.left-dt);h.pulseClock-=dt;if(h.pulses>0&&h.pulseClock<=0&&h.left>0){h.pulses--;h.pulseClock+=.65;return true;}if(h.left===0)h.pulses=0;return false;}

export function autoRebirth(s){return !s.gameOver&&s.completed&&s.stage===MAX_STAGE?rebirth(s):false;}

export function restartAfterGameOver(s){if(!s.gameOver)return false;Object.assign(s,fresh());return true;}
