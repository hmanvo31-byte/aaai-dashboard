/* ============================================================
   AAAI — Active Ageing Index dashboard
   Application logic. Reads everything from AAAI_DATA (data.js).
   No build step required — open index.html directly, or host
   the three files (index.html, styles.css, app.js, data.js) as
   a static site.
   ============================================================ */

const COUNTRIES = AAAI_DATA.countries;
const COUNTRY_META = {
  Vietnam:   { abbr:'VN', css:'--c-vn' },
  Indonesia: { abbr:'ID', css:'--c-id' },
  Thailand:  { abbr:'TH', css:'--c-th' },
  Singapore: { abbr:'SG', css:'--c-sg' },
  Malaysia:  { abbr:'MY', css:'--c-my' },
  Japan:     { abbr:'JP', css:'--c-jp' },
};
function ccolor(country){ return getComputedStyle(document.documentElement).getPropertyValue(COUNTRY_META[country].css).trim(); }

/* ---------------- curated policy recommendations ----------------
   These are hand-written / vetted lines a policy team would author —
   distinct from the auto-generated "gap" flags below. Add, edit or
   remove entries here; the Recommendations view re-renders from this
   array on load. Each entry can reference a domain/indicator code so
   the reader can jump to the evidence. */
const CURATED_RECOMMENDATIONS = [
  {
    country: 'Malaysia', priority: 'high', domain: '1. Policy & Statistics', code: '1.4',
    text: 'Legislate a standalone age-discrimination protection covering employment and services. Malaysia currently relies on general Federal Constitution equality provisions with no dedicated enforcement mechanism — the weakest legal protection among the six countries reviewed.'
  },
  {
    country: 'Thailand', priority: 'medium', domain: '1. Policy & Statistics', code: '1.4',
    text: 'Consolidate scattered age-discrimination provisions (Older Persons Act, Labor Protection Act, constitutional clauses) into a single referenceable statute so employers and older workers have one clear standard.'
  },
  {
    country: 'Malaysia', priority: 'high', domain: '1. Policy & Statistics', code: '1.5',
    text: 'Move from a long-term care strategic framework to a funded national LTC financing mechanism (insurance or budgeted entitlement) — Malaysia is the only country in the group without one.'
  },
  {
    country: 'Indonesia', priority: 'medium', domain: '1. Policy & Statistics', code: '1.12',
    text: 'Centralize long-term care facility registration under a single authority. Bed and facility counts currently sit across multiple ministries with no consolidated national total.'
  },
  {
    country: 'Singapore', priority: 'low', domain: '2. Income & Livelihood Security', code: '2.1',
    text: 'Publish an official low-income threshold (or an agreed proxy) for older residents so old-age poverty can be tracked on a consistent, comparable basis with peer countries.'
  },
  {
    country: 'Japan', priority: 'medium', domain: '1. Policy & Statistics', code: '1.13',
    text: 'Extend the existing National Transfer Accounts programme to produce a National Time Transfer Account, capturing the economic value of unpaid family caregiving as the 80+ population grows.'
  },
];

/* ---------------- status normalisation ---------------- */
function normalizeStatus(raw){
  if(raw===undefined || raw===null) return null;
  const s = String(raw).trim();
  if(s==='' || s.toLowerCase()==='nan' || s.toLowerCase()==='n.a' || s.toLowerCase()==='n.a.') return null;
  const low = s.toLowerCase();
  const numeric = s.replace(/,/g,'').replace(/%$/,'');
  if(/^-?\d+(\.\d+)?$/.test(numeric)) return {type:'data', display:s};
  if(/^https?:\/\//.test(s)) return {type:'yes', display:s, caveat:true};
  if(/no standalone|no specific|no single|no sigle|not part of regular/.test(low)) return {type:'no', display:s};
  if(/^yes\b/.test(low)){
    if(/,\s*no/.test(low) || /\bno[\s\)]/.test(low.slice(3,30))) return {type:'partial', display:s};
    return {type:'yes', display:s};
  }
  if(/^no\b/.test(low)) return {type:'no', display:s};
  if(/maybe|not sure|tbc\b|confirming|unsure/.test(low)) return {type:'partial', display:s};
  return {type:'unclear', display:s};
}

