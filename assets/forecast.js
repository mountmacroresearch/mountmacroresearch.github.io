/* 指数：上面一条累计收益曲线，下面每个交易日一根柱。
   盈亏由 lib/engine.js 计算。 */
(function () {
  const { el, sv, fmt, signed, kv, block } = Site;
  const ALL = window.MMR_SPX.rows;
  Site.nav('forecast.html');

  const field = document.getElementById('field');
  Site.defs(field);
  const DEFAULTS = { contract: 'MES', capital: 10000, fee: 1.25, slippage: 1, policy: 'daily', basis: 'futures', mode: 'simulation' };
  const state = { range: 'all', dir: 'all', hit: 'all', settings: Object.assign({}, DEFAULTS) };
  // 预测除方向外还给出过交易动作时，才提供“按交易动作”这一种算法
  const hasActions = ALL.some(r => r.action && r.action !== 'no_trade');
  let rows, result, daily, scales;

  const dirCN = d => (d === 'up' ? '上涨' : d === 'down' ? '下跌' : '—');
  const hitCN = r => (!r.official ? '未计入' : r.hit == null ? '待结算' : r.hit ? '判对' : '判错');
  const actionCN = a => ({ no_trade: '不交易', long: '做多', buy: '做多', short: '做空', sell: '做空' }[a] || a || '—');
  // 没有正常成交的日子给一个说明，正常成交的不必说
  const NOTE = { '研究记录，不计交易': '未计入统计', '待结算': '待结算', '框架空仓': '当日不交易', '无交易方向': '当日不交易', '缺少行情，未计收益': '行情待补' };
  const noteOf = d => NOTE[d.reason] || '';

  function compute() {
    rows = state.range === 'all' ? ALL : ALL.slice(-Number(state.range));
    result = Engine.calculate(rows, state.settings, {});
    daily = result.daily;
  }

  // ── 舞台 ──
  const PX0 = 150, PX1 = 1404, A = { top: 300, bot: 604 }, B = { top: 660, bot: 800 };
  field.append(Site.dust(190, 23, [0, 0, 1600, 850]), Site.horizon(888));
  const plot = sv('g', { class: 'rise' }), cross = sv('g', { style: 'pointer-events:none' });
  const pad = sv('rect', { x: PX0 - 16, y: A.top - 12, width: PX1 - PX0 + 32, height: B.bot - A.top + 24, fill: 'transparent', class: 'hot', tabindex: '0', role: 'application', 'aria-label': '逐日读数：左右方向键移动，回车查看这一天的详情' });
  field.append(plot, cross, pad);

  function ticks(lo, hi, count) {
    const step0 = (hi - lo || 1) / count, mag = Math.pow(10, Math.floor(Math.log10(step0))), norm = step0 / mag;
    const step = (norm >= 5 ? 5 : norm >= 2 ? 2 : 1) * mag, out = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(6));
    return out;
  }
  const hair = (x1, y1, x2, y2, o) => sv('line', { x1: x1, y1: y1, x2: x2, y2: y2, stroke: '#cfb07a', 'stroke-opacity': o });

  function drawChart() {
    plot.replaceChildren(); cross.replaceChildren();
    const n = daily.length;
    const xOf = i => (n === 1 ? (PX0 + PX1) / 2 : PX0 + (PX1 - PX0) * i / (n - 1));
    const s = daily.map(d => d.returnPct), b = daily.map(d => d.benchmark);
    const vals = s.concat(b.filter(v => v != null), [0]);
    let lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    const padA = (hi - lo || 1) * 0.08; lo -= padA; hi += padA;
    const yA = v => A.bot - (v - lo) / (hi - lo) * (A.bot - A.top);
    ticks(lo, hi, 4).forEach(v => {
      plot.append(hair(PX0, yA(v), PX1, yA(v), v === 0 ? .36 : .13),
        sv('text', { class: 'ta', x: PX0 - 16, y: yA(v) + 4, 'text-anchor': 'end' }, (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) + '%'));
    });
    plot.append(sv('text', { class: 't3', x: PX0, y: A.top - 22 }, '累计收益率'));
    const pts = (arr, y) => arr.map((v, i) => (v == null ? null : xOf(i).toFixed(1) + ' ' + y(v).toFixed(1))).filter(Boolean);
    const sp = pts(s, yA), bp = pts(b, yA);
    if (sp.length > 1) plot.append(sv('path', { d: 'M' + xOf(0).toFixed(1) + ' ' + yA(0).toFixed(1) + 'L' + sp.join('L') + 'L' + xOf(n - 1).toFixed(1) + ' ' + yA(0).toFixed(1) + 'Z', fill: '#cfb07a', opacity: .1 }));
    if (bp.length > 1) plot.append(sv('path', { d: 'M' + bp.join('L'), fill: 'none', stroke: '#f1eadb', 'stroke-opacity': .55, 'stroke-width': 1.4, 'stroke-dasharray': '5 5', 'stroke-linejoin': 'round' }));
    if (sp.length > 1) plot.append(
      sv('path', { d: 'M' + sp.join('L'), fill: 'none', stroke: '#ecd092', 'stroke-width': 7, opacity: .3, filter: 'url(#glow)', 'stroke-linejoin': 'round' }),
      sv('path', { d: 'M' + sp.join('L'), fill: 'none', stroke: '#f3dca3', 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
    // 线尾直接标名，两条线靠得近时上下错开
    const lastB = b.reduce((acc, v, i) => (v == null ? acc : i), -1);
    let yS = yA(s[n - 1]), yBn = lastB >= 0 ? yA(b[lastB]) : null;
    plot.append(sv('circle', { cx: xOf(n - 1), cy: yS, r: 4.5, fill: '#f3dca3', stroke: '#050505', 'stroke-width': 2 }));
    if (yBn != null) plot.append(sv('circle', { cx: xOf(lastB), cy: yBn, r: 4, fill: '#bdb7aa', stroke: '#050505', 'stroke-width': 2 }));
    let lS = yS, lB = yBn;
    if (lB != null && Math.abs(lS - lB) < 40) { const mid = (lS + lB) / 2, up = lS <= lB; lS = mid + (up ? -20 : 20); lB = mid + (up ? 20 : -20); }
    plot.append(sv('text', { class: 't', x: PX1 + 18, y: lS - 1 }, '模拟 ' + state.settings.contract + ' 一手'), sv('text', { class: 'tn', x: PX1 + 18, y: lS + 17 }, fmt.pct(s[n - 1])));
    if (lB != null) plot.append(sv('text', { class: 't2', x: PX1 + 18, y: lB - 1 }, '标普500 持有'), sv('text', { class: 'tn', x: PX1 + 18, y: lB + 17, style: 'fill:var(--ink2)' }, fmt.pct(b[lastB])));

    // 每日柱
    const r = daily.map(d => d.spyReturn).filter(v => v != null);
    let lo2 = Math.min.apply(null, r.concat([0])), hi2 = Math.max.apply(null, r.concat([0]));
    const padB = (hi2 - lo2 || 1) * 0.06; lo2 -= padB; hi2 += padB;
    const yB = v => B.bot - (v - lo2) / (hi2 - lo2) * (B.bot - B.top);
    ticks(lo2, hi2, 3).forEach(v => {
      plot.append(hair(PX0, yB(v), PX1, yB(v), v === 0 ? .36 : .13),
        sv('text', { class: 'ta', x: PX0 - 16, y: yB(v) + 4, 'text-anchor': 'end' }, (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) + '%'));
    });
    plot.append(sv('text', { class: 't3', x: PX0, y: B.top - 16 }, 'SPY 开盘到收盘涨跌幅'));
    const bw = Math.max(2, Math.min(22, (PX1 - PX0) / n * 0.56));
    daily.forEach((d, i) => {
      if (d.spyReturn == null) return;
      const y0 = yB(0), y1 = yB(d.spyReturn), top = Math.min(y0, y1), hgt = Math.max(1.5, Math.abs(y1 - y0));
      const known = d.official && d.hit != null;
      plot.append(sv('rect', Object.assign({ x: xOf(i) - bw / 2, y: top, width: bw, height: hgt, rx: Math.min(2, bw / 2) },
        !known ? { fill: 'none', stroke: '#cfb07a', 'stroke-opacity': .6 } : d.hit ? { fill: '#ecd092' } : { fill: '#f1eadb', 'fill-opacity': .3 })));
    });
    // 横轴
    const lab = (i, t) => plot.append(hair(xOf(i), B.bot + 8, xOf(i), B.bot + 14, .5), sv('text', { class: 't3', x: xOf(i), y: B.bot + 32, 'text-anchor': 'middle' }, t));
    if (n <= 25) daily.forEach((d, i) => { if (i % 5 === 0 || i === n - 1) lab(i, fmt.md(d.date)); });
    else daily.forEach((d, i) => { if (i === 0 || d.date.slice(5, 7) !== daily[i - 1].date.slice(5, 7)) lab(i, Number(d.date.slice(5, 7)) + '月'); });
    scales = { xOf: xOf, yA: yA, n: n };
  }

  // 十字线：找到最近的交易日，读出所有序列
  let cur = -1;
  function readout(i, evt) {
    cur = i;
    const d = daily[i], x = scales.xOf(i);
    cross.replaceChildren(
      sv('line', { x1: x, y1: A.top - 8, x2: x, y2: B.bot + 6, stroke: '#f1eadb', 'stroke-opacity': .5 }),
      sv('circle', { cx: x, cy: scales.yA(d.returnPct), r: 5.5, fill: '#f3dca3', stroke: '#050505', 'stroke-width': 2 }));
    let e = evt;
    if (!e) { const p = field.createSVGPoint(); p.x = x; p.y = A.top + 40; const q = p.matrixTransform(field.getScreenCTM()); e = { clientX: q.x, clientY: q.y, type: 'pointermove' }; }
    Site.tip(e, [el('b', { text: d.date }),
      kv('预测', dirCN(d.direction) + '，置信度 ' + (d.confidence != null ? d.confidence : '—')),
      kv('SPY 开盘到收盘', fmt.pct(d.spyReturn)), kv('结果', hitCN(d)),
      kv('当日模拟净收益', d.net == null || !d.traded ? '—' : fmt.usd(d.net)), kv('累计收益率', fmt.pct(d.returnPct)),
      kv('标普500 同期', fmt.pct(d.benchmark)), noteOf(d) ? el('i', { text: noteOf(d) }) : null].filter(Boolean));
  }
  const nearest = evt => {
    const p = field.createSVGPoint(); p.x = evt.clientX; p.y = evt.clientY;
    const q = p.matrixTransform(field.getScreenCTM().inverse());
    return Math.max(0, Math.min(scales.n - 1, Math.round((q.x - PX0) / (PX1 - PX0) * (scales.n - 1))));
  };
  const clearCross = () => { cross.replaceChildren(); Site.untip(); cur = -1; };
  pad.addEventListener('pointermove', e => readout(nearest(e), e));
  pad.addEventListener('pointerleave', clearCross);
  pad.addEventListener('click', e => openDay(daily[nearest(e)].date));
  pad.addEventListener('focus', () => readout(scales.n - 1));
  pad.addEventListener('blur', clearCross);
  pad.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); readout(Math.max(0, Math.min(scales.n - 1, (cur < 0 ? scales.n - 1 : cur) + (e.key === 'ArrowLeft' ? -1 : 1)))); }
    if (e.key === 'Enter' && cur >= 0) openDay(daily[cur].date);
  });

  // 右上读数
  const reads = document.getElementById('reads');
  const stat = (label, value, sub) => el('div', null, label, el('b', null, value), el('small', { text: sub }));
  function drawReads() {
    const r = result, cap = state.settings.capital;
    reads.replaceChildren(
      stat('方向命中率', r.hitRate == null ? '—' : r.hitRate.toFixed(2) + '%', r.hits + ' / ' + r.settled + ' 日判对'),
      stat('模拟累计净收益', signed(r.pnl, fmt.usd(r.pnl)), '毛收益 ' + fmt.usd(r.gross) + '，成本 $' + fmt.num(r.costs, 2)),
      stat('账户收益率', signed(r.returnPct, fmt.pct(r.returnPct)), '标普500 同期持有 ' + fmt.pct(r.benchmark)),
      stat('最大回撤', fmt.pct(r.maxDrawdown), '初始资金 $' + fmt.num(cap)));
  }

  // 封面
  const L = ALL[ALL.length - 1];
  document.getElementById('line').textContent = fmt.cn(L.date) + '预测' + dirCN(L.direction) + '，置信度 ' + L.confidence + ' / 10。' +
    (L.dominant ? L.dominant.replace(/。$/, '') + '。' : '') + (L.official && L.hit != null ? '收盘 ' + fmt.pct(L.spyReturn) + '，' + hitCN(L) + '。' : '');
  const segStage = el('span', { class: 'seg-d' });
  document.getElementById('meta').append(el('span', null, '数据截至 ', el('b', { text: fmt.md(L.date) })), segStage,
    el('button', { class: 'link', type: 'button', text: fmt.md(L.date) + ' 详情', on: { click: () => openDay(L.date) } }));
  const RANGES = [['20', '近 20 日'], ['60', '近 60 日'], ['all', '全部 ' + ALL.length + ' 日']];
  let syncStage, syncPaper;
  const setRange = v => { state.range = v; syncStage(v); syncPaper(v); renderAll(); };
  syncStage = Site.seg(segStage, RANGES, state.range, setRange);
  syncPaper = Site.seg(document.getElementById('f-range'), RANGES, state.range, setRange);
  Site.seg(document.getElementById('f-dir'), [['all', '全部'], ['up', '预测上涨'], ['down', '预测下跌']], 'all', v => { state.dir = v; drawLedger(); });
  Site.seg(document.getElementById('f-hit'), [['all', '全部'], ['hit', '判对'], ['miss', '判错']], 'all', v => { state.hit = v; drawLedger(); });

  const mini = (...kids) => sv('svg', { viewBox: '0 0 26 12', 'aria-hidden': 'true' }, ...kids);
  document.getElementById('legend').append(
    el('span', null, mini(sv('line', { x1: 1, y1: 6, x2: 25, y2: 6, stroke: '#f3dca3', 'stroke-width': 2 })), '模拟累计收益率'),
    el('span', null, mini(sv('line', { x1: 1, y1: 6, x2: 25, y2: 6, stroke: '#f1eadb', 'stroke-opacity': .6, 'stroke-width': 1.4, 'stroke-dasharray': '5 5' })), '标普500 买入持有'),
    el('span', null, mini(sv('rect', { x: 10, y: 1, width: 6, height: 10, rx: 1.5, fill: '#ecd092' })), '判对'),
    el('span', null, mini(sv('rect', { x: 10, y: 3, width: 6, height: 8, rx: 1.5, fill: '#f1eadb', 'fill-opacity': .3 })), '判错'));

  // ── 纸面：逐日明细 ──
  const openRow = d => ({ class: 'open', tabindex: '0', on: { click: () => openDay(d.date), keydown: e => { if (e.key === 'Enter') openDay(d.date); } } });
  const ledger = Site.pager(document.getElementById('ledger-table'), {
    size: 20, empty: '没有符合条件的交易日。',
    head: [['交易日'], ['预测'], ['置信度', 'n'], ['主导因素'], ['SPY 开盘到收盘', 'n'], ['结果'], ['当日模拟净收益', 'n'], ['累计净收益', 'n']],
    row: d => el('tr', openRow(d),
      el('td', { style: 'font-family:var(--num);white-space:nowrap', text: d.date }),
      el('td', null, el('span', { class: d.direction === 'up' ? 'up' : 'dn', text: dirCN(d.direction) })),
      el('td', { class: 'n', text: d.confidence != null ? d.confidence.toFixed(1) : '—' }),
      el('td', null, el('span', { class: 'clip', text: d.dominant || '—' })),
      el('td', { class: 'n' }, signed(d.spyReturn, fmt.pct(d.spyReturn))),
      el('td', { style: 'white-space:nowrap' }, d.official && d.hit != null ? el('i', { class: 'mark ' + (d.hit ? 'hit' : 'miss') }) : null, hitCN(d)),
      el('td', { class: 'n' }, d.net == null || !d.traded ? '—' : signed(d.net, fmt.usd(d.net))),
      el('td', { class: 'n', text: fmt.usd(d.pnl) })),
  });
  function drawLedger() {
    const list = daily.filter(d => (state.dir === 'all' || d.direction === state.dir) &&
      (state.hit === 'all' || (d.official && d.hit != null && (state.hit === 'hit') === !!d.hit))).slice().reverse();
    ledger.set(list);
    document.getElementById('f-count').textContent = daily[0].date + ' 至 ' + daily[daily.length - 1].date;
  }
  function drawMonths() {
    const m = new Map();
    daily.forEach(d => {
      const k = d.date.slice(0, 7), o = m.get(k) || { days: 0, n: 0, hits: 0, net: 0 };
      o.days++; if (d.official && d.hit != null) { o.n++; o.hits += d.hit ? 1 : 0; } o.net += d.net || 0; m.set(k, o);
    });
    const t = document.getElementById('month-table');
    const partial = [...m.values()].some(o => o.n !== o.days);   // 有未计入或待结算的日子时，多列一栏“计入”
    t.replaceChildren(
      el('thead', null, el('tr', null, [['月份'], ['交易日', 'n'], partial ? ['计入', 'n'] : null, ['判对', 'n'], ['命中率'], ['模拟净收益', 'n']].filter(Boolean).map(h => el('th', { class: h[1] || null, text: h[0] })))),
      el('tbody', null, [...m.entries()].map(([k, o]) => el('tr', null,
        el('td', { text: k.slice(0, 4) + ' 年 ' + Number(k.slice(5)) + ' 月' }), el('td', { class: 'n', text: o.days }), partial ? el('td', { class: 'n', text: o.n }) : null, el('td', { class: 'n', text: o.hits }),
        el('td', { style: 'font-family:var(--num);white-space:nowrap' }, el('i', { class: 'bar-cell', style: 'width:' + (o.n ? Math.round(o.hits / o.n * 150) : 0) + 'px' }), o.n ? (o.hits / o.n * 100).toFixed(1) + '%' : '—'),
        el('td', { class: 'n' }, signed(o.net, fmt.usd(o.net)))))));
  }

  // 交易假设
  const assume = document.getElementById('assume');
  const field2 = (id, label, node, wide) => el('div', { class: wide ? 'wide' : null }, el('label', { for: 'a-' + id, text: label }), node);
  const sel = (id, opts) => el('select', { id: 'a-' + id }, opts.map(([v, t]) => el('option', { value: v, text: t, selected: state.settings[id] === v ? true : null })));
  const num = (id, step) => el('input', { id: 'a-' + id, type: 'number', min: '0', step: step, value: state.settings[id] });
  const CHOICES = ['contract', 'basis'].concat(hasActions ? ['policy'] : []);
  assume.append(
    hasActions ? field2('policy', '交易方式', sel('policy', [['daily', '每天按预测方向交易'], ['framework', '按预测给出的交易动作']]), true) : null,
    field2('contract', '合约', sel('contract', [['MES', 'MES 微型'], ['ES', 'ES 迷你']])),
    field2('basis', '价格', sel('basis', [['futures', 'ES 连续期货'], ['spx', 'SPX 指数点位']])),
    field2('capital', '初始资金（美元）', num('capital', '1000')),
    field2('fee', '每边费用（美元）', num('fee', '0.05')),
    field2('slippage', '每边滑点（跳）', num('slippage', '0.25')),
    el('div', { class: 'wide' }, el('button', { class: 'plain', type: 'button', text: '恢复默认', on: { click: () => { state.settings = Object.assign({}, DEFAULTS); Object.keys(DEFAULTS).forEach(k => { const n = document.getElementById('a-' + k); if (n) n.value = DEFAULTS[k]; }); renderAll(); } } })));
  assume.addEventListener('change', () => {
    const next = Object.assign({}, state.settings);
    CHOICES.forEach(k => { next[k] = document.getElementById('a-' + k).value; });
    ['capital', 'fee', 'slippage'].forEach(k => { next[k] = Number(document.getElementById('a-' + k).value); });
    if (!(next.capital > 0) || !(next.fee >= 0) || !(next.slippage >= 0)) return;
    state.settings = next; renderAll();
  });
  function drawCosts() {
    const c = Engine.CONTRACTS[state.settings.contract], s = state.settings, tickV = c.tick * c.multiplier;
    const row = (k, v) => el('div', null, el('span', { text: k }), el('b', { text: v }));
    document.getElementById('costs').replaceChildren(
      row('一跳价值', '$' + fmt.num(tickV, 2)), row('往返费用', '$' + fmt.num(2 * s.fee, 2)), row('往返滑点', '$' + fmt.num(2 * s.slippage * tickV, 2)),
      row('单次交易成本', '$' + fmt.num(2 * s.fee + 2 * s.slippage * tickV, 2)),
      row('交易天数', result.count + ' 天，净盈利 ' + result.wins + ' 天'));
  }

  document.getElementById('export').addEventListener('click', () => {
    const head = 'date,direction,confidence,spy_return_pct,hit,side,entry,exit,gross,cost,net,cumulative_net';
    const lines = daily.map(d => [d.date, d.direction, d.confidence, d.spyReturn, d.hit, d.side, d.entry, d.exit, d.gross, (d.fee || 0) + (d.slip || 0), d.net, d.pnl].map(v => (v == null ? '' : v)).join(','));
    const a = el('a', { href: URL.createObjectURL(new Blob(['\uFEFF' + head + '\n' + lines.join('\n')], { type: 'text/csv' })), download: 'spx_forecast_' + daily[0].date + '_' + daily[daily.length - 1].date + '.csv' });
    document.body.append(a); a.click(); a.remove();
  });

  // ── 一个交易日的详情：结果、主导因素与理由、收盘后的市场，一页读完 ──
  function openDay(date) {
    let d = daily.find(x => x.date === date);
    if (!d) { setRange('all'); d = daily.find(x => x.date === date); }
    if (!d) return;
    const settled = d.spyClose != null;
    Site.untip();
    Site.dossier({
      hash: date, kicker: '标普500 预测', title: fmt.cny(date),
      line: settled
        ? ['预测' + dirCN(d.direction) + '。SPY 开盘 ' + d.spyOpen + '，收盘 ' + d.spyClose + '，', signed(d.spyReturn, fmt.pct(d.spyReturn)), '，' + hitCN(d) + '。']
        : '预测' + dirCN(d.direction) + '，待结算。',
      facts: [['置信度', d.confidence != null ? d.confidence + ' / 10' : '—'], hasActions ? ['交易动作', actionCN(d.action)] : null,
        d.traded ? ['当日模拟净收益', signed(d.net, fmt.usd(d.net))] : null],
      tabs: [{ label: '判断', build: () => [block.sect('主导因素', block.p(d.dominant)), block.sect('理由', block.p(d.why)), block.sect('收盘后', block.p(d.review))].flat() }],
    });
  }

  function renderAll() { compute(); drawChart(); drawReads(); drawLedger(); drawMonths(); drawCosts(); }
  renderAll();

  document.getElementById('foot').append(Site.pagefoot(['模拟交易按固定假设计算，不是实际账户业绩。']));
  Site.stage(document.getElementById('stage'));
  // 地址里带日期时直接打开这一天的详情
  const fromHash = () => { if (/^#\d{4}-\d{2}-\d{2}$/.test(location.hash)) openDay(location.hash.slice(1)); };
  fromHash();
  window.addEventListener('hashchange', fromHash);
})();
