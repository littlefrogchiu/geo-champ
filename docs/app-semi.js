'use strict';
/* 準決賽（紙筆測驗）：選擇題、非選擇題、同分決勝題、綜合模擬
 * 依「國家地理知識大競賽 複賽及準決賽試題範例」的題型設計；共用 app.js 的回合管理、計分與圖片繪製。
 */
const SEMI = ['smc', 'sopen', 'stie'];

Object.assign(TYPES, {
  smc: { name: '準決賽－選擇題', stage: '準決賽・第一部分', pts: 2, def: 10,
    desc: '情境、照片、地圖、統計表的推理題，含題組',
    rules: ['題目常結合<b>時事、照片、地圖、統計表</b>，要從線索推理出答案', '會跨到<b>歷史、公民</b>等相關知識', '「題組」共用一段題幹，連續回答 2～3 題', '準決賽是紙筆測驗，這裡不計時；鍵盤可按 <b>A–D</b> 或 <b>1–4</b> 作答'] },
  sopen: { name: '準決賽－非選擇題', stage: '準決賽・第二部分', def: 5,
    desc: '寫出名稱或說明原因，自動批改＋依評分規準自評',
    rules: ['要寫<b>名稱</b>的小題由系統批改（每小題 2 分），<b>關鍵字寫錯不給分</b>', '要<b>說明原因</b>的小題：寫完後對照參考答案與評分規準，自己勾選得分', '地名以現今地名、我國慣用翻譯為準；若系統誤判可按「評審改判」'] },
  stie: { name: '準決賽－同分決勝題', stage: '準決賽・第三部分', def: 5,
    desc: '手繪輪廓標示位置、在地圖上點出地點',
    rules: ['<b>手繪題</b>：在畫布上用手指或滑鼠畫出輪廓並寫上標示，完成後對照真實地圖，依評分規準自評', '<b>定位題</b>：在地圖上點出指定地點，系統依距離自動給分', '<b>等高線題</b>：在等高線圖上點出鞍部或山頂', '每題 6 分'] }
});

function startSemiMock() {
  startSession([
    { type: 'smc', items: draw('smc', 12) },
    { type: 'sopen', items: draw('sopen', 4) },
    { type: 'stie', items: draw('stie', 2) }
  ], { mock: true, semi: true, title: '準決賽・綜合模擬' });
}