function indicatorFormat(ind){
  const types = COUNTRIES.map(c => normalizeStatus(ind.values[c])).filter(Boolean).map(x=>x.type);
  const binaryish = types.filter(t=>['yes','no','partial'].includes(t)).length;
  if(types.length===0) return 'empty';
  return binaryish >= types.length * 0.6 ? 'binary' : 'other';
}

/* ---------------- demographic helpers ---------------- */
function demoVal(code, country){
  const row = AAAI_DATA.demographics[code];
  if(!row) return null;
  let v = row.values[country];
  if(v===undefined || v===null || v==='' ) return null;
  return v;
}
function demoNum(code, country){
  const v = demoVal(code, country);
  if(v===null) return null;
  const n = parseFloat(String(v).replace(/,/g,''));
  return isNaN(n) ? null : n;
}
function demoYear(code, country){
  const row = AAAI_DATA.demographics[code];
  return row && row.years ? (row.years[country] || '') : '';
}
function demoSource(code, country){
  const row = AAAI_DATA.demographics[code];
  return row && row.sources ? (row.sources[country] || '') : '';
}
function fmtInt(n){ return n===null ? '—' : Math.round(n).toLocaleString('en-US'); }
function fmtPct(n){ return n===null ? '—' : (n<=1 ? (n*100).toFixed(1) : n.toFixed(1)) + '%'; }
function pctVal(n){ return n===null ? null : (n<=1 ? n*100 : n); }

/* ============================================================
   TAB NAVIGATION
   ============================================================ */
const views = ['overview','map','profiles','domains','compare','about'];
function showView(name){
  views.forEach(v=>{
    document.getElementById('view-'+v).classList.toggle('active', v===name);
    document.querySelector(`nav.tabs button[data-view="${v}"]`).classList.toggle('active', v===name);
  });
  window.scrollTo({top:0, behavior:'smooth'});
}
document.querySelectorAll('nav.tabs button').forEach(btn=>{
  btn.addEventListener('click', ()=> showView(btn.dataset.view));
});

/* ============================================================
   OVERVIEW
   ============================================================ */
function renderOverview(){
  const total60 = COUNTRIES.reduce((s,c)=> s + (demoNum('A1',c)||0), 0);
  const total65 = COUNTRIES.reduce((s,c)=> s + (demoNum('B1',c)||0), 0);
  const avgDep = COUNTRIES.reduce((s,c)=> s + (demoNum('B5',c)||0), 0) / COUNTRIES.length;

  document.getElementById('hero-figure').textContent = (total60/1e6).toFixed(0) + 'M';
  document.getElementById('hero-sub1').textContent = fmtInt(total65);
  document.getElementById('hero-sub2').textContent = avgDep.toFixed(1);

  const wrap = document.getElementById('overview-cards');
  wrap.innerHTML = '';
  COUNTRIES.forEach(c=>{
    const a1 = demoNum('A1',c), a2 = pctVal(demoNum('A2',c)), b5 = demoNum('B5',c);
    const div = document.createElement('div');
    div.className = 'country-card';
    div.innerHTML = `
      <h3><span class="flagdot" style="background:${ccolor(c)}"></span>${c}</h3>
      <div class="row"><span>Population 60+</span><b>${fmtInt(a1)}</b></div>
      <div class="row"><span>Share of population</span><b>${a2===null?'—':a2.toFixed(1)+'%'}</b></div>
      <div class="row"><span>Old-age dependency ratio</span><b>${b5===null?'—':b5.toFixed(1)}</b></div>
    `;
    div.addEventListener('click', ()=>{ currentProfileCountry=c; showView('profiles'); renderProfiles(); });
    wrap.appendChild(div);
  });

  const ctx = document.getElementById('overview-chart');
  if(overviewChart) overviewChart.destroy();
  overviewChart = new Chart(ctx, {
    type:'bar',
    data:{
      labels: COUNTRIES,
      datasets:[{
        label:'Population aged 60+ (% of total)',
        data: COUNTRIES.map(c=> pctVal(demoNum('A2',c))),
        backgroundColor: COUNTRIES.map(c=>ccolor(c)),
        borderRadius:2, maxBarThickness:46
      }]
    },
    options:{
      plugins:{legend:{display:false}, tooltip:{callbacks:{label:(i)=> i.formattedValue+'%'}}},
      scales:{ y:{ beginAtZero:true, ticks:{callback:v=>v+'%'}, grid:{color:'#D8D0BA'} }, x:{grid:{display:false}} }
    }
  });
}
let overviewChart=null;

