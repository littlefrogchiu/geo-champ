'use strict';
/* 地理大競賽特訓場 — 依國家地理知識大競賽總決賽題型設計 */

const B = window.BANK;
const app = document.getElementById('app');
const topScore = document.getElementById('topScore');

/* ───────── 儲存 ───────── */
const store = {
  get(k, d) { try { const v = localStorage.getItem('geochamp:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('geochamp:' + k, JSON.stringify(v)); } catch (e) { /* 無痕模式等 */ } }
};
const settings = Object.assign({ rival: 'normal', speed: 7 }, store.get('settings', {}));
settings.timer = 'off';   // 已移除計時功能：所有題型都不限時
const stats = store.get('stats', {});
const wrong = store.get('wrong', {});
const saveAll = () => { store.set('settings', settings); store.set('stats', stats); store.set('wrong', wrong); };

/* ───────── 題型定義（規則取自總決賽投影片） ───────── */
const TYPES = {
  tf: { name: '是非題', stage: '第一階段・第I部分', ans: 3, pts: 10, def: 10,
    desc: 'O 代表正確、X 代表錯誤，每題 3 秒',
    rules: ['「O」代表正確、「X」代表錯誤', '聆聽主持人宣讀題幹，再作答', '比賽時每題作答時間 <b>3 秒</b>', '鍵盤：按 <b>O</b> 或 <b>X</b> 作答'] },
  mc: { name: '選擇題', stage: '第一階段・第II部分', ans: 5, pts: 10, def: 10,
    desc: '單選題，以 (A)(B)(C)(D) 作答，每題 5 秒',
    rules: ['皆為<b>單選題</b>，以 (A)(B)(C)(D) 作答', '比賽時每題作答時間 <b>5 秒</b>', '鍵盤：按 <b>A–D</b> 或 <b>1–4</b> 作答'] },
  sa: { name: '簡答題－單題', stage: '第一階段・第III部分', ans: 10, pts: 10, def: 10,
    desc: '寫出答案，每題 10 秒',
    rules: ['答案要寫清楚，<b>關鍵字寫錯不給分</b>', '地名以<b>現今地名</b>或<b>我國慣用翻譯</b>為準', '比賽時每題作答時間 <b>10 秒</b>', '若系統誤判（例如用了其他合理譯名），可按「評審改判」'] },
  group: { name: '簡答題－題組', stage: '第一階段・第IV部分', ans: 10, pts: 30, def: 5,
    desc: '3 個提示，越早作答分數越高（30／20／10）',
    rules: ['每個題組有 <b>3 個提示</b>，可在任一提示後作答，<b>作答後不可更改</b>', '第一個提示後作答：寫在<b>紅色紙</b>（30 分）', '第二個提示後作答：寫在<b>藍色紙</b>（20 分）', '第三個提示後作答：寫在<b>白板</b>（10 分）', '比賽時每個提示的作答時間 <b>10 秒</b>'] },
  buzz: { name: '搶答－單題', stage: '第二階段・第I部分', pts: 10, def: 10,
    desc: '題幹先出現、主要問題較晚出現，按鈴搶答',
    rules: ['題幹會先出現，<b>主要問題比較晚</b>才播放', '只要有人按鈴，主持人就停止唸題，按鈴者必須<b>立刻作答</b>', '答錯就開放其他選手作答；<b>每人每題只有一次機會</b>', '鍵盤：按 <b>空白鍵</b> 按鈴、<b>Enter</b> 送出'] },
  chain: { name: '搶答－連鎖題', stage: '第二階段・第II部分', pts: 10, def: 5,
    desc: '每組 3 個子題，答對可取得下一題優先權',
    rules: ['每組連鎖題有 <b>3 個子題</b>，題目環環相扣', '被評定答對，可獲得下一個子題的<b>優先答題權</b>', '被評定答錯，其他選手才可以再開始搶答', '每人每子題只有 <b>1 次</b>答題機會'] }
};
const LETTERS = ['A', 'B', 'C', 'D'];
// 每次出題隨機排列選項（甲乙丙丁這類有順序的選項不動），避免正解集中在 (A)
function mixOpts(q) {
  if (q.fixed || q.opts.every(o => /^[甲乙丙丁]$/.test(o))) return q;
  const order = shuffle([0, 1, 2, 3].slice(0, q.opts.length));
  return Object.assign({}, q, { opts: order.map(i => q.opts[i]), a: order.indexOf(q.a) });
}
const RIVAL = {
  off: null,
  easy: { label: '新手', lo: 1.05, hi: 1.6, p: 0.5 },
  normal: { label: '普通', lo: 0.9, hi: 1.3, p: 0.65 },
  hard: { label: '高手', lo: 0.72, hi: 1.08, p: 0.8 }
};

/* ───────── 工具 ───────── */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rand = (a, b) => a + Math.random() * (b - a);
const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const MARKS = new RegExp('[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + ']', 'g'); // 去掉重音符號（Niña → nina）
function norm(s) {
  return String(s || '').normalize('NFD').replace(MARKS, '').toLowerCase()
    .replace(/[０-９Ａ-Ｚａ-ｚ]/g, c => String.fromCharCode(c.charCodeAt(0) - 65248))
    .replace(/台/g, '臺')
    .replace(/[\s　,，。.、;；:：!！?？「」『』（）()\-—_·・'’"“”\/]/g, '');
}
function judge(input, item) {
  const x = norm(input);
  if (!x) return false;
  if (item.range) {                                                          // 估算題：數字落在範圍內
    const n = parseFloat(String(input).replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 65248)).replace(/[^0-9.]/g, ''));
    return n >= item.range[0] && n <= item.range[1];
  }
  if (item.exact) return item.ans.some(a => norm(a) === x);                  // 只接受列出的寫法
  if (item.all) return item.all.every(k => x.includes(norm(k)));
  return item.ans.some(a => {
    const y = norm(a);
    if (x === y) return true;
    if (y.length >= 2 && x.includes(y)) return true;                       // 多寫了「國、族、山」等
    if (x.length >= 2 && y.includes(x) && y.length - x.length <= 1) return true; // 少寫一個字
    return false;
  });
}

// 每換一個畫面 gen+1，舊的計時器回呼一律作廢
let gen = 0;
let onKey = null;
document.addEventListener('keydown', e => { if (onKey) onKey(e); });
const later = (fn, ms) => { const g = gen; setTimeout(() => { if (g === gen) fn(); }, ms); };

/* ───────── 圖片（照片／地圖／國旗／氣候圖） ───────── */
const COMMONS = 'https://upload.wikimedia.org/wikipedia/commons/thumb/';
const hasImg = d => !!(d && (d.img || d.ref || d.map || d.kind || (d.hints && d.hints.some(h => h.img)) || (d.items && d.items.some(x => x.img))));
const scripts = {};
function loadScript(src) {
  return scripts[src] || (scripts[src] = new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = src; s.onload = res;
    s.onerror = () => { delete scripts[src]; rej(new Error(src)); };
    document.head.appendChild(s);
  }));
}
const geoData = {};
async function geo(kind) {
  await loadScript('https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js');
  await loadScript('https://cdn.jsdelivr.net/npm/topojson-client@3/dist/topojson-client.min.js');
  if (!geoData[kind]) {
    const url = kind === 'world' ? 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json' : 'https://cdn.jsdelivr.net/npm/taiwan-atlas@2021.9.20/counties-10t.json';
    geoData[kind] = fetch(url).then(r => r.json())
      .then(t => topojson.feature(t, kind === 'world' ? t.objects.countries : t.objects.counties).features)
      .catch(e => { delete geoData[kind]; throw e; });
  }
  return geoData[kind];
}
function mediaHTML(img) {
  if (!img) return '';
  if (img.photo) {
    const name = img.photo.split('/').pop();
    const base = COMMONS + img.photo.split('/').map(encodeURIComponent).join('/') + '/';
    return `<figure class="qimg photo"><img src="${base}500px-${encodeURIComponent(name)}" data-fb="${base}330px-${encodeURIComponent(name)}" data-name="${esc(name)}" alt="題目照片" onerror="if(this.dataset.fb){this.src=this.dataset.fb;this.dataset.fb=''}"></figure>`;
  }
  if (img.src) return `<figure class="qimg pdfimg"><img src="${img.src}" alt="題目附圖"></figure>`;
  if (img.flag) return `<figure class="qimg flag"><img src="https://flagcdn.com/w640/${img.flag}.png" alt="題目國旗"></figure>`;
  if (img.climate) return `<figure class="qimg chart">${climateSVG(img.climate)}</figure>`;
  if (img.map) return `<figure class="qimg map ${img.map}" data-map='${esc(JSON.stringify(img))}'><div class="map-loading">地圖載入中…</div></figure>`;
  return '';
}
function hydrate(root) {
  root.querySelectorAll('figure[data-map]').forEach(async fig => {
    const spec = JSON.parse(fig.dataset.map); fig.removeAttribute('data-map');
    try { fig.innerHTML = await drawMap(spec); }
    catch (e) { fig.innerHTML = '<div class="map-loading">地圖載入失敗，請確認網路連線</div>'; }
  });
}
async function drawMap(s) { return (await buildMap(s)).svg; }
async function buildMap(s) {
  const feats = await geo(s.map);
  const tw = s.map === 'tw', W = tw ? 420 : 640, H = tw ? 520 : 400;
  let proj;
  if (tw) proj = d3.geoMercator().fitExtent([[14, 14], [W - 14, H - 14]], { type: 'MultiPoint', coordinates: [[119.3, 21.88], [122.02, 25.32]] });
  else {
    const [lon, lat, span] = s.view;
    if (span >= 180) proj = d3.geoNaturalEarth1().fitExtent([[6, 6], [W - 6, H - 6]], { type: 'Sphere' });
    else proj = d3.geoAzimuthalEqualArea().rotate([-lon, -lat]).translate([W / 2, H / 2]).scale(W / (span * Math.PI / 180)).clipAngle(90);
  }
  const path = d3.geoPath(proj), hl = new Set(s.hl || []);
  const key = f => tw ? f.properties.COUNTYENG : f.id;
  let svg = `<svg viewBox="0 0 ${W} ${H}" class="mapsvg" role="img" aria-label="題目地圖"><rect width="${W}" height="${H}" class="sea"/>`;
  if (!tw) svg += `<path d="${path(d3.geoGraticule10())}" class="grat"/>`;
  feats.forEach(f => { const d = path(f); if (d) svg += `<path d="${d}" class="land${hl.has(key(f)) ? ' hl' : ''}"/>`; });
  (s.pts || []).forEach(p => {
    const xy = proj([p[0], p[1]]); if (!xy) return;
    if (p[2]) svg += `<circle cx="${xy[0]}" cy="${xy[1]}" r="5" class="pt"/><text x="${xy[0] + 8}" y="${xy[1] + 6}" class="pt-label" style="font-size:${tw ? 22 : 16}px">${esc(p[2])}</text>`;
    else svg += `<circle cx="${xy[0]}" cy="${xy[1]}" r="15" class="ping"/><circle cx="${xy[0]}" cy="${xy[1]}" r="6.5" class="pt"/>`;
  });
  return { svg: svg + '</svg>', proj, W, H };
}
function climateSVG(c) {
  const W = 520, H = 300, L = 46, R = 46, T = 30, Bm = 34, iw = W - L - R, ih = H - T - Bm, cw = iw / 12;
  const pm = Math.max(...c.p), pstep = pm > 400 ? 200 : 100;
  const pmax = Math.max(100, Math.ceil(pm / pstep) * pstep);
  const tmin = Math.min(0, Math.floor(Math.min(...c.t) / 10) * 10);
  const tmax = tmin + Math.max(40, Math.ceil((Math.max(...c.t) - tmin) / 20) * 20);  // 讓刻度為整數
  const yP = v => T + ih - v / pmax * ih, yT = v => T + ih - (v - tmin) / (tmax - tmin) * ih;
  let s = `<svg viewBox="0 0 ${W} ${H}" class="climsvg" role="img" aria-label="氣候圖">`;
  for (let k = 0; k <= 4; k++) { const y = T + ih * k / 4; s += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" class="cl-grid"/>`; }
  c.p.forEach((v, i) => { s += `<rect x="${L + i * cw + 4}" y="${yP(v)}" width="${cw - 8}" height="${T + ih - yP(v)}" class="cl-bar"/>`; });
  s += `<polyline points="${c.t.map((v, i) => `${L + (i + 0.5) * cw},${yT(v)}`).join(' ')}" class="cl-line"/>`;
  c.t.forEach((v, i) => { s += `<circle cx="${L + (i + 0.5) * cw}" cy="${yT(v)}" r="3.5" class="cl-dot"/>`; });
  for (let k = 0; k <= 4; k++) {
    const y = T + ih - ih * k / 4;
    s += `<text x="${L - 6}" y="${y + 4}" text-anchor="end" class="cl-ax p">${Math.round(pmax * k / 4)}</text>`;
    s += `<text x="${W - R + 6}" y="${y + 4}" class="cl-ax t">${Math.round(tmin + (tmax - tmin) * k / 4)}</text>`;
  }
  for (let i = 0; i < 12; i++) s += `<text x="${L + (i + 0.5) * cw}" y="${H - 12}" text-anchor="middle" class="cl-ax">${i + 1}月</text>`;
  s += `<text x="${L - 6}" y="16" text-anchor="end" class="cl-ax p">雨量(mm)</text><text x="${W - R + 6}" y="16" class="cl-ax t">氣溫(°C)</text>`;
  return s + '</svg>';
}

function readMs(text, img) {
  if (settings.timer === 'off') return 0;
  const base = Math.max(1500, String(text).length * 1000 / 8) + (img ? 2500 : 0);
  return settings.timer === 'relax' ? base * 1.5 : base;
}
function ansMs(sec) { return settings.timer === 'relax' ? sec * 3000 : sec * 1000; }

const timerHTML = () => `<div class="tbox"><div class="timer"><i style="width:100%"></i></div><div class="timer-label"><span></span><span></span></div></div>`;

function bar(box, ms, cls, onDone) {
  const g = gen, start = performance.now();
  const tEl = box.querySelector('.timer'), fill = tEl.querySelector('i'), num = box.querySelector('.timer-label span:last-child');
  tEl.className = 'timer ' + (cls || '');
  let stopped = false;
  (function step(now) {
    if (stopped || g !== gen) return;
    const t = Math.min(1, (now - start) / ms), left = ms * (1 - t);
    fill.style.width = ((1 - t) * 100) + '%';
    if (cls !== 'read' && left < 2000) tEl.classList.add('hot');
    num.textContent = Math.ceil(left / 1000) + ' 秒';
    if (t >= 1) { stopped = true; onDone && onDone(); } else requestAnimationFrame(step);
  })(start);
  return { stop() { stopped = true; } };
}
// 先「閱讀」再「作答」的兩段式計時
function phaseTimer(box, rMs, aMs, onTimeout) {
  if (settings.timer === 'off' || !box) { if (box) box.hidden = true; return { stop() {} }; }
  const lab = box.querySelector('.timer-label span');
  let cur, stopped = false;
  const answer = () => { lab.textContent = '作答時間'; cur = bar(box, aMs, '', () => { if (!stopped) onTimeout(); }); };
  if (rMs > 0) { lab.textContent = '閱讀題目'; cur = bar(box, rMs, 'read', () => { if (!stopped) answer(); }); } else answer();
  return { stop() { stopped = true; cur && cur.stop(); } };
}

/* ───────── 題庫抽題（不重複，抽完才重洗） ───────── */
function draw(type, n) {
  const total = B[type].length;
  let deck = store.get('deck:' + type, []).filter(i => i < total);
  const out = [];
  while (out.length < Math.min(n, total)) {
    if (!deck.length) deck = shuffle([...Array(total).keys()].filter(i => !out.includes(i)));
    const i = deck.shift();
    if (!out.includes(i)) out.push(i);
  }
  store.set('deck:' + type, deck);
  return out.map(i => ({ type, idx: i, key: type + ':' + i, d: B[type][i] }));
}

/* ───────── 統計 ───────── */
function bump(type, ok) {
  const s = stats[type] || (stats[type] = { n: 0, c: 0 });
  s.n++; if (ok) s.c++;
}
function updateTop() {
  let n = 0, c = 0;
  Object.values(stats).forEach(s => { n += s.n; c += s.c; });
  topScore.textContent = n ? `已練 ${n} 題・答對率 ${Math.round(c / n * 100)}%` : '';
}

/* ───────── 首頁 ───────── */
function home() {
  gen++; onKey = null; S = null;
  updateTop();
  const card = t => {
    const s = stats[t] || { n: 0, c: 0 }, T = TYPES[t];
    const total = t === 'chain' ? B.chain.length + ' 組' : t === 'smc' ? B.smc.reduce((n, d) => n + (d.items ? d.items.length : 1), 0) + ' 題' : B[t].length + ' 題';
    const pct = s.n ? Math.round(s.c / s.n * 100) : 0;
    return `<button class="mode" data-mode="${t}">
      <span class="tag">${T.stage}</span><span class="name">${T.name}</span><span class="desc">${T.desc}</span>
      <span class="meta"><span>題庫 ${total}・圖片 ${picturePool(t).length}</span><span>${s.n ? `答對率 ${pct}%（${s.c}/${s.n}）` : '尚未練習'}</span></span>
      <span class="bar"><i style="width:${pct}%"></i></span></button>`;
  };
  const seg = (key, opts) => `<span class="seg" data-set="${key}">${opts.map(([v, l]) => `<button data-v="${v}" aria-pressed="${String(settings[key]) === String(v)}">${l}</button>`).join('')}</span>`;
  const wc = Object.keys(wrong).length;
  app.innerHTML = `
  <section class="hero">
    <svg class="globe" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" stroke-width="2"/><ellipse cx="20" cy="20" rx="8" ry="18" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M2 20h36M5 11h30M5 29h30" stroke="currentColor" stroke-width="1.2"/></svg>
    <h1>國家地理知識大競賽・特訓場</h1>
    <p>依準決賽紙筆測驗與總決賽六種題型設計，題目全部新編，題型練熟了再上場。</p>
  </section>

  <div class="section-h"><h2>準決賽練習</h2><small>紙筆測驗：選擇題、非選擇題、同分決勝題</small></div>
  <div class="grid">${['smc', 'sopen', 'stie'].map(card).join('')}
    <button class="mode" data-semimock="1"><span class="tag">準決賽・綜合模擬</span><span class="name">綜合模擬</span><span class="desc">選擇 12 → 非選擇 4 → 同分決勝 2，三種題型一次練</span><span class="meta"><span>不計時・依題型計分</span><span></span></span></button>
  </div>

  <div class="section-h"><h2>模擬總決賽</h2><small>照比賽順序與計分完整跑一次</small></div>
  <div class="grid">
    <button class="mode wide" data-mock="1"><span><span class="tag">第一階段・白板作答</span><br><span class="name">是非 10 → 選擇 10 → 簡答 10 → 題組 5</span></span><span class="desc">滿分 450 分</span></button>
    <button class="mode wide" data-mock="2"><span><span class="tag">第二階段・搶答</span><br><span class="name">搶答單題 20 → 連鎖題 5 組</span></span><span class="desc">滿分 350 分・有電腦對手</span></button>
  </div>

  <div class="section-h"><h2>圖片題特訓</h2><small>看照片、地圖、國旗、氣候圖作答</small></div>
  <div class="grid">
    <button class="mode wide" data-pic="1"><span><span class="tag">六種題型混合</span><br><span class="name">看圖作答 15 題</span></span><span class="desc">圖片題庫 ${picturePool().length} 題</span></button>
  </div>

  <div class="section-h"><h2>第一階段題型</h2><small>白板作答</small></div>
  <div class="grid">${['tf', 'mc', 'sa', 'group'].map(card).join('')}</div>

  <div class="section-h"><h2>第二階段題型</h2><small>按鈴搶答</small></div>
  <div class="grid">${['buzz', 'chain'].map(card).join('')}</div>

  <div class="section-h"><h2>錯題本</h2><small>答錯的題目會自動收集，複習答對就移出</small></div>
  <div class="grid">
    <button class="mode wide" data-review="1" ${wc ? '' : 'disabled'}><span><span class="name">錯題複習</span><br><span class="desc">${wc ? `目前 ${wc} 題待複習` : '目前沒有錯題，太強了！'}</span></span><span class="desc">${wc ? '開始 →' : ''}</span></button>
  </div>

  <div class="section-h"><h2>設定</h2></div>
  <div class="settings">
    <div class="set-row"><label>搶答對手</label>${seg('rival', [['off', '關閉'], ['easy', '新手'], ['normal', '普通'], ['hard', '高手']])}
      <span class="hint">電腦對手會在唸題過程中按鈴搶答；越強按得越早、答得越準。</span></div>
    <div class="set-row"><label>唸題速度</label>${seg('speed', [[5, '慢'], [7, '中'], [10, '快']])}
      <span class="hint">搶答題逐字顯示的速度（每秒 5／7／10 字）。</span></div>
    <div class="set-row"><button class="btn ghost small" id="resetStats">清除練習紀錄</button></div>
  </div>
  <p class="foot">題目依「國家地理知識大競賽」準決賽與總決賽題型自編，僅供練習使用。</p>`;

  app.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => modePage(b.dataset.mode));
  app.querySelectorAll('[data-mock]').forEach(b => b.onclick = () => startMock(+b.dataset.mock));
  app.querySelector('[data-pic]').onclick = startPictures;
  app.querySelector('[data-semimock]').onclick = startSemiMock;
  const rv = app.querySelector('[data-review]'); if (wc) rv.onclick = startReview;
  app.querySelectorAll('.seg').forEach(sg => sg.querySelectorAll('button').forEach(b => b.onclick = () => {
    const key = sg.dataset.set; settings[key] = key === 'speed' ? +b.dataset.v : b.dataset.v; saveAll();
    sg.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
  }));
  app.querySelector('#resetStats').onclick = () => {
    if (!confirm('確定清除所有答題統計與錯題本？')) return;
    Object.keys(stats).forEach(k => delete stats[k]); Object.keys(wrong).forEach(k => delete wrong[k]); saveAll(); home();
  };
  window.scrollTo(0, 0);
}

/* ───────── 練習模式說明頁 ───────── */
function modePage(type) {
  gen++; onKey = null;
  const T = TYPES[type];
  const total = B[type].length;
  const counts = [...new Set([5, T.def, 10, 20].filter(n => n < total))].sort((a, b) => a - b);
  let pick = T.def;
  app.innerHTML = `<div class="rules">
    <small class="tag" style="color:var(--gold);font-weight:700">${T.stage}</small>
    <h2>${T.name}</h2>
    <ul>${T.rules.map(r => `<li>${r}</li>`).join('')}</ul>
    <div class="count-pick seg" id="cnt">${counts.map(n => `<button data-n="${n}" aria-pressed="${n === pick}">${n} ${type === 'chain' ? '組' : '題'}</button>`).join('')}<button data-n="${total}" aria-pressed="false">全部 ${total}</button></div>
    <div class="count-pick seg" id="pic"><button data-p="0" aria-pressed="true">全部題目</button><button data-p="1" aria-pressed="false">${SEMI.includes(type) ? `只出 PDF 試題範例原題（${pdfPool(type).length}）` : `只出圖片題（${picturePool(type).length}）`}</button></div>
    <div class="row"><button class="btn ghost" data-go="home">← 回首頁</button><span class="spacer"></span><button class="btn" id="go">開始練習</button></div>
  </div>`;
  let picOnly = false;
  app.querySelectorAll('#pic button').forEach(b => b.onclick = () => { picOnly = b.dataset.p === '1'; app.querySelectorAll('#pic button').forEach(x => x.setAttribute('aria-pressed', x === b)); });
  app.querySelectorAll('#cnt button').forEach(b => b.onclick = () => { pick = +b.dataset.n; app.querySelectorAll('#cnt button').forEach(x => x.setAttribute('aria-pressed', x === b)); });
  app.querySelector('#go').onclick = () => startSession([{ type, items: picOnly ? shuffle(SEMI.includes(type) ? pdfPool(type) : picturePool(type)).slice(0, pick) : draw(type, pick) }], { title: T.name + (picOnly ? (SEMI.includes(type) ? '・試題範例原題' : '・圖片題') : '') });
  onKey = e => { if (e.key === 'Enter') app.querySelector('#go').click(); };
}

/* ───────── 回合管理 ───────── */
let S = null;
function startSession(segments, opts) {
  S = Object.assign({ segments, seg: 0, i: 0, no: 0, score: 0, max: 0, results: [], mock: false, review: false }, opts);
  if (S.mock) intro(); else renderItem();
}
function startMock(stage) {
  const segs = stage === 1
    ? [{ type: 'tf', items: draw('tf', 10) }, { type: 'mc', items: draw('mc', 10) }, { type: 'sa', items: draw('sa', 10) }, { type: 'group', items: draw('group', 5) }]
    : [{ type: 'buzz', items: draw('buzz', 20) }, { type: 'chain', items: draw('chain', 5) }];
  startSession(segs, { mock: true, title: stage === 1 ? '模擬總決賽・第一階段' : '模擬總決賽・第二階段' });
}
function picturePool(type) {
  const out = [];
  (type ? [type] : ['tf', 'mc', 'sa', 'group', 'buzz', 'chain']).forEach(t => B[t].forEach((d, i) => { if (hasImg(d)) out.push({ type: t, idx: i, key: t + ':' + i, d }); }));
  return out;
}
function startPictures() {
  startSession([{ type: 'mixed', items: shuffle(picturePool()).slice(0, 15) }], { title: '圖片題特訓' });
}
function startReview() {
  const items = shuffle(Object.keys(wrong)).map(key => {
    const [type, rest] = key.split(':');
    if (type === 'chain') {
      const [g, s] = rest.split('.').map(Number), grp = B.chain[g];
      if (!grp || !grp.items[s]) return null;
      const prev = grp.items.slice(0, s).map(x => x.ans[0]).join(' → ');
      const it = grp.items[s];
      return { type: 'sa', key, d: { q: (prev ? `（連鎖題「${grp.theme}」，前面答案：${prev}）` : '') + it.q, ans: it.ans, all: it.all, exp: it.exp, img: it.img } };
    }
    if (type === 'smc') {
      const [g, s] = rest.split('.').map(Number), d = B.smc[g];
      if (!d) return null;
      if (!d.items) return { type, key, d };
      const q = d.items[s]; if (!q) return null;
      return { type, key, d: { q: d.stem + q.q, opts: q.opts, a: q.a, exp: q.exp, img: d.img, table: d.table } };
    }
    const d = B[type] && B[type][+rest];
    if (!d) return null;
    if (type === 'buzz') return { type: 'sa', key, d: { q: d.stem + d.q, ans: d.ans, all: d.all, exp: d.exp, img: d.img } };
    return { type, key, d };
  }).filter(Boolean);
  // 刪掉已不存在的舊題目
  Object.keys(wrong).forEach(k => { if (!items.some(it => it.key === k)) delete wrong[k]; });
  saveAll();
  if (!items.length) return home();
  // 依題型分段，但維持單一回合
  startSession([{ type: 'mixed', items }], { review: true, title: '錯題複習' });
}
function intro() {
  gen++;
  const seg = S.segments[S.seg], T = TYPES[seg.type];
  app.innerHTML = `<div class="rules">
    <small class="tag" style="color:var(--gold);font-weight:700">${S.title}</small>
    <h2>${T.stage}：${T.name}</h2>
    <p>共 ${seg.items.length} ${seg.type === 'chain' ? '組' : '題'}</p>
    <ul>${T.rules.map(r => `<li>${r}</li>`).join('')}</ul>
    <div class="row"><button class="btn ghost" id="quit">結束模擬</button><span class="spacer"></span><button class="btn" id="go">開始</button></div>
  </div>`;
  app.querySelector('#go').onclick = renderItem;
  app.querySelector('#quit').onclick = () => (S.results.length ? result() : home());
  onKey = e => { if (e.key === 'Enter') renderItem(); };
  window.scrollTo(0, 0);
}
function nextItem() {
  S.i++;
  if (S.i >= S.segments[S.seg].items.length) {
    S.seg++; S.i = 0;
    if (S.seg >= S.segments.length) return result();
    if (S.mock) return intro();
  }
  renderItem();
}
function renderItem() {
  gen++; onKey = null;
  const it = S.segments[S.seg].items[S.i];
  ({ tf: renderTF, mc: renderMC, sa: renderSA, group: renderGroup, buzz: renderBuzz, chain: renderChain, smc: renderSMC, sopen: renderSOpen, stie: renderSTie })[it.type](it);
  window.scrollTo(0, 0);
}
function progressText() {
  const total = S.segments.reduce((n, s) => n + s.items.length, 0);
  const done = S.segments.slice(0, S.seg).reduce((n, s) => n + s.items.length, 0) + S.i + 1;
  return `${S.title}・${done}/${total}・得分 ${S.score}`;
}
function stage(title, body) {
  return `<div class="stage"><div class="stage-head"><span class="q-no">${title}</span><span class="q-progress">${progressText()}</span></div>${body}</div>
  <div class="row" style="margin-top:12px"><button class="btn ghost small" id="quit">結束練習</button></div>`;
}
const hintText = h => typeof h === 'string' ? h : h.t;
const hintCard = (h, i) => `<div class="hint-card h${i + 1}"><b>提示 ${i + 1}</b>${esc(hintText(h))}${mediaHTML(h.img)}</div>`;
function bindQuit() { hydrate(app); const q = app.querySelector('#quit'); if (q) q.onclick = () => (S.results.length ? result() : home()); }

function record(it, ok, pts, max, label, your, answer) {
  S.score += pts; S.max += max;
  S.results.push({ type: it.type, ok, pts, max, label, your, answer, seg: S.seg });
  if (!S.review) bump(it.type, ok);
  if (ok) delete wrong[it.key]; else if (it.type !== 'sopen' && it.type !== 'stie') wrong[it.key] = 1;
  saveAll(); updateTop();
  const pg = app.querySelector('.q-progress'); if (pg) pg.textContent = progressText();
}
// 回饋區；override 為「評審改判」
function feedback(el, { ok, verdict, answer, exp, your, override, nextLabel, onNext }) {
  el.innerHTML = `<div class="feedback ${ok ? 'ok' : 'bad'}">
    <div class="verdict">${verdict}</div>
    ${your != null && your !== '' ? `<div>你的答案：${esc(your)}</div>` : ''}
    <div>正確答案：<span class="ans">${answer}</span></div>
    ${exp ? `<div class="exp">${esc(exp)}</div>` : ''}
    ${creditHTML()}
    <div class="row">${override && !ok ? '<button class="btn ghost small" id="ovr">評審改判：我答對了</button>' : ''}<span class="spacer"></span><button class="btn" id="nx">${nextLabel || '下一題 →'}</button></div>
  </div>`;
  const go = onNext || nextItem;
  const nx = el.querySelector('#nx');
  nx.onclick = go;
  const ov = el.querySelector('#ovr');
  if (ov) ov.onclick = () => { override(); ov.remove(); const fb = el.querySelector('.feedback'); fb.className = 'feedback ok'; fb.querySelector('.verdict').textContent = '評審改判：答對！'; };
  const shown = performance.now();
  onKey = e => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat && performance.now() - shown > 450) { e.preventDefault(); go(); } };
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function creditHTML() {
  const names = [...app.querySelectorAll('figure.photo img')].map(i => i.dataset.name);
  const parts = names.map(n => `<a href="https://commons.wikimedia.org/wiki/File:${encodeURIComponent(n)}" target="_blank" rel="noopener">照片來源（Wikimedia Commons）</a>`);
  if (app.querySelector('figure.pdfimg')) parts.push('圖片出自〈國家地理知識大競賽 複賽、準決賽試題範例〉');
  if (app.querySelector('figure.flag')) parts.push('國旗圖：flagcdn.com');
  if (app.querySelector('figure.map')) parts.push('地圖：Natural Earth、taiwan-atlas');
  return parts.length ? `<div class="credit">${parts.join('・')}</div>` : '';
}
const kbd = t => `<div class="kbd">${t}</div>`;

