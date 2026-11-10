/* 整站共用：顶栏、舞台缩放、悬停读数、详情面板。各页只写自己的那张图。 */
(function () {
  const NS = 'http://www.w3.org/2000/svg';

  function apply(n, attrs) {
    if (!attrs) return;
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'text') n.textContent = v;
      else if (k === 'on') for (const [e, f] of Object.entries(v)) n.addEventListener(e, f);
      else if (k === 'data') for (const [d, x] of Object.entries(v)) n.dataset[d] = x;
      else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
      else n.setAttribute(k, v === true ? '' : v);
    }
  }
  function append(n, kids) {
    for (const k of kids.flat(Infinity)) {
      if (k === null || k === undefined || k === false) continue;
      n.append(k.nodeType ? k : document.createTextNode(String(k)));
    }
  }
  // 所有文字都经 textContent 进入页面；数据里的字符串不会被当成标记执行。
  function el(tag, attrs, ...kids) { const n = document.createElement(tag); apply(n, attrs); append(n, kids); return n; }
  function sv(tag, attrs, ...kids) { const n = document.createElementNS(NS, tag); apply(n, attrs); append(n, kids); return n; }

  const fmt = {
    md: iso => (iso ? String(iso).slice(5, 10) : '—'),
    ymd: iso => (iso ? String(iso).slice(0, 10) : '—'),
    cn(iso) { if (!iso) return '—'; const [, m, d] = String(iso).slice(0, 10).split('-').map(Number); return m + '月' + d + '日'; },
    cny(iso) { if (!iso) return '—'; const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number); return y + '年' + m + '月' + d + '日'; },
    pct: (v, d = 2) => (v == null || !isFinite(v) ? '—' : (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(d) + '%'),
    num: (v, d = 0) => (v == null || !isFinite(v) ? '—' : Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })),
    usd: (v, d = 2) => (v == null || !isFinite(v) ? '—' : (v < 0 ? '−$' : v > 0 ? '+$' : '$') + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })),
    days: (a, b) => Math.round((Date.parse(String(b).slice(0, 10)) - Date.parse(String(a).slice(0, 10))) / 864e5),
  };
  // 带方向的数：三角记号带颜色，数字本身保持正文色。
  function signed(v, text) { return el('span', { class: v > 0 ? 'up' : v < 0 ? 'dn' : null, text: text }); }

  const TABS = [['index.html', '总览'], ['macro.html', '经济'], ['research.html', '专题'], ['forecast.html', '指数'], ['stocks.html', '个股']];
  function nav(active) {
    const H = window.MMR_HUB;
    const aside = el('span', { class: 'aside' }, H && H.builtAt ? el('span', { text: '更新于 ' + H.builtAt }) : null);
    const bar = el('nav', { class: 'nav', 'aria-label': '栏目' },
      el('a', { class: 'brand', href: 'index.html' }, el('b', { text: 'MMR' }), el('span', { text: 'Mount Macro Research' })),
      TABS.map(([href, label]) => el('a', { class: 'tab', href: href, 'aria-current': href === active ? 'page' : null, text: label })), aside);
    document.body.prepend(bar);
    fit();
    window.addEventListener('resize', fit);
    return bar;
  }

  function fit() {
    const w = document.documentElement.clientWidth || window.innerWidth, h = Math.max(window.innerHeight - 48, 420);
    const s = Math.min(w / 1600, (h * 1.1) / 900, 1.3);
    document.documentElement.style.setProperty('--s', s.toFixed(4));
  }
  function stage(node) {
    const reveal = () => node.classList.remove('pre');
    requestAnimationFrame(() => requestAnimationFrame(reveal));
    setTimeout(reveal, 700); // 页面在后台打开时动画帧不走，定时器保证内容一定显示出来
  }

  let tipEl;
  function tip(evt, content) {
    if (!tipEl) { tipEl = el('div', { class: 'tip', role: 'status' }); document.body.append(tipEl); }
    tipEl.replaceChildren(...[].concat(content));
    tipEl.hidden = false;
    const r = tipEl.getBoundingClientRect();
    let x, y;
    if (evt.clientX !== undefined && evt.type !== 'focus') { x = evt.clientX + 16; y = evt.clientY + 18; }
    else { const b = evt.target.getBoundingClientRect(); x = b.right + 10; y = b.top; }
    if (x + r.width > innerWidth - 8) x = Math.max(8, x - r.width - 32);
    if (y + r.height > innerHeight - 8) y = Math.max(8, y - r.height - 30);
    tipEl.style.left = x + 'px'; tipEl.style.top = y + 'px';
  }
  function untip() { if (tipEl) tipEl.hidden = true; }
  // 悬停与键盘聚焦给同一份读数。
  function hover(node, build) {
    node.addEventListener('pointermove', e => tip(e, build()));
    node.addEventListener('pointerleave', untip);
    node.addEventListener('focus', e => tip(e, build()));
    node.addEventListener('blur', untip);
    return node;
  }
  function kv(k, v) { return el('div', { class: 'kv' }, el('span', { text: k }), el('span', { text: v })); }

  // ── 详情面板 ──
  let dz, dzLast;
  function buildDossier() {
    dz = el('div', { class: 'dossier', 'aria-hidden': 'true' },
      el('div', { class: 'veil', on: { click: closeDossier } }),
      el('section', { class: 'panel', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'dz-title' },
        el('header', null,
          el('div', { class: 'top' }, el('span', { class: 'kicker' }), el('button', { class: 'close', type: 'button', text: '收起', on: { click: closeDossier } })),
          el('h3', { id: 'dz-title' }), el('p', { class: 'line' }), el('div', { class: 'facts' }), el('div', { class: 'tabs', role: 'tablist' })),
        el('div', { class: 'body', role: 'tabpanel', tabindex: '0' })));
    document.body.append(dz);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && dz.classList.contains('open')) closeDossier(); });
  }
  function dossier(spec) {
    if (!dz) buildDossier();
    dzLast = document.activeElement;
    const q = s => dz.querySelector(s);
    q('.kicker').textContent = spec.kicker || '';
    q('h3').textContent = spec.title || '';
    const line = q('.line'); line.replaceChildren(...[].concat(spec.line || [])); line.hidden = !spec.line;
    q('.facts').replaceChildren(...(spec.facts || []).filter(Boolean).map(([k, v]) => el('div', null, el('b', null, v), k)));
    const tabs = q('.tabs'), body = q('.body');
    const show = i => {
      [...tabs.children].forEach((b, j) => b.setAttribute('aria-selected', j === i ? 'true' : 'false'));
      body.replaceChildren(...[].concat(spec.tabs[i].build()).filter(Boolean));
      body.scrollTop = 0;
    };
    tabs.replaceChildren(...spec.tabs.map((t, i) => el('button', { type: 'button', role: 'tab', on: { click: () => show(i) } }, t.label, t.count ? el('small', { text: t.count }) : null)));
    tabs.hidden = spec.tabs.length < 2;
    show(spec.tab || 0);
    dz.classList.add('open'); dz.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (spec.hash) history.replaceState(null, '', '#' + spec.hash);
    q('.close').focus({ preventScroll: true });
  }
  function closeDossier() {
    if (!dz) return;
    dz.classList.remove('open'); dz.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    if (dzLast && dzLast.focus) dzLast.focus({ preventScroll: true });
  }
  // 详情正文里的常用块
  const block = {
    h: t => el('h4', { text: t }),
    p: t => (t ? el('p', { text: t }) : null),
    list: items => (items && items.length ? el('ul', null, items.filter(Boolean).map(t => el('li', { text: t }))) : null),
    defs: rows => { const keep = rows.filter(r => r && r[1] != null && r[1] !== ''); return keep.length ? el('dl', { class: 'defs' }, keep.map(([k, v]) => [el('dt', { text: k }), el('dd', null, v)])) : null; },
    quiet: t => el('p', { class: 'quiet', text: t }),
    // 一个小标题加它的内容；内容为空时整段不出现
    sect: (title, ...kids) => { const body = kids.flat(Infinity).filter(Boolean); return body.length ? [el('h4', { text: title }), ...body] : []; },
  };

  // 页脚
  function pagefoot(notes) {
    const H = window.MMR_HUB, year = H && H.builtAt ? H.builtAt.slice(0, 4) : new Date().getFullYear();
    return el('footer', { class: 'pagefoot' }, (notes || []).map(t => el('p', { text: t })),
      el('p', { text: '© ' + year + ' Mount Macro Research　本站内容为研究记录，不构成投资建议。' }));
  }
  // 访客所在地的今天
  function today() { const d = new Date(), p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }

  // 舞台 SVG 的公共定义：光晕、节点、星尘
  function defs(svgEl) {
    const d = sv('defs', null,
      sv('filter', { id: 'glow', x: '-60%', y: '-60%', width: '220%', height: '220%' }, sv('feGaussianBlur', { stdDeviation: '5' })),
      sv('filter', { id: 'glow-l', x: '-100%', y: '-100%', width: '300%', height: '300%' }, sv('feGaussianBlur', { stdDeviation: '16' })),
      sv('filter', { id: 'glow-s', x: '-60%', y: '-60%', width: '220%', height: '220%' }, sv('feGaussianBlur', { stdDeviation: '2.2' })),
      sv('radialGradient', { id: 'node' },
        sv('stop', { offset: '0', 'stop-color': '#fff8e6' }), sv('stop', { offset: '.22', 'stop-color': '#f3d99a' }),
        sv('stop', { offset: '.55', 'stop-color': '#cfa24a', 'stop-opacity': '.38' }), sv('stop', { offset: '1', 'stop-color': '#cfa24a', 'stop-opacity': '0' })),
      sv('radialGradient', { id: 'node-dim' },
        sv('stop', { offset: '0', 'stop-color': '#f1eadb', 'stop-opacity': '.9' }), sv('stop', { offset: '.4', 'stop-color': '#cfb07a', 'stop-opacity': '.3' }),
        sv('stop', { offset: '1', 'stop-color': '#cfb07a', 'stop-opacity': '0' })));
    svgEl.prepend(d);
    return d;
  }
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function dust(n, seed, box) {
    const r = rng(seed), g = sv('g', { 'aria-hidden': 'true' });
    const [x0, y0, x1, y1] = box || [0, 0, 1600, 900];
    for (let i = 0; i < n; i++) {
      const o = 0.08 + r() * r() * 0.5;
      g.append(sv('circle', { cx: (x0 + r() * (x1 - x0)).toFixed(1), cy: (y0 + r() * (y1 - y0)).toFixed(1), r: (0.4 + r() * 0.9).toFixed(2), fill: '#f1eadb', opacity: o.toFixed(2) }));
    }
    return g;
  }

  // 每个舞台底边都露出一线日面
  function horizon(top) {
    const R0 = 9000, cy = top + R0, a = Math.asin(900 / R0);
    const p = t => (800 + R0 * Math.sin(t)).toFixed(1) + ' ' + (cy - R0 * Math.cos(t)).toFixed(1);
    const d = 'M' + p(-a) + 'A' + R0 + ' ' + R0 + ' 0 0 1 ' + p(a);
    return sv('g', { 'aria-hidden': 'true' },
      sv('ellipse', { cx: 800, cy: top + 40, rx: 1000, ry: 130, fill: '#d9b56c', opacity: .08, filter: 'url(#glow-l)' }),
      sv('path', { d: d, fill: 'none', stroke: '#e9c57c', 'stroke-width': 24, opacity: .2, filter: 'url(#glow-l)' }),
      sv('path', { d: d + 'L1750 1000L-150 1000Z', fill: '#0b0703' }),
      sv('path', { d: d, fill: 'none', stroke: '#f6dfa6', 'stroke-width': 4, opacity: .5, filter: 'url(#glow)' }),
      sv('path', { d: d, fill: 'none', stroke: '#fbeecb', 'stroke-width': 1, opacity: .85 }));
  }
  // 简单的分页表：rows 变了就重画
  function pager(host, opts) {
    let page = 0, rows = [];
    const body = el('tbody'), info = el('span'), prev = el('button', { type: 'button', text: '上一页' }), next = el('button', { type: 'button', text: '下一页' });
    const table = el('table', { class: 'tbl ' + (opts.cls || '') }, el('thead', null, el('tr', null, opts.head.map(h => el('th', { class: h[1] || null, text: h[0] })))), body);
    const draw = () => {
      const size = opts.size || 20, pages = Math.max(1, Math.ceil(rows.length / size));
      page = Math.min(page, pages - 1);
      body.replaceChildren(...rows.slice(page * size, page * size + size).map(opts.row));
      if (!rows.length) body.append(el('tr', null, el('td', { colspan: opts.head.length, class: 'quiet', text: opts.empty || '没有符合条件的记录，放宽筛选再看。' })));
      info.textContent = rows.length ? '第 ' + (page * size + 1) + ' 至 ' + Math.min(rows.length, page * size + size) + ' 条，共 ' + rows.length + ' 条' : '';
      prev.disabled = page === 0; next.disabled = page >= pages - 1;
    };
    prev.addEventListener('click', () => { page--; draw(); });
    next.addEventListener('click', () => { page++; draw(); });
    host.replaceChildren(el('div', { class: 'tbl-wrap' }, table), el('div', { class: 'pager' }, info, el('div', null, prev, ' ', next)));
    return { set(r) { rows = r; page = 0; draw(); } };
  }
  function seg(host, options, value, onChange) {
    const draw = v => [...host.children].forEach(b => b.setAttribute('aria-pressed', b.dataset.v === v ? 'true' : 'false'));
    host.replaceChildren(...options.map(([v, label]) => el('button', { type: 'button', data: { v: v }, text: label, on: { click: () => { draw(v); onChange(v); } } })));
    draw(value);
    return draw;
  }

  // 往已有节点里追加内容：数组会展开，空值跳过（原生 append 会把 null 写成文字）
  function add(n, ...kids) { append(n, kids); return n; }

  window.Site = { add, el, sv, fmt, signed, nav, stage, fit, tip, untip, hover, kv, dossier, closeDossier, block, pagefoot, today, defs, dust, rng, horizon, pager, seg };
})();
