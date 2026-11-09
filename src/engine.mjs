export const MAX_STAGE=500;
export const friends=[{name:'イヌ',job:'先制かみつき',base:25,power:8},{name:'サル',job:'分身きびだんご拳',base:500,power:180},{name:'キジ',job:'天空メテオ',base:10000,power:4400}];
const cap=n=>Math.min(1e220,n);
export function fresh(){return {gameOver:false,teamHP:100,cycleScale:1,retreats:0,encounterStage:0,attackClock:3,windup:0,bossSeal:false,healCooldown:0,mobHP:[],mobStage:0,waveLoot:0,completed:false,version:5,stage:1,hp:18,coins:0,total:0,kills:0,sword:0,allies:[0,0,0],souls:0,rebirths:0,best:1};}
export const boss=s=>s.stage%10===0;
export const maxHP=s=>cap(18*Math.pow(1.60,s.stage-1)*(boss(s)?7:1)*s.cycleScale*(1+Math.floor(s.stage/25)*.8));
export const multiplier=s=>1+s.souls;
export const tapPower=s=>cap(6*Math.pow(2,s.sword)*evolution(s.sword)*multiplier(s));
export const allyPower=(s,i)=>cap(tapPower(s)*[.12,.16,.22][i]+friends[i].power*(s.allies[i]>0?Math.pow(2,s.allies[i]-1)*evolution(s.allies[i])*multiplier(s):0));
export const dps=s=>cap(friends.reduce((n,_,i)=>n+allyPower(s,i),0));
export const swordCost=s=>cap(12*Math.pow(2.05,s.sword)*evolution(s.sword));
export const allyCost=(s,i)=>cap(friends[i].base*Math.pow(2.08,s.allies[i])*evolution(s.allies[i]));
export const reward=s=>cap(10*Math.pow(1.65,s.stage-1)*(boss(s)?8:1)*s.cycleScale);
export const BURST_POWER=1e8;
export const BURST_LOOT=1e4;
export const enemyCount=s=>boss(s)?7:Math.min(8,3+Math.floor((s.stage-1)/20));
export const enemyWeight=(s,i)=>boss(s)&&i===0?4:1+(i%3)*.18;
export function mobMaxHP(s,i){let weight=0;for(let j=0;j<enemyCount(s);j++)weight+=enemyWeight(s,j);return maxHP(s)*enemyWeight(s,i)/weight;}
export function ensureSwarm(s){const sum=s.mobHP?.reduce((a,b)=>a+b,0)||0;if(s.mobStage!==s.stage||s.mobHP?.length!==enemyCount(s)||Math.abs(sum-s.hp)>Math.max(1e-8,s.hp*1e-10)){
 s.mobHP=Array.from({length:enemyCount(s)},(_,i)=>mobMaxHP(s,i)*Math.min(1,s.hp/maxHP(s)));s.mobStage=s.stage;s.waveLoot=0;
}return s.mobHP;}
export function damage(s,n,lootBoost=1){
 if(s.completed||s.gameOver||!Number.isFinite(n)||n<=0)return null;
 ensureSwarm(s);if(s.bossSeal&&s.encounterStage===s.stage)n=Math.min(n,Math.max(0,s.hp-maxHP(s)*.4));const boost=Number.isFinite(lootBoost)?Math.max(1,Math.min(BURST_LOOT,lootBoost)):1;
 let left=n;const wasAlive=s.mobHP.map(h=>h>0);
 for(let pass=0;pass<enemyCount(s)&&left>0;pass++){
  const live=s.mobHP.map((h,i)=>h>0?i:-1).filter(i=>i>=0);if(!live.length)break;
  const share=left/live.length;let spent=0;
  for(const i of live){const hit=Math.min(s.mobHP[i],share);s.mobHP[i]-=hit;spent+=hit;if(s.mobHP[i]<mobMaxHP(s,i)*1e-12)s.mobHP[i]=0;}
  if(spent<=0)break;left=Math.max(0,left-spent);
 }
 let loot=0;for(let i=0;i<s.mobHP.length;i++)if(wasAlive[i]&&s.mobHP[i]===0){s.kills++;loot+=reward(s)/enemyCount(s)*boost;}
 s.coins=cap(s.coins+loot);s.total=cap(s.total+loot);s.waveLoot=cap(s.waveLoot+loot);s.hp=s.mobHP.reduce((a,b)=>a+b,0);
 if(s.hp>0)return null;
 const waveLoot=s.waveLoot,wasBoss=boss(s),cleared=s.stage,won=cleared===MAX_STAGE;s.completed=won;
 if(!won)s.stage++;s.best=Math.max(s.best,s.stage);s.hp=maxHP(s);s.mobHP=[];s.mobStage=0;s.waveLoot=0;
 return {loot:waveLoot,boss:wasBoss,cleared,won};
}
export function buy(s,type,index=0){if(s.gameOver)return false;const cost=type==='sword'?swordCost(s):allyCost(s,index);if(s.coins<cost)return false;s.coins-=cost;if(type==='sword')s.sword++;else s.allies[index]++;return true;}
export const soulGain=s=>s.stage>=30?Math.floor(Math.pow(s.stage/10,1.7)):0;
export function rebirth(s){if(s.gameOver)return false;const gain=soulGain(s);if(!gain)return false;const scale=Math.min(1e218,Math.max(1,tapPower(s)/18));const keep={sword:s.sword,allies:s.allies.slice(),coins:s.coins,total:s.total,kills:s.kills,best:s.best,souls:s.souls+gain,rebirths:s.rebirths+1,retreats:s.retreats,cycleScale:scale};Object.assign(s,fresh(),keep);s.hp=maxHP(s);return true;}
export const threatTier=s=>Math.min(3,Math.floor(s.stage/50));
export const attackDelay=s=>boss(s)?2.4:Math.max(2.5,4.5-threatTier(s)*.5);
export function prepareCombat(s){if(s.encounterStage!==s.stage){s.encounterStage=s.stage;s.attackClock=boss(s)?.6:attackDelay(s);s.windup=0;s.bossSeal=boss(s);}}
export function tickCombat(s,dt){if(s.completed||s.gameOver)return null;prepareCombat(s);dt=Math.max(0,Math.min(.25,dt));s.healCooldown=Math.max(0,s.healCooldown-dt);if(s.stage<5)return null;
 if(s.windup>0){s.windup=Math.max(0,s.windup-dt);if(s.windup>0)return null;s.bossSeal=false;const hit=(boss(s)?35:18)+threatTier(s)*7;s.teamHP=Math.max(0,s.teamHP-hit);s.attackClock=attackDelay(s);if(s.teamHP<=0){s.gameOver=true;s.completed=false;s.windup=0;s.bossSeal=false;return {type:'gameover',hit,from:s.stage};}return {type:'hit',hit};}
 s.attackClock-=dt;if(s.attackClock<=0){s.windup=boss(s)?1.2:1.5;return {type:'warning'};}return null;
}
export function parry(s){if(s.gameOver||s.windup<=0||s.windup>.55)return false;s.windup=0;s.attackClock=attackDelay(s);s.bossSeal=false;s.teamHP=Math.min(100,s.teamHP+8);return true;}
export function heal(s){if(s.gameOver||s.healCooldown>0||s.teamHP>=100)return false;s.teamHP=Math.min(100,s.teamHP+35);s.healCooldown=20;return true;}
export function restore(raw){try{const o=JSON.parse(raw);if(!o||![1,2,3,4,5].includes(o.version))return fresh();const s=fresh();for(const k of ['stage','coins','total','kills','sword','souls','rebirths','best'])if(Number.isFinite(o[k])&&o[k]>=0)s[k]=Math.min(o[k],1e220);s.stage=Math.max(1,Math.min(MAX_STAGE,Math.floor(s.stage)));s.sword=Math.min(700,Math.floor(s.sword));s.allies=[0,1,2].map(i=>Math.max(0,Math.min(700,Math.floor(Number.isFinite(o.allies?.[i])?o.allies[i]:0))));s.completed=o.completed===true&&s.stage===MAX_STAGE;if(o.version>=4){s.cycleScale=Number.isFinite(o.cycleScale)&&o.cycleScale>=1?Math.min(1e218,o.cycleScale):1;s.teamHP=Number.isFinite(o.teamHP)?Math.max(0,Math.min(100,o.teamHP)):100;s.retreats=Number.isFinite(o.retreats)?Math.max(0,o.retreats):0;s.healCooldown=Number.isFinite(o.healCooldown)?Math.max(0,Math.min(20,o.healCooldown)):0;}const oldMax=18*Math.pow(1.30,s.stage-1)*(boss(s)?7:1);const prevMax=o.version===1?oldMax:18*Math.pow(1.60,s.stage-1)*(boss(s)?7:1);const savedHP=o.version<4?o.hp/prevMax*maxHP(s):o.hp;s.hp=Number.isFinite(savedHP)&&savedHP>0?Math.min(savedHP,maxHP(s)):maxHP(s);if(o.version>=4&&o.mobStage===s.stage&&Array.isArray(o.mobHP)&&o.mobHP.length===enemyCount(s)&&o.mobHP.every((n,i)=>Number.isFinite(n)&&n>=0&&n<=mobMaxHP(s,i))){const sum=o.mobHP.reduce((a,b)=>a+b,0);if(sum>0){s.mobHP=o.mobHP.slice();s.hp=sum;s.mobStage=s.stage;s.waveLoot=Number.isFinite(o.waveLoot)&&o.waveLoot>=0?cap(o.waveLoot):0;}}s.gameOver=(o.version>=5&&o.gameOver===true)||s.teamHP<=0;if(s.gameOver){s.teamHP=0;s.completed=false;}return s;}catch{return fresh();}}
export const units=['','万','億','兆','京','垓','秭','穣','溝','澗','正','載','極','恒河沙','阿僧祇','那由他','不可思議','無量大数','超無量','極無量','桃源','鬼神','天元','宇宙','多元','全知','終極'];
export const unitRank=n=>n<1e4?0:Math.floor(Math.log10(n)/4);
export const unitLabel=rank=>units[rank]||(rank===0?'一':'終極'+(rank-units.length+2)+'乗');
export function fmt(n){if(!Number.isFinite(n)||n<0)return '0';if(n<1e4)return Math.floor(n).toLocaleString('ja-JP');let i=unitRank(n),v=Number((n/10**(i*4)).toFixed(1));if(v>=10000){i++;v=1;}return v.toFixed(1)+unitLabel(i);}
export const weaponNames=['桃の木刀','桃鉄・鬼斬丸','雷神・桃一閃','獄炎・鬼滅丸','星砕きの桃剣','銀河断ち','次元裂き・桃源','因果逆転の太刀','不可思議の神剣','無量大数・桃皇剣','宇宙創生・太郎','終極・桃源開闢'];
export const weaponTier=s=>Math.floor(s.sword/5);
export const weaponName=s=>weaponNames[Math.min(weaponNames.length-1,weaponTier(s))]+(weaponTier(s)>=weaponNames.length?' 第'+(weaponTier(s)-weaponNames.length+2)+'解放':'');
export const evolution=level=>Math.pow(10,Math.floor(level/5));
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