/* ───────── 是非題 ───────── */
function renderTF(it) {
  const d = it.d, no = ++S.no;
  app.innerHTML = stage(`${no}-是非題`, `<div class="q-text">${esc(d.q)}</div>${mediaHTML(d.img)}${timerHTML()}
    <div class="ox"><button data-v="1" aria-label="正確（O）">O</button><button data-v="0" aria-label="錯誤（X）">X</button></div>
    <div id="fb"></div>${kbd('按 <kbd>O</kbd> / <kbd>X</kbd> 作答，<kbd>Enter</kbd> 下一題')}`);
  bindQuit();
  let done = false;
  const t = phaseTimer(app.querySelector('.tbox'), readMs(d.q, d.img), ansMs(TYPES.tf.ans), () => finish(null));
  function finish(v) {
    if (done) return; done = true; t.stop();
    const ok = v === d.a;
    app.querySelectorAll('.ox button').forEach(b => {
      b.disabled = true;
      const bv = b.dataset.v === '1';
      if (bv === v) b.classList.add(ok ? 'picked-ok' : 'picked-bad');
      if (bv === d.a) b.classList.add('is-answer');
    });
    record(it, ok, ok ? 10 : 0, 10, d.q, v == null ? '（未作答）' : (v ? 'O' : 'X'), d.a ? 'O' : 'X');
    feedback(app.querySelector('#fb'), { ok, verdict: v == null ? '時間到！' : ok ? '答對！+10' : '答錯了', answer: d.a ? 'O（正確）' : 'X（錯誤）', exp: d.exp });
  }
  app.querySelectorAll('.ox button').forEach(b => b.onclick = () => finish(b.dataset.v === '1'));
  onKey = e => { const k = e.key.toLowerCase(); if (k === 'o' || k === '0') finish(true); else if (k === 'x') finish(false); };
}

