const $=id=>document.getElementById(id),KEY='dopataro-save-v1';
let s=fresh(),storageOK=true;try{s=restore(localStorage.getItem(KEY));}catch{storageOK=false;}
let calm=matchMedia('(prefers-reduced-motion: reduce)').matches,sound=true,fever=0,feverEnd=0,lastTap=-10000,combo=0,bannerEnd=0,last=performance.now(),autoAccum=0,saveAccum=0,lastAutoPop=0,lootTimer,toastTimer,unitTimer,previousRank=unitRank(tapPower(s)),allyTurn=0;const allyPulse=[0,0,0];let heroSwing=-10000,parryUntil=0,hurtUntil=0,heroSteps=0;let hype=freshHype(),ultimateTimer,comicTimer,ultimateHits=0;let previousLife=s.teamHP,lifeInitialized=false,lifeTimer,lifeTrailTimer,pendingLifeReason='',autoRebirthLeft=0;let gameOverTimer;
try{sound=localStorage.getItem('dopataro-sound')!=='off';}catch{}
syncSoundLabel();
for(const event of ['pointerdown','touchend','click'])document.addEventListener(event,()=>{audioEngine.unlocked=true;primeAudio();},{capture:true});document.addEventListener('keydown',()=>{audioEngine.unlocked=true;primeAudio();},{capture:true});
$('motion').textContent=calm?'演出 OFF':'演出 ON';$('motion').setAttribute('aria-pressed',String(!calm));document.body.classList.toggle('calm',calm);
friends.forEach((f,i)=>{$('allies').insertAdjacentHTML('beforeend',`<button class="upgrade" id="ally-${i}" aria-keyshortcuts="${i+2}"><span class="badge">${['犬','猿','雉'][i]}</span><span class="upgrade-info"><b>${f.name} <kbd>${i+2}</kbd><em id="ally-lv-${i}">Lv.0</em></b><small id="ally-role-${i}">${f.job} / 参戦中</small></span><span class="price" id="ally-price-${i}"></span></button>`);$(`ally-${i}`).onclick=()=>{const beforePower=allyPower(s,i);if(buy(s,'ally',i)){tone(420+i*140);const gain=amountRatio(allyPower(s,i),beforePower).toFixed(1);upgradeEffect(f.name+' Lv.'+s.allies[i],gain,s.allies[i]%5===0,false,beforePower,allyPower(s,i));announce(f.name+'の技、強化！ 火力 ×'+gain);update();save();}};});
function announce(text,ms=1800){$('banner').textContent=text;bannerEnd=performance.now()+ms;}
function battleBoost(now=performance.now()){return (feverEnd>now?BURST_POWER:1)*hypePower(hype);}
function chainBoost(){return performance.now()-lastTap<1000?Math.min(10,1+Math.floor(combo/10)):1;}
function pulse(el){if(calm)return;el.classList.remove('power-pop');void el.offsetWidth;el.classList.add('power-pop');}
function upgradeEffect(name,gain,major,weapon=true,before=0,after=0){
 const duration=major?1700:950;
 $('upgrade-toast').textContent=(major?'限界突破！ ':'強化！ ')+name+' / 火力 ×'+gain;
 $('upgrade-toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('upgrade-toast').classList.remove('visible'),1800);
 addHype(hype,major?15:5);pulse($(weapon?'sword':'allies'));pulse($('power'));emitBurst(160,230,major?90:35,major?'#ffe36c':'#ff7196');
 if(weapon||major){
  const panel=$('loot-show');panel.classList.toggle('weapon',weapon);panel.classList.toggle('evolution',major);
  $('loot-label').textContent=weapon?(major?'新神装、顕現！':'刀、覚醒！'):'仲間、覚醒！';
  $('loot-name').textContent=name;$('loot-boost').textContent='威力 ×'+gain+(weapon?' / Lv.'+s.sword:'');
  const shownBoost=battleBoost()*(weapon?chainBoost():1);$('loot-power').textContent=compareAmounts(before,0)>0?(weapon?'一撃 ':'援護 ')+fmt(multiplyAmounts(before,shownBoost))+' → '+fmt(multiplyAmounts(after,shownBoost)):'';
  panel.style.setProperty('--loot-duration',duration+'ms');panel.classList.remove('show');void panel.offsetWidth;panel.classList.add('show');clearTimeout(lootTimer);lootTimer=setTimeout(()=>panel.classList.remove('show'),duration);
  if(weapon){weaponRevealBorn=performance.now();weaponRevealMajor=major;heroSwing=performance.now()+600;soundFX(major?'weapon':'forge');addRing(260,180,major?210:120,'#ffe36c');if(major)comic('神装、獲得！');}
  else soundFX('level');
 }
}
function checkUnit(n){const rank=unitRank(n);if(rank>previousRank){const from=unitLabel(previousRank),to=unitLabel(rank);$('unit-break').textContent='桁突破！ '+from+' → '+to;$('unit-break').classList.add('show');clearTimeout(unitTimer);unitTimer=setTimeout(()=>$('unit-break').classList.remove('show'),1800);emitBurst(420,170,45,'#91edcd');if(rank-previousRank>=2){comic('桁、壊れた！');soundFX('chain');}pulse($('power'));}previousRank=Math.max(previousRank,rank);}
function pop(text,crit=false,amount=0,auto=false){if(calm)return;const layer=$('float-layer');while(layer.children.length>=20)layer.firstChild.remove();const e=document.createElement('span');e.className='float'+(crit?' crit':'')+(auto?' auto':'');e.textContent=text;let size=Math.min(crit?68:56,(auto?16:26)+unitRank(amount)*1.8+(crit?9:0));const width=$('battle').clientWidth;ctx.save();ctx.font='900 '+size+'px system-ui';const measured=ctx.measureText(text).width;ctx.restore();size=Math.min(size,size*(width*.86)/Math.max(1,measured));e.style.fontSize=size+'px';const textWidth=Math.min(width*.86,measured);e.style.left=Math.max(8,Math.min(width-textWidth-12,width*(.30+Math.random()*.10)))+'px';e.style.top=(24+Math.random()*23)+'%';layer.append(e);setTimeout(()=>e.remove(),850);}
function strike(n,manual=false,crit=false){
 if(s.completed||s.gameOver)return;
 const before=ensureSwarm(s).slice(),positions=enemyPositions(s),oldKills=s.kills;
 const result=damage(s,n,feverEnd>performance.now()?BURST_LOOT:1);hitUntil=performance.now()+110;
 const defeated=before.map((h,i)=>compareAmounts(h,0)>0&&(result||s.mobHP[i]===0)?i:-1).filter(i=>i>=0);
 if(manual){heroSwing=performance.now();heroSteps++;pop((crit?'超会心！ ':'薙ぎ払い −')+fmt(n),crit,n);soundFX('slash');slashUntil=performance.now()+220;}
 else if(performance.now()-lastAutoPop>380){pop('援護 '+fmt(n),false,n,true);lastAutoPop=performance.now();}
 checkUnit(n);
 addHype(hype,defeated.length*.8);for(const i of defeated){const p=positions[i];burstEnemy(p.x,p.y,p.scale,i);}
 if(s.kills>oldKills){soundFX('pop');pulse($('coins'));}
 if(result){
  s.teamHP=Math.min(100,s.teamHP+3);
  pop(before.filter(h=>compareAmounts(h,0)>0).length+'体 一掃！ +'+fmt(result.loot)+'両',true,result.loot);addRing(440,220,180,'#ffe36c');
  if(result.won){autoRebirthLeft=.9;announce('五百波、突破！ 育成そのまま、自動転生！',2200);save();}
  else if(result.boss){comic('鬼軍団、粉砕！');soundFX('bossbreak');announce('鬼軍団、壊滅！ +'+fmt(result.loot)+' 両',2400);tone(660,true);}
  else if(s.kills<10)announce('群れを一掃！ +'+fmt(result.loot)+' 両 → 刀と仲間を強化！');
  else if(boss(s))announce('大鬼軍団出現。全員まとめて、ぶっ飛ばせ！',2000);
  if(!calm){$('battle').classList.remove('impact');void $('battle').offsetWidth;$('battle').classList.add('impact');}
 }
 update();
}
function attack(){const now=performance.now();if(s.completed||s.gameOver||now-lastTap<65||document.querySelector('dialog[open]'))return;combo=now-lastTap<1000?combo+1:1;lastTap=now;addHype(hype,3);if(combo%10===0){comic(['桃斬！','鬼神連斬！','桃源突破！','神域到達！','限界の向こう！'][Math.min(4,Math.floor(combo/10)-1)]);soundFX('chain');}const crit=Math.random()<.16;if(feverEnd<=now){fever=Math.min(100,fever+5.6);if(fever>=100){feverEnd=now+8000;fever=0;announce('桃バースト！ 全火力 ×1億',2200);soundFX('burst');burstUntil=now+1800;$('burst-callout').classList.add('show');setTimeout(()=>$('burst-callout').classList.remove('show'),1500);emitBurst(330,200,120,'#ffe36c');}}strike(multiplyAmounts(tapPower(s),chainBoost()*battleBoost(now)*(crit?5:1)),true,crit);if(crit)soundFX('crit');else tone(180);$('combo').textContent=combo>1?combo+' 連斬！':'一撃入魂';}
$('hit').onclick=attack;$('attack').onclick=attack;
document.addEventListener('keydown',e=>{
 if(e.repeat||e.isComposing||e.ctrlKey||e.metaKey||e.altKey||e.shiftKey||document.querySelector('dialog[open]')||e.target.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"])'))return;
 const upgrade={'Digit1':'sword','Digit2':'ally-0','Digit3':'ally-1','Digit4':'ally-2','Numpad1':'sword','Numpad2':'ally-0','Numpad3':'ally-1','Numpad4':'ally-2'}[e.code];
 if(upgrade){e.preventDefault();$(upgrade).click();return;}
 if(e.code==='KeyF'){e.preventDefault();activateUltimate();}
 if(e.code==='KeyG'){e.preventDefault();attemptParry();}
 if(e.code==='Space'&&(e.target===document.body||e.target===$('hit')||e.target===$('attack'))){e.preventDefault();attack();}
});
$('sword').onclick=()=>{const before=tapPower(s);if(buy(s,'sword')){const major=s.sword%5===0;upgradeEffect(weaponName(s),major?20:2,major,true,before,tapPower(s));announce(major?'武器進化！ '+weaponName(s)+' / 火力20倍！':weaponName(s)+'、火力2倍！');checkUnit(tapPower(s));update();save();}};
$('sound').onclick=()=>{sound=!sound;syncSoundLabel();try{localStorage.setItem('dopataro-sound',sound?'on':'off');}catch{}if(sound){primeAudio();setAudioMix(.6);tone(440);}else setAudioMix(0);};
$('motion').onclick=()=>{calm=!calm;document.body.classList.toggle('calm',calm);if(calm){particles.length=0;shots.length=0;ghosts.length=0;rings.length=0;}$('motion').textContent=calm?'演出 OFF':'演出 ON';$('motion').setAttribute('aria-pressed',String(!calm));};
$('help').onclick=()=>$('guide').showModal();$('close-guide').onclick=()=>$('guide').close();
function save(){try{localStorage.setItem(KEY,JSON.stringify(s));storageOK=true;}catch{storageOK=false;}$('save-status').textContent=storageOK?'進行はこのブラウザに自動保存':'この環境では保存できません。閉じると進行が失われます。';}
function update(){ensureSwarm(s);prepareCombat(s);updateLifeHUD();const now=performance.now(),boost=battleBoost(now),feverActive=feverEnd>now;updateHypeHUD();$('stage').textContent=s.stage;updateTactics();$('parry').disabled=s.completed||s.gameOver;$('heal').disabled=s.gameOver||s.teamHP>=100||s.healCooldown>0;$('heal').textContent=s.healCooldown>0?'だんご あと'+Math.ceil(s.healCooldown)+'秒':'きびだんご +35';$('best').textContent=s.best;$('swarm-status').textContent=s.completed?'鬼軍団 全滅！':'鬼軍団 '+s.mobHP.filter(h=>compareAmounts(h,0)>0).length+' / '+enemyCount(s)+'体';$('squad-status').textContent='犬 '+allyMove(s,0)+' / 猿 '+allyMove(s,1)+' / キジ '+allyMove(s,2);$('region').textContent=['第一幕 / 桃の里','第二幕 / 鬼の浜','第三幕 / 鬼ヶ島','第四幕 / 天上鬼界','最終幕 / 桃源宇宙'][Math.min(4,Math.floor((s.stage-1)/30))];$('boss-label').textContent=s.completed?'伝説、達成。':boss(s)?'大鬼、襲来。':'鬼、襲来。';$('enemy-name').textContent=s.completed?'鬼退治、完遂。':boss(s)?['鬼ヶ島の門番','百裂の鬼将','極・鬼大王'][Math.floor(s.stage/10)%3]:['鬼の先兵','重装・金棒鬼','狂化・百裂鬼','神域・雷鳴鬼'][threatTier(s)];$('hp-text').textContent=fmt(s.hp)+' / '+fmt(maxHP(s));const pct=Math.max(0,Math.min(1,amountRatio(s.hp,maxHP(s))));$('hp-bar').style.transform='scaleX('+pct+')';document.querySelector('.hp-track').setAttribute('aria-valuenow',Math.round(pct*100));$('coins').innerHTML=fmt(s.coins)+'<small> 両</small>';$('power').textContent=fmt(multiplyAmounts(tapPower(s),boost*chainBoost()));$('dps').textContent=fmt(multiplyAmounts(dps(s),boost));$('kills').textContent=fmt(s.kills);$('sword-lv').textContent='Lv.'+s.sword;$('weapon-name').textContent=weaponName(s);$('weapon-caption').textContent='装備：'+weaponName(s);$('sword-next').textContent=(s.sword%5===4?'次の強化：武器進化 ×20！':'次の強化 ×2 / 進化まで '+(5-s.sword%5)+'Lv');$('power-era').textContent='火力の単位：'+unitLabel(unitRank(multiplyAmounts(tapPower(s),boost*chainBoost())));$('chain-power').textContent='連斬倍率 ×'+chainBoost();$('sword-price').textContent=fmt(swordCost(s))+' 両';$('sword').disabled=!canAfford(s.coins,swordCost(s))||s.completed||s.gameOver;friends.forEach((f,i)=>{$('ally-lv-'+i).textContent=s.allies[i]?'Lv.'+s.allies[i]:'同行中';$('ally-role-'+i).textContent=allyMove(s,i)+' / '+(compareAmounts(multiplyAmounts(allyPower(s,i),boost),10)<0?multiplyAmounts(allyPower(s,i),boost).toFixed(1):fmt(multiplyAmounts(allyPower(s,i),boost)))+' 毎秒';$('ally-price-'+i).textContent=fmt(allyCost(s,i))+' 両';$('ally-'+i).disabled=!canAfford(s.coins,allyCost(s,i))||s.completed||s.gameOver;});$('multi').textContent='×'+fmt(multiplier(s));$('auto-cycle').textContent='第'+(s.rebirths+1)+'周 / '+(s.completed?'自動転生中…':'500波突破で自動転生');$('attack').disabled=s.completed||s.gameOver;$('attack').innerHTML=s.completed?'自動転生中！<small>育成・小判は全部そのまま</small>':'鬼の群れをぶった斬る！<small>薙ぎ払い / Space</small>';$('hit').disabled=s.completed||s.gameOver;$('battle').classList.toggle('fever',feverActive);$('fever-label').textContent=feverActive?'桃バースト ×1億':'桃バースト';$('fever-text').textContent=feverActive?((feverEnd-now)/1000).toFixed(1)+'秒':Math.floor(fever)+'% / 連打でためろ！';$('fever-bar').style.transform='scaleX('+(feverActive?(feverEnd-now)/8000:fever/100)+')';}
function frame(now){if(s.gameOver)showGameOver();const dt=Math.min(.1,(now-last)/1000);last=now;if(!document.hidden&&!s.gameOver&&!document.querySelector('dialog[open]')){if(s.completed){if(autoRebirthLeft<=0)autoRebirthLeft=.9;autoRebirthLeft-=dt;if(autoRebirthLeft<=0)performAutoRebirth();}if(tickHype(hype,dt))ultimatePulse();updateHypeHUD();const event=tickCombat(s,dt);if(event){if(event.type==='warning'){announce('構えた！ 光る瞬間に見切れ！',1200);soundFX('warning');}else{hurtUntil=now+500;soundFX('hurt');announce(event.type==='gameover'?'ライフ0。ゲームオーバー。':'鬼の反撃！ 体力 −'+event.hit,2200);if(event.type==='gameover'){pendingLifeReason='ライフ0・ゲームオーバー';endBattleOnGameOver();update();renderArt(now);requestAnimationFrame(frame);return;}}}updateTactics();autoAccum+=dt;saveAccum+=dt;if(feverEnd<=now&&now-lastTap>1000)fever=Math.max(0,fever-dt*4);if(autoAccum>=.34){if(!s.completed){const i=allyTurn++%3,live=ensureSwarm(s).map((h,j)=>compareAmounts(h,0)>0?j:-1).filter(j=>j>=0),target=enemyPositions(s)[live[i%live.length]];allyPulse[i]=now;fireAlly(i,target);soundFX('ally');strike(multiplyAmounts(allyPower(s,i),autoAccum*3*battleBoost(now)));}autoAccum=0;update();}if(saveAccum>3){save();saveAccum=0;}if(now>bannerEnd&&!s.completed)$('banner').textContent=boss(s)?'でかい鬼ほど、うまい。':'犬・猿・キジと、鬼の群れを一掃しろ。';}if(!document.hidden){musicTick();renderArt(now);}requestAnimationFrame(frame);}
document.addEventListener('visibilitychange',()=>{setAudioMix(document.hidden||!sound?0:.6);save();last=performance.now();autoAccum=0;});window.addEventListener('pagehide',save);if(s.completed)announce('五百波突破済み！ 自動で次の周回へ。',1800);update();save();requestAnimationFrame(frame);

function attemptParry(){if(s.completed||s.gameOver||document.querySelector('dialog[open]'))return;if(parry(s)){addHype(hype,25);comic('見切った！');parryUntil=performance.now()+700;heroSwing=performance.now();soundFX('parry');announce('見切り成功！ 結界破壊・反撃！',1600);addRing(200,210,150,'#91edcd');strike(multiplyAmounts(maxHP(s),.15),true,true);save();}else{announce(s.windup>0?'まだ早い！ 光る瞬間を待て！':'鬼の予告を待て。',900);tone(150);}}
function updateTactics(){
 updateLifeHUD();
 const active=!s.gameOver&&!s.completed&&s.stage>=5,warning=active&&s.windup>0,ready=warning&&s.windup<=.55;
 const duration=boss(s)?1.2:1.5,seconds=warning?s.windup:Math.max(0,s.attackClock);
 const text=s.gameOver?'ゲームオーバー':s.completed?'鬼軍団を突破！':!active?'序盤は反撃なし。まずは強化！':warning?(ready?'今だ！見切り！ ':'反撃まで ')+seconds.toFixed(1)+'秒':'次の構えまで '+seconds.toFixed(1)+'秒';
 $('parry').classList.toggle('ready',ready);
 $('parry').setAttribute('aria-label',ready?'今だ！見切りで防ぐ':'見切り（光る瞬間を待つ）');
 $('enemy-action').textContent=text;
 const panel=$('counter-panel'),track=$('counter-track');
 panel.classList.toggle('warning',warning);panel.classList.toggle('ready',ready);
 track.hidden=!active;
 const fraction=active?Math.max(0,Math.min(1,seconds/(warning?duration:attackDelay(s)))):0;
 $('counter-fill').style.transform='scaleX('+fraction+')';
 $('counter-window').hidden=!warning;
 $('counter-window').style.width=(.55/duration*100)+'%';
 track.setAttribute('aria-valuenow',Math.round(fraction*100));
 track.setAttribute('aria-valuetext',text);
 $('counter-hint').textContent=!active?'':warning?'左の「見切り区間」に入ったら G / 見切り！':s.bossSeal?'大鬼の結界は見切りで砕け！':'予告の後、見切り区間で G / 見切り！';
 $('battle').classList.toggle('danger',warning);
}
$('parry').onclick=attemptParry;
$('heal').onclick=()=>{if(heal(s)){tone(660,true);announce('きびだんご！ 体力 +35',1200);emitBurst(100,220,30,'#91edcd');update();save();}};
$('audio-help').onclick=()=>{$('audio-dialog').showModal();ensureTestClip();audioStatus();};
$('close-audio').onclick=()=>{$('native-audio').pause();$('audio-dialog').close();};
$('start-audio').onclick=()=>{sound=true;audioEngine.unlocked=true;try{localStorage.setItem('dopataro-sound','on');}catch{}primeAudio();setAudioMix(.65);syncSoundLabel();const context=audioEngine.context;if(context)context.resume().then(()=>{soundFX('parry');audioStatus();}).catch(e=>{audioEngine.lastError=e.name;audioStatus();});ensureTestClip();const play=$('native-audio').play();if(play)play.catch(e=>{audioEngine.lastError=e.name;audioStatus();});};

function comic(word){$('comic-word').textContent=word;$('comic-word').classList.remove('show');void $('comic-word').offsetWidth;$('comic-word').classList.add('show');clearTimeout(comicTimer);comicTimer=setTimeout(()=>$('comic-word').classList.remove('show'),760);}
function updateHypeHUD(){const liveCombo=performance.now()-lastTap<1000?combo:0,active=hype.left>0,ready=hype.charge>=100&&!active;$('hype-label').textContent=active?'桃神降臨中！ 全火力さらに×10':ready?'桃神、解放可能！':'桃神ゲージ';$('hype-count').textContent=active?hype.left.toFixed(1)+'秒 / 合体追撃':Math.floor(hype.charge)+'% / 攻撃・撃破・見切り';$('hype-meter').style.transform='scaleX('+(active?hype.left/8:hype.charge/100)+')';$('ultimate').disabled=!ready||s.completed||s.gameOver;$('ultimate').innerHTML=active?'桃神、降臨中！<small>敵の予告には見切り！</small>':'桃神降臨！<small>ゲージ100%で解放 / F</small>';$('ultimate').parentElement.classList.toggle('active',active);$('battle').classList.toggle('god',active);$('chain-rank').textContent=liveCombo>=10?['鬼神','爆斬','桃源','神域','超越'][Math.min(4,Math.floor(combo/10)-1)]+' / '+combo+'連斬':'連鎖をつなげ！';}
function activateUltimate(){if(s.completed||s.gameOver||document.querySelector('dialog[open]')||!castHype(hype))return;heroSwing=performance.now();godBeamUntil=performance.now()+1400;$('god-cutin').classList.remove('show');void $('god-cutin').offsetWidth;$('god-cutin').classList.add('show');clearTimeout(ultimateTimer);ultimateTimer=setTimeout(()=>$('god-cutin').classList.remove('show'),1550);soundFX('god');announce('桃神降臨！ 四重合体・桃源開闢！',2400);ultimatePulse();update();}
function ultimatePulse(){if(s.completed||s.gameOver)return;ultimateHits++;godBeamUntil=performance.now()+800;heroSwing=performance.now();const positions=enemyPositions(s),live=ensureSwarm(s).map((h,i)=>compareAmounts(h,0)>0?i:-1).filter(i=>i>=0);for(let i=0;i<3;i++){allyPulse[i]=performance.now();fireAlly(i,positions[live[i%live.length]]);emitBurst(65+i*105,280,12,['#ffe36c','#ff7196','#91edcd'][i]);}soundFX('godpulse');addRing(400,210,200,'#ff94dc');strike(multiplyAmounts(tapPower(s),chainBoost()*battleBoost()*20),true,true);}
$('ultimate').onclick=activateUltimate;

const BACKUP_KEY='dopataro-restart-backup-v1';
function readRestartBackup(){try{const b=JSON.parse(localStorage.getItem(BACKUP_KEY));if(!b?.state||![1,2,3,4,5,6].includes(b.state.version)||!Number.isFinite(b.state.stage)||b.state.stage<1)return null;return b;}catch{return null;}}
function refreshRestartDialog(){const b=readRestartBackup();$('restore-backup').disabled=!b;$('backup-summary').textContent=b?'退避中：第'+b.state.stage+'波 / 刀Lv.'+(b.state.sword||0)+' / '+fmt(b.state.coins||0)+'両':'退避セーブはまだありません。';}
function writeRestartState(next){const previous=localStorage.getItem(BACKUP_KEY);localStorage.setItem(BACKUP_KEY,JSON.stringify({savedAt:Date.now(),state:s}));try{localStorage.setItem(KEY,JSON.stringify(next));}catch(e){try{if(previous===null)localStorage.removeItem(BACKUP_KEY);else localStorage.setItem(BACKUP_KEY,previous);}catch{}throw e;}}
function applyRestartState(next){
 s=next;clearTimeout(gameOverTimer);$('battle').classList.remove('game-over');previousLife=s.teamHP;lifeInitialized=false;pendingLifeReason='';clearTimeout(lifeTimer);clearTimeout(lifeTrailTimer);$('life-feedback').textContent='';autoRebirthLeft=0;weaponRevealBorn=-10000;hype=freshHype();fever=0;feverEnd=0;combo=0;lastTap=-10000;autoAccum=0;saveAccum=0;last=performance.now();previousRank=unitRank(tapPower(s));heroSwing=-10000;parryUntil=0;hurtUntil=0;godBeamUntil=0;slashUntil=0;hitUntil=0;burstUntil=0;allyTurn=0;ultimateHits=0;heroSteps=0;allyPulse.fill(0);particles.length=0;shots.length=0;ghosts.length=0;rings.length=0;
 clearTimeout(lootTimer);clearTimeout(toastTimer);clearTimeout(unitTimer);clearTimeout(ultimateTimer);clearTimeout(comicTimer);
 for(const id of ['loot-show','unit-break','god-cutin','comic-word','burst-callout'])$(id).classList.remove('show');$('upgrade-toast').classList.remove('visible');$('float-layer').replaceChildren();$('combo').textContent='一撃入魂';$('battle').classList.remove('impact');$('native-audio').pause();update();save();
}
$('new-game').onclick=()=>{$('restart-error').textContent='';refreshRestartDialog();$('new-game-dialog').showModal();};
$('cancel-new-game').onclick=()=>$('new-game-dialog').close();
$('confirm-new-game').onclick=()=>{const next=fresh();try{writeRestartState(next);}catch{$('restart-error').textContent='保存できないため開始しませんでした。今の進行はそのままです。';return;}applyRestartState(next);$('new-game-dialog').close();announce('第1波から開始！ 前のセーブは「最初から」から戻せます。',3200);};
$('restore-backup').onclick=()=>{const backup=readRestartBackup();if(!backup){refreshRestartDialog();return;}const next=restore(JSON.stringify(backup.state));try{writeRestartState(next);}catch{$('restart-error').textContent='保存できないため復元しませんでした。今の進行はそのままです。';return;}applyRestartState(next);$('new-game-dialog').close();announce('前のセーブに戻しました。今の進行も退避済み。',2800);};

function updateLifeHUD(){const hp=Math.max(0,Math.min(100,s.teamHP));$('team-hp').textContent=Math.ceil(hp)+' / 100';$('life-fill').style.transform='scaleX('+hp/100+')';$('life-panel').classList.toggle('low',hp<=35);document.querySelector('.life-track').setAttribute('aria-valuenow',Math.ceil(hp));
 if(!lifeInitialized){$('life-trail').style.transform='scaleX('+hp/100+')';previousLife=hp;lifeInitialized=true;}
 if(hp!==previousLife||pendingLifeReason){const change=hp-previousLife;$('life-feedback').textContent=pendingLifeReason||(change<0?'被弾 −'+Math.round(-change):'回復 +'+Math.round(change));$('life-feedback').classList.toggle('damage',change<0);pendingLifeReason='';clearTimeout(lifeTimer);lifeTimer=setTimeout(()=>$('life-feedback').textContent='',1700);clearTimeout(lifeTrailTimer);lifeTrailTimer=setTimeout(()=>$('life-trail').style.transform='scaleX('+s.teamHP/100+')',550);previousLife=hp;}}
function performAutoRebirth(){const souls=s.souls;if(!autoRebirth(s))return;autoRebirthLeft=0;autoAccum=0;pendingLifeReason='自動転生・ライフ全快';soundFX('reborn');comic('自動転生！');announce('第'+(s.rebirths+1)+'周へ！ 魂 +'+fmt(s.souls-souls)+' / 育成・小判は全引継',3000);emitBurst(140,220,90,'#ff94dc');checkUnit(tapPower(s));update();save();}

function endBattleOnGameOver(){hype=freshHype();fever=0;feverEnd=0;autoRebirthLeft=0;autoAccum=0;godBeamUntil=0;slashUntil=0;weaponRevealBorn=-10000;particles.length=0;shots.length=0;ghosts.length=0;rings.length=0;for(const id of ['loot-show','unit-break','god-cutin','comic-word','burst-callout'])$(id).classList.remove('show');$('native-audio').pause();soundFX('gameover');save();showGameOver();}
function showGameOver(){if(!s.gameOver||$('game-over-dialog').open)return;for(const d of document.querySelectorAll('dialog[open]'))d.close();$('native-audio').pause();$('battle').classList.add('game-over');$('game-over-summary').textContent='到達 第'+s.stage+'波 / 第'+(s.rebirths+1)+'周\n倒した鬼 '+fmt(s.kills)+'体 / 刀Lv.'+s.sword;const button=$('restart-after-over');button.disabled=true;$('game-over-dialog').showModal();$('game-over-title').focus();clearTimeout(gameOverTimer);gameOverTimer=setTimeout(()=>button.disabled=false,650);}
$('game-over-dialog').addEventListener('cancel',e=>e.preventDefault());
$('restart-after-over').onclick=()=>{if(!restartAfterGameOver(s))return;applyRestartState(s);$('game-over-dialog').close();announce('第1波から、もう一度！',2200);tone(523,true);};
