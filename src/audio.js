// Self-contained synth: user gesture unlocks audio, no assets or network.
const audioEngine={context:null,master:null,analyser:null,started:false,unlocked:false,events:0,voices:0,nextBeat:0,beat:0,peak:0,lastError:null};
function primeAudio(){
 if(!sound||!audioEngine.unlocked)return;
 try{
  if(!audioEngine.context){
   const ac=new(window.AudioContext||window.webkitAudioContext)();audioEngine.context=ac;
   const master=ac.createGain(),compressor=ac.createDynamicsCompressor(),analyser=ac.createAnalyser();master.gain.value=.6;analyser.fftSize=256;
   master.connect(compressor);compressor.connect(analyser);analyser.connect(ac.destination);
   Object.assign(audioEngine,{master,analyser,nextBeat:ac.currentTime,started:true});
  }
  if(['suspended','interrupted'].includes(audioEngine.context.state))audioEngine.context.resume().then(()=>{audioEngine.lastError=null;audioStatus();}).catch(e=>{audioEngine.lastError=e.name;audioStatus();});
 }catch{sound=false;syncSoundLabel('音 非対応');}
}
function synth(freq,duration=.12,type='triangle',volume=.08,slide=0,delay=0){
 if(!sound||!audioEngine.started||audioEngine.context.state!=='running'||audioEngine.voices>=32)return;
 const ac=audioEngine.context,o=ac.createOscillator(),g=ac.createGain(),t=ac.currentTime+delay;
 o.type=type;o.frequency.setValueAtTime(freq,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,slide),t+duration);
 g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(volume,t+.008);g.gain.exponentialRampToValueAtTime(.001,t+duration);
 o.connect(g);g.connect(audioEngine.master);o.start(t);o.stop(t+duration+.02);audioEngine.voices++;audioEngine.events++;
 o.onended=()=>{audioEngine.voices--;o.disconnect();g.disconnect();};
}
function tone(freq=220,win=false){primeAudio();synth(freq,.16,'triangle',.10,win?freq*2:freq*.45);}
function crackle(duration=.15,volume=.07){
 if(!sound||!audioEngine.started||audioEngine.context.state!=='running'||audioEngine.voices>=32)return;
 const ac=audioEngine.context,source=ac.createBufferSource(),g=ac.createGain(),filter=ac.createBiquadFilter(),buffer=ac.createBuffer(1,Math.ceil(ac.sampleRate*duration),ac.sampleRate),data=buffer.getChannelData(0);
 for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);
 source.buffer=buffer;filter.type='lowpass';filter.frequency.value=2200;g.gain.setValueAtTime(volume,ac.currentTime);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+duration);
 source.connect(filter);filter.connect(g);g.connect(audioEngine.master);source.start();audioEngine.voices++;audioEngine.events++;
 source.onended=()=>{audioEngine.voices--;source.disconnect();filter.disconnect();g.disconnect();};
}
function soundFX(kind){
 if(!sound)return;primeAudio();
 if(kind==='gameover'){[392,330,262,196].forEach((f,i)=>synth(f,.38,'triangle',.10,0,i*.17));synth(55,.75,'sine',.14,35);}
 if(kind==='forge'){synth(260,.16,'sawtooth',.11,90);[784,1175,1568].forEach((f,i)=>synth(f,.17,'triangle',.10,0,i*.035));crackle(.06,.08);}
 if(kind==='weapon'){crackle(.22,.11);synth(65,.45,'sine',.20,180);[523,784,1046,1318,1568,2093,2637,3136].forEach((f,i)=>synth(f,.25,'triangle',.095,0,i*.065));synth(220,.35,'sawtooth',.07,880);}
 if(kind==='reborn'){[392,523,659,784,1046,1318].forEach((f,i)=>synth(f,.23,'triangle',.09,0,i*.06));synth(98,.5,'sine',.17,196);}
 if(kind==='god'){crackle(.4,.12);[65,98,130].forEach(f=>synth(f,.65,'sawtooth',.085,f*2));[523,659,784,1046,1318,1568,2093,2637].forEach((f,i)=>synth(f,.25,'triangle',.09,0,i*.07));}
 if(kind==='godpulse'){synth(65,.22,'sine',.18,35);crackle(.1,.09);[784,1175,1568].forEach((f,i)=>synth(f,.14,'square',.055,0,i*.04));}
 if(kind==='chain'){const lift=1+Math.min(5,Math.floor(combo/10))*.1;[660,880,1320].forEach((f,i)=>synth(f*lift,.13,'triangle',.085,0,i*.045));}
 if(kind==='bossbreak'){[1046,1318,1568,2093,2637].forEach((f,i)=>synth(f,.17,'triangle',.09,0,i*.045));synth(55,.4,'sine',.15,110);}
 if(kind==='crit'){[1046,1568,2093].forEach((f,i)=>synth(f,.10,'square',.07,0,i*.035));}
 if(kind==='level'){[523,659,784,1046,1318,1568].forEach((f,i)=>synth(f,.16,'triangle',.10,0,i*.055));synth(65,.35,'sine',.15,130);}
 if(kind==='warning'){synth(196,.2,'sawtooth',.10,140);synth(147,.2,'square',.07,0,.22);}
 if(kind==='hurt'){crackle(.18,.12);synth(100,.3,'sawtooth',.12,35);}
 if(kind==='parry'){[784,1046,1568,2093].forEach((f,i)=>synth(f,.20,'triangle',.11,0,i*.035));crackle(.08,.07);synth(80,.25,'sine',.20,160);}
 if(kind==='slash'){crackle(.07,.055);synth(1000,.07,'sawtooth',.065,90);synth(80,.13,'sine',.17,35);}
 if(kind==='pop'){crackle(.17,.10);synth(100,.16,'sine',.17,35);synth(1100,.10,'square',.045,300);[880,1320,1760].forEach((f,i)=>synth(f,.09,'triangle',.06,0,i*.045));}
 if(kind==='burst'){crackle(.45,.13);[65,130,260].forEach(f=>synth(f,.6,'sawtooth',.09,f*2));[523,659,784,1046,1318].forEach((f,i)=>synth(f,.22,'square',.065,0,i*.08));}
 if(kind==='ally')synth([440,660,880][allyTurn%3],.08,'triangle',.04,1300);
}
function musicTick(){
 if(s.gameOver||!sound||!audioEngine.started||audioEngine.context.state!=='running'||document.hidden)return;
 const ac=audioEngine.context;if(ac.currentTime<audioEngine.nextBeat)return;
 const godOn=hype.left>0,feverOn=feverEnd>performance.now(),chainOn=performance.now()-lastTap<1000&&combo>=10,intense=godOn||feverOn||chainOn;audioEngine.mode=godOn?'god':feverOn?'burst':s.windup>0?'danger':chainOn?'chain':'normal';const melody=s.windup>0?[392,0,415,0,392,370,330,0,392,415,466,415,392,330,311,294]:[523,659,784,659,523,784,1046,784,659,784,1046,1318,1046,784,659,392];
 const i=audioEngine.beat++%16;audioEngine.nextBeat=ac.currentTime+(godOn?.09:feverOn?.115:boss(s)?.145:intense?.16:.19);
 if(melody[i])synth(melody[i]*(intense?2:1),.11,'square',intense?.04:.03);if(intense&&i%2===1){synth(melody[i]/2,.12,'triangle',.04);crackle(.025,.02);}if(i%4===2)synth(160,.09,'triangle',.05,60);
 if(godOn){if(i%4===0){synth(392,.24,'triangle',.055);synth(523,.24,'triangle',.05);}if(i%2===0)crackle(.025,.025);}
 if(i%2===0)synth([130,164,196,164][Math.floor(i/4)],.16,'triangle',.045);
 if(i%4===0)synth(100,.09,'sine',.10,40);
 if(audioEngine.analyser){const data=new Uint8Array(256);audioEngine.analyser.getByteTimeDomainData(data);audioEngine.peak=Math.max(audioEngine.peak,...data.map(v=>Math.abs(v-128)));}
}
function syncSoundLabel(override){$('sound').textContent=override||(sound?'音 ON':'音 OFF');$('sound').setAttribute('aria-pressed',String(sound));}