/* ───────── 選擇題 ───────── */
function renderMC(it) {
  const d = mixOpts(it.d), no = ++S.no;
  app.innerHTML = stage(`${no}-選擇題`, `<div class="q-text">${esc(d.q)}</div>${mediaHTML(d.img)}${timerHTML()}
    <div class="opts">${d.opts.map((o, i) => `<button data-i="${i}"><span class="k">(${LETTERS[i]})</span><span>${esc(o)}</span></button>`).join('')}</div>
    <div id="fb"></div>${kbd('按 <kbd>A</kbd>–<kbd>D</kbd> 或 <kbd>1</kbd>–<kbd>4</kbd> 作答')}`);
  bindQuit();
  let done = false;
  const t = phaseTimer(app.querySelector('.tbox'), readMs(d.q + d.opts.join(''), d.img), ansMs(TYPES.mc.ans), () => finish(null));
  function finish(v) {
    if (done) return; done = true; t.stop();
    const ok = v === d.a;
    app.querySelectorAll('.opts button').forEach(b => {
      b.disabled = true; const i = +b.dataset.i;
      if (i === v) b.classList.add(ok ? 'picked-ok' : 'picked-bad');
      if (i === d.a) b.classList.add('is-answer');
    });
    const ansText = `(${LETTERS[d.a]}) ${esc(d.opts[d.a])}`;
    record(it, ok, ok ? 10 : 0, 10, d.q, v == null ? '（未作答）' : LETTERS[v], `(${LETTERS[d.a]}) ${d.opts[d.a]}`);
    feedback(app.querySelector('#fb'), { ok, verdict: v == null ? '時間到！' : ok ? '答對！+10' : '答錯了', answer: ansText, exp: d.exp });
  }
  app.querySelectorAll('.opts button').forEach(b => b.onclick = () => finish(+b.dataset.i));
  onKey = e => {
    const k = e.key.toLowerCase();
    const i = 'abcd'.indexOf(k) >= 0 ? 'abcd'.indexOf(k) : '1234'.indexOf(k);
    if (i >= 0 && k.length === 1) finish(i);
  };
}

