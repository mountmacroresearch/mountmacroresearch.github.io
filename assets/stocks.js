/* 个股：自底部展开的扇面。每条射线是一个行业里的一家公司，
   自下而上三道弧是覆盖、深入研究、A 级，越往上留下的越少。 */
(function () {
  const { el, sv, fmt, signed, kv, block, add } = Site;
  const D = window.MMR_RADAR;
  Site.nav('stocks.html');

  const field = document.getElementById('field');
  Site.defs(field);

  const GICS = { 'Information Technology': '信息技术', Financials: '金融', 'Health Care': '医疗保健', Energy: '能源', 'Consumer Discretionary': '可选消费', Utilities: '公用事业', Industrials: '工业', 'Communication Services': '通信服务', 'Consumer Staples': '必需消费', Materials: '原材料', 'Real Estate': '房地产' };
  const indCN = n => GICS[n] || n;
  const mktCN = m => (m === 'CN' ? 'A 股' : '美股');
  const GRADE = { A: 'A 级', B: 'B 级，条件观察', C: 'C 级，当前不推荐', Reject: '原假说被否定', 'Data Hold': '证据不足，暂缓', 'Research Pending': '研究未完成' };
  const STAGE = { not_prioritized: '初步评估后未列入优先', nominate: '进入深入研究', tier0_excluded: '初筛排除' };
  const LOGIC = { confirmed: '得到印证', weakened: '被削弱', inconclusive: '尚无定论', refuted: '被否定' };
  const KIND = { research_task: '研究任务', falsifier: '证伪检查', catalyst: '催化观察', evaluation: '复盘评价' };
  const GATE = { data_eligibility: '数据资格', causality: '因果链', exposure_expectations: '业务暴露与预期', valuation_falsification: '估值与证伪' };
  const PASS = { PASS: '通过', FAIL: '未通过', CONDITIONAL: '有条件通过', PENDING: '待定', DEPRIORITIZED: '未列入优先' };
  const BUCKET = { Conditional: '有条件', Avoid: '回避', Attractive: '看好' };
  const PRICED = { fully_priced: '已充分反映', partially_priced: '部分反映', unknown: '无法判断' };
  const VALUE = { acceptable: '在可接受范围内', outside: '不在可接受范围内', unknown: '无法判断' };
  const LEVEL = { high: '高', medium: '中', low: '低' };
  const HORIZON = { '1_to_3_quarters': '1 至 3 个季度', '20_60_trading_days': '20 至 60 个交易日' };
  // 期限多数直接写成文字；写成代号而表里没有的不显示
  const horizonCN = h => HORIZON[h] || (h && !/_/.test(h) ? String(h).replace(/\s*months?$/i, ' 个月') : null);
  const group = (arr, key) => { const m = new Map(); arr.forEach(x => { const k = x[key]; if (!m.has(k)) m.set(k, []); m.get(k).push(x); }); return m; };
  const clipT = (t, n) => (t && t.length > n ? t.slice(0, n - 1) + '…' : t || '');
  // 排定的时间点：北京时间，精确到分钟
  const at = iso => { const s = String(iso || ''); return s.length > 10 ? s.slice(0, 10) + ' ' + s.slice(11, 16) : s || '—'; };

  const companies = D.companies, byId = new Map(companies.map(c => [c.id, c]));
  const cov = D.coverage, covById = new Map(cov.map(c => [c.id, c]));
  const outcomesBy = group(D.outcomes.filter(o => o.scope === 'candidate'), 'sid');
  const schedBy = group(D.schedule, 'sid');
  const As = companies.filter(c => c.bucket === 'A');
  const S = D.summary;
  const scopeOf = m => [...new Set(D.scopes.filter(x => x.market === m).map(x => String(x.universe || '').replace('∪', ' 与 ')))].join('、');
  const scopeText = ['CN', 'US'].filter(scopeOf).map(m => mktCN(m) + '：' + scopeOf(m)).join('　');

  // ── 行业分区：A 股在左，美股在右，各按覆盖数从多到少 ──
  const counts = new Map();
  cov.forEach(c => { const k = c.market + '|' + c.industry; counts.set(k, (counts.get(k) || 0) + 1); });
  const sectors = [];
  ['CN', 'US'].forEach(m => {
    [...counts.entries()].filter(([k]) => k.indexOf(m + '|') === 0).sort((a, b) => b[1] - a[1])
      .forEach(([k, n]) => sectors.push({ key: k, market: m, name: k.split('|')[1], n: n, w: Math.pow(n, 0.7), deep: 0, a: 0 }));
  });
  const SPAN = 116, GAP = 2.6, TH_A = -58, DEG = Math.PI / 180;
  const unit = (SPAN - GAP) / sectors.reduce((t, s) => t + s.w, 0);
  let ang = TH_A;
  sectors.forEach((s, i) => { if (i && sectors[i - 1].market !== s.market) ang += GAP; s.a0 = ang; ang += s.w * unit; s.a1 = ang; });
  const sectorOf = new Map(sectors.map(s => [s.key, s]));
  companies.forEach(c => { const s = sectorOf.get(c.market + '|' + c.industry); if (s) { s.deep++; if (c.bucket === 'A') s.a++; } });

  const F = { x: 800, y: 1020 }, RA = 652, COV = [334, 444], RES = [494, 580];
  const P = (r, deg) => [F.x + r * Math.sin(deg * DEG), F.y - r * Math.cos(deg * DEG)];
  const arcD = (r, a0, a1) => { const p0 = P(r, a0), p1 = P(r, a1); return 'M' + p0[0].toFixed(1) + ' ' + p0[1].toFixed(1) + 'A' + r + ' ' + r + ' 0 0 1 ' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1); };
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

  field.append(Site.dust(170, 37, [0, 0, 1600, 860]), Site.horizon(886));

  // 射线与弧
  const frame = sv('g', { class: 'rise', 'aria-hidden': 'true' });
  const ray = (deg, r0, r1, o) => { const p0 = P(r0, deg), p1 = P(r1, deg); return sv('line', { x1: p0[0], y1: p0[1], x2: p1[0], y2: p1[1], stroke: '#cfb07a', 'stroke-opacity': o }); };
  sectors.forEach((s, i) => {
    frame.append(ray(s.a0, 134 / Math.cos(s.a0 * DEG), RA + 12, .13));
    if (i === sectors.length - 1 || sectors[i + 1].market !== s.market) frame.append(ray(s.a1, 134 / Math.cos(s.a1 * DEG), RA + 12, .13));
  });
  [COV[0], COV[1] + 4, RES[0], RES[1] + 4].forEach(r => frame.append(sv('path', { d: arcD(r, TH_A, TH_A + SPAN), fill: 'none', stroke: '#cfb07a', 'stroke-opacity': .13 })));
  frame.append(sv('path', { d: arcD(RA, TH_A, TH_A + SPAN), fill: 'none', stroke: '#cfb07a', 'stroke-opacity': .4 }));
  field.append(frame);

  // 每家公司在自己行业里取一个固定角度，三道弧上的点落在同一条射线上
  const aSlot = new Map();
  As.forEach(c => { const k = c.market + '|' + c.industry; aSlot.set(k, (aSlot.get(k) || 0) + 1); });
  const aSeen = new Map();
  const pts = [];
  const dots = sv('g', { class: 'rise', 'aria-hidden': 'true' }), links = sv('g', { class: 'rise', 'aria-hidden': 'true' }), deepDots = sv('g', { class: 'rise', 'aria-hidden': 'true' });
  cov.forEach(c => {
    const s = sectorOf.get(c.market + '|' + c.industry), r = Site.rng(hash(c.id));
    const co = byId.get(c.id);
    let deg = s.a0 + (s.a1 - s.a0) * (0.1 + 0.8 * r());
    if (co && co.bucket === 'A') { const k = c.market + '|' + c.industry, i = (aSeen.get(k) || 0) + 1; aSeen.set(k, i); deg = s.a0 + (s.a1 - s.a0) * (i / (aSlot.get(k) + 1)); }
    const rc = COV[0] + (COV[1] - COV[0]) * r(), pc = P(rc, deg);
    dots.append(sv('circle', co
      ? { cx: pc[0].toFixed(1), cy: pc[1].toFixed(1), r: 1.7, fill: '#ecd092', opacity: .9 }
      : { cx: pc[0].toFixed(1), cy: pc[1].toFixed(1), r: 1.35, fill: '#f1eadb', opacity: c.stage === 'tier0_excluded' ? .16 : .34 }));
    pts.push({ x: pc[0], y: pc[1], c: c, co: co, band: 0 });
    if (co) {
      const rr = RES[0] + (RES[1] - RES[0]) * r(), pr = P(rr, deg);
      co.deg = deg;
      links.append(sv('line', { x1: pc[0], y1: pc[1], x2: pr[0], y2: pr[1], stroke: '#cfb07a', 'stroke-opacity': co.bucket === 'A' ? .5 : .16 }));
      if (co.bucket === 'Reject') deepDots.append(sv('path', { d: 'M' + (pr[0] - 3.4) + ' ' + (pr[1] - 3.4) + 'l6.8 6.8m0 -6.8l-6.8 6.8', stroke: '#f1eadb', 'stroke-opacity': .6, 'stroke-width': 1.2 }));
      else deepDots.append(sv('circle', co.bucket === 'A'
        ? { cx: pr[0], cy: pr[1], r: 3.6, fill: '#ecd092' }
        : { cx: pr[0], cy: pr[1], r: 3.1, fill: '#050505', stroke: '#f1eadb', 'stroke-opacity': .7, 'stroke-width': 1.1 }));
      pts.push({ x: pr[0], y: pr[1], c: c, co: co, band: 1 });
      if (co.bucket === 'A') { const pa = P(RA, deg); links.append(sv('line', { x1: pr[0], y1: pr[1], x2: pa[0], y2: pa[1], stroke: '#cfb07a', 'stroke-opacity': .5 })); }
    }
  });
  field.append(dots, links, deepDots);

  // A 级：亮点加名字，沿射线向外放，两侧的字朝外对齐
  const aLayer = sv('g');
  const aNodes = As.map(c => ({ c: c, p: P(RA, c.deg) })).sort((a, b) => a.c.deg - b.c.deg);
  let prevDeg = -1e9, prevFar = false;
  aNodes.forEach(n => {
    const c = n.c, p = n.p, deg = c.deg, label = c.market === 'US' ? c.ticker : c.name;
    const side = deg < -22 ? 'end' : deg > 22 ? 'start' : 'middle';
    const far = side === 'middle' && deg - prevDeg < 7 && !prevFar;
    prevDeg = deg; prevFar = far;
    const q = P(RA + (side === 'middle' ? (far ? 74 : 36) : 22), deg);
    const tx = q[0] + (side === 'end' ? -4 : side === 'start' ? 4 : 0), ty = q[1] + (side === 'middle' ? -10 : 0);
    const g = sv('g', { class: 'hot dim rise', 'data-id': c.id, tabindex: '0', role: 'link', 'aria-label': c.name + '，A 级' });
    if (far) { const l0 = P(RA + 14, deg), l1 = P(RA + 52, deg); g.append(sv('line', { x1: l0[0], y1: l0[1], x2: l1[0], y2: l1[1], stroke: '#cfb07a', 'stroke-opacity': .5 })); }
    g.append(sv('circle', { cx: p[0], cy: p[1], r: 17, fill: 'url(#node)' }), sv('circle', { cx: p[0], cy: p[1], r: 3, fill: '#fff8e6' }),
      sv('text', { class: 't', x: tx, y: ty, 'text-anchor': side }, label),
      sv('text', { class: 't3', x: tx, y: ty + 17, 'text-anchor': side }, indCN(c.industry)));
    g.addEventListener('click', () => openCompany(c.id));
    g.addEventListener('keydown', e => { if (e.key === 'Enter') openCompany(c.id); });
    pts.push({ x: p[0], y: p[1], c: covById.get(c.id), co: c, band: 2 });
    aLayer.append(g);
  });
  field.append(aLayer);

  // 三道弧左端的名字、两侧的市场
  const bandLabel = (r, name, sub) => { const p = P(r, TH_A); return [sv('text', { class: 't', x: p[0] - 16, y: p[1] - 2, 'text-anchor': 'end' }, name), sv('text', { class: 't3', x: p[0] - 16, y: p[1] + 17, 'text-anchor': 'end' }, sub)]; };
  const labels = sv('g', { class: 'rise', 'aria-hidden': 'true' });
  labels.append(...bandLabel(RA, 'A 级', (S.grades.A || 0) + ' 家'), ...bandLabel((RES[0] + RES[1]) / 2, '深入研究', S.companies + ' 家'), ...bandLabel((COV[0] + COV[1]) / 2, '覆盖', fmt.num(S.universe) + ' 只'));
  const cnN = cov.filter(c => c.market === 'CN').length, usN = cov.length - cnN;
  const mid = m => { const list = sectors.filter(s => s.market === m); return (list[0].a0 + list[list.length - 1].a1) / 2; };
  [[mid('CN'), 'A 股', cnN + ' 只'], [mid('US'), '美股', usN + ' 只']].forEach(([deg, name, sub]) => {
    const p = P(276, deg);
    labels.append(sv('text', { class: 't', x: p[0], y: p[1], 'text-anchor': 'middle' }, name, sv('tspan', { class: 'tn', dx: 10 }, sub)));
  });
  field.append(labels);

  // 指针扫过时读出行业、点亮最近的一个点；触屏上点一下也按同样的办法找最近的点
  const wedge = sv('path', { fill: '#cfb07a', 'fill-opacity': .07, style: 'pointer-events:none' });
  const ring = sv('circle', { r: 7, fill: 'none', stroke: '#fff8e6', 'stroke-width': 1.2, style: 'pointer-events:none', visibility: 'hidden' });
  const read1 = sv('text', { class: 't', x: 800, y: 232, 'text-anchor': 'middle' }), read2 = sv('text', { class: 't3', x: 800, y: 252, 'text-anchor': 'middle' });
  field.append(wedge, ring, read1, read2);
  field.append(sv('g', { class: 'sweep', 'aria-hidden': 'true' },
    sv('line', { x1: 800, y1: F.y - 330, x2: 800, y2: F.y - RA - 14, stroke: '#fff3d0', 'stroke-width': 5, opacity: .35, filter: 'url(#glow)' }),
    sv('line', { x1: 800, y1: F.y - 330, x2: 800, y2: F.y - RA - 14, stroke: '#fff8e6', 'stroke-width': 1 })));
  let near = null;
  function scan(e, quiet) {
    const q = field.createSVGPoint(); q.x = e.clientX; q.y = e.clientY;
    const m = q.matrixTransform(field.getScreenCTM().inverse());
    const dx = m.x - F.x, dy = F.y - m.y, r = Math.hypot(dx, dy), deg = Math.atan2(dx, dy) / DEG;
    const s = r > 300 && r < 700 ? sectors.find(x => deg >= x.a0 && deg <= x.a1) : null;
    if (!s) { clearScan(); return; }
    const o0 = P(COV[0] - 6, s.a0), o1 = P(RA + 12, s.a0), o2 = P(RA + 12, s.a1), o3 = P(COV[0] - 6, s.a1);
    wedge.setAttribute('d', 'M' + o0 + 'L' + o1 + 'A' + (RA + 12) + ' ' + (RA + 12) + ' 0 0 1 ' + o2 + 'L' + o3 + 'A' + (COV[0] - 6) + ' ' + (COV[0] - 6) + ' 0 0 0 ' + o0 + 'Z');
    read1.textContent = mktCN(s.market) + '　' + indCN(s.name);
    read2.textContent = '覆盖 ' + s.n + ' 只，深入研究 ' + s.deep + ' 家，A 级 ' + s.a + ' 家';
    let best = null, bd = 144;
    pts.forEach(p => { const d = (p.x - m.x) * (p.x - m.x) + (p.y - m.y) * (p.y - m.y) - p.band * 18; if (d < bd) { bd = d; best = p; } });
    near = best;
    if (best) {
      ring.setAttribute('cx', best.x); ring.setAttribute('cy', best.y); ring.setAttribute('visibility', 'visible');
      const c = best.c, co = best.co;
      if (!quiet) Site.tip(e, [el('b', { text: c.name + '　' + c.ticker }), kv('行业', mktCN(c.market) + '　' + indCN(c.industry)),
        kv(co ? '结论' : '停在', co ? GRADE[co.bucket] || co.bucket : STAGE[c.stage] || c.stage),
        (co ? co.whyNow : c.reason) ? el('div', { text: clipT(co ? co.whyNow : c.reason, 96) }) : null].filter(Boolean));
      field.style.cursor = 'pointer';
    } else { ring.setAttribute('visibility', 'hidden'); Site.untip(); field.style.cursor = ''; }
  }
  function clearScan() { wedge.setAttribute('d', ''); ring.setAttribute('visibility', 'hidden'); read1.textContent = ''; read2.textContent = ''; near = null; Site.untip(); field.style.cursor = ''; }
  field.addEventListener('pointermove', e => scan(e));
  field.addEventListener('pointerleave', clearScan);
  field.addEventListener('click', e => { if (e.target.closest('[data-id]')) return; scan(e, true); if (near) (near.co ? openCompany(near.co.id) : openCoverage(near.c)); });

  // ── 封面、名单、图例 ──
  const stageEl = document.getElementById('stage');
  const G = { A: S.grades.A || 0, C: S.grades.C || 0, Reject: S.grades.Reject || 0 };
  document.getElementById('line').textContent = fmt.num(S.universe) + ' 只股票中 ' + S.companies + ' 家进入深入研究，' + G.A + ' 家评为 A 级：A 股 ' + As.filter(c => c.market === 'CN').length + ' 家，美股 ' + As.filter(c => c.market === 'US').length + ' 家。' +
    (G.C ? '其余 ' + G.C + ' 家当前不推荐' + (G.Reject ? '，' + G.Reject + ' 家原假说被否定' : '') + '。' : '');
  add(document.getElementById('meta'), el('span', null, '研究截止 ', el('b', { text: D.displayTime })), el('a', { class: 'link', href: '#grade-a', text: 'A 级名单' }), el('span', { text: scopeText }));
  const idx = document.getElementById('index');
  idx.append(el('h2', { text: 'A 级 ' + As.length + ' 家　下次复核' }));
  As.slice().sort((a, b) => String(a.nextCheck).localeCompare(String(b.nextCheck))).forEach(c => {
    const row = el('button', { class: 'row', type: 'button', on: { click: () => openCompany(c.id) } }, el('span', { text: fmt.md(c.nextCheck) }), c.market === 'US' ? c.ticker + '　' + c.name.replace(/,? Inc\.?$/, '') : c.name);
    const focus = on => { stageEl.classList.toggle('focus', on); row.classList.toggle('on', on); const g = aLayer.querySelector('[data-id="' + c.id + '"]'); if (g) g.classList.toggle('on', on); };
    row.addEventListener('pointerenter', () => focus(true)); row.addEventListener('pointerleave', () => focus(false));
    row.addEventListener('focus', () => focus(true)); row.addEventListener('blur', () => focus(false));
    idx.append(row);
  });
  const mini = (...kids) => sv('svg', { viewBox: '0 0 26 12', 'aria-hidden': 'true' }, ...kids);
  add(document.getElementById('legend'),
    el('span', null, mini(sv('circle', { cx: 13, cy: 6, r: 1.6, fill: '#f1eadb', opacity: .5 })), '覆盖'),
    el('span', null, mini(sv('circle', { cx: 13, cy: 6, r: 1.9, fill: '#ecd092' })), '深入研究'),
    el('span', null, mini(sv('circle', { cx: 13, cy: 6, r: 6, fill: 'url(#node)' }), sv('circle', { cx: 13, cy: 6, r: 2, fill: '#fff8e6' })), 'A 级'),
    el('span', null, mini(sv('circle', { cx: 13, cy: 6, r: 3.1, fill: 'none', stroke: '#f1eadb', 'stroke-opacity': .7, 'stroke-width': 1.1 })), '不推荐'),
    el('span', null, mini(sv('path', { d: 'M9.6 2.6l6.8 6.8m0 -6.8l-6.8 6.8', stroke: '#f1eadb', 'stroke-opacity': .6, 'stroke-width': 1.2 })), '假说被否定'));

  // ── 纸面 ──
  const state = { market: 'all', q: '', grade: 'all' };
  const okMarket = x => state.market === 'all' || x.market === state.market;
  const okQ = (x, extra) => { const q = state.q.trim().toLowerCase(); return !q || [x.name, x.ticker, x.industry, indCN(x.industry || ''), extra].filter(Boolean).join(' ').toLowerCase().indexOf(q) >= 0; };
  const rowOpen = fn => ({ class: 'open', tabindex: '0', on: { click: fn, keydown: e => { if (e.key === 'Enter') fn(); } } });
  const price = c => (c.price && c.price.value != null ? (c.price.currency === 'USD' ? '$' : '¥') + fmt.num(c.price.value, 2) : '—');
  // 核心假设：因果链的起点；后面的环节在详情里逐级列出
  const thesis = c => (c.chain && c.chain.length ? c.chain[0].label : c.core) || '—';

  function drawA() {
    const list = As.filter(c => okMarket(c) && okQ(c));
    document.getElementById('a-list').replaceChildren(...(list.length ? list.map(c => el('article', Object.assign(rowOpen(() => openCompany(c.id)), { class: 'a-row' }),
      el('h3', null, c.name, el('small', { text: c.ticker + '　' + mktCN(c.market) + '　' + indCN(c.industry) })),
      el('p', null, el('span', { class: 'k', text: '核心假设' }), el('span', { class: 'clip3', text: thesis(c) })),
      el('p', null, el('span', { class: 'k', text: '为什么是现在' }), el('span', { class: 'clip3', text: c.whyNow })),
      el('div', { class: 'when' }, el('b', { text: fmt.md(c.nextCheck) }), '下次复核', el('b', { style: 'margin-top:10px', text: price(c) }), '研究时价格，' + fmt.md(c.price.at))))
      : [el('p', { class: 'fine', style: 'padding:18px 0', text: '没有符合条件的公司。' })]));
  }
  const cTable = Site.pager(document.getElementById('c-table'), {
    size: 15, head: [['公司'], ['行业'], ['结论'], ['为什么不是现在'], ['下次复核', 'n']],
    row: c => el('tr', rowOpen(() => openCompany(c.id)),
      el('td', { style: 'white-space:nowrap' }, c.name, el('small', { text: c.ticker })),
      el('td', { style: 'white-space:nowrap' }, indCN(c.industry), el('small', { text: mktCN(c.market) })),
      el('td', { style: 'white-space:nowrap' }, c.bucket === 'Reject' ? '原假说被否定' : 'C 级'),
      el('td', null, el('span', { class: 'clip', text: c.whyNow || c.firstRejection || '—' })),
      el('td', { class: 'n', text: fmt.md(c.nextCheck) })),
  });
  const drawC = () => cTable.set(companies.filter(c => c.bucket !== 'A' && okMarket(c) && okQ(c) && (state.grade === 'all' || c.bucket === state.grade)));
  const indTable = Site.pager(document.getElementById('ind-table'), {
    size: 12, head: [['行业'], ['判断'], ['把握', 'n'], ['深入研究', 'n'], ['现在的看法'], ['下次复核', 'n']],
    row: i => el('tr', rowOpen(() => openIndustry(i)),
      el('td', { style: 'white-space:nowrap' }, indCN(i.name), el('small', { text: mktCN(i.market) })),
      el('td', { style: 'white-space:nowrap', text: BUCKET[i.bucket] || i.bucket }),
      el('td', { class: 'n', text: i.confidence != null ? i.confidence.toFixed(1) : '—' }), el('td', { class: 'n', text: i.companies != null ? i.companies + ' 家' : '—' }),
      el('td', null, el('span', { class: 'clip', text: i.whyNow || '—' })), el('td', { class: 'n', text: fmt.md(i.nextReview) })),
  });
  const drawInd = () => indTable.set(D.industries.filter(i => okMarket(i) && okQ({ name: indCN(i.name), industry: i.name })).sort((a, b) => (b.companies || 0) - (a.companies || 0)));

  function drawAll() { drawA(); drawC(); drawInd(); }
  Site.seg(document.getElementById('f-market'), [['all', '全部'], ['CN', 'A 股'], ['US', '美股']], 'all', v => { state.market = v; drawAll(); });
  Site.seg(document.getElementById('f-grade'), [['all', '全部 ' + (G.C + G.Reject)], ['C', 'C 级 ' + G.C], ['Reject', '被否定 ' + G.Reject]], 'all', v => { state.grade = v; drawC(); });
  document.getElementById('f-q').addEventListener('input', e => { state.q = e.target.value; drawAll(); });

  // 已排定的验证，按时间点汇总
  (function () {
    const byTime = new Map();
    D.schedule.forEach(s => { const k = at(s.due), o = byTime.get(k) || { n: 0, kinds: {}, blocked: 0, a: new Set() }; o.n++; o.kinds[s.kind] = (o.kinds[s.kind] || 0) + 1; if (s.state === 'blocked') o.blocked++; const co = byId.get(s.sid); if (co && co.bucket === 'A') o.a.add(co.name); byTime.set(k, o); });
    As.forEach(c => { const o = byTime.get(at(c.nextCheck)); if (o) o.a.add(c.name); });
    add(document.getElementById('sch-table'),
      el('thead', null, el('tr', null, [['复核时间（北京时间）'], ['事项', 'n'], ['研究任务', 'n'], ['证伪检查', 'n'], ['催化观察', 'n'], ['其中等待证据', 'n'], ['涉及的 A 级公司']].map(h => el('th', { class: h[1] || null, text: h[0] })))),
      el('tbody', null, [...byTime.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([k, o]) => el('tr', null,
        el('td', { style: 'font-family:var(--num);white-space:nowrap', text: k }), el('td', { class: 'n', text: o.n }),
        el('td', { class: 'n', text: o.kinds.research_task || '—' }), el('td', { class: 'n', text: o.kinds.falsifier || '—' }), el('td', { class: 'n', text: o.kinds.catalyst || '—' }),
        el('td', { class: 'n', text: o.blocked || '—' }), el('td', { text: [...o.a].join('、') || '—' })))));
  })();

  // ── 详情 ──
  const when = iso => (iso ? fmt.ymd(iso) : '—');
  const byEnd = (a, b) => String(a.end).localeCompare(String(b.end));
  function outcomeTable(list) {
    if (!list || !list.length) return null;
    return el('div', { class: 'tbl-wrap' }, el('table', { class: 'tbl' },
      el('thead', null, el('tr', null, [['窗口'], ['区间'], ['股价', 'n'], ['基准', 'n'], ['相对', 'n'], ['逻辑']].map(h => el('th', { class: h[1] || null, text: h[0] })))),
      el('tbody', null, list.slice().sort(byEnd).map(o => el('tr', null,
        el('td', { style: 'white-space:nowrap', text: o.window + ' 日' }), el('td', { style: 'font-family:var(--num);white-space:nowrap', text: fmt.md(o.start) + ' 至 ' + fmt.md(o.end) }),
        el('td', { class: 'n' }, signed(o.abs, fmt.pct(o.abs * 100))), el('td', { class: 'n', text: fmt.pct(o.bench * 100) + ' ' + String(o.benchmark || '').replace(/^[A-Z]{2}:/, '') }), el('td', { class: 'n' }, signed(o.rel, fmt.pct(o.rel * 100))),
        el('td', { style: 'white-space:nowrap', text: LOGIC[o.logic] || o.logic }))))));
  }
  function schedList(sid) {
    const list = (schedBy.get(sid) || []).slice().sort((a, b) => String(a.due).localeCompare(String(b.due)));
    return block.sect('复核日程（北京时间）', list.length ? el('ul', null, list.map(s => el('li', { text: at(s.due) + '　' + (KIND[s.kind] || '复核') + (s.state === 'blocked' ? '，等待证据' : '') + (s.question ? '：' + s.question.replace(/。$/, '') : '') }))) : null);
  }
  function openCompany(id) {
    const c = byId.get(id); if (!c) return;
    const oc = (outcomesBy.get(id) || []).slice().sort(byEnd);
    Site.untip();
    Site.dossier({
      hash: id, kicker: '个股机会', title: c.name + '　' + c.ticker,
      line: GRADE[c.bucket] || c.bucket,
      facts: [['市场与行业', mktCN(c.market) + '　' + indCN(c.industry)], ['研究时价格，' + fmt.md(c.price.at), price(c)], horizonCN(c.horizon) ? ['预期期限', horizonCN(c.horizon)] : null,
        ['下次复核', when(c.nextCheck)], c.expires ? ['假设到期', when(c.expires)] : null],
      tabs: [
        { label: '判断', build: () => [block.sect('核心假设', block.p(thesis(c))),
          block.sect('传导', c.chain && c.chain.length > 1 ? el('ol', { class: 'chain' }, c.chain.slice(1).map(x => el('li', null, x.label, x.why ? el('div', { class: 'quiet', text: x.why }) : null))) : null),
          block.sect('为什么是现在', block.p(c.whyNow)),
          block.sect('与市场看法的差别', block.p(c.expect.wedge)), block.sect('重新考虑的条件', block.p(c.investableIf))].flat() },
        { label: '依据', build: () => [
          block.sect('业务暴露', block.p(c.exposure.summary), block.defs([['财务科目', c.exposure.line], ['重要性', LEVEL[c.exposure.materiality]]])),
          block.sect('估值', block.p(c.valuation.threshold), block.defs([['方法', c.valuation.method], ['当前估值', VALUE[c.valuation.status]]])),
          block.sect('市场预期', block.defs([['价格已反映的程度', PRICED[c.expect.pricedIn]], ['一致预期', c.expect.consensus]])),
          block.sect('催化', c.catalysts.length ? el('ul', null, c.catalysts.map(t => el('li', null, t.text, t.check ? el('div', { class: 'quiet', text: '下次检查 ' + when(t.check) + (t.condition ? '：' + t.condition : '') }) : null))) : null)].flat() },
        { label: '口径', build: () => [
          block.sect('评级门槛', c.gates.length ? el('dl', { class: 'defs' }, c.gates.map(g => [el('dt', { text: GATE[g.gate] || g.gate }), el('dd', { text: PASS[g.status] || g.status })])) : null),
          block.sect('价格', block.defs([['研究时价格', c.price.value != null ? price(c) + '，' + when(c.price.at) : null]]))].flat() },
        { label: '验证', count: c.falsifiers.length + oc.length, build: () => [
          block.sect('证伪条件', c.falsifiers.length ? el('ul', null, c.falsifiers.map(f => el('li', null, f.text, f.check ? el('div', { class: 'quiet', text: '检查时间 ' + when(f.check) }) : null))) : block.p(c.firstRejection)),
          block.sect('反方观点', block.p(c.counter)), block.sect('风险', block.list(c.risks)),
          schedList(id), block.sect('复盘', outcomeTable(oc))].flat() },
      ],
    });
  }
  function openCoverage(c) {
    const tabs = [];
    if (c.reason) tabs.push({ label: '判断', build: () => block.sect('未进入深入研究的原因', block.p(c.reason)) });
    if (c.basis) tabs.push({ label: '口径', build: () => block.sect('初筛口径', block.p(c.basis)) });
    tabs.push({ label: '验证', build: () => [block.sect('下次复核', block.p(c.revisit ? '随所在行业在 ' + when(c.revisit) + ' 复核。' : '暂未排定。')), schedList(c.id)].flat() });
    Site.untip();
    Site.dossier({
      hash: c.id, kicker: '个股机会', title: c.name + '　' + c.ticker, line: STAGE[c.stage] || c.stage,
      facts: [['市场与行业', mktCN(c.market) + '　' + indCN(c.industry)], c.revisit ? ['下次复核', when(c.revisit)] : null], tabs: tabs,
    });
  }
  function openIndustry(i) {
    const mine = companies.filter(c => c.market === i.market && c.industry === i.name);
    const tabs = [{ label: '判断', build: () => [block.sect('现在的看法', block.p(i.whyNow)), block.sect('驱动因素', block.list(i.drivers)),
      block.sect('深入研究过的公司', mine.length ? el('ul', null, mine.map(c => el('li', null, el('button', { class: 'plain', type: 'button', text: c.name, on: { click: () => openCompany(c.id) } }), '　' + (GRADE[c.bucket] || c.bucket)))) : null)].flat() }];
    if ((i.reasons || []).length || (i.kpis || []).length) tabs.push({ label: '依据', build: () => [block.sect('判断理由', block.list(i.reasons)), block.sect('跟踪指标', block.list(i.kpis))].flat() });
    if (i.firstRejection || i.minority || i.nextKpi) tabs.push({ label: '验证', build: () => [block.sect('证伪条件', block.p(i.firstRejection)), block.sect('不同的看法', block.p(i.minority)), block.sect('下一个确认指标', block.p(i.nextKpi))].flat() });
    Site.dossier({
      kicker: '个股机会　行业', title: indCN(i.name) + '　' + mktCN(i.market), line: i.whyNow,
      facts: [['判断', BUCKET[i.bucket] || i.bucket], ['把握', i.confidence != null ? i.confidence.toFixed(1) : '—'], ['深入研究', (i.companies || 0) + ' 家'], ['下次复核', when(i.nextReview)]], tabs: tabs,
    });
  }

  drawAll();
  document.getElementById('foot').append(Site.pagefoot());
  Site.stage(stageEl);
  // 地址里带公司代码时直接打开它的详情
  const fromHash = () => { const h = decodeURIComponent(location.hash.slice(1)); if (h && byId.has(h)) openCompany(h); else if (h && covById.has(h)) openCoverage(covById.get(h)); };
  fromHash();
  window.addEventListener('hashchange', fromHash);
})();
