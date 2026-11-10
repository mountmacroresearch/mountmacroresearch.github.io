/* 研报阅读页：题头、目录、正文、相关阅读。 */
(function () {
  const { el, fmt, add } = Site;
  const H = window.MMR_HUB, R = H.reports;
  Site.nav('research.html');
  const link = x => 'report.html?id=' + encodeURIComponent(x.id);
  const id = new URLSearchParams(location.search).get('id') || R[R.length - 1].id;
  const i = R.findIndex(r => r.id === id), r = R[i];
  const mast = document.getElementById('mast'), prose = document.getElementById('prose');
  if (!r) {
    add(mast, el('p', { class: 'kicker' }, el('a', { href: 'research.html', text: '专题研究' })), el('h1', { text: '没有找到这篇研报' }), el('p', { class: 'sub' }, el('a', { class: 'link', href: 'research.html', text: '查看全部研报' })));
    document.querySelector('.reader').hidden = true;
    document.getElementById('foot').append(Site.pagefoot());
    return;
  }
  document.title = r.title + ' · Mount Macro Research';
  add(mast,
    el('p', { class: 'kicker' }, el('a', { href: 'research.html', text: '专题研究' })),
    el('h1', { text: r.title }), r.subtitle ? el('p', { class: 'sub', text: r.subtitle }) : null,
    el('div', { class: 'facts' }, [['日期', fmt.cny(r.date)], ['地区', r.lane], ['图表', r.charts + ' 张'], ['篇幅', (Math.round(r.chars / 100) / 10).toFixed(1) + ' 千字']]
      .map(([k, v]) => el('div', null, el('b', { text: v }), k))),
    r.assetKeys.length ? el('div', { class: 'chips' }, r.assetKeys.map(k => el('span', { text: k === 'A股' ? 'A 股' : k }))) : null,
    el('div', { class: 'acts' }, el('button', { class: 'link', type: 'button', text: '打印', on: { click: () => window.print() } })));

  const toc = document.getElementById('toc');
  add(toc, el('h2', { text: '目录' }), r.toc.map(t => el('a', { href: '#' + t.id, data: { id: t.id }, text: t.text })), el('a', { class: 'back', href: 'research.html', text: '全部研报' }));

  function fill(data) {
    // 正文是研报原文的排版内容，不含脚本
    prose.innerHTML = data.body;
    const lead = el('div', { class: 'lead' });
    while (prose.firstChild && !(prose.firstChild.nodeType === 1 && /^H2$/.test(prose.firstChild.tagName))) {
      const n = prose.firstChild;
      if (n.nodeType === 1 && /summary-box|highlight-box/.test(n.className || '')) { while (n.firstChild) lead.append(n.firstChild); n.remove(); } else lead.append(n);
    }
    if (lead.textContent.trim()) prose.prepend(lead);
    prose.querySelectorAll('svg').forEach(s => { s.removeAttribute('width'); s.removeAttribute('height'); });

    const after = document.getElementById('after');
    const same = R.filter(x => x.id !== r.id && x.assetKeys.some(k => r.assetKeys.indexOf(k) >= 0))
      .map(x => ({ x: x, shared: x.assetKeys.filter(k => r.assetKeys.indexOf(k) >= 0) })).sort((a, b) => b.shared.length - a.shared.length || b.x.date.localeCompare(a.x.date)).slice(0, 4);
    const layers = [];
    if (r.assetKeys.indexOf('美股') >= 0) layers.push(['指数', '标普500 当日预测', 'forecast.html#' + nearestDay(r.date)]);
    if (r.assetKeys.indexOf('美股') >= 0 || r.assetKeys.indexOf('A股') >= 0) layers.push(['个股', 'A 股与美股个股机会', 'stocks.html']);
    if (r.lane !== '中国') layers.push(['经济', '基础经济研究', 'macro.html']);
    add(after,
      same.length ? [el('h2', { text: '相关研报' }), el('div', { class: 'rel' }, same.map(s => el('a', { href: link(s.x) }, el('span', { text: s.x.date }), el('div', null, s.x.title, el('small', { style: 'display:block;color:var(--p-ink2);font-size:12.5px', text: s.shared.map(k => (k === 'A股' ? 'A 股' : k)).join('、') })))))] : [],
      layers.length ? [el('h2', { style: 'margin-top:34px', text: '延伸阅读' }), el('div', { class: 'rel' }, layers.map(l => el('a', { href: l[2] }, el('span', { text: l[0] }), el('div', { text: l[1] }))))] : []);
    if (data.disclaimer) { const d = el('div', { class: 'disclaimer' }); d.innerHTML = data.disclaimer; after.append(d); }
    add(after, el('div', { class: 'pn' },
      i > 0 ? el('a', { href: link(R[i - 1]) }, el('span', { text: '上一篇　' + R[i - 1].date }), R[i - 1].title) : el('span'),
      i < R.length - 1 ? el('a', { href: link(R[i + 1]) }, el('span', { text: '下一篇　' + R[i + 1].date }), R[i + 1].title) : el('span')));

    // 目录跟随阅读位置
    const heads = [...prose.querySelectorAll('h2[id]')], links = [...toc.querySelectorAll('a[data-id]')];
    const mark = () => {
      let cur = heads[0];
      heads.forEach(h => { if (h.getBoundingClientRect().top < 120) cur = h; });
      links.forEach(a => a.classList.toggle('on', !!cur && a.dataset.id === cur.id));
    };
    window.addEventListener('scroll', mark, { passive: true }); mark();
    if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }
  }
  function nearestDay(date) {
    const days = H.spx.lite.map(d => d.d);
    return days.filter(d => d >= date)[0] || days[days.length - 1];
  }

  const s = el('script', { src: 'data/reports/' + encodeURIComponent(r.id) + '.js?v=' + r.ver });
  s.addEventListener('load', () => fill(window.MMR_REPORT_BODY));
  s.addEventListener('error', () => { prose.replaceChildren(el('p', { class: 'fine', text: '正文没有载入，请刷新重试。' })); });
  document.body.append(s);

  document.getElementById('foot').append(Site.pagefoot());
})();