/* ───────── 簡答題（單題／錯題複習共用） ───────── */
function renderSA(it) {
  const d = it.d, no = ++S.no;
  const title = S.review ? `${no}-錯題複習` : `${no}-簡答題-單題`;
  app.innerHTML = stage(title, `<div class="q-text">${esc(d.q)}</div>${mediaHTML(d.img)}${timerHTML()}
    <div class="answer-row"><input class="board-input" id="inp" autocomplete="off" placeholder="在白板寫下答案…" aria-label="答案"><button class="btn" id="sub">出示答案</button></div>
    <div id="fb"></div>${kbd('<kbd>Enter</kbd> 出示答案')}`);
  bindQuit();
  const inp = app.querySelector('#inp');
  inp.focus();
  let done = false;
  const t = phaseTimer(app.querySelector('.tbox'), readMs(d.q, d.img), ansMs(TYPES.sa.ans), () => finish(true));
  function finish(timeout) {
    if (done) return; done = true; t.stop();
    const your = inp.value.trim();
    inp.disabled = true; app.querySelector('#sub').disabled = true;
    const ok = judge(your, d);
    record(it, ok, ok ? 10 : 0, 10, d.q, your || '（未作答）', d.ans[0]);
    const r = S.results[S.results.length - 1];
    feedback(app.querySelector('#fb'), {
      ok, verdict: ok ? '答對！+10' : (timeout && !your ? '時間到！' : '答錯了'), answer: esc(d.ans[0]), exp: d.exp, your,
      override: () => { r.ok = true; r.pts = 10; S.score += 10; delete wrong[it.key]; if (!S.review) stats[it.type].c++; saveAll(); updateTop(); }
    });
  }
  app.querySelector('#sub').onclick = () => finish(false);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); e.stopPropagation(); finish(false); } });
}