/* ============================================================
   MAP
   ============================================================ */
// Approximate centroid coordinates — good enough for a schematic
// relative-position map, not a precise political map.
const COUNTRY_COORDS = {
  Vietnam:   { lat: 16.0,  lng: 108.0 },
  Indonesia: { lat: -2.0,  lng: 118.0 },
  Thailand:  { lat: 15.0,  lng: 101.0 },
  Singapore: { lat: 1.35,  lng: 103.8 },
  Malaysia:  { lat: 4.0,   lng: 109.5 },
  Japan:     { lat: 36.0,  lng: 138.0 },
};
const MAP_VIEWBOX = { w: 700, h: 460 };
function projectLng(lng){ return 50 + (lng - 95) / 50 * 600; }
function projectLat(lat){ return 40 + (45 - lat) / 55 * 400; }

function mapRadius(pop, allPops){
  const min = Math.sqrt(Math.min(...allPops));
  const max = Math.sqrt(Math.max(...allPops));
  const r = Math.sqrt(pop);
  const t = max===min ? 0.5 : (r - min) / (max - min);
  return 12 + t * 34; // 12px .. 46px
}

function renderMap(){
  const pops = COUNTRIES.map(c => demoNum('A1', c) || 0);
  let nodes = '';
  COUNTRIES.forEach(c=>{
    const { lat, lng } = COUNTRY_COORDS[c];
    const x = projectLng(lng), y = projectLat(lat);
    const pop = demoNum('A1', c) || 0;
    const r = mapRadius(pop, pops);
    nodes += `
      <g class="map-node" data-country="${c}" transform="translate(${x},${y})">
        <circle r="${r}" fill="${ccolor(c)}" fill-opacity="0.82"></circle>
        <text x="0" y="${-r-8}" text-anchor="middle">${c}</text>
        <text class="pop" x="0" y="${-r+18 > 4 ? 4 : -r+18}" text-anchor="middle" fill="#fff" style="font-size:${Math.min(11, r*0.5)}px">${(pop/1e6).toFixed(1)}M</text>
      </g>`;
  });

  const svg = `<svg viewBox="0 0 ${MAP_VIEWBOX.w} ${MAP_VIEWBOX.h}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="${MAP_VIEWBOX.w}" height="${MAP_VIEWBOX.h}" fill="var(--paper)"></rect>
    ${nodes}
  </svg>`;
  document.getElementById('map-wrap').innerHTML = svg;

  document.querySelectorAll('.map-node').forEach(node=>{
    node.addEventListener('click', ()=>{
      currentProfileCountry = node.dataset.country;
      showView('profiles');
      renderProfiles();
    });
  });

  const legend = document.getElementById('map-legend');
  legend.innerHTML = COUNTRIES.map(c=>`
    <div class="item"><span class="swatch" style="background:${ccolor(c)}"></span>${c} — ${fmtInt(demoNum('A1',c))} aged 60+</div>
  `).join('');
}

/* ============================================================
   COUNTRY PROFILES
   ============================================================ */
let currentProfileCountry = COUNTRIES[0];

