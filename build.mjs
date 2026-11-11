import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';

const read = path => readFileSync(path, 'utf8');
const numbers = read('src/numbers.mjs').replace(/export /g, '');
const engine = read('src/engine.mjs')
  .replace(/^import .* from '.\/numbers.mjs';\n/m, '')
  .replace(/export /g, '');
const html = read('src/index.html')
  .replace('/* STYLES */', read('src/style.css'))
  .replace('// NUMBERS', numbers)
  .replace('// ENGINE', engine)
  .replace('// AUDIO', read('src/audio.js'))
  .replace('// ART', read('src/art.js'))
  .replace('// GAME', read('src/game.js'));

mkdirSync('dist', {recursive:true});
writeFileSync('dist/dopataro.html', html);
writeFileSync('dist/index.html', html);
console.log('Built dist/index.html (GitHub Pages) and dist/dopataro.html (offline, zero dependencies)');
