/* 专题：星图。横向是日期，三条带是研报关注的地区；
   选一种资产，讨论过它的研报按时间连成一条线。 */
(function () {
  const { el, sv, fmt, kv, add } = Site;
  const H = window.MMR_HUB, R = H.reports;
  Site.nav('research.html');

  const field = document.getElementById('field');
  Site.defs(field);
  // 只画有研报的地区带，按带数上下均分
  const LANES = ['美国', '中国', '全球与跨市场'].filter(l => R.some(r => r.lane === l));
  const laneY = {};
  LANES.forEach((l, i) => { laneY[l] = 600 + (i - (LANES.length - 1) / 2) * (LANES.length > 2 ? 150 : 200); });
  const day = iso => Date.parse(String(iso).slice(0, 10) + 'T00:00:00Z');
  const today = Site.today();
  const T0 = day(R[0].date.slice(0, 7) + '-01'), T1 = Math.max(day(today), day(R[R.length - 1].date)), X0 = 300, X1 = 1400;
  const xOf = iso => X0 + (X1 - X0) * (day(iso) - T0) / (T1 - T0);
  const latest = R[R.length - 1];
  const href = r => 'report.html?id=' + encodeURIComponent(r.id);
  const assetName = k => (k === 'A股' ? 'A 股' : k);
  // 按视觉宽度截断：汉字算 1，拉丁字母与数字算 0.55
  function clipW(t, max) { let w = 0, out = ''; for (const ch of t) { w += ch.charCodeAt(0) > 0x2e80 ? 1 : 0.55; if (w > max) return out + '…'; out += ch; } return out; }

  field.append(Site.dust(210, 51, [0, 0, 1600, 860]), Site.horizon(888));

  // 地区带、月份、今天
  const frame = sv('g', { class: 'rise', 'aria-hidden': 'true' });
  LANES.forEach(name => {
    const y = laneY[name], n = R.filter(r => r.lane === name).length;
    frame.append(sv('line', { x1: X0 - 30, y1: y, x2: X1 + 70, y2: y, stroke: '#cfb07a', 'stroke-opacity': .3 }),
      sv('text', { class: 't', x: X0 - 48, y: y - 2, 'text-anchor': 'end' }, name), sv('text', { class: 't3', x: X0 - 48, y: y + 17, 'text-anchor': 'end' }, n + ' 篇'));
  });
  for (let d = new Date(T0); d.getTime() <= T1; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) {
    const x = X0 + (X1 - X0) * (d.getTime() - T0) / (T1 - T0);
    frame.append(sv('line', { x1: x, y1: 806, x2: x, y2: 814, stroke: '#cfb07a', 'stroke-opacity': .5 }), sv('text', { class: 't3', x: x, y: 834, 'text-anchor': 'middle' }, (d.getUTCMonth() + 1) + '月'));
  }
  frame.append(sv('line', { x1: X1, y1: 330, x2: X1, y2: 814, stroke: '#f1eadb', 'stroke-opacity': .45 }),
    sv('text', { class: 't2', x: X1 + 10, y: 834 }, '今天 ', sv('tspan', { class: 'tn' }, fmt.md(today))));
  field.append(frame);

  // 资产连线画在星的下面
  const trail = sv('g', { style: 'pointer-events:none' });
  field.append(trail);

  // 星：同一条带上日期挨得近的上下错开，名字斜着写，互不遮挡
  const stars = sv('g');
  const pos = new Map();
  const LEVELS = [0, -30, 30, -60, 60];
  const lastAt = {};
  R.forEach(r => {
    const x = xOf(r.date), seen = lastAt[r.lane] || (lastAt[r.lane] = {});
    const lv = LEVELS.find(l => seen[l] === undefined || x - seen[l] >= 36);
    const level = lv === undefined ? 0 : lv;
    seen[level] = x;
    const y = laneY[r.lane] + level;
    pos.set(r.id, [x, y]);
    const newest = r === latest, core = newest ? 18 : 13, orbit = core + 4;
    const g = sv('g', { class: 'hot dim rise', 'data-id': r.id, tabindex: '0', role: 'link', 'aria-label': r.date + ' ' + r.title });
    g.append(sv('circle', { cx: x, cy: y, r: core, fill: 'url(#node)' }), sv('circle', { cx: x, cy: y, r: newest ? 3.2 : 2.4, fill: '#fff8e6' }));
    for (let i = 0; i < r.charts; i++) { const a = -Math.PI / 2 + i / r.charts * Math.PI * 2; g.append(sv('circle', { cx: x + orbit * Math.cos(a), cy: y + orbit * Math.sin(a), r: 1.15, fill: '#ecd092', opacity: .85 })); }
    g.append(sv('text', { class: newest ? 't' : 't2', x: x + orbit + 8, y: y - 4, transform: 'rotate(-30 ' + x + ' ' + y + ')' }, sv('tspan', { class: 'tn' }, fmt.md(r.date) + ' '), clipW(r.title.split('：')[0], 16)),
      sv('circle', { cx: x, cy: y, r: 20, fill: 'transparent' }));
    const open = () => { location.href = href(r); };
    g.addEventListener('click', open); g.addEventListener('keydown', e => { if (e.key === 'Enter') open(); });
    Site.hover(g, () => [el('b', { text: r.title }), r.subtitle ? el('div', { text: r.subtitle }) : null, kv('日期', r.date), kv('图表', r.charts + ' 张'),
      r.assetKeys.length ? kv('资产', r.assetKeys.map(assetName).join('、')) : null].filter(Boolean));
    stars.append(g);
  });
  field.append(stars);

  // 按资产连线
  const assets = {};
  R.forEach(r => r.assetKeys.forEach(k => { (assets[k] = assets[k] || []).push(r); }));
  const order = Object.keys(assets).sort((a, b) => assets[b].length - assets[a].length);
  const stageEl = document.getElementById('stage');
  const chips = document.getElementById('chips');
  let pinned = null;
  function show(k, quiet) {
    trail.replaceChildren();
    stars.querySelectorAll('g').forEach(g => g.classList.remove('on'));
    stageEl.classList.toggle('focus', !!k && !quiet);
    if (!k) return;
    const d = 'M' + assets[k].map(r => pos.get(r.id).join(' ')).join('L');
    trail.append(sv('path', { d: d, fill: 'none', stroke: '#ecd092', 'stroke-width': 6, opacity: .22, filter: 'url(#glow)', 'stroke-linejoin': 'round' }),
      sv('path', { d: d, fill: 'none', stroke: '#ecd092', 'stroke-width': 1.2, 'stroke-linejoin': 'round', opacity: .9 }));
    assets[k].forEach(r => { const g = stars.querySelector('[data-id="' + r.id + '"]'); if (g) g.classList.add('on'); });
  }
  const press = () => [...chips.children].forEach(b => b.setAttribute('aria-pressed', b.dataset.k === pinned ? 'true' : 'false'));
  order.forEach(k => {
    const b = el('button', { type: 'button', data: { k: k }, 'aria-pressed': 'false' }, assetName(k), el('small', { text: assets[k].length }));
    b.addEventListener('pointerenter', () => show(k)); b.addEventListener('pointerleave', () => show(pinned, true));
    b.addEventListener('focus', () => show(k)); b.addEventListener('blur', () => show(pinned, true));
    b.addEventListener('click', () => { pinned = pinned === k ? null : k; press(); show(pinned, true); });
    chips.append(b);
  });
  // 打开页面时先连好一种资产：选讨论过它的研报最接近半数的那种，线最有区分度
  pinned = order.slice().sort((a, b) => Math.abs(assets[a].length - R.length / 2) - Math.abs(assets[b].length - R.length / 2))[0] || null;
  press(); show(pinned, true);

  // 封面与图例
  document.getElementById('line').textContent = fmt.cn(latest.date) + '　' + latest.title;
  add(document.getElementById('meta'), el('span', null, el('b', { text: R.length + ' 篇' }), ' 研报'), el('a', { class: 'link', href: href(latest), text: '读最新一篇' }));
  const mini = (...kids) => sv('svg', { viewBox: '0 0 26 12', 'aria-hidden': 'true' }, ...kids);
  add(document.getElementById('legend'),
    el('span', null, mini(sv('circle', { cx: 13, cy: 6, r: 6, fill: 'url(#node)' }), sv('circle', { cx: 13, cy: 6, r: 2, fill: '#fff8e6' })), '研报'),
    el('span', null, mini(sv('circle', { cx: 6, cy: 6, r: 1.3, fill: '#ecd092' }), sv('circle', { cx: 13, cy: 3, r: 1.3, fill: '#ecd092' }), sv('circle', { cx: 20, cy: 6, r: 1.3, fill: '#ecd092' })), '图表数'),
    el('span', null, mini(sv('line', { x1: 1, y1: 6, x2: 25, y2: 6, stroke: '#ecd092', 'stroke-width': 1.2 })), '同一资产'));

  // ── 纸面：全部研报 ──
  const state = { lane: 'all', q: '' };
  const lib = document.getElementById('lib');
  function draw() {
    const q = state.q.trim().toLowerCase();
    const list = R.filter(r => (state.lane === 'all' || r.lane === state.lane) &&
      (!q || [r.title, r.subtitle, r.assetKeys.join(' ')].join(' ').toLowerCase().indexOf(q) >= 0)).slice().reverse();
    lib.replaceChildren(
      el('thead', null, el('tr', null, [['日期'], ['题目'], ['地区'], ['资产'], ['图表', 'n'], ['篇幅', 'n']].map(h => el('th', { class: h[1] || null, text: h[0] })))),
      el('tbody', null, list.length ? list.map(r => {
        const open = () => { location.href = href(r); };
        return el('tr', { class: 'open', tabindex: '0', on: { click: open, keydown: e => { if (e.key === 'Enter') open(); } } },
          el('td', { style: 'font-family:var(--num);white-space:nowrap', text: r.date }),
          el('td', null, el('h3', { text: r.title }), r.subtitle ? el('small', { text: r.subtitle }) : null),
          el('td', { style: 'white-space:nowrap', text: r.lane }),
          el('td', null, el('div', { class: 'tags' }, r.assetKeys.map(k => el('span', { class: 'tag', text: assetName(k) })))),
          el('td', { class: 'n', text: r.charts + ' 张' }), el('td', { class: 'n', text: (Math.round(r.chars / 100) / 10).toFixed(1) + ' 千字' }));
      }) : el('tr', null, el('td', { colspan: '6', text: '没有符合条件的研报。' }))));
    document.getElementById('f-count').textContent = list.length + ' / ' + R.length + ' 篇';
  }
  Site.seg(document.getElementById('f-lane'), [['all', '全部']].concat(LANES.map(l => [l, l])), 'all', v => { state.lane = v; draw(); });
  document.getElementById('f-q').addEventListener('input', e => { state.q = e.target.value; draw(); });
  draw();

  add(document.getElementById('foot'), Site.pagefoot());
  Site.stage(stageEl);
})();