/* ───────── 題組（3 個提示：30／20／10） ───────── */
function renderGroup(it) {
  const d = it.d, no = ++S.no;
  const PAPER = [{ pts: 30, cls: 'red', name: '紅色紙', badge: 'p30' }, { pts: 20, cls: 'blue', name: '藍色紙', badge: 'p20' }, { pts: 10, cls: '', name: '白板', badge: 'p10' }];
  let k = 0, done = false, t = { stop() {} };
  app.innerHTML = stage(`${no}-簡答題-題組`, `<div class="q-text">${esc(d.prompt)}</div>
    <div class="hints" id="hints"></div>${timerHTML()}
    <div class="row" style="margin-bottom:8px"><span class="paper-badge" id="badge"></span></div>
    <div class="answer-row"><input class="board-input" id="inp" autocomplete="off" aria-label="答案"><button class="btn" id="sub">作答</button><button class="btn ghost" id="more">等下一個提示</button></div>
    <div id="fb"></div>${kbd('<kbd>Enter</kbd> 作答（作答後不可更改）')}`);
  bindQuit();
  const inp = app.querySelector('#inp'), hintsEl = app.querySelector('#hints'), more = app.querySelector('#more');
  function show() {
    const p = PAPER[k];
    hintsEl.innerHTML = d.hints.map((h, i) => i <= k
      ? hintCard(h, i)
      : `<div class="hint-card h${i + 1} hidden"><b>提示 ${i + 1}</b>？？？</div>`).join('');
    hydrate(hintsEl);
    inp.className = 'board-input ' + p.cls;
    inp.placeholder = `寫在${p.name}上（${p.pts} 分）`;
    const badge = app.querySelector('#badge'); badge.className = 'paper-badge ' + p.badge; badge.textContent = `現在作答：${p.name} ${p.pts} 分`;
    app.querySelector('#sub').textContent = `作答（${p.pts} 分）`;
    more.hidden = k >= 2;
    t.stop();
    t = phaseTimer(app.querySelector('.tbox'), readMs(hintText(d.hints[k]), d.hints[k].img), ansMs(TYPES.group.ans), () => (k < 2 ? nextHint() : finish(true)));
    inp.focus();
  }
  function nextHint() { if (done || k >= 2) return; k++; show(); }
  function finish(timeout) {
    if (done) return; done = true; t.stop();
    const your = inp.value.trim(), p = PAPER[k];
    inp.disabled = true; app.querySelector('#sub').disabled = true; more.hidden = true;
    hintsEl.innerHTML = d.hints.map(hintCard).join(''); hydrate(hintsEl);
    const ok = judge(your, d), pts = ok ? p.pts : 0;
    record(it, ok, pts, 30, d.prompt + '（' + hintText(d.hints[0]) + '…）', your ? `${your}（${p.name}）` : '（未作答）', d.ans[0]);
    const r = S.results[S.results.length - 1];
    feedback(app.querySelector('#fb'), {
      ok, verdict: ok ? `答對！在第 ${k + 1} 個提示作答 +${p.pts}` : (timeout && !your ? '時間到！' : '答錯了'), answer: esc(d.ans[0]), exp: d.exp, your,
      override: () => { r.ok = true; r.pts = p.pts; S.score += p.pts; delete wrong[it.key]; if (!S.review) stats[it.type].c++; saveAll(); updateTop(); }
    });
  }
  more.onclick = nextHint;
  app.querySelector('#sub').onclick = () => finish(false);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); e.stopPropagation(); finish(false); } });
  show();
}

