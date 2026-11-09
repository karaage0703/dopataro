import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const html=read('src/index.html').replace('/* STYLES */',read('src/style.css')).replace('// ENGINE',read('src/engine.mjs').replace(/export /g,'')).replace('// AUDIO',read('src/audio.js')).replace('// ART',read('src/art.js')).replace('// GAME',read('src/game.js'));
mkdirSync('dist',{recursive:true});
writeFileSync('dist/dopataro.html',html);
writeFileSync('dist/index.html',html);
console.log('Built dist/index.html (GitHub Pages) and dist/dopataro.html (offline, zero dependencies)');