function tableHTML(t) {
  if (!t) return '';
  return `<div class="dtable-wrap"><table class="dtable"><thead><tr>${t.head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${t.rows.map(r => `<tr>${r.map((c, i) => i ? `<td>${esc(c)}</td>` : `<th>${esc(c)}</th>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

/* ───────── 準決賽・選擇題（含題組） ───────── */
function renderSMC(it) {
  const d = it.d, no = ++S.no, subs = d.items || [d], isG = !!d.items;
  let k = 0;
  function show() {
    gen++; onKey = null;
    const q = mixOpts(subs[k]);
    const head = isG ? `<div class="stem"><b>題組</b>${esc(d.stem)}</div>${mediaHTML(d.img)}${tableHTML(d.table)}<div class="q-text">（${k + 1}）${esc(q.q)}</div>`
      : `<div class="q-text">${esc(q.q)}</div>${mediaHTML(d.img)}${tableHTML(d.table)}`;
    app.innerHTML = stage(`${no}-準決賽選擇題${isG ? `（題組 ${k + 1}/${subs.length}）` : ''}`, `${head}
      <div class="opts">${q.opts.map((o, i) => `<button data-i="${i}"><span class="k">(${LETTERS[i]})</span><span>${esc(o)}</span></button>`).join('')}</div>
      <div id="fb"></div>${kbd('按 <kbd>A</kbd>–<kbd>D</kbd> 或 <kbd>1</kbd>–<kbd>4</kbd> 作答')}`);
    bindQuit();
    let done = false;
    function finish(v) {
      if (done) return; done = true;
      const ok = v === q.a;
      app.querySelectorAll('.opts button').forEach(b => {
        b.disabled = true; const i = +b.dataset.i;
        if (i === v) b.classList.add(ok ? 'picked-ok' : 'picked-bad');
        if (i === q.a) b.classList.add('is-answer');
      });
      const key = isG ? `smc:${it.idx}.${k}` : it.key;
      record({ type: 'smc', key }, ok, ok ? 2 : 0, 2, (isG ? '【題組】' : '') + q.q, LETTERS[v], `(${LETTERS[q.a]}) ${q.opts[q.a]}`);
      const last = k >= subs.length - 1;
      feedback(app.querySelector('#fb'), {
        ok, verdict: ok ? '答對！+2' : '答錯了', answer: `(${LETTERS[q.a]}) ${esc(q.opts[q.a])}`, exp: q.exp,
        nextLabel: last ? '下一題 →' : '題組下一小題 →', onNext: last ? nextItem : () => { k++; show(); }
      });
    }
    app.querySelectorAll('.opts button').forEach(b => b.onclick = () => finish(+b.dataset.i));
    onKey = e => {
      const key = e.key.toLowerCase();
      const i = 'abcd'.indexOf(key) >= 0 ? 'abcd'.indexOf(key) : '1234'.indexOf(key);
      if (i >= 0 && key.length === 1) finish(i);
    };
    window.scrollTo(0, 0);
  }
  show();
}

/* ───────── 準決賽・非選擇題 ───────── */
function renderSOpen(it) {
  const d = it.d, no = ++S.no;
  const maxOf = p => p.ref ? p.rubric.reduce((n, r) => n + r.p, 0) : 2;
  const max = d.parts.reduce((n, p) => n + maxOf(p), 0);
  app.innerHTML = stage(`${no}-準決賽非選擇題`, `<div class="q-text">${esc(d.q)}</div>${mediaHTML(d.img)}${tableHTML(d.table)}
    <div class="parts">${d.parts.map((p, i) => `<div class="part" data-i="${i}">
      <div class="part-q"><b>（${i + 1}）</b>${esc(p.q)}<span class="part-pts">${maxOf(p)} 分</span></div>
      ${p.ref ? '<textarea class="board-input area" rows="3" placeholder="寫下你的說明…"></textarea>' : '<input class="board-input" autocomplete="off" placeholder="寫下答案…">'}
      <div class="part-fb"></div></div>`).join('')}</div>
    <div class="row end" id="subRow"><button class="btn" id="sub">交卷批改</button></div>
    <div id="fb"></div>`);
  bindQuit();
  const partEls = [...app.querySelectorAll('.part')];
  const fields = partEls.map(el => el.querySelector('input, textarea'));
  fields[0].focus();
  fields.forEach((f, i) => f.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || e.isComposing || f.tagName === 'TEXTAREA') return;
    e.preventDefault(); e.stopPropagation();
    if (fields[i + 1]) fields[i + 1].focus(); else grade();
  }));
  const got = d.parts.map(() => 0);
  let graded = false;
  function total() { return got.reduce((a, b) => a + b, 0); }
  function updateTotal() { const el = app.querySelector('#semiTotal'); if (el) el.textContent = `${total()} / ${max}`; }
  function grade() {
    if (graded) return; graded = true;
    fields.forEach(f => f.disabled = true);
    app.querySelector('#subRow').hidden = true;
    d.parts.forEach((p, i) => {
      const fb = partEls[i].querySelector('.part-fb'), your = fields[i].value.trim();
      if (!p.ref) {
        const ok = judge(your, p); got[i] = ok ? 2 : 0;
        fb.innerHTML = `<div class="feedback ${ok ? 'ok' : 'bad'} small"><div class="verdict">${ok ? '答對 +2' : your ? '答錯' : '未作答'}</div>
          <div>正確答案：<span class="ans">${esc(p.ans[0])}</span></div>${p.exp ? `<div class="exp">${esc(p.exp)}</div>` : ''}
          ${ok || !your ? '' : '<button class="btn ghost small ovr">評審改判：我答對了</button>'}</div>`;
        const ov = fb.querySelector('.ovr');
        if (ov) ov.onclick = () => { got[i] = 2; ov.remove(); const box = fb.querySelector('.feedback'); box.className = 'feedback ok small'; box.querySelector('.verdict').textContent = '評審改判：答對 +2'; updateTotal(); };
      } else {
        fb.innerHTML = `<div class="feedback self small"><div class="verdict">參考答案</div><div class="exp ref">${esc(p.ref)}</div>
          <div class="rubric"><b>評分規準（勾選你寫到的）</b>${p.rubric.map((r, j) => `<label><input type="checkbox" data-j="${j}"> ${esc(r.t)}<span class="part-pts">${r.p} 分</span></label>`).join('')}</div></div>`;
        fb.querySelectorAll('input[type=checkbox]').forEach(cb => cb.onchange = () => {
          got[i] = [...fb.querySelectorAll('input:checked')].reduce((n, c) => n + p.rubric[+c.dataset.j].p, 0); updateTotal();
        });
      }
    });
    hydrate(app);
    const fbEl = app.querySelector('#fb');
    fbEl.innerHTML = `<div class="feedback"><div class="verdict">本題得分 <span id="semiTotal"></span></div>${creditHTML()}
      <div class="row"><span class="spacer"></span><button class="btn" id="nx">確認得分，下一題 →</button></div></div>`;
    updateTotal();
    fbEl.querySelector('#nx').onclick = () => {
      const pts = total();
      record(it, pts === max, pts, max, d.q, fields.map(f => f.value.trim() || '—').join('／'), d.parts.map(p => p.ref ? '（說明題）' : p.ans[0]).join('／'));
      nextItem();
    };
    partEls[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  app.querySelector('#sub').onclick = grade;
}

/* ───────── 準決賽・同分決勝題 ───────── */
function renderSTie(it) {
  const d = it.d, no = ++S.no;
  ({ draw: tieDraw, locate: tieLocate, contour: tieLocate })[d.kind](it, no);
}

// 手繪：畫布＋復原／清除，完成後對照參考地圖自評
function tieDraw(it, no) {
  const d = it.d;
  app.innerHTML = stage(`${no}-同分決勝題（手繪）`, `<div class="q-text">${esc(d.q)}</div>
    <div class="drawbox"><canvas id="cv" aria-label="手繪區"></canvas><div class="draw-hint">在這裡用手指或滑鼠畫，標示可以直接寫字</div></div>
    <div class="row" id="tools"><button class="btn ghost small" id="undo">↶ 復原</button><button class="btn ghost small" id="clr">清除</button><span class="spacer"></span><button class="btn" id="done">畫好了，對照答案</button></div>
    <div id="fb"></div>`);
  bindQuit();
  const cv = app.querySelector('#cv'), box = app.querySelector('.drawbox'), hint = app.querySelector('.draw-hint');
  const W = box.clientWidth, H = Math.round(Math.min(480, Math.max(300, W * 0.8))), dpr = window.devicePixelRatio || 1;
  cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
  const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
  const ink = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#333';
  const strokes = []; let cur = null, locked = false;
  function redraw() {
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = ink; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    strokes.forEach(s => { ctx.beginPath(); s.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); if (s.length === 1) ctx.lineTo(s[0][0] + 0.1, s[0][1]); ctx.stroke(); });
    hint.hidden = strokes.length > 0;
  }
  const pos = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  cv.addEventListener('pointerdown', e => { if (locked) return; cv.setPointerCapture(e.pointerId); cur = [pos(e)]; strokes.push(cur); redraw(); });
  cv.addEventListener('pointermove', e => { if (!cur) return; cur.push(pos(e)); redraw(); });
  const up = () => { cur = null; };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  app.querySelector('#undo').onclick = () => { if (!locked) { strokes.pop(); redraw(); } };
  app.querySelector('#clr').onclick = () => { if (!locked) { strokes.length = 0; redraw(); } };
  redraw();
  app.querySelector('#done').onclick = () => {
    locked = true; app.querySelector('#tools').hidden = true;
    const max = d.rubric.reduce((n, r) => n + r.p, 0);
    let got = 0;
    const fb = app.querySelector('#fb');
    fb.innerHTML = `<div class="feedback self"><div class="verdict">參考地圖</div>${mediaHTML(d.ref)}
      <div class="rubric"><b>評分規準（對照地圖，勾選你畫對的）</b>${d.rubric.map((r, j) => `<label><input type="checkbox" data-j="${j}"> ${esc(r.t)}<span class="part-pts">${r.p} 分</span></label>`).join('')}</div>
      <div class="verdict">本題得分 <span id="semiTotal">0 / ${max}</span></div>${creditHTML()}
      <div class="row"><span class="spacer"></span><button class="btn" id="nx">確認得分，下一題 →</button></div></div>`;
    hydrate(fb);
    fb.querySelectorAll('input[type=checkbox]').forEach(cb => cb.onchange = () => {
      got = [...fb.querySelectorAll('input:checked')].reduce((n, c) => n + d.rubric[+c.dataset.j].p, 0);
      fb.querySelector('#semiTotal').textContent = `${got} / ${max}`;
    });
    fb.querySelector('#nx').onclick = () => { record(it, got === max, got, max, d.q, '（手繪）', '對照參考地圖'); nextItem(); };
    fb.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
}

// 等高線圖：兩座高斯山峰，算出鞍部與最高點
async function contourMap() {
  await loadScript('https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js');
  const n = 128, m = 80, W = 640, H = 400, k = W / n;
  const peaks = [
    { x: rand(0.2, 0.34) * n, y: rand(0.32, 0.68) * m, h: rand(820, 960), s: rand(15, 19) },
    { x: rand(0.66, 0.8) * n, y: rand(0.32, 0.68) * m, h: rand(560, 720), s: rand(14, 18) }
  ];
  if (Math.random() < 0.5) [peaks[0].h, peaks[1].h] = [peaks[1].h, peaks[0].h];
  const f = (x, y) => 40 + peaks.reduce((v, p) => v + p.h * Math.exp(-((x - p.x) ** 2 + (y - p.y) ** 2) / (2 * p.s ** 2)), 0);
  const values = new Float64Array(n * m);
  for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) values[j * n + i] = f(i + 0.5, j + 0.5);
  const th = d3.range(100, 1000, 100);
  const cs = d3.contours().size([n, m]).thresholds(th)(values);
  const path = d3.geoPath(d3.geoIdentity().scale(k));
  const color = d3.interpolateRgbBasis(['#eef6dc', '#bfdc96', '#e8d57e', '#d9a35a', '#b06d3c', '#7a4526']);
  // 鞍部：兩峰連線上的最低點；山頂：較高的峰
  let best = null;
  for (let t = 0.05; t <= 0.95; t += 0.005) {
    const x = peaks[0].x + (peaks[1].x - peaks[0].x) * t, y = peaks[0].y + (peaks[1].y - peaks[0].y) * t, v = f(x, y);
    if (!best || v < best.v) best = { x, y, v };
  }
  const top = peaks[0].h > peaks[1].h ? peaks[0] : peaks[1];
  let svg = `<svg viewBox="0 0 ${W} ${H + 40}" class="mapsvg contour" role="img" aria-label="等高線圖"><rect width="${W}" height="${H}" fill="#f7fbf0"/>`;
  cs.forEach((c, i) => { const pd = path(c); if (pd) svg += `<path d="${pd}" fill="${color((i + 1) / th.length)}" stroke="#5b4a32" stroke-width="1"/>`; });
  th.forEach((v, i) => { svg += `<rect x="${12 + i * 52}" y="${H + 6}" width="50" height="12" fill="${color((i + 1) / th.length)}" stroke="#5b4a32" stroke-width=".5"/><text x="${37 + i * 52}" y="${H + 34}" text-anchor="middle" class="cl-ax">${v}</text>`; });
  svg += `<text x="${W - 8}" y="${H + 34}" text-anchor="end" class="cl-ax">公尺</text></svg>`;
  return { svg, saddle: [best.x * k, best.y * k], peak: [top.x * k, top.y * k], W, H };
}

// 定位：點地圖，確定後依距離給分（6／3／0）
function tieLocate(it, no) {
  const d = it.d, g = gen;
  const label = d.kind === 'contour' ? '等高線' : '定位';
  app.innerHTML = stage(`${no}-同分決勝題（${label}）`, `<div class="q-text">${esc(d.q)}</div>
    <figure class="qimg ${d.kind === 'contour' ? 'contour' : 'map'} locate ${d.map && d.map.map === 'tw' ? 'tw' : ''}" id="lm"><div class="map-loading">地圖載入中…</div></figure>
    <div class="row"><span class="hint" id="lhint">在圖上點一下，放下你的標記（可以重新點選）</span><span class="spacer"></span><button class="btn" id="ok" disabled>確定位置</button></div>
    <div id="fb"></div>`);
  bindQuit();
  const fig = app.querySelector('#lm'), okBtn = app.querySelector('#ok');
  let m, mark = null, svg, done = false;
  const NS = 'http://www.w3.org/2000/svg';
  const dot = (x, y, cls, r) => { const c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', r); c.setAttribute('class', cls); svg.appendChild(c); return c; };
  (d.kind === 'contour' ? contourMap() : buildMap(d.map)).then(res => {
    if (g !== gen) return;
    m = res; fig.innerHTML = m.svg; svg = fig.querySelector('svg');
    svg.addEventListener('click', e => {
      if (done) return;
      const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
      const xy = p.matrixTransform(svg.getScreenCTM().inverse());
      if (mark) mark.remove();
      mark = dot(xy.x, xy.y, 'you-mark', 7); mark._xy = [xy.x, xy.y];
      okBtn.disabled = false;
    });
  }).catch(() => { fig.innerHTML = '<div class="map-loading">地圖載入失敗，請確認網路連線</div>'; });
  okBtn.onclick = () => {
    if (!mark || done) return; done = true; okBtn.disabled = true;
    let truth, pts, distText;
    if (d.kind === 'contour') {
      truth = d.target === 'saddle' ? m.saddle : m.peak;
      const px = Math.hypot(mark._xy[0] - truth[0], mark._xy[1] - truth[1]), tol = m.W * 0.06;
      pts = px <= tol ? 6 : px <= tol * 2 ? 3 : 0;
      distText = pts === 6 ? '位置正確' : pts === 3 ? '接近了，但不夠準確' : '位置差太遠';
    } else {
      truth = m.proj(d.at);
      const km = d3.geoDistance(m.proj.invert(mark._xy), d.at) * 6371;
      pts = km <= d.tol ? 6 : km <= d.tol * 2 ? 3 : 0;
      distText = `與正確位置相差約 ${km < 10 ? km.toFixed(1) : Math.round(km)} 公里`;
    }
    const ln = document.createElementNS(NS, 'line');
    [['x1', mark._xy[0]], ['y1', mark._xy[1]], ['x2', truth[0]], ['y2', truth[1]]].forEach(([a, v]) => ln.setAttribute(a, v));
    ln.setAttribute('class', 'miss-line'); svg.appendChild(ln);
    dot(truth[0], truth[1], 'truth-mark', 8);
    svg.appendChild(mark);
    const name = d.kind === 'contour' ? (d.target === 'saddle' ? '鞍部' : '最高山頂') : d.name;
    record(it, pts === 6, pts, 6, d.q, distText, name);
    feedback(app.querySelector('#fb'), { ok: pts === 6, verdict: `${distText}・得 ${pts} / 6 分`, answer: `${esc(name)}（綠色圓點）`, exp: d.exp });
  };
}
