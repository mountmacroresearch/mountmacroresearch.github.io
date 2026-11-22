/* 总览：四层研究画在同一条时间轴上。
   最下面是经济，往上三道弧依次是专题、指数、个股；同一条射线上的东西发生在同一天。 */
(function () {
  const { el, sv, fmt, signed, hover, kv } = Site;
  const H = window.MMR_HUB;
  Site.nav('index.html');

  const field = document.getElementById('field');
  const defs = Site.defs(field);

  // ── 几何 ──
  const C = { x: 800, y: 3028 };
  const R = { sun: 2308, topic: 2438, index: 2573, stock: 2708 };
  const DEG = Math.PI / 180, TH0 = -13.6 * DEG, TH1 = 14.6 * DEG;
  const day = iso => Date.parse(String(iso).slice(0, 10) + 'T00:00:00Z');
  const today = Site.today();
  // 滚动窗口：过去四个月到未来一个月，每天占的宽度固定，更早的内容在各栏目页里
  const now = new Date(day(today));
  const T0 = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 4, now.getUTCDate());
  const T1 = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate());
  const thMs = ms => TH0 + (TH1 - TH0) * (ms - T0) / (T1 - T0);
  const th = iso => thMs(day(iso));
  const pt = (r, a) => [C.x + r * Math.sin(a), C.y - r * Math.cos(a)];
  const arc = (r, a0, a1) => { const p0 = pt(r, a0), p1 = pt(r, a1); return 'M' + p0[0].toFixed(1) + ' ' + p0[1].toFixed(1) + 'A' + r + ' ' + r + ' 0 0 1 ' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1); };
  const inWin = iso => day(iso) >= T0 && day(iso) <= T1;
  const aT = th(today);
  const go = href => () => { location.href = href; };
  const link = (node, href, label) => { node.setAttribute('tabindex', '0'); node.setAttribute('role', 'link'); node.setAttribute('aria-label', label); node.addEventListener('click', go(href)); node.addEventListener('keydown', e => { if (e.key === 'Enter') location.href = href; }); return node; };

  // ── 夜空与日面 ──
  field.append(Site.dust(230, 11, [0, 0, 1600, 770]));
  const sunA = Math.asin(860 / R.sun);
  defs.append(
    sv('radialGradient', { id: 'sun-body', gradientUnits: 'userSpaceOnUse', cx: C.x, cy: C.y, r: R.sun },
      sv('stop', { offset: '.93', 'stop-color': '#070502' }), sv('stop', { offset: '.968', 'stop-color': '#1c1206' }),
      sv('stop', { offset: '.99', 'stop-color': '#553b14' }), sv('stop', { offset: '1', 'stop-color': '#c9a55c' })),
    sv('filter', { id: 'gran', x: '0', y: '0', width: '100%', height: '100%' },
      sv('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.012 0.034', numOctaves: '3', seed: '8' }),
      sv('feColorMatrix', { values: '0 0 0 0 .92  0 0 0 0 .68  0 0 0 0 .3  0 0 0 2.6 -1.3' })),
    sv('clipPath', { id: 'sun-clip' }, sv('circle', { cx: C.x, cy: C.y, r: R.sun })),
    sv('radialGradient', { id: 'shade' }, sv('stop', { offset: '0', 'stop-color': '#050505', 'stop-opacity': '.86' }), sv('stop', { offset: '.6', 'stop-color': '#050505', 'stop-opacity': '.6' }), sv('stop', { offset: '1', 'stop-color': '#050505', 'stop-opacity': '0' })),
    sv('radialGradient', { id: 'dawn' }, sv('stop', { offset: '0', 'stop-color': '#d9b56c', 'stop-opacity': '.16' }), sv('stop', { offset: '1', 'stop-color': '#d9b56c', 'stop-opacity': '0' })));
  const sun = sv('g', { 'aria-hidden': 'true' });
  sun.append(
    sv('ellipse', { cx: 800, cy: 760, rx: 1050, ry: 250, fill: 'url(#dawn)' }),
    sv('path', { d: arc(R.sun + 6, -sunA, sunA), fill: 'none', stroke: '#e9c57c', 'stroke-width': 46, opacity: .2, filter: 'url(#glow-l)' }),
    sv('circle', { cx: C.x, cy: C.y, r: R.sun, fill: 'url(#sun-body)' }),
    sv('rect', { x: 0, y: 715, width: 1600, height: 185, filter: 'url(#gran)', 'clip-path': 'url(#sun-clip)', opacity: .42 }),
    sv('path', { d: arc(R.sun, -sunA, sunA), fill: 'none', stroke: '#f6dfa6', 'stroke-width': 5, opacity: .55, filter: 'url(#glow)' }),
    sv('path', { d: arc(R.sun, -sunA, sunA), fill: 'none', stroke: '#fbeecb', 'stroke-width': 1.1, opacity: .9 }));
  field.append(sun);

  // 一个地区：一处亮斑，从它升起一束束细光，每个研究主题一束，越往上越淡。
  function region(m, x) {
    const a = Math.asin((x - C.x) / R.sun), p = pt(R.sun, a);
    const g = sv('g', { class: 'hot dim rise' });
    const n = m.themes.length, REACH = 140;
    defs.append(
      sv('radialGradient', { id: 'fade-' + m.key, gradientUnits: 'userSpaceOnUse', cx: p[0], cy: p[1], r: REACH },
        sv('stop', { offset: '0', 'stop-color': '#fff', 'stop-opacity': '1' }), sv('stop', { offset: '.16', 'stop-color': '#fff', 'stop-opacity': '.72' }),
        sv('stop', { offset: '.45', 'stop-color': '#fff', 'stop-opacity': '.3' }), sv('stop', { offset: '.8', 'stop-color': '#fff', 'stop-opacity': '.07' }),
        sv('stop', { offset: '1', 'stop-color': '#fff', 'stop-opacity': '0' })),
      sv('mask', { id: 'mask-' + m.key, maskUnits: 'userSpaceOnUse', x: p[0] - REACH, y: p[1] - REACH, width: REACH * 2, height: REACH * 2 },
        sv('circle', { cx: p[0], cy: p[1], r: REACH, fill: 'url(#fade-' + m.key + ')' })),
      sv('filter', { id: 'soft-' + m.key, x: '-20%', y: '-20%', width: '140%', height: '140%' }, sv('feGaussianBlur', { stdDeviation: '1.1' })));
    const rnd = Site.rng(n * 97 + Math.round(x));
    const beams = [], cores = [];
    for (let k = 0; k < n; k++) {
      const t = n === 1 ? 0 : k / (n - 1) - 0.5;               // −0.5 … 0.5
      const base = pt(R.sun, a + (t * 34) / R.sun);             // 光束的根沿日面排开
      const dir = a + t * 44 * DEG + (rnd() - 0.5) * 2.4 * DEG; // 向外略微张开
      const len = REACH * (0.8 + 0.2 * rnd()) * (1 - 0.42 * Math.abs(t) * 2);
      const ux = Math.sin(dir), uy = -Math.cos(dir), nx = -uy, ny = ux, w = 3.4 + 2.2 * rnd();
      const tip = [base[0] + len * ux, base[1] + len * uy];
      beams.push('M' + (base[0] - nx * 0.6).toFixed(1) + ' ' + (base[1] - ny * 0.6).toFixed(1) + 'L' + (tip[0] - nx * w).toFixed(1) + ' ' + (tip[1] - ny * w).toFixed(1) +
        'L' + (tip[0] + nx * w).toFixed(1) + ' ' + (tip[1] + ny * w).toFixed(1) + 'L' + (base[0] + nx * 0.6).toFixed(1) + ' ' + (base[1] + ny * 0.6).toFixed(1) + 'Z');
      cores.push('M' + base[0].toFixed(1) + ' ' + base[1].toFixed(1) + 'L' + tip[0].toFixed(1) + ' ' + tip[1].toFixed(1));
    }
    g.append(
      sv('ellipse', { cx: p[0], cy: p[1] + 4, rx: 96, ry: 24, fill: '#f2d38e', opacity: .38, filter: 'url(#glow-l)' }),
      sv('ellipse', { cx: p[0] + 52 * Math.sin(a), cy: p[1] - 52, rx: 46, ry: 82, fill: '#e9c57c', opacity: .2, filter: 'url(#glow-l)' }),
      sv('g', { mask: 'url(#mask-' + m.key + ')' },
        sv('g', { filter: 'url(#soft-' + m.key + ')' }, beams.map(d => sv('path', { d: d, fill: '#f7e1ad', opacity: .3 }))),
        cores.map(d => sv('path', { d: d, stroke: '#fff6dc', 'stroke-width': .7, 'stroke-linecap': 'round', opacity: .6 }))),
      sv('ellipse', { cx: p[0], cy: p[1] + 1, rx: 30, ry: 4.5, fill: '#fff6dc', filter: 'url(#glow-s)' }));
    g.append(
      sv('ellipse', { cx: p[0], cy: p[1] + 58, rx: Math.max(190, m.line.length * 7.6), ry: 40, fill: 'url(#shade)' }),
      sv('text', { class: 't', x: p[0], y: p[1] + 48, 'text-anchor': 'middle' }, m.name, sv('tspan', { class: 'tn', dx: 12 }, '更新于 ' + fmt.md(m.date) + '　' + m.counts.themes + ' 个主题　' + m.counts.cross + ' 项跨主题研究')),
      sv('text', { class: 't2', x: p[0], y: p[1] + 72, 'text-anchor': 'middle' }, m.line),
      sv('rect', { x: p[0] - 240, y: p[1] - 60, width: 480, height: 150, fill: 'transparent' }));
    link(g, 'view.html?region=' + m.key, m.title + '：' + m.line);
    hover(g, () => [el('b', { text: m.title }), el('div', { text: m.lead })]);
    return g;
  }

  // ── 三道弧、月份刻度、今天 ──
  const frame = sv('g', { class: 'rise', 'aria-hidden': 'true' });
  ['topic', 'index', 'stock'].forEach(k => {
    frame.append(
      sv('path', { d: arc(R[k], TH0, aT), fill: 'none', stroke: '#cfb07a', 'stroke-opacity': .36, 'stroke-width': 1 }),
      sv('path', { d: arc(R[k], aT, TH1), fill: 'none', stroke: '#cfb07a', 'stroke-opacity': .42, 'stroke-width': 1, 'stroke-dasharray': '1 7', 'stroke-linecap': 'round' }));
  });
  Site.months(T0, T1, (R.stock + 102) * (TH1 - TH0)).forEach(([t, label]) => {
    const a = thMs(t), p0 = pt(R.stock + 78, a), p1 = pt(R.stock + 86, a), pl = pt(R.stock + 102, a);
    frame.append(
      sv('line', { x1: p0[0], y1: p0[1], x2: p1[0], y2: p1[1], stroke: '#cfb07a', 'stroke-opacity': .5 }),
      sv('text', { class: 't3', x: pl[0], y: pl[1], 'text-anchor': 'middle' }, label));
  });
  const r0 = pt(R.sun + 5, aT), r1 = pt(R.stock + 86, aT), rl = pt(R.stock + 102, aT);
  frame.append(
    sv('line', { x1: r0[0], y1: r0[1], x2: r1[0], y2: r1[1], stroke: '#f1eadb', 'stroke-opacity': .5, 'stroke-width': 1 }),
    sv('text', { class: 't2', x: rl[0] + 8, y: rl[1] }, '今天 ', sv('tspan', { class: 'tn' }, fmt.md(today))));
  field.append(frame);

  // 每道弧左端的层名
  function layerLabel(r, name, sub, href) {
    const p = pt(r, TH0);
    const g = sv('g', { class: 'hot rise' });
    g.append(sv('text', { class: 't', x: p[0] - 18, y: p[1] - 2, 'text-anchor': 'end' }, name),
      sv('text', { class: 't3', x: p[0] - 18, y: p[1] + 17, 'text-anchor': 'end' }, sub));
    link(g, href, name);
    return g;
  }
  const S = H.spx, RD = H.radar;
  field.append(
    layerLabel(R.stock, '个股机会', 'A 股与美股', 'stocks.html'),
    layerLabel(R.index, '指数预测', '标普500', 'forecast.html'),
    layerLabel(R.topic, '专题研究', H.reports.length + ' 篇研报', 'research.html'));
  (function () {
    const g = sv('g', { class: 'hot rise' });
    g.append(sv('text', { class: 't', x: 213, y: 776, 'text-anchor': 'end' }, '基础经济研究'), sv('text', { class: 't3', x: 213, y: 795, 'text-anchor': 'end' }, H.macro.map(m => m.name).join('与')));
    field.append(link(g, 'macro.html', '基础经济研究'));
  })();
  field.append(region(H.macro[0], 470), region(H.macro[1], 990));

  // 按视觉宽度截断：汉字算 1，拉丁字母与数字算 0.55
  function clipW(t, max) { let w = 0, out = ''; for (const ch of t) { w += ch.charCodeAt(0) > 0x2e80 ? 1 : 0.55; if (w > max) return out + '…'; out += ch; } return out; }

  // ── 专题：每篇研报一颗星 ──
  const topics = sv('g');
  let lastX = -1e9;
  const latestReport = H.reports[H.reports.length - 1];
  H.reports.forEach(r => {
    if (!inWin(r.date)) return;
    let a = th(r.date), p = pt(R.topic, a);
    if (p[0] - lastX < 13) { a += (13 - (p[0] - lastX)) / R.topic; p = pt(R.topic, a); }
    lastX = p[0];
    const newest = r === latestReport;
    const g = sv('g', { class: 'hot dim rise' });
    g.append(sv('circle', { cx: p[0], cy: p[1], r: newest ? 15 : 10, fill: 'url(#node)' }), sv('circle', { cx: p[0], cy: p[1], r: newest ? 2.8 : 2, fill: '#fff8e6' }),
      sv('circle', { cx: p[0], cy: p[1], r: 12, fill: 'transparent' }));
    if (newest) {
      const q = pt(R.topic, aT + 0.9 * DEG);
      g.append(sv('path', { d: 'M' + p[0] + ' ' + (p[1] - 8) + 'V' + (q[1] - 30) + 'H' + (q[0] - 8), fill: 'none', stroke: '#cfb07a', 'stroke-opacity': .6 }),
        sv('text', { class: 't2', x: q[0], y: q[1] - 35 }, sv('tspan', { class: 'tn' }, fmt.md(r.date) + ' '), '最新专题'),
        sv('text', { class: 't', x: q[0], y: q[1] - 14 }, clipW(r.title.split('：')[0], 17)));
    }
    link(g, 'report.html?id=' + encodeURIComponent(r.id), r.title);
    hover(g, () => [el('b', { text: r.title }), r.subtitle ? el('div', { text: r.subtitle }) : null,
      kv('日期', r.date), kv('地区', r.lane), r.assetKeys.length ? kv('资产', r.assetKeys.join('、')) : null].filter(Boolean));
    topics.append(g);
  });
  field.append(topics);

  // ── 指数：每个交易日一根柱 ──
  const SC = 24, CAP = 2.5;
  const bars = sv('g');
  S.lite.forEach(r => {
    if (!inWin(r.d)) return;
    const a = th(r.d), p0 = pt(R.index, a);
    const g = sv('g', { class: 'hot dim rise' });
    if (r.ret == null || r.hit == null || !r.official) {
      g.append(sv('circle', { cx: p0[0], cy: p0[1], r: 1.6, fill: '#cfb07a', opacity: .6 }));
    } else {
      const len = Math.min(Math.abs(r.ret), CAP) * SC * Math.sign(r.ret) || 0.01;
      const p1 = pt(R.index + len, a);
      g.append(sv('line', r.hit
        ? { x1: p0[0], y1: p0[1], x2: p1[0], y2: p1[1], stroke: '#ecd092', 'stroke-width': 2.4, 'stroke-linecap': 'round' }
        : { x1: p0[0], y1: p0[1], x2: p1[0], y2: p1[1], stroke: '#f1eadb', 'stroke-opacity': .36, 'stroke-width': 1.5, 'stroke-linecap': 'round' }));
      if (Math.abs(r.ret) > CAP) { const c0 = pt(R.index + len + Math.sign(len) * 4, a - 0.0016), c1 = pt(R.index + len + Math.sign(len) * 4, a + 0.0016); g.append(sv('line', { x1: c0[0], y1: c0[1], x2: c1[0], y2: c1[1], stroke: '#ecd092', 'stroke-width': 1.4 })); }
    }
    const h0 = pt(R.index - 22, a), h1 = pt(R.index + 22, a);
    g.append(sv('line', { x1: h0[0], y1: h0[1], x2: h1[0], y2: h1[1], stroke: 'transparent', 'stroke-width': 5.6 }));
    link(g, 'forecast.html#' + r.d, r.d);
    hover(g, () => [el('b', { text: r.d }), kv('预测', r.dir === 'up' ? '上涨' : '下跌'),
      kv('SPY 开盘到收盘', fmt.pct(r.ret)), kv('结果', !r.official ? '未计入' : r.hit == null ? '待结算' : r.hit ? '判对' : '判错'), kv('置信度', r.conf + ' / 10')]);
    bars.append(g);
  });
  if (inWin(S.latest.date)) (function () {
    const L = S.latest, a = th(L.date), p = pt(R.index, a), q = pt(R.index, aT + 0.9 * DEG);
    const tipY = p[1] - Math.max(0, Math.min(L.spyReturn || 0, CAP)) * SC - 8;
    const g = sv('g', { class: 'hot rise' });
    g.append(sv('path', { d: 'M' + p[0] + ' ' + tipY + 'V' + (q[1] - 50) + 'H' + (q[0] - 8), fill: 'none', stroke: '#cfb07a', 'stroke-opacity': .6 }),
      sv('text', { class: 't2', x: q[0], y: q[1] - 55 }, sv('tspan', { class: 'tn' }, fmt.md(L.date))),
      sv('text', { class: 't', x: q[0], y: q[1] - 34 }, '预测' + (L.direction === 'up' ? '上涨' : '下跌') + (L.hit == null ? '，待结算' : '，收盘 ' + fmt.pct(L.spyReturn) + '，' + (L.hit ? '判对' : '判错'))));
    bars.append(link(g, 'forecast.html#' + L.date, '最新预测'));
  })();
  field.append(bars);

  // ── 个股：左边是已做的复盘与本轮研究，今天以右是已排定的复核 ──
  const stocks = sv('g');
  RD.outcomeBatches.forEach(([d0, n]) => {
    if (!inWin(d0)) return;
    const p = pt(R.stock, th(d0)), s = 3.2 + Math.sqrt(n) * 0.36;
    const g = sv('g', { class: 'hot dim rise' });
    g.append(sv('path', { d: 'M' + p[0] + ' ' + (p[1] - s) + 'L' + (p[0] + s) + ' ' + p[1] + 'L' + p[0] + ' ' + (p[1] + s) + 'L' + (p[0] - s) + ' ' + p[1] + 'Z', fill: '#050505', stroke: '#cfb07a', 'stroke-width': 1.1 }),
      sv('circle', { cx: p[0], cy: p[1], r: 12, fill: 'transparent' }));
    link(g, 'stocks.html', d0 + ' 复盘');
    hover(g, () => [el('b', { text: d0 + ' 复盘' }), kv('核对原判断', n + ' 项')]);
    stocks.append(g);
  });
  let runEnd = null;   // 本轮研究两行标注的右端
  const runDay = String(RD.displayTime || RD.asOf).slice(0, 10);   // 研究截止的日期按北京时间，与个股页写的“研究截止”一致
  if (inWin(runDay)) (function () {
    const d0 = runDay, p = pt(R.stock, th(d0));
    runEnd = p[0] - 14;
    const g = sv('g', { class: 'hot rise' });
    g.append(sv('circle', { cx: p[0], cy: p[1], r: 15, fill: 'url(#node)' }), sv('circle', { cx: p[0], cy: p[1], r: 2.8, fill: '#fff8e6' }),
      sv('text', { class: 't2', x: p[0] - 14, y: p[1] + 30, 'text-anchor': 'end' }, sv('tspan', { class: 'tn' }, fmt.md(d0) + ' '), '本轮研究'),
      sv('text', { class: 't', x: p[0] - 14, y: p[1] + 51, 'text-anchor': 'end' }, '深入研究 ' + RD.summary.companies + ' 家，A 级 ' + (RD.summary.grades.A || 0) + ' 家'));
    stocks.append(link(g, 'stocks.html', '本轮研究'));
  })();
  const aByDate = {};
  RD.A.forEach(c => { const k = String(c.nextCheck).slice(0, 10); (aByDate[k] = aByDate[k] || []).push(c); });
  const tags = [];   // 大圈的标注；相邻几天挨得太近时合用一个，写起止日期和其间排定的事项合计
  RD.dueByDate.forEach(([d0, n]) => {
    if (day(d0) < day(today) || !inWin(d0)) return;
    const a = th(d0), p = pt(R.stock, a), names = aByDate[d0] || [], big = n >= 8 || names.length > 0;
    const r = big ? 3 + Math.sqrt(n) * 0.82 : 2;
    const g = sv('g', { class: 'hot dim rise' });
    if (big) g.append(sv('circle', { cx: p[0], cy: p[1], r: r, fill: '#cfb07a', 'fill-opacity': .12, stroke: '#cfb07a', 'stroke-width': 1.1 }));
    else g.append(sv('circle', { cx: p[0], cy: p[1], r: r, fill: '#cfb07a', opacity: .75 }));
    names.forEach((c, i) => { const q = pt(R.stock + r + 8 + i * 7, a); g.append(sv('circle', { cx: q[0], cy: q[1], r: 2.5, fill: '#ecd092' })); });
    if (big) {
      const prev = tags[tags.length - 1];
      if (prev && R.stock * (a - prev.a1) < 44) { prev.a1 = a; prev.r = Math.max(prev.r, r); prev.d1 = d0; }
      else tags.push({ g: g, a0: a, a1: a, r: r, d0: d0, d1: d0 });
    }
    g.append(sv('circle', { cx: p[0], cy: p[1], r: Math.max(r, 12), fill: 'transparent' }));
    link(g, 'stocks.html#schedule', d0 + ' 复核');
    hover(g, () => [el('b', { text: d0 + ' 计划复核' }), kv('排定事项', n + ' 项'),
      names.length ? el('div', { text: 'A 级：' + names.map(c => c.name).join('、') }) : null].filter(Boolean));
    stocks.append(g);
  });
  tags.forEach(t => {
    const a = (t.a0 + t.a1) / 2, b0 = pt(R.stock - t.r - 18, a), b1 = pt(R.stock - t.r - 35, a);
    const n = RD.dueByDate.reduce((s, [d, k]) => s + (d >= t.d0 && d <= t.d1 ? k : 0), 0);
    t.els = [sv('text', { class: 'tn', x: b0[0], y: b0[1], 'text-anchor': 'middle' }, t.d0 === t.d1 ? fmt.md(t.d0) : fmt.md(t.d0) + ' 至 ' + fmt.md(t.d1)),
      sv('text', { class: 't3', x: b1[0], y: b1[1], 'text-anchor': 'middle' }, n + ' 项')];
    t.g.append(...t.els);
  });
  field.append(stocks);
  // 本轮研究临近下一批复核时，复核标注整体右移，与本轮研究的标注隔开
  if (runEnd != null) tags.forEach(t => {
    const dx = runEnd + 20 - Math.min(...t.els.map(e => e.getBBox().x));
    if (dx > 0) t.els.forEach(e => e.setAttribute('x', +e.getAttribute('x') + dx));
  });

  // ── 封面与图例 ──
  document.getElementById('asof').append(
    '数据截至', ...[['经济', H.macro.map(m => m.date).sort().pop()], ['专题', latestReport.date], ['指数', S.last], ['个股', runDay]]
      .map(([k, d]) => el('span', null, k + ' ', el('b', { text: fmt.md(d) }))));
  const key = (shape, text) => el('span', null, shape, text);
  const mini = (...kids) => sv('svg', { viewBox: '0 0 26 12', 'aria-hidden': 'true' }, ...kids);
  document.getElementById('legend').append(
    key(mini(sv('line', { x1: 13, y1: 11, x2: 13, y2: 1, stroke: '#ecd092', 'stroke-width': 2.4, 'stroke-linecap': 'round' })), '判对'),
    key(mini(sv('line', { x1: 13, y1: 11, x2: 13, y2: 2, stroke: '#f1eadb', 'stroke-opacity': .4, 'stroke-width': 1.5, 'stroke-linecap': 'round' })), '判错'),
    key(mini(sv('circle', { cx: 13, cy: 6, r: 6, fill: 'url(#node)' }), sv('circle', { cx: 13, cy: 6, r: 2, fill: '#fff8e6' })), '研报'),
    key(mini(sv('path', { d: 'M13 1L18 6L13 11L8 6Z', fill: 'none', stroke: '#cfb07a', 'stroke-width': 1.1 })), '复盘'),
    key(mini(sv('circle', { cx: 13, cy: 6, r: 4.6, fill: '#cfb07a', 'fill-opacity': .12, stroke: '#cfb07a', 'stroke-width': 1.1 })), '排定的复核'),
    key(mini(sv('circle', { cx: 13, cy: 6, r: 2.5, fill: '#ecd092' })), 'A 级公司'));

  // ── 纸面：四层的最新结论 ──
  const pctOf = (a, b) => (b ? (a / b * 100).toFixed(1) + '%' : '—');
  const fig = (v, label) => el('div', null, el('b', { text: v }), label);
  const metric = m => el('div', null, el('b', { text: fmt.num(m.value, Math.abs(m.value) >= 100 ? 0 : 1) + (/%/.test(m.unit) ? '%' : '') }), m.label + (/%/.test(m.unit) ? '' : '（' + m.unit + '）'), el('br'), m.period);
  const last20 = S.lite.filter(r => r.official && r.hit != null).slice(-20);
  const aNames = mk => RD.A.filter(c => c.market === mk).map(c => c.name).join('、');
  const nextChecks = Object.keys(aByDate).sort().map(k => fmt.md(k) + ' 复核 ' + aByDate[k].map(c => c.name).join('、')).join('；');
  const enter = (href, text) => el('a', { class: 'btn', href: href, text: text });
  const L = S.latest, settledL = L.hit != null;
  document.getElementById('now-table').append(
    el('thead', null, el('tr', null, ['', '判断', '读数', '更新', ''].map(t => el('th', { text: t })))),
    el('tbody', null,
      el('tr', null,
        el('td', null, el('h3', null, '经济', el('small', { text: H.macro.map(m => m.name).join('与') }))),
        el('td', null, H.macro.map(m => el('p', { class: 'judg' }, el('b', { text: m.name + '　' }), m.line + '。'))),
        el('td', null, H.macro.map((m, i) => [el('p', { class: 'region-k', style: i ? 'margin-top:16px' : null, text: m.name }), el('div', { class: 'figs' }, m.metrics.slice(0, 3).map(metric))])),
        el('td', null, el('p', { class: 'fine', text: H.macro.map(m => m.name + ' ' + fmt.cn(m.date)).join('　') })),
        el('td', null, enter('macro.html', '进入经济'))),
      el('tr', null,
        el('td', null, el('h3', null, '专题', el('small', { text: H.reports.length + ' 篇研报' }))),
        el('td', null, el('p', { class: 'judg' }, el('b', { text: latestReport.title })), latestReport.subtitle ? el('p', { class: 'judg', text: latestReport.subtitle }) : null),
        el('td', null, el('div', { class: 'figs' }, ['美国', '中国', '全球与跨市场'].map(l => [l, H.reports.filter(r => r.lane === l).length]).filter(x => x[1]).map(x => fig(x[1] + ' 篇', x[0])))),
        el('td', null, el('p', { class: 'fine', text: '最新一篇 ' + fmt.cn(latestReport.date) })),
        el('td', null, enter('research.html', '进入专题'))),
      el('tr', null,
        el('td', null, el('h3', null, '指数', el('small', { text: '标普500' }))),
        el('td', null,
          el('p', { class: 'judg' }, el('b', { text: fmt.cn(L.date) + '预测' + (L.direction === 'up' ? '上涨' : '下跌') }), '，置信度 ' + L.confidence + ' / 10。' + (L.dominant ? L.dominant.replace(/。$/, '') + '。' : '')),
          settledL ? el('p', { class: 'judg' }, 'SPY 开盘 ' + L.spyOpen + '，收盘 ' + L.spyClose + '，', signed(L.spyReturn, fmt.pct(L.spyReturn)), '，' + (L.hit ? '判对。' : '判错。')) : null),
        el('td', null, el('div', { class: 'figs' }, fig(pctOf(S.hits, S.settled), '方向命中率，' + S.hits + ' / ' + S.settled), fig(last20.filter(r => r.hit).length + ' / ' + last20.length, '近 20 日判对'))),
        el('td', null, el('p', { class: 'fine', text: S.days + ' 个交易日，自 ' + fmt.cny(S.first) })),
        el('td', null, enter('forecast.html', '进入指数'))),
      el('tr', null,
        el('td', null, el('h3', null, '个股', el('small', { text: 'A 股与美股' }))),
        el('td', null,
          el('p', { class: 'judg' }, fmt.num(RD.summary.universe) + ' 只股票中 ' + RD.summary.companies + ' 家进入深入研究，', el('b', { text: RD.summary.grades.A + ' 家评为 A 级' }), '。'),
          el('p', { class: 'judg', text: [['A 股', aNames('CN')], ['美股', aNames('US')]].filter(x => x[1]).map(x => x[0] + '：' + x[1]).join('。') + '。' })),
        el('td', null, el('div', { class: 'figs' }, fig(String(RD.summary.grades.A || 0), 'A 级'), RD.summary.grades.B ? fig(String(RD.summary.grades.B), 'B 级') : null, fig(String(RD.summary.grades.C || 0), 'C 级'), RD.summary.grades['Research Pending'] ? fig(String(RD.summary.grades['Research Pending']), '研究未完成') : null, RD.summary.grades['Data Hold'] ? fig(String(RD.summary.grades['Data Hold']), '证据不足暂缓') : null, fig(String(RD.summary.grades.Reject || 0), '假说被否定'))),
        el('td', null, el('p', { class: 'fine', text: (nextChecks ? nextChecks + '。' : '') + '研究截止 ' + RD.displayTime })),
        el('td', null, enter('stocks.html', '进入个股')))));

  document.getElementById('foot').append(Site.pagefoot());

  const stageEl = document.getElementById('stage');
  Site.stage(stageEl);
})();