/* ───────── 搶答引擎 ─────────
 * mode: 'open' 一般搶答｜'me' 我有優先權｜'rival' 對手有優先權
 * cb({ correct, by: 'me'|'rival'|null, your, frac })
 */
function buzzRound(box, q, mode, cb) {
  const g = gen;
  const stem = q.stem || '', main = q.q;
  const SL = stem.length, GAP = stem ? 5 : 0, ML = main.length, N = SL + GAP + ML;
  const cps = settings.speed, tick = 1000 / cps;
  const rv = RIVAL[settings.rival];
  const waitSec = (settings.timer === 'race' ? 6 : settings.timer === 'relax' ? 15 : Infinity) + (q.img ? 3 : 0);
  const answerSec = settings.timer === 'race' ? 10 : settings.timer === 'relax' ? 25 : Infinity;
  let pos = 0, iv = null, state = 'reading', waitFrom = N, userOut = false, rivalOut = !rv, frac = null, ansTimer = null;
  let rivalPos = rv ? Math.round(N * rand(rv.lo, rv.hi)) : Infinity;
  if (mode === 'me') rivalOut = true;
  if (mode === 'rival') { rivalOut = false; rivalPos = N + Math.round(cps * 0.8); }

  box.innerHTML = `
    <div class="row" style="justify-content:center;margin-bottom:4px">${rv ? `<span class="rival" id="rival"><span class="dot"></span>2 號選手（電腦・${rv.label}）</span>` : ''}</div>
    <div class="host" id="host"></div>
    ${mediaHTML(q.img)}
    <div class="q-text"><span id="stemT"></span>${stem ? '<br>' : ''}<span class="q-main" id="mainT"></span></div>
    <div class="buzz-area" id="barea"><button class="buzzer" id="buzzer">搶答</button><div class="buzz-note">按 <kbd>空白鍵</kbd> 按鈴</div><button class="btn ghost small" id="skip">不會，看答案</button></div>
    <div id="ansArea" hidden>${timerHTML()}<div class="answer-row"><input class="board-input" id="inp" autocomplete="off" placeholder="立刻作答…" aria-label="答案"><button class="btn" id="sub">回答</button></div></div>`;
  const $ = s => box.querySelector(s);
  hydrate(box);
  const host = $('#host'), stemT = $('#stemT'), mainT = $('#mainT'), buzzer = $('#buzzer'), inp = $('#inp');
  const say = t => { host.textContent = t; };

  function draw() {
    stemT.textContent = stem.slice(0, Math.min(pos, SL));
    mainT.textContent = main.slice(0, Math.max(0, Math.min(ML, pos - SL - GAP)));
    const typingMain = pos > SL + GAP && pos < N, typingStem = pos < SL;
    stemT.classList.toggle('caret', typingStem); mainT.classList.toggle('caret', typingMain);
  }
  function stop() { if (iv) { clearInterval(iv); iv = null; } }
  function run() {
    if (iv) return;
    iv = setInterval(() => {
      if (g !== gen) return stop();
      pos++;
      if (pos <= N) draw();
      if (pos === N && state === 'reading') { state = 'waiting'; waitFrom = N; }
      if (!rivalOut && pos >= rivalPos && (state === 'reading' || state === 'waiting')) return rivalBuzz();
      if (state === 'waiting') {
        const left = waitSec - (pos - waitFrom) / cps;
        if (userOut && rivalOut) return end(false, null, q._your);
        say(userOut ? '' : (isFinite(left) ? `請按鈴搶答…（${Math.max(0, Math.ceil(left))}）` : '請按鈴搶答…'));
        if (left <= 0) { stop(); state = 'timeout'; say('時間到，無人搶答'); later(() => end(false, null, q._your), 900); }
      }
    }, tick);
  }
  function end(correct, by, your) {
    stop(); state = 'done';
    if (ansTimer) ansTimer.stop();
    buzzer.disabled = true; inp.disabled = true; $('#sub').disabled = true;
    pos = N; draw();
    cb({ correct, by, your: your == null ? '' : your, frac });
  }
  function openAnswer() {
    $('#ansArea').hidden = false; $('#barea').hidden = true;
    inp.disabled = false; inp.focus();
    const tb = $('.tbox');
    if (isFinite(answerSec)) { tb.hidden = false; tb.querySelector('.timer-label span').textContent = '作答時間'; ansTimer = bar(tb, answerSec * 1000, '', () => submit(true)); }
    else tb.hidden = true;
  }
  function userBuzz() {
    if (userOut || !(state === 'reading' || state === 'waiting')) return;
    if (mode === 'rival' && !rivalOut) return;   // 對手有優先權，要等他答錯
    stop(); state = 'myAnswer'; frac = Math.min(1, pos / N);
    buzzer.classList.add('hit'); buzzer.disabled = true;
    say(pos < SL + GAP + 1 && stem ? '你按鈴了！（主要問題還沒出現）請立刻作答' : '你按鈴了！請立刻作答');
    openAnswer();
  }
  function submit(timeout) {
    if (state !== 'myAnswer') return;
    if (ansTimer) ansTimer.stop();
    const your = inp.value.trim();
    const ok = judge(your, q);
    if (ok) return end(true, 'me', your);
    stop();
    userOut = true; state = 'judged'; inp.disabled = true; $('#sub').disabled = true;
    say(timeout && !your ? '作答超時！' : `答錯！（你答：${your || '—'}）`);
    if (mode === 'me' && rv) rivalOut = false;   // 優先權答錯 → 開放對手搶答
    if (rivalOut) return later(() => end(false, null, your), 900);
    // 開放其他選手作答
    later(() => {
      $('#ansArea').hidden = true;
      rivalPos = pos + Math.round(cps * rand(0.6, 1.4));
      state = pos >= N ? 'waiting' : 'reading'; waitFrom = Math.max(pos, N);
      q._your = your;
      run();
    }, 900);
  }
  function rivalBuzz() {
    stop(); state = 'rival'; rivalOut = true;
    const el = $('#rival'); if (el) el.classList.add('on');
    buzzer.disabled = true;
    say(mode === 'rival' ? '2 號選手（優先答題權）作答中…' : '叮！2 號選手按鈴！');
    const sawMain = pos > SL + GAP + Math.min(4, ML);
    const p = rv.p * (sawMain ? 1 : 0.55);
    later(() => {
      if (el) el.classList.remove('on');
      if (Math.random() < p) { say(`2 號選手答對了：「${q.ans[0]}」`); later(() => end(false, 'rival', q._your), 1100); return; }
      say('2 號選手答錯！');
      if (userOut) return later(() => end(false, null, q._your), 900);
      later(() => {
        buzzer.disabled = false; state = pos >= N ? 'waiting' : 'reading'; waitFrom = Math.max(pos, N);
        say(state === 'waiting' ? '請按鈴搶答…' : ''); run();
      }, 700);
    }, 1300);
  }

  buzzer.onclick = userBuzz;
  $('#skip').onclick = () => { if (state === 'reading' || state === 'waiting') end(false, null, q._your); };
  $('#sub').onclick = () => submit(false);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); e.stopPropagation(); submit(false); } });
  onKey = e => {
    if (e.key === ' ' && document.activeElement !== inp && !e.repeat) { e.preventDefault(); userBuzz(); }
  };

  if (mode === 'me') {
    say('你有優先答題權！聽完題目後作答');
    state = 'myAnswer'; frac = 1;
    openAnswer(); if (ansTimer) { ansTimer.stop(); ansTimer = null; }
    $('.tbox').hidden = true;
    // 唸完才開始計時
    const g2 = gen;
    const startWhenRead = setInterval(() => {
      if (g2 !== gen || state !== 'myAnswer') return clearInterval(startWhenRead);
      if (pos >= N) { clearInterval(startWhenRead); const tb = $('.tbox'); if (isFinite(answerSec)) { tb.hidden = false; tb.querySelector('.timer-label span').textContent = '作答時間'; ansTimer = bar(tb, answerSec * 1000, '', () => submit(true)); } }
    }, 100);
    // 唸題（不會被搶）
    iv = setInterval(() => { if (g !== gen) return stop(); pos++; draw(); if (pos >= N) stop(); }, tick);
  } else {
    if (mode === 'rival') { say('2 號選手有優先答題權'); buzzer.disabled = true; }
    draw(); run();
  }
}