function domainGapCounts(country, domain){
  let yes=0,no=0,partial=0;
  domain.indicators.forEach(ind=>{
    if(indicatorFormat(ind)!=='binary') return;
    const st = normalizeStatus(ind.values[country]);
    if(!st){ partial++; return; } // blank / not-yet-collected counts as pending
    if(st.type==='yes') yes++;
    else if(st.type==='no') no++;
    else if(st.type==='partial') partial++;
  });
  return {yes,no,partial};
}

function renderCountryRail(){
  const rail = document.getElementById('country-rail');
  rail.innerHTML = '';
  COUNTRIES.forEach(c=>{
    const b = document.createElement('button');
    b.innerHTML = `<span class="dot" style="background:${ccolor(c)}"></span>${c}`;
    b.className = c===currentProfileCountry ? 'active':'';
    b.addEventListener('click', ()=>{ currentProfileCountry=c; renderProfiles(); });
    rail.appendChild(b);
  });
}

function livingArrangementRows(country){
  const rows = [
    ['C1','Living alone'], ['C2','With spouse/partner only'],
    ['C3','With children / family'], ['C4','Institutional care']
  ];
  return rows.map(([code,label])=>{
    let v = pctVal(demoNum(code,country));
    const raw = demoVal(code,country);
    return {label, v, raw, year: demoYear(code,country), source: demoSource(code,country)};
  });
}
function maritalRows(country){
  const rows = [['D1','Married / in union'], ['D2','Widowed'], ['D3','Divorced / separated'], ['D4','Never married']];
  return rows.map(([code,label])=>{
    let v = pctVal(demoNum(code,country));
    const raw = demoVal(code,country);
    return {label, v, raw, year: demoYear(code,country), source: demoSource(code,country)};
  });
}
function renderBarPanel(elId, rows){
  const el = document.getElementById(elId);
  el.innerHTML = rows.map(r=>{
    const w = r.v===null ? 0 : Math.min(100, r.v);
    const display = r.v===null ? (r.raw ? String(r.raw).slice(0,18) : '—') : r.v.toFixed(1)+'%';
    const tip = [r.source, r.year ? `(${r.year})` : ''].filter(Boolean).join(' ');
    return `<div class="bar-row" ${tip ? `title="${tip.replace(/"/g,'&quot;')}"` : ''}>
      <span class="lbl">${r.label}</span>
      <span class="track"><span class="fill" style="width:${w}%"></span></span>
      <span class="val">${display}</span>
    </div>`;
  }).join('');
  // Compact source/year footnote — de-duplicated across rows
  const notes = [...new Set(rows.filter(r=>r.source).map(r=> r.source + (r.year?` (${r.year})`:'')))];
  const noteEl = document.getElementById(elId + '-note');
  if(noteEl) noteEl.textContent = notes.length ? 'Source: ' + notes.join(' · ') : '';
}

const POPULATION_CODES = [
  'A1','A2','A3','A4','A5','B1','B2','B3','B4','B5'
];
function renderPopulationTable(country){
  const tbl = document.getElementById('population-table');
  const rows = POPULATION_CODES.map(code=>{
    const row = AAAI_DATA.demographics[code];
    if(!row) return '';
    const raw = row.values[country];
    const year = (row.years && row.years[country]) || '—';
    const source = (row.sources && row.sources[country]) || '';
    let display;
    if(raw===undefined || raw===null || raw==='') display = 'Pending';
    else {
      const n = parseFloat(String(raw).replace(/,/g,''));
      if(isNaN(n)) display = String(raw);
      else if(/ratio/i.test(row.label)) display = n.toFixed(1);
      else if(/%|percent/i.test(row.label)) display = fmtPct(n);
      else display = n < 1000 ? n.toLocaleString('en-US',{maximumFractionDigits:2}) : fmtInt(n);
    }
    return `<tr>
      <td class="code">${code}</td>
      <td class="name">${row.label}</td>
      <td class="num" style="font-family:var(--font-mono)">${display}</td>
      <td style="color:var(--ink-soft);font-size:12px">${year}</td>
      <td style="color:var(--ink-soft);font-size:12px">${source}</td>
    </tr>`;
  }).join('');
  tbl.innerHTML = `<thead><tr><th style="width:44px">Code</th><th>Indicator</th><th>Value</th><th>Year</th><th>Source</th></tr></thead><tbody>${rows}</tbody>`;
}

function renderProfiles(){
  renderCountryRail();
  const c = currentProfileCountry;
  document.getElementById('profile-name').textContent = c;
  const a1=demoNum('A1',c), a2=pctVal(demoNum('A2',c)), b1=demoNum('B1',c), b3=demoNum('B3',c), b5=demoNum('B5',c);
  document.getElementById('profile-meta').textContent =
    `${fmtInt(a1)} people aged 60+ (${a2===null?'—':a2.toFixed(1)+'%'} of the population) · ${fmtInt(b3)} aged 80+ · dependency ratio ${b5===null?'—':b5.toFixed(1)}`;

  renderPopulationTable(c);
  renderBarPanel('panel-living', livingArrangementRows(c));
  renderBarPanel('panel-marital', maritalRows(c));

  const strip = document.getElementById('score-strip');
  strip.innerHTML = '';
  AAAI_DATA.domains.forEach((d, idx)=>{
    const {yes,no,partial} = domainGapCounts(c, d);
    const cell = document.createElement('div');
    cell.className = 'score-cell';
    cell.innerHTML = `
      <div class="dnum">${d.name.split('.')[0]}</div>
      <div class="dname">${d.name.replace(/^\d+\.\s*/,'')}</div>
      <div class="counts">
        <span class="pill yes">${yes} yes</span>
        <span class="pill no">${no} gap</span>
        ${partial? `<span class="pill partial">${partial} pending</span>`:''}
      </div>`;
    cell.addEventListener('click', ()=>{ currentDomainIndex=idx; showView('domains'); renderDomains(); });
    strip.appendChild(cell);
  });
  renderCountryRecommendations(c);
}

/* ============================================================
   POLICY DOMAINS
   ============================================================ */
let currentDomainIndex = 0;
let gapsOnly = false;
let searchTerm = '';

function renderDomainTabs(){
  const wrap = document.getElementById('domain-tabs');
  wrap.innerHTML = '';
  AAAI_DATA.domains.forEach((d, idx)=>{
    const b = document.createElement('button');
    b.textContent = d.name;
    b.className = idx===currentDomainIndex ? 'active':'';
    b.addEventListener('click', ()=>{ currentDomainIndex=idx; renderDomains(); });
    wrap.appendChild(b);
  });
}

function renderDomains(){
  renderDomainTabs();
  const domain = AAAI_DATA.domains[currentDomainIndex];
  document.getElementById('domain-desc').textContent = domain.desc;
  document.getElementById('domain-composite-title').textContent = `${domain.name} — composite index`;

  const thead = document.getElementById('indicators-thead');
  thead.innerHTML = `<tr><th style="width:52px">Code</th><th style="width:230px">Indicator</th>` +
    COUNTRIES.map(c=>`<th style="text-align:center">${COUNTRY_META[c].abbr}</th>`).join('') + `</tr>`;

  const tbody = document.getElementById('indicators-tbody');
  tbody.innerHTML = '';
  let shown = 0;
  domain.indicators.forEach((ind, i)=>{
    const format = indicatorFormat(ind);
    const hasGap = COUNTRIES.some(c=> (normalizeStatus(ind.values[c])||{}).type==='no');
    if(gapsOnly && !hasGap) return;
    if(searchTerm && !(ind.name.toLowerCase().includes(searchTerm) || ind.code.includes(searchTerm))) return;
    shown++;

    const tr = document.createElement('tr');
    tr.className = 'indicator-row';
    const rowId = `row-${currentDomainIndex}-${i}`;
    tr.dataset.target = rowId;
    tr.innerHTML = `<td class="code">${ind.code}</td><td class="name">${ind.name}</td>` +
      COUNTRIES.map(c=>{
        const st = normalizeStatus(ind.values[c]);
        const yr = (ind.years && ind.years[c]) ? ` (${ind.years[c]})` : '';
        if(!st){
          if(format==='binary') return `<td class="status-cell" title="Pending"><span class="status-dot partial"></span></td>`;
          return `<td class="status-cell num" style="font-family:var(--font-mono);font-size:12px;color:var(--ink-soft);font-style:italic">Pending</td>`;
        }
        if(st.type==='data') return `<td class="status-cell num" style="font-family:var(--font-mono);font-size:12px" title="${yr.trim()}">${st.display}${yr}</td>`;
        const tip = (st.type==='partial' ? ('Pending — '+st.display) : st.display) + yr;
        return `<td class="status-cell" title="${tip.replace(/"/g,'&quot;')}"><span class="status-dot ${st.type}"></span></td>`;
      }).join('');
    tbody.appendChild(tr);

    const dtr = document.createElement('tr');
    dtr.className = 'detail-row';
    dtr.id = rowId;
    const td = document.createElement('td');
    td.colSpan = COUNTRIES.length + 2;
    td.innerHTML = `<div class="def-text">${ind.def}</div>
      <div class="detail-grid">${COUNTRIES.map(c=>{
        const st = normalizeStatus(ind.values[c]);
        const src = ind.sources[c] || '';
        const yr = (ind.years && ind.years[c]) || '';
        let cval;
        if(!st) cval = '<em>Pending</em>';
        else if(st.type==='partial') cval = `<em>Pending</em> — ${st.display}`;
        else cval = st.display;
        const srcYr = [src, yr ? `(${yr})` : ''].filter(Boolean).join(' ');
        return `<div class="detail-cell">
          <div class="cname">${c}</div>
          <div class="cval">${cval}</div>
          ${srcYr ? `<div class="csrc">${srcYr}</div>` : ''}
        </div>`;
      }).join('')}</div>`;
    dtr.appendChild(td);
    tbody.appendChild(dtr);

    tr.addEventListener('click', ()=> dtr.classList.toggle('open'));
  });

  document.getElementById('indicator-count').textContent = `${shown} of ${domain.indicators.length} indicators`;
  renderDomainRecommendations(domain);
}

