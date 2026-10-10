// Сбор поисковых запросов через подсказки Яндекса и Google.
// Запуск: node tools\suggest.js   -> пишет tools\queries-YYYY-MM-DD.txt и печатает новые запросы.
// Затравки можно дополнять в SEEDS. Отсев: запрос пропускается, если все его значимые слова уже есть в slug/title статьи.
const fs = require('fs');
const path = require('path');

const SEEDS = [
  'перманентный макияж', 'перманентный макияж бровей', 'перманентный макияж губ', 'перманентный макияж век',
  'перманентный макияж саратов', 'татуаж бровей', 'татуаж губ', 'татуаж век', 'пудровые брови',
  'межресничка', 'стрелки перманент', 'ремувер перманентного макияжа', 'коррекция перманентного макияжа',
  'перманентный макияж цена', 'перманентный макияж после', 'перманентный макияж можно ли',
  'перманентный макияж отзывы', 'перманентный макияж противопоказания', 'мини тату', 'ламинирование бровей саратов'
];

async function get(url) {
  try { const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }); return await r.json(); }
  catch (e) { return null; }
}

(async () => {
  const found = new Map();
  for (const s of SEEDS) {
    const y = await get('https://suggest.yandex.ru/suggest-ff.cgi?part=' + encodeURIComponent(s) + '&uil=ru&v=4&n=10');
    if (y && Array.isArray(y[1])) y[1].forEach(q => found.set(String(q).toLowerCase(), 'yandex'));
    const g = await get('https://suggestqueries.google.com/complete/search?client=firefox&hl=ru&q=' + encodeURIComponent(s));
    if (g && Array.isArray(g[1])) g[1].forEach(q => { const k = String(q).toLowerCase(); if (!found.has(k)) found.set(k, 'google'); });
  }
  // уже закрытые темы: текст всех статей и slug
  let corpus = '';
  for (const f of ['build-articles.js', 'articles-2026-10.js']) {
    const p = path.join(__dirname, f);
    if (fs.existsSync(p)) corpus += fs.readFileSync(p, 'utf8').toLowerCase();
  }
  for (const f of fs.readdirSync(__dirname)) {
    if (/^articles-.*\.js$/.test(f) && f !== 'articles-2026-10.js') corpus += fs.readFileSync(path.join(__dirname, f), 'utf8').toLowerCase();
  }
  const out = [];
  for (const [q, src] of found) {
    const words = q.split(/\s+/).filter(w => w.length > 3);
    const covered = words.length && words.every(w => corpus.includes(w.slice(0, Math.max(4, w.length - 2))));
    out.push({ q, src, covered });
  }
  out.sort((a, b) => a.covered - b.covered || a.q.localeCompare(b.q));
  const d = new Date().toISOString().slice(0, 10);
  const file = path.join(__dirname, 'queries-' + d + '.txt');
  fs.writeFileSync(file, out.map(o => (o.covered ? 'covered\t' : 'NEW\t') + o.src + '\t' + o.q).join('\n'), 'utf8');
  console.log('всего запросов:', out.length, ' новых:', out.filter(o => !o.covered).length, ' файл:', file);
  out.filter(o => !o.covered).forEach(o => console.log(o.src + '\t' + o.q));
})();