/* ───────── 搶答單題 ───────── */
function renderBuzz(it) {
  const d = it.d, no = ++S.no;
  app.innerHTML = stage(`${no}-搶答-單題`, `<div id="box"></div><div id="fb"></div>`);
  bindQuit();
  buzzRound(app.querySelector('#box'), Object.assign({}, d), 'open', r => {
    const ok = r.correct && r.by === 'me';
    record(it, ok, ok ? 10 : 0, 10, d.stem + d.q, r.your || (r.by === 'rival' ? '（被對手搶答）' : '（未作答）'), d.ans[0]);
    let verdict = ok ? '答對！+10' : r.by === 'rival' ? '被 2 號選手搶走了！' : r.your ? '答錯了' : '沒有搶到這題';
    if (ok && r.frac != null && r.frac < 0.8) verdict += '（神搶！題目還沒唸完）';
    const rec = S.results[S.results.length - 1];
    feedback(app.querySelector('#fb'), {
      ok, verdict, answer: esc(d.ans[0]), exp: d.exp, your: r.your,
      override: r.your ? () => { rec.ok = true; rec.pts = 10; S.score += 10; delete wrong[it.key]; stats.buzz.c++; saveAll(); updateTop(); } : null
    });
  });
}

/* ───────── 連鎖題 ───────── */
function renderChain(it) {
  const grp = it.d, no = ++S.no;
  let k = 0, prio = null;
  const marks = [];
  function sub() {
    gen++; onKey = null;
    const q = grp.items[k];
    const steps = [0, 1, 2].map(i => `<span class="${marks[i] === true ? 'ok' : marks[i] === false ? 'bad' : i === k ? 'cur' : ''}"></span>`).join('');
    const pb = prio === 'me' ? '<span class="priority">你有優先答題權</span>' : prio === 'rival' && RIVAL[settings.rival] ? '<span class="priority rival-p">2 號有優先答題權</span>' : '';
    app.innerHTML = stage(`${no}-連鎖題（${k + 1}/3）`, `<div class="row" style="justify-content:space-between;margin-bottom:6px"><span class="chain-steps">${steps}</span>${pb}</div><div id="box"></div><div id="fb"></div>`);
    bindQuit();
    const mode = prio === 'me' ? 'me' : (prio === 'rival' && RIVAL[settings.rival]) ? 'rival' : 'open';
    buzzRound(app.querySelector('#box'), Object.assign({}, q), mode, r => {
      const ok = r.correct && r.by === 'me';
      marks[k] = ok;
      const subIt = { type: 'chain', key: `chain:${it.idx}.${k}` };
      record(subIt, ok, ok ? 10 : 0, 10, `【${grp.theme}】${q.q}`, r.your || (r.by === 'rival' ? '（被對手搶答）' : '（未作答）'), q.ans[0]);
      prio = ok ? 'me' : r.by === 'rival' ? 'rival' : null;
      const rec = S.results[S.results.length - 1];
      const last = k >= 2;
      feedback(app.querySelector('#fb'), {
        ok, verdict: ok ? (k < 2 ? '答對！+10，取得下一題優先答題權' : '答對！+10') : r.by === 'rival' ? '被 2 號選手答走了！' : r.your ? '答錯了' : '無人答對',
        answer: esc(q.ans[0]), exp: q.exp, your: r.your,
        nextLabel: last ? '下一組 →' : '下一個子題 →',
        onNext: last ? nextItem : () => { k++; sub(); },
        override: r.your ? () => { rec.ok = true; rec.pts = 10; S.score += 10; delete wrong[subIt.key]; stats.chain.c++; marks[k] = true; saveAll(); updateTop(); } : null
      });
    });
    window.scrollTo(0, 0);
  }
  sub();
}