document.getElementById('search-indicators').addEventListener('input', (e)=>{
  searchTerm = e.target.value.trim().toLowerCase();
  renderDomains();
});
document.getElementById('toggle-gaps').addEventListener('change', (e)=>{
  gapsOnly = e.target.checked;
  renderDomains();
});

/* ============================================================
   COMPARE / INFOGRAPHIC BY DOMAIN
   ============================================================ */
let compareChart=null;
let domainInfographicChart=null;

function renderDomainInfographic(domIdx){
  const domain = AAAI_DATA.domains[domIdx];
  document.getElementById('infographic-domain-desc').textContent = domain.desc;

  const binaryInds = domain.indicators.filter(ind => indicatorFormat(ind)==='binary');
  const quantInds = domain.indicators.filter(ind => indicatorFormat(ind)==='other');

  const pctYes = COUNTRIES.map(c=>{
    if(!binaryInds.length) return 0;
    const yesCount = binaryInds.filter(ind=>{
      const st = normalizeStatus(ind.values[c]);
      return st && st.type==='yes';
    }).length;
    return Math.round((yesCount / binaryInds.length) * 100);
  });

  const ctx = document.getElementById('domain-infographic-chart');
  if(domainInfographicChart) domainInfographicChart.destroy();
  domainInfographicChart = new Chart(ctx, {
    type:'bar',
    data:{ labels:COUNTRIES, datasets:[{
      label:`% of ${domain.name} indicators answered Yes`,
      data: pctYes,
      backgroundColor: COUNTRIES.map(c=>ccolor(c)),
      borderRadius:2, maxBarThickness:52
    }]},
    options:{ plugins:{legend:{display:false}, tooltip:{callbacks:{label:(i)=> i.formattedValue+'% Yes'}}},
      scales:{ y:{min:0,max:100,ticks:{callback:v=>v+'%'}, grid:{color:'#DED2B0'}}, x:{grid:{display:false}} } }
  });

  const statsEl = document.getElementById('infographic-quant-stats');
  if(!quantInds.length){
    statsEl.innerHTML = '';
  } else {
    statsEl.innerHTML = quantInds.slice(0,3).map(ind=>
      COUNTRIES.map(c=>{
        const st = normalizeStatus(ind.values[c]);
        return `<div class="stat-card">
          <div class="sc-label">${ind.code} · ${c}</div>
          <div class="sc-value">${st ? st.display : 'Pending'}</div>
        </div>`;
      }).join('')
    ).join('');
  }
}

