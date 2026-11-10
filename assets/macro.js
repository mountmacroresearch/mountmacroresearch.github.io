/* 经济：每个地区一个圆盘。圆周上的亮点是研究主题，圆内每条线是一项跨主题研究，
   沿它依次经过的主题画过去。 */
(function () {
  const { el, sv, fmt, add } = Site;
  const H = window.MMR_HUB;
  Site.nav('macro.html');

  const field = document.getElementById('field');
  const defs = Site.defs(field);
  const FAM = ['#ad4a40', '#6290dc', '#b3903a'];
  const stageEl = document.getElementById('stage');
  field.append(Site.dust(210, 71, [0, 0, 1600, 860]), Site.horizon(888));
  defs.append(sv('radialGradient', { id: 'disc' },
    sv('stop', { offset: '0', 'stop-color': '#0d0904' }), sv('stop', { offset: '.8', 'stop-color': '#0a0703' }), sv('stop', { offset: '.97', 'stop-color': '#2a1c08' }), sv('stop', { offset: '1', 'stop-color': '#6b4c1a' })));

  const RD = 190;
  const view = m => 'view.html?region=' + encodeURIComponent(m.key);

  function disc(m, cx, cy) {
    const g = sv('g', { class: 'rise' });
    const n = m.themes.length, idx = new Map(m.themes.map((t, i) => [t.id, i]));
    const at = (i, r) => { const a = -Math.PI / 2 + i / n * Math.PI * 2; return [cx + r * Math.cos(a), cy + r * Math.sin(a), a]; };
    const touch = m.themes.map(t => m.cross.filter(c => c.cards.indexOf(t.id) >= 0).length);
    // 暗的圆盘，亮的边
    g.append(sv('circle', { cx: cx, cy: cy, r: RD + 8, fill: 'none', stroke: '#e9c57c', 'stroke-width': 30, opacity: .16, filter: 'url(#glow-l)' }),
      sv('circle', { cx: cx, cy: cy, r: RD, fill: 'url(#disc)' }),
      sv('circle', { cx: cx, cy: cy, r: RD, fill: 'none', stroke: '#f6dfa6', 'stroke-width': 4, opacity: .45, filter: 'url(#glow)' }),
      sv('circle', { cx: cx, cy: cy, r: RD, fill: 'none', stroke: '#fbeecb', 'stroke-width': 1, opacity: .85 }));
    const hit = sv('circle', { cx: cx, cy: cy, r: RD - 6, fill: 'transparent', class: 'hot', tabindex: '0', role: 'link', 'aria-label': '进入' + m.title });
    hit.addEventListener('click', () => { location.href = view(m); });
    hit.addEventListener('keydown', e => { if (e.key === 'Enter') location.href = view(m); });
    g.append(hit);

    // 跨主题研究：沿路线把主题连起来
    const chords = sv('g'), groups = [];
    m.cross.forEach(c => {
      const cg = sv('g', { class: 'hot dim', 'data-study': c.id });
      const ids = c.cards.map(k => idx.get(k)).filter(v => v != null);
      for (let k = 0; k < ids.length - 1; k++) {
        const p0 = at(ids[k], RD - 3), p1 = at(ids[k + 1], RD - 3), mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2;
        const qx = cx + (mx - cx) * 0.22, qy = cy + (my - cy) * 0.22;
        const d = 'M' + p0[0].toFixed(1) + ' ' + p0[1].toFixed(1) + 'Q' + qx.toFixed(1) + ' ' + qy.toFixed(1) + ' ' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1);
        cg.append(sv('path', { d: d, fill: 'none', stroke: FAM[c.family] || '#cfb07a', 'stroke-width': 1.5, 'stroke-linecap': 'round', opacity: .9 }),
          sv('path', { d: d, fill: 'none', stroke: 'transparent', 'stroke-width': 12 }));
      }
      const on = v => { stageEl.classList.toggle('focus', v); cg.classList.toggle('on', v); c.cards.forEach(k => { const nd = g.querySelector('[data-theme="' + k + '"]'); if (nd) nd.classList.toggle('on', v); }); };
      cg.addEventListener('pointerenter', () => on(true)); cg.addEventListener('pointerleave', () => on(false));
      cg.addEventListener('click', () => { location.href = view(m); });
      Site.hover(cg, () => [el('b', { text: c.question || c.title }), el('div', { text: c.headline }), el('i', { text: m.families[c.family] })]);
      groups.push(cg); chords.append(cg);
    });
    g.append(chords);

    // 主题：圆周上的亮点，经过的研究越多越亮
    m.themes.forEach((t, i) => {
      const p = at(i, RD), q = at(i, RD + 24), cosA = Math.cos(p[2]), sinA = Math.sin(p[2]);
      const anchor = cosA > 0.3 ? 'start' : cosA < -0.3 ? 'end' : 'middle';
      const tg = sv('g', { class: 'hot dim', 'data-theme': t.id, tabindex: '0', role: 'link', 'aria-label': t.name + '：' + t.headline });
      const s = 9 + touch[i] * 2.6;
      tg.append(sv('circle', { cx: p[0], cy: p[1], r: s, fill: 'url(#node)' }), sv('circle', { cx: p[0], cy: p[1], r: 2.4, fill: '#fff8e6' }),
        sv('text', { class: 't2', x: q[0] + (anchor === 'start' ? 2 : anchor === 'end' ? -2 : 0), y: q[1] + (anchor === 'middle' ? (sinA < 0 ? -4 : 16) : 5), 'text-anchor': anchor, style: 'fill:var(--ink)' }, t.name),
        sv('circle', { cx: p[0], cy: p[1], r: 16, fill: 'transparent' }));
      const mine = m.cross.filter(c => c.cards.indexOf(t.id) >= 0).map(c => c.id);
      const on = v => { stageEl.classList.toggle('focus', v); tg.classList.toggle('on', v); groups.forEach(cg => { if (mine.indexOf(cg.dataset.study) >= 0) cg.classList.toggle('on', v); }); };
      tg.addEventListener('pointerenter', () => on(true)); tg.addEventListener('pointerleave', () => on(false));
      tg.addEventListener('focus', () => on(true)); tg.addEventListener('blur', () => on(false));
      tg.addEventListener('click', () => { location.href = view(m); });
      tg.addEventListener('keydown', e => { if (e.key === 'Enter') location.href = view(m); });
      Site.hover(tg, () => [el('b', { text: t.name }), el('div', { text: t.headline }), touch[i] ? Site.kv('跨主题研究', touch[i] + ' 项') : null].filter(Boolean));
      g.append(tg);
    });

    // 圆盘下方：地区名与本期判断
    const parts = m.line.length > 22 ? splitLine(m.line) : [m.line];
    g.append(sv('text', { class: 't', x: cx, y: cy + RD + 78, 'text-anchor': 'middle', style: 'font-size:19px;letter-spacing:.16em' }, m.name),
      sv('text', { class: 'tn', x: cx, y: cy + RD + 100, 'text-anchor': 'middle' }, '更新于 ' + fmt.md(m.date) + '　' + m.counts.themes + ' 个主题　' + m.counts.cross + ' 项跨主题研究'));
    parts.forEach((t, k) => g.append(sv('text', { class: 't2', x: cx, y: cy + RD + 124 + k * 20, 'text-anchor': 'middle' }, t)));
    return g;
  }
  function splitLine(t) { const cuts = []; for (let i = 0; i < t.length; i++) if (t[i] === '，') cuts.push(i + 1); const best = cuts.sort((a, b) => Math.abs(a - t.length / 2) - Math.abs(b - t.length / 2))[0] || Math.ceil(t.length / 2); return [t.slice(0, best), t.slice(best)]; }

  const CENTERS = [[440, 456], [1160, 456]];
  H.macro.forEach((m, i) => {
    field.append(disc(m, CENTERS[i][0], CENTERS[i][1]));
    add(document.getElementById('enters'), el('div', { class: 'enter', style: 'left:' + CENTERS[i][0] + 'px;top:' + (CENTERS[i][1] + RD + 176) + 'px' },
      el('a', { class: 'link', href: view(m), text: '进入' + m.title })));
  });

  add(document.getElementById('meta'), H.macro.map(m => el('span', null, m.name + '更新于 ', el('b', { text: fmt.md(m.date) }))));
  const mini = (...kids) => sv('svg', { viewBox: '0 0 26 12', 'aria-hidden': 'true' }, ...kids);
  add(document.getElementById('legend'),
    el('span', null, mini(sv('circle', { cx: 13, cy: 6, r: 6, fill: 'url(#node)' }), sv('circle', { cx: 13, cy: 6, r: 2, fill: '#fff8e6' })), '研究主题'),
    el('span', null, mini(sv('path', { d: 'M1 10Q13 -4 25 10', fill: 'none', stroke: FAM[0], 'stroke-width': 1.5 })), mini(sv('path', { d: 'M1 10Q13 -4 25 10', fill: 'none', stroke: FAM[1], 'stroke-width': 1.5 })), mini(sv('path', { d: 'M1 10Q13 -4 25 10', fill: 'none', stroke: FAM[2], 'stroke-width': 1.5 })), '跨主题研究，按问题类别分色'));

  // ── 纸面：各地区一段综述 ──
  const metricText = m => fmt.num(m.value, Math.abs(m.value) >= 100 ? 0 : 1) + (/%/.test(m.unit) ? '%' : '');
  add(document.getElementById('regions'), H.macro.map(m => el('article', { class: 'region', id: m.key },
    el('h2', null, m.title, el('small', { text: '更新于 ' + m.date })),
    el('p', { class: 'judg', text: m.line + '。' }), el('p', { class: 'lead-p', text: m.lead }),
    el('dl', { class: 'kvs' }, m.metrics.map(x => el('div', { class: 'kv-b' }, el('dt', { text: x.label + (/%/.test(x.unit) ? '' : '（' + x.unit + '）') }), el('dd', { text: metricText(x) }), el('small', { text: x.period })))),
    el('div', { class: 'go' }, el('a', { class: 'btn', href: view(m), text: '进入' + m.title })))));

  add(document.getElementById('foot'), Site.pagefoot());
  Site.stage(stageEl);
})();