function setAudioMix(value){if(audioEngine.master){audioEngine.master.gain.cancelScheduledValues(0);audioEngine.master.gain.value=value;}}

function audioStatus(){const el=document.getElementById('audio-status');if(!el)return;const state=audioEngine.context?.state;el.textContent=!sound?'音OFFです。「音を開始」で有効にできます。':audioEngine.lastError?'再生が保留されています。開始ボタンか標準プレーヤーの ▶ を押してください。':state==='running'?'音声処理は再生中です。下のプレーヤーでも確認できます。':'「音を開始」を押して再生を許可してください。';}
function ensureTestClip(){const el=document.getElementById('native-audio');if(el.src)return;const rate=22050,duration=1.05,n=Math.floor(rate*duration),buffer=new ArrayBuffer(44+n*2),v=new DataView(buffer);const text=(o,t)=>{for(let i=0;i<t.length;i++)v.setUint8(o+i,t.charCodeAt(i));};text(0,'RIFF');v.setUint32(4,36+n*2,true);text(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);text(36,'data');v.setUint32(40,n*2,true);for(let i=0;i<n;i++){const t=i/rate,step=Math.floor(t/.18),f=[523,659,784,1046,1318,1568][Math.min(5,step)],env=Math.sin(Math.PI*(t%.18)/.18);const sample=(Math.sin(2*Math.PI*f*t)*.7+Math.sin(4*Math.PI*f*t)*.15)*env*.45;v.setInt16(44+i*2,Math.max(-32767,Math.min(32767,sample*32767)),true);}el.src=URL.createObjectURL(new Blob([buffer],{type:'audio/wav'}));el.volume=.6;el.onplaying=()=>{audioEngine.lastError=null;audioStatus();};el.onerror=()=>{audioEngine.lastError='media';audioStatus();};}