function populateCompareSelects(){
  const domSel = document.getElementById('compare-domain');
  domSel.innerHTML = AAAI_DATA.domains.map((d,i)=>`<option value="${i}">${d.name}</option>`).join('');
  domSel.addEventListener('change', ()=>{
    renderDomainInfographic(+domSel.value);
    populateIndicatorSelect();
  });
  renderDomainInfographic(0);
  populateIndicatorSelect();
  document.getElementById('compare-indicator').addEventListener('change', renderCompare);
}
function populateIndicatorSelect(){
  const domIdx = +document.getElementById('compare-domain').value;
  const indSel = document.getElementById('compare-indicator');
  indSel.innerHTML = AAAI_DATA.domains[domIdx].indicators.map((ind,i)=>`<option value="${i}">${ind.code} — ${ind.name}</option>`).join('');
  renderCompare();
}
function renderCompare(){
  const domIdx = +document.getElementById('compare-domain').value;
  const indIdx = +document.getElementById('compare-indicator').value;
  const ind = AAAI_DATA.domains[domIdx].indicators[indIdx];
  document.getElementById('compare-def').textContent = ind.def;

  const format = indicatorFormat(ind);
  const ctx = document.getElementById('compare-chart');
  if(compareChart) compareChart.destroy();

  if(format==='binary'){
    const scoreMap = {yes:1, partial:0.5, no:0, data:null, unclear:0.5};
    compareChart = new Chart(ctx, {
      type:'bar',
      data:{ labels:COUNTRIES, datasets:[{
        label: ind.name,
        data: COUNTRIES.map(c=>{ const st=normalizeStatus(ind.values[c]); return st ? scoreMap[st.type] : 0.5; }),
        backgroundColor: COUNTRIES.map(c=>{ const st=normalizeStatus(ind.values[c]); if(!st) return '#B07F1E'; return st.type==='no' ? '#9C4530' : (st.type==='partial'||st.type==='unclear' ? '#B07F1E' : ccolor(c)); }),
        borderRadius:2, maxBarThickness:52
      }]},
      options:{ plugins:{legend:{display:false}}, scales:{ y:{min:0,max:1,ticks:{callback:v=> v===1?'Yes':v===0.5?'Pending':v===0?'No':''}}, x:{grid:{display:false}} } }
    });
  } else {
    const vals = COUNTRIES.map(c=>{ const st=normalizeStatus(ind.values[c]); if(!st) return null; const n=parseFloat(st.display.replace(/[^0-9.\-]/g,'')); return isNaN(n)?null:n; });
    compareChart = new Chart(ctx, {
      type:'bar',
      data:{ labels:COUNTRIES, datasets:[{ label: ind.name, data: vals, backgroundColor: COUNTRIES.map(c=>ccolor(c)), borderRadius:2, maxBarThickness:52 }]},
      options:{ plugins:{legend:{display:false}}, scales:{ x:{grid:{display:false}} } }
    });
  }

  const tbl = document.getElementById('compare-table');
  tbl.innerHTML = `<tr><th>Country</th><th>Value</th><th>Year</th><th>Source</th></tr>` + COUNTRIES.map(c=>{
    const st = normalizeStatus(ind.values[c]);
    const val = !st ? 'Pending' : (st.type==='partial' ? `Pending — ${st.display}` : st.display);
    const yr = (ind.years && ind.years[c]) || '—';
    return `<tr><td>${c}</td><td>${val}</td><td style="color:var(--ink-soft);font-size:12px">${yr}</td><td style="color:var(--ink-soft);font-size:12px">${ind.sources[c]||''}</td></tr>`;
  }).join('');
}