/* ───────── 結果 ───────── */
function result() {
  gen++; onKey = null;
  const R = S.results;
  const okN = R.filter(r => r.ok).length;
  let table = '';
  if (S.mock || S.segments.length > 1) {
    table = `<table class="sec-table"><tr><th>題型</th><th>答對</th><th>得分</th></tr>${S.segments.map((sg, i) => {
      const rs = R.filter(r => r.seg === i);
      if (!rs.length) return '';
      return `<tr><td>${TYPES[sg.type].name}</td><td>${rs.filter(r => r.ok).length}/${rs.length}</td><td>${rs.reduce((n, r) => n + r.pts, 0)}/${rs.reduce((n, r) => n + r.max, 0)}</td></tr>`;
    }).join('')}</table>`;
  }
  const score = R.reduce((n, r) => n + r.pts, 0), max = R.reduce((n, r) => n + r.max, 0);
  const pct = max ? Math.round(score / max * 100) : 0;
  const msg = pct >= 90 ? '冠軍水準！' : pct >= 75 ? '進前三沒問題！' : pct >= 60 ? '穩穩的，再多練幾輪' : '把錯題本複習一遍再來挑戰！';
  app.innerHTML = `<div class="rules result">
    <small class="tag" style="color:var(--gold);font-weight:700">${esc(S.title)}</small>
    <div class="big-score">${score}<small style="font-size:1.2rem;color:var(--ink-soft)"> / ${max}</small></div>
    <p>答對 ${okN} / ${R.length} 題・${msg}</p>
    ${table}
    <div class="row" style="justify-content:center;margin-top:14px"><button class="btn ghost" data-go="home">回首頁</button><button class="btn" id="again">再來一輪</button></div>
    <div class="result-list">${R.map(r => `<div class="result-item ${r.ok ? '' : 'bad'}">${r.ok ? '✔' : '✘'} ${esc(r.label)}<br><span class="you">你：${esc(r.your)}　正解：${esc(r.answer)}</span></div>`).join('')}</div>
  </div>`;
  const prev = S;
  app.querySelector('#again').onclick = () => {
    if (prev.review) return startReview();
    if (prev.semi) return startSemiMock();
    if (prev.mock) return startMock(prev.segments[0].type === 'tf' ? 1 : 2);
    const sg = prev.segments[0]; startSession([{ type: sg.type, items: draw(sg.type, sg.items.length) }], { title: prev.title });
  };
  window.scrollTo(0, 0);
}

/* 錯題複習的 mixed 段：依每題自己的 type 渲染 */
TYPES.mixed = { name: '錯題複習' };

document.addEventListener('click', e => { const g = e.target.closest('[data-go="home"]'); if (g) home(); });
document.addEventListener('DOMContentLoaded', home);