/* ============================================================
   RECOMMENDATIONS
   ============================================================ */
function autoGaps(){
  const list = [];
  COUNTRIES.forEach(country=>{
    AAAI_DATA.domains.forEach(domain=>{
      const gaps = domain.indicators.filter(ind=>{
        if(indicatorFormat(ind)!=='binary') return false;
        const st = normalizeStatus(ind.values[country]);
        return st && st.type==='no';
      });
      if(gaps.length){
        list.push({country, domain: domain.name, count: gaps.length, codes: gaps.map(g=>g.code).join(', ')});
      }
    });
  });
  return list.sort((a,b)=> b.count - a.count);
}

function curatedItemHTML(r, showDomain, showCountry){
  return `
    <div class="reco-item">
      <div class="country-tag"><span class="flagdot" style="width:9px;height:9px;border-radius:50%;display:inline-block;background:${ccolor(r.country)}"></span>${showCountry ? r.country : ''}</div>
      <div class="priority ${r.priority}">${r.priority}</div>
      <div>
        <p>${r.text}</p>
        <div class="domain-ref">${showDomain ? r.domain+' — ' : ''}indicator ${r.code}</div>
      </div>
    </div>`;
}
function autoItemHTML(g, showDomain){
  return `
    <div class="reco-item">
      <div class="country-tag"><span class="flagdot" style="width:9px;height:9px;border-radius:50%;display:inline-block;background:${ccolor(g.country)}"></span>${g.country}</div>
      <div class="priority ${g.count>=3?'high':g.count===2?'medium':'low'}">${g.count} gap${g.count>1?'s':''}</div>
      <div>
        <p>${g.count} indicator${g.count>1?'s':''} answered "No"${showDomain?` in <b>${g.domain}</b>`:''}.</p>
        <div class="domain-ref">Indicators: ${g.codes}</div>
      </div>
    </div>`;
}

function renderDomainRecommendations(domain){
  const curatedEl = document.getElementById('domain-reco-curated');
  const matches = CURATED_RECOMMENDATIONS.filter(r=> r.domain === domain.name);
  curatedEl.innerHTML = matches.length ? matches.map(r=>curatedItemHTML(r,false,true)).join('')
    : `<div class="reco-item" style="grid-template-columns:1fr;"><p style="color:var(--ink-soft);font-size:13px;">No curated recommendations for this domain yet.</p></div>`;

  const gaps = autoGaps().filter(g=> g.domain === domain.name);
  const autoEl = document.getElementById('domain-reco-auto');
  autoEl.innerHTML = gaps.length ? gaps.map(g=>autoItemHTML(g,false)).join('') : '';
}

function renderCountryRecommendations(country){
  const curatedEl = document.getElementById('profile-reco-curated');
  const matches = CURATED_RECOMMENDATIONS.filter(r=> r.country === country);
  curatedEl.innerHTML = matches.length ? matches.map(r=>curatedItemHTML(r,true,false)).join('')
    : `<div class="reco-item" style="grid-template-columns:1fr;"><p style="color:var(--ink-soft);font-size:13px;">No curated recommendations for ${country} yet.</p></div>`;

  const gaps = autoGaps().filter(g=> g.country === country);
  const autoEl = document.getElementById('profile-reco-auto');
  autoEl.innerHTML = gaps.length ? gaps.map(g=>autoItemHTML(g,true)).join('') : '';
}

/* ============================================================
   INIT
   ============================================================ */
function init(){
  document.getElementById('data-updated').textContent = AAAI_DATA.meta ? AAAI_DATA.meta.updated : '';
  renderOverview();
  renderMap();
  renderProfiles();
  renderDomains();
  populateCompareSelects();
}
init();
