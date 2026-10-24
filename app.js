/* Jashan-e-Roshni 2026: data, rendering and motion. */
const GS = !!(window.gsap && window.ScrollTrigger);
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const MOTION = GS && !REDUCED;
document.documentElement.classList.toggle('gs', MOTION); // set early in <head>; dropped here if GSAP failed to load

const $ = s => document.querySelector(s);
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSefK4H5KSlPgQSePCbdjxbbpJH_i1PkcbDin3u6LYbnbNJ8yA/viewform?usp=header';
document.querySelectorAll('.js-form').forEach(a => {
  a.href = FORM_URL; a.target = '_blank'; a.rel = 'noopener';
});

const DAYS = {
  0: { label: 'Pre-fest, Wednesday 28 October 2026', short: '28 Oct', who: 'Open to all departments' },
  1: { label: 'Day 1, Thursday 5 November 2026', short: '5 Nov', who: 'Open to all departments' },
  2: { label: 'Day 2, Friday 6 November 2026', short: '6 Nov', who: 'Computational Sciences students' }
};

const COMPS = [
  { day: 0, no: 1, name: 'Mehndi Competition', cats: 'cultural art', ico: 'ph-hand-palm', when: 'Wednesday, 28 October 2026',
    rules: ['Date: 28 October 2026, at the Department of Computational Sciences.', 'Time slot, entry rules and awards will be announced by the organisers.'], awards: 'To be announced' },

  { day: 1, no: 1, name: 'Quiz', cats: 'fun', ico: 'ph-question', when: 'Round 1 Morning, Round 2 Midday',
    rules: ['Individual participation only (no teams or pairs).', 'Round 1: time-bound written test on General Knowledge and Festive Trivia.', 'Round 2: top 5 scorers qualify for the oral round (5 questions per candidate).', 'Mobile phones, smartwatches and external reference material are strictly prohibited in both rounds.', "Points awarded for accuracy and speed. The quiz master's decision is final."], awards: '1st, 2nd' },
  { day: 1, no: 2, name: 'Debate', cats: 'fun', ico: 'ph-chats-circle', when: 'Midday slot',
    rules: ['Round 1 (Quarter Finals): 4 match-ups. Round 2 (Semi Finals): 2 match-ups. Round 3 (Finals): 1 match-up to decide the winner.', '5 minutes per team match, with a 5-minute break between rounds.', 'Topics are assigned by the panel / organisers. Speakers must stick strictly to their time slot; reading entirely from paper is discouraged.'], awards: '1st' },
  { day: 1, no: 3, name: 'Essay Writing', cats: 'creative', ico: 'ph-pen-nib', when: 'Morning slot',
    rules: ['Languages allowed: English, Hindi or Punjabi.', 'Topic assigned by faculty on the spot. Suggested themes: Cultural Significance of Festivals, Modern Lifestyle vs. Traditional Values, Environmental Impact of Festivals.', 'Written live on sheets provided at the venue within the time limit. No smart devices or internet reference material permitted.', 'Judged on content clarity, vocabulary, structural flow and relevance to the topic.'], awards: '1st, 2nd' },
  { day: 1, no: 4, name: 'Technical Poster & Chart Making', cats: 'creative art', ico: 'ph-presentation-chart', when: 'Midday slot',
    rules: ['Technical theme (e.g. Green Computing, AI & Future Technology, Cybersecurity Awareness, Eco-Friendly Innovation).', 'Must be created manually on an A3 size drawing sheet or chart paper, provided or verified on the spot.', 'All work drawn and painted live. Pre-drawn outlines or traced work means immediate disqualification.', 'Participants bring their own art supplies (watercolours, acrylics, oil pastels, poster colours, markers, pencils, brushes, rulers).', 'Judged on technical clarity, visual presentation, cleanliness and factual accuracy.', 'Maximum 2 participants per entry.'], awards: '1st, 2nd' },
  { day: 1, no: 5, name: 'Turban Tying', cats: 'cultural', ico: 'ph-crown-simple', when: 'Afternoon slot',
    rules: ['Participants either bring their own model or tie the turban on themselves live.', 'Participants bring their own turban fabric (Pagg) and accessories.', 'Judged on neatness, shape, symmetry, alignment of folds (larhs) and traditional styling.', 'Must be completed within the designated 45-60 minute window.'], awards: '1st, 2nd' },
  { day: 1, no: 6, name: 'Diya & Thali Decoration', cats: 'cultural art', ico: 'ph-flame', when: 'Afternoon slot',
    rules: ['Each participant must paint and decorate a matching set of 2 earthen diyas and 1 thali with an identical theme across the set.', 'Participants bring their own plain diyas, thali, acrylic/poster paints, glitters, mirrors and paintbrushes.', 'Painting must be done strictly on the spot within the assigned venue room.', 'Maximum 2 participants per entry.'], awards: '1st, 2nd' },
  { day: 1, no: 7, name: 'Best Out of Waste', cats: 'art creative', ico: 'ph-recycle', when: 'Morning slot',
    rules: ['Free-style crafting using discarded household / scrap materials (plastic bottles, cardboard, newspapers, old cans, CD disks), brought by the participant.', 'Items must be built on the spot. Pre-assembled base objects are strictly prohibited.', 'Judged on creativity, utility, neatness and effective reuse of waste material.', 'Maximum 2 participants per entry.'], awards: '1st, 2nd' },

  { day: 2, no: 1, name: 'Rangoli', cats: 'cultural art', ico: 'ph-flower-lotus', when: '09:30 AM to 12:30 PM',
    rules: ['Maximum 2 participants per entry.', 'Free-style artwork on allocated corridor floor spots. Stencils, printed borders or prefabricated stickers are forbidden.', 'Participants supply their own rangoli powders, coloured rice, flower petals or chalk outlines.'], awards: '1st, 2nd' },
  { day: 2, no: 2, name: 'Decoration', cats: 'art', ico: 'ph-confetti', when: '09:30 AM to 12:30 PM',
    rules: ['Maximum 4 participants per entry.', 'Strict focus on eco-friendly, sustainable and recyclable decorative materials.', 'Decor must be set up only in designated corridor spaces. No direct gluing, nailing or painting on walls, glass doors or college fixtures.'], awards: '1st, 2nd' },
  { day: 2, no: 3, name: 'Singing', cats: 'perf', ico: 'ph-microphone-stage', when: '10:30 AM to 12:30 PM',
    rules: ['Time limit: 3 to 5 minutes per performance.', 'Solo or duet; light classical, folk, festive or contemporary music.', 'Background karaoke tracks must be submitted to the audio coordinator 30 minutes prior, or participants may carry one acoustic instrument player.', 'Lyrics must be clean and appropriate; offensive, vulgar or politically sensitive songs are strictly barred.'], awards: '1st, 2nd' },
  { day: 2, no: 4, name: 'Dancing', cats: 'perf', ico: 'ph-music-notes', when: '10:30 AM to 12:30 PM',
    rules: ['Solo or duet performances only. Group performances are strictly not allowed.', 'Styles may include folk, classical, western or fusion dance. Time limit: 3 to 5 minutes.', 'Audio tracks must be submitted to the event coordinator in MP3 format (pen drive or shared drive link) at least 30 minutes before the start.', 'Appropriate stage attire required; explicit gestures, moves or music are strictly prohibited.', 'Judged on choreography, rhythm, stage presence, facial expressions and overall execution.'], awards: '1st, 2nd' },
  { day: 2, no: 5, name: 'Digital Reel Making', cats: 'creative', ico: 'ph-film-reel', when: 'Submission deadline 12:00 PM',
    rules: ['Maximum duration: 1 minute.', 'Reel must cover all ongoing fest competitions and festive highlights across campus.', 'Submission strictly by 12:00 PM to the respective faculty teachers.', "Editing, music overlay and colour grading may be done on participants' own phones / laptops."], awards: '1st' }
];

const SCHEDULE = [
  { day: 0, time: '28 October 2026', name: 'Mehndi Competition', items: ['Time and rules to be announced'] },
  { day: 1, time: '10:00 AM - 11:30 AM', name: 'Morning Slot', items: ['Quiz (Round 1)', 'Essay Writing', 'Best Out of Waste'] },
  { day: 1, time: '11:30 AM - 01:30 PM', name: 'Midday Slot', items: ['Quiz (Round 2)', 'Debate', 'Technical Poster & Chart Making'] },
  { day: 1, time: '01:30 PM - 02:30 PM', name: 'Lunch Break', items: ['1-hour lunch break'], brk: true },
  { day: 1, time: '02:30 PM - 03:30 PM', name: 'Afternoon Slot', items: ['Turban Tying', 'Diya & Thali Decoration'] },
  { day: 2, time: '09:30 AM - 12:30 PM', name: 'Event Slot', items: ['Rangoli', 'Decoration', 'Exhibition Showcase (from 10:00 AM)', 'Singing & Dancing (from 10:30 AM)'] },
  { day: 2, time: 'By 12:00 PM', name: 'Submission', items: ['Digital Reel Making: final submission to respective faculty'] },
  { day: 2, time: '12:30 PM - 01:00 PM', name: 'Break', items: ['30-minute break'], brk: true },
  { day: 2, time: '01:00 PM - 02:30 PM', name: 'Ceremony', items: ['Result Announcement & Prize Distribution'] }
];


const PAGE = document.body.dataset.page || 'home';
const SUMMARY = [
  { day: 0, date: '28', mon: 'OCT', title: 'Mehndi Competition', time: 'Time to be announced', img: 'assets/schedule/day-0.webp' },
  { day: 1, date: '05', mon: 'NOV', title: 'Finals Competitions', time: '10:00 AM - 03:30 PM', img: 'assets/schedule/day-1.webp' },
  { day: 2, date: '06', mon: 'NOV', title: 'Exhibition & Showcase', time: '09:30 AM - 02:30 PM', img: 'assets/schedule/day-2.webp' }
];
const EXHIBIT = {
  display: { ico: 'ph-palette', title: 'Student Creations Display', who: 'Competition participants',
    rules: ['Participants of Diya Painting, Best Out of Waste, Technical Poster & Chart Making and craft entries must display their best work.', 'Selling the displayed item is optional.'] },
  open: { ico: 'ph-hand-heart', title: 'Open Participation', who: 'Students not taking part in any competition',
    rules: ['Display and sell your own homemade items: handmade crafts, artwork, decorative items and festive gifts.', 'Items must be original and made by the student at home. Ready-made or purchased items are not allowed.', 'Entries are for display and sale only. They are not part of competition judging.', 'Write the Event Name on the price tag as "Open Exhibit".'] },
  sale: { ico: 'ph-bank', title: 'Cultural Showcase', who: 'Friday 6 November 2026, 10:00 AM to 12:30 PM, Computational Sciences, MRSPTU',
    rules: ['Optional sale: participants and open exhibitors may sell crafted items to visitors and faculty.', 'Price tags: students prepare their own tags showing Student Name, Roll No., Event Name and Sale Price.', 'Pricing: reasonable and affordable, decided by the student artist.', 'Transactions are handled directly by the student artist.'] }
};
// Reference order for the tiles; the last three sit behind "And Many More" on the home page.
const ORDER = ['Mehndi Competition', 'Rangoli', 'Diya & Thali Decoration', 'Best Out of Waste', 'Technical Poster & Chart Making',
  'Turban Tying', 'Singing', 'Dancing', 'Essay Writing', 'Quiz'];
const EXTRA = ['Debate', 'Decoration', 'Digital Reel Making'];
const SHORT = { 'Technical Poster & Chart Making': 'Chart Making' };
const slug = n => n.toLowerCase().replace(/&/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const ruleList = rules => `<ul class="rl">${rules.map(r => `<li>${esc(r)}</li>`).join('')}</ul>`;
// A timetable item links to its event when it starts with an event's name.
const compFor = text => COMPS.find(c => text.toLowerCase().startsWith(c.name.toLowerCase()));
const tagHtml = item => {
  const c = compFor(item), href = c ? `events.html#${slug(c.name)}` : /^Exhibition/.test(item) ? 'exhibition.html' : '';
  return href ? `<a class="tag" href="${href}">${esc(item)}<i class="ph ph-arrow-up-right" aria-hidden="true"></i></a>` : `<span class="tag">${esc(item)}</span>`;
};

// Flip glides tiles to their new places when a filter changes and fades newly shown ones in.
let flipTl;
function relayout(grid, items, change) {
  if (!MOTION || !window.Flip) { change(); return; }
  const state = Flip.getState(grid.querySelectorAll(items));
  if (flipTl) flipTl.progress(1).kill();
  change();
  grid.classList.add('flipping');
  flipTl = Flip.from(state, {
    duration: .55, ease: 'power3.inOut', stagger: .012,
    onEnter: els => gsap.fromTo(els, { autoAlpha: 0, scale: .86 }, { autoAlpha: 1, scale: 1, duration: .45, delay: .12, ease: 'power2.out' }),
    onComplete: () => { grid.classList.remove('flipping'); ScrollTrigger.refresh(); }
  });
}
function pressChip(group, b) {
  group.querySelectorAll('.chip').forEach(c => { const on = c === b; c.classList.toggle('active', on); c.setAttribute('aria-pressed', on); });
}

/* ---------- home page ---------- */
if (PAGE === 'home') {
  $('#schList').innerHTML = SUMMARY.map(s => `
  <li class="reveal">
    <span class="sch-day"><b>${s.date}</b><small>${s.mon}</small></span>
    <button type="button" class="sch-card" data-day="${s.day}" aria-haspopup="dialog">
      <span class="sch-thumb"><img src="${s.img}" alt="" decoding="async" onload="this.classList.add('ok')"></span>
      <span class="sch-txt"><strong>${esc(s.title)}</strong>
        <span class="sch-meta"><span><i class="ph ph-clock" aria-hidden="true"></i>${s.time}</span>
        <span><i class="ph ph-map-pin" aria-hidden="true"></i>Computational Sciences, MRSPTU</span></span></span>
      <i class="ph ph-caret-right sch-go" aria-hidden="true"></i>
    </button>
  </li>`).join('');

  const tile = (name, extra) => {
    const i = COMPS.findIndex(c => c.name === name), c = COMPS[i];
    return `<article class="card reveal${extra ? ' extra' : ''}" data-day="${c.day}" data-i="${i}" data-cats="${c.cats}">
    <div class="thumb"><i class="ph ${c.ico}" aria-hidden="true"></i>
      <img src="assets/events/${slug(c.name)}.webp" alt="" loading="lazy" decoding="async" onload="this.classList.add('ok')" onerror="this.remove()"></div>
    <h3><button type="button" class="rules-btn" aria-haspopup="dialog" aria-label="${esc(c.name)}: read rules">${esc(SHORT[c.name] || c.name)}</button></h3>
  </article>`;
  };
  const cardsEl = $('#cards');
  cardsEl.innerHTML = ORDER.map(n => tile(n)).join('') + EXTRA.map(n => tile(n, true)).join('') + `
  <button type="button" class="tile-more reveal" aria-expanded="false" aria-controls="cards">
    <span class="thumb"><i class="ph ph-gift" aria-hidden="true"></i><img src="assets/events/and-many-more.webp" alt="" loading="lazy" decoding="async" onload="this.classList.add('ok')" onerror="this.remove()"></span>
    <h3>And Many More</h3>
  </button>`;
  const more = $('.tile-more');
  more.addEventListener('click', () => {
    relayout(cardsEl, '.card,.tile-more', () => { cardsEl.classList.add('expanded'); more.setAttribute('aria-expanded', 'true'); more.classList.add('hide'); });
    cardsEl.querySelector('.card.extra .rules-btn').focus({ preventScroll: true });
  });
  $('#filters').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    const f = b.dataset.f, all = f === 'all';
    pressChip($('#filters'), b);
    relayout(cardsEl, '.card,.tile-more', () => {
      cardsEl.classList.toggle('is-all', all);
      cardsEl.querySelectorAll('.card').forEach(c => c.classList.toggle('hide', !all && !c.dataset.cats.split(' ').includes(f)));
      more.classList.toggle('hide', !all || cardsEl.classList.contains('expanded'));
    });
  });

  // Dialog: rules, timetable, exhibition details (native dialog: focus trap, Esc, focus return).
  const dlg = $('#rulesDialog');
  const openDialog = html => {
    $('#rd-body').innerHTML = html;
    dlg.showModal();
    if (window.__lenis) window.__lenis.stop();
    dlg.querySelector('.rd-box').scrollTop = 0;
  };
  const closeDialog = () => {
    if (!dlg.open || dlg.classList.contains('closing')) return;
    if (!MOTION) { dlg.close(); return; }
    dlg.classList.add('closing');
    setTimeout(() => { dlg.classList.remove('closing'); dlg.close(); }, 180);
  };
  dlg.addEventListener('cancel', e => { if (MOTION) { e.preventDefault(); closeDialog(); } });
  dlg.addEventListener('close', () => { if (window.__lenis) window.__lenis.start(); });
  dlg.addEventListener('click', e => { if (e.target === dlg) closeDialog(); });
  $('.rd-x').addEventListener('click', closeDialog);

  cardsEl.addEventListener('click', e => {
    const card = e.target.closest('.card'); if (!card) return;
    const c = COMPS[card.dataset.i];
    openDialog(`
    <div class="rd-head"><span class="card-ico"><i class="ph ${c.ico}" aria-hidden="true"></i></span>
      <div><h3 id="rd-title">${esc(c.name)}</h3><p class="when">${DAYS[c.day].label}</p><p class="when">${esc(c.when)}</p></div></div>
    <h4>Rules</h4>${ruleList(c.rules)}
    <div class="rd-foot"><span class="badge">Awards: ${c.awards}</span><span class="badge alt">${DAYS[c.day].who}</span><a class="badge alt" href="events.html#${slug(c.name)}">Events page</a></div>`);
  });

  const slotsHtml = list => {
    let last = -1;
    return list.map(s => {
      const head = s.day !== last ? `<h4 class="slot-day">${DAYS[s.day].label}</h4>` : '';
      last = s.day;
      return head + `<div class="slot ${s.brk ? 'break' : ''}"><time>${s.time}</time><h5>${esc(s.name)}</h5>
      <div class="tags">${s.items.map(i => `<span class="tag">${esc(i)}</span>`).join('')}</div></div>`;
    }).join('');
  };
  const openSchedule = day => {
    const list = day === 'all' ? SCHEDULE : SCHEDULE.filter(s => String(s.day) === String(day));
    openDialog(`<div class="rd-head"><span class="card-ico"><i class="ph ph-calendar-dots" aria-hidden="true"></i></span>
    <div><h3 id="rd-title">${day === 'all' ? 'Full timetable' : esc(SUMMARY[day].title)}</h3><p class="when">${day === 'all' ? 'All three dates' : DAYS[day].label}</p></div></div>${slotsHtml(list)}`);
  };
  $('#schList').addEventListener('click', e => { const b = e.target.closest('.sch-card'); if (b) openSchedule(b.dataset.day); });
  $('#fullSched').addEventListener('click', () => openSchedule('all'));

  document.querySelectorAll('[data-ex]').forEach(b => b.addEventListener('click', () => {
    const x = EXHIBIT[b.dataset.ex];
    openDialog(`<div class="rd-head"><span class="card-ico"><i class="ph ${x.ico}" aria-hidden="true"></i></span>
    <div><h3 id="rd-title">${esc(x.title)}</h3><p class="when">${esc(x.who)}</p></div></div>
    <h4>Details</h4>${ruleList(x.rules)}`);
  }));

  // The fixed bar appears once the hero copy has scrolled away.
  new IntersectionObserver(es => $('#nav').classList.toggle('solid', !es[0].isIntersecting), { rootMargin: '-72px 0px 0px 0px' }).observe($('.h-eyebrow'));
}

/* ---------- schedule page: the full timetable, day by day ---------- */
if (PAGE === 'schedule') {
  $('#timetable').innerHTML = SUMMARY.map(s => {
    const d = s.day, slots = SCHEDULE.filter(x => x.day === d);
    return `<section class="tt-day" id="day-${d}" aria-labelledby="tt-h-${d}">
      <header class="tt-head reveal">
        <span class="tt-date"><b>${s.date}</b><small>${s.mon}</small></span>
        <div class="tt-title"><p class="tt-kicker">${esc(s.title)}</p><h2 id="tt-h-${d}">${esc(DAYS[d].label)}</h2>
          <p class="tt-who"><i class="ph ph-users-three" aria-hidden="true"></i>${DAYS[d].who}<span><i class="ph ph-clock" aria-hidden="true"></i>${s.time}</span></p></div>
        <span class="tt-pic"><img src="${s.img}" alt="" loading="lazy" decoding="async" onload="this.classList.add('ok')"></span>
      </header>
      <ol class="tt-slots">${slots.map(x => `
        <li class="tt-slot reveal${x.brk ? ' brk' : ''}"><time>${x.time}</time>
          <div><h3>${esc(x.name)}</h3><div class="tags">${x.items.map(tagHtml).join('')}</div></div></li>`).join('')}
      </ol>
    </section>`;
  }).join('');
}

/* ---------- events page: every competition with its full rules ---------- */
if (PAGE === 'events') {
  const list = $('#eventList');
  list.innerHTML = [...ORDER, ...EXTRA].map(n => {
    const c = COMPS.find(x => x.name === n), id = slug(n);
    return `<article class="ev-item reveal" id="${id}" data-cats="${c.cats}" data-day="${c.day}" tabindex="-1">
      <div class="ev-pic"><i class="ph ${c.ico}" aria-hidden="true"></i><img src="assets/events/${id}.webp" alt="" loading="lazy" decoding="async" onload="this.classList.add('ok')" onerror="this.remove()">
        <span class="ev-day">${DAYS[c.day].short}</span></div>
      <div class="ev-body">
        <h2>${esc(c.name)}</h2>
        <p class="ev-meta"><span><i class="ph ph-clock" aria-hidden="true"></i>${esc(c.when)}</span><span><i class="ph ph-users-three" aria-hidden="true"></i>${DAYS[c.day].who}</span></p>
        ${ruleList(c.rules)}
        <p class="ev-award"><i class="ph ph-trophy" aria-hidden="true"></i>Awards: ${c.awards}</p>
      </div>
    </article>`;
  }).join('');
  const count = $('#evCount'), items = [...list.querySelectorAll('.ev-item')];
  const showCount = () => { count.textContent = `${items.filter(i => !i.classList.contains('hide')).length} of ${items.length} events`; };
  showCount();
  $('#evFilters').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    const f = b.dataset.f;
    pressChip($('#evFilters'), b);
    relayout(list, '.ev-item', () => items.forEach(i => i.classList.toggle('hide', f !== 'all' && !i.dataset.cats.split(' ').includes(f))));
    showCount();
  });
}

/* ---------- exhibition page ---------- */
if (PAGE === 'exhibition') {
  $('#exhibitBlocks').innerHTML = Object.values(EXHIBIT).map(x => `
    <article class="xb reveal">
      <span class="xb-ico"><i class="ph ${x.ico}" aria-hidden="true"></i></span>
      <h3>${esc(x.title)}</h3><p class="xb-who">${esc(x.who)}</p>${ruleList(x.rules)}
    </article>`).join('');
}

/* ---------- nav menu toggle on small screens ---------- */
const navLinks = $('#navLinks'), navToggle = $('#navToggle');
navToggle.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', open);
  navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
});
navLinks.addEventListener('click', e => { if (e.target.closest('a')) { navLinks.classList.remove('open'); navToggle.setAttribute('aria-expanded', 'false'); } });

/* ---------- embers (ambient, skipped for reduced motion) ---------- */
if (!REDUCED) {
  const cv = $('#sparks'), cx = cv.getContext('2d');
  let W, H, vis = true; const P = [];
  const size = () => { W = cv.width = innerWidth; H = cv.height = innerHeight; };
  size(); addEventListener('resize', size);
  const mk = () => ({ x: Math.random() * W, y: H + 10, r: Math.random() * 1.8 + .5, v: Math.random() * .45 + .15, dx: (Math.random() - .5) * .3, a: Math.random() * .45 + .2, ph: Math.random() * 6.28 });
  for (let i = 0; i < 34; i++) { const p = mk(); p.y = Math.random() * H; P.push(p); }
  const loop = () => {
    if (!vis) return;
    cx.clearRect(0, 0, W, H);
    for (const p of P) {
      p.y -= p.v; p.ph += .02; p.x += p.dx + Math.sin(p.ph) * .3;
      if (p.y < -10) Object.assign(p, mk());
      cx.beginPath(); cx.fillStyle = `rgba(255,190,90,${p.a})`; cx.arc(p.x, p.y, p.r, 0, 6.283); cx.fill();
    }
    requestAnimationFrame(loop);
  };
  document.addEventListener('visibilitychange', () => { vis = !document.hidden; if (vis) loop(); });
  loop();
}

/* ---------- schedule page: day tabs slide in once the banner's date pills scroll away ---------- */
if (PAGE === 'schedule') new IntersectionObserver(([e]) => $('.tt-tabs').classList.toggle('show', !e.isIntersecting && e.boundingClientRect.top < 0),
  { rootMargin: '-72px 0px 0px 0px' }).observe($('.pg-dates'));

/* ---------- schedule page: the day tab for the day in view ---------- */
if (GS && PAGE === 'schedule') {
  gsap.registerPlugin(ScrollTrigger);
  document.querySelectorAll('.tt-day').forEach(day => ScrollTrigger.create({ trigger: day, start: 'top 55%', end: 'bottom 55%',
    onToggle: self => { const tab = $(`.tt-tabs a[href="#${day.id}"]`); if (tab) tab.classList.toggle('active', self.isActive); } }));
}

/* ---------- GSAP motion layer ---------- */
if (MOTION) {
  gsap.registerPlugin(ScrollTrigger, ...[window.SplitText, window.Flip].filter(Boolean));
  const has = s => !!document.querySelector(s);

  // Smooth scroll enhances native scroll; it never replaces it.
  if (window.Lenis) {
    const lenis = new Lenis({ lerp: .1 }); window.__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const id = a.getAttribute('href'), t = document.querySelector(id); if (!t) return;
      e.preventDefault(); lenis.scrollTo(id === '#top' ? 0 : t, { offset: PAGE === 'schedule' ? -140 : -72 });
    }));
  }

  // CSS hover transitions on transform pause while GSAP moves an element, then GSAP hands it back.
  const lock = t => gsap.utils.toArray(t).forEach(e => e.classList.add('m-lock'));
  const release = t => { const els = gsap.utils.toArray(t); gsap.set(els, { clearProps: 'transform' }); els.forEach(e => e.classList.remove('m-lock')); };
  const enter = (trigger, start = 'top 85%') => ({ trigger, start, once: true });
  const rise = (targets, trigger, vars = {}) => {
    if (!has(targets)) return;
    lock(targets);
    gsap.from(targets, { autoAlpha: 0, y: 26, duration: .75, ease: 'power3.out', stagger: .08, ...vars, scrollTrigger: enter(trigger), onComplete: () => release(targets) });
  };
  const splitWords = sel => document.querySelectorAll(sel).forEach(el => {
    if (!window.SplitText) { gsap.from(el, { autoAlpha: 0, y: 24, duration: .8, scrollTrigger: enter(el, 'top 88%') }); return; }
    SplitText.create(el, { type: 'words', mask: 'words', wordsClass: 'sw', autoSplit: true,
      onSplit: s => gsap.from(s.words, { yPercent: 115, duration: .95, ease: 'power4.out', stagger: .07, scrollTrigger: enter(el, 'top 88%') }) });
  });
  const splitChars = (sel, delay) => {
    if (!has(sel) || !window.SplitText) return;
    SplitText.create(sel, { type: 'words,chars', charsClass: 'hc', autoSplit: true,
      onSplit: s => gsap.from(s.chars, { yPercent: 90, rotationX: -75, autoAlpha: 0, transformOrigin: '50% 100%', duration: .85, ease: 'power3.out', stagger: .028, delay }) });
  };

  // Reading progress along the top edge.
  gsap.to('#progress', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .3 } });

  if (PAGE === 'home') {
    // Hero: the artwork settles in, the title letters rise, and everything on the artwork's slots fades in place.
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .fromTo('.hero', { autoAlpha: 0, scale: 1.04 }, { autoAlpha: 1, scale: 1, duration: 1.1, ease: 'power2.out' })
      .from('.h-eyebrow, .h-tag, .h-sub', { autoAlpha: 0, y: 16, duration: .7, stagger: .1 }, .35)
      .from('.hero-nav > *, .band li, .dates li, .hero-cta .btn, .hero-diya', { autoAlpha: 0, duration: .7, stagger: .05 }, .55);
    splitChars('.hero h1', .3);
    // Scrolling away, the hero sinks a little behind the dates strip.
    gsap.to('.hero', { yPercent: 16, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

    // Dates strip (artwork band): numbers pop in place, labels and venue rows fade. Nothing crosses the frame lines.
    gsap.timeline({ scrollTrigger: enter('.strip', 'top 88%') })
      .from('.sd-label', { autoAlpha: 0, duration: .5 })
      .from('.sd-dates b', { autoAlpha: 0, scale: .5, duration: .7, ease: 'back.out(2.2)', stagger: .12 }, '<.1')
      .from('.sd-dates span, .sd-dates em', { autoAlpha: 0, duration: .5, stagger: .04 }, '<.25')
      .from('.facts li', { autoAlpha: 0, duration: .7, stagger: .14 }, '<');

    // Marquee: speeds up with scroll velocity and follows the scroll direction, then settles.
    const marq = gsap.to('.marquee-track', { xPercent: -50, ease: 'none', duration: 60, repeat: -1 }).totalTime(600);
    let calm;
    ScrollTrigger.create({ trigger: '.marquee', start: 'top bottom', end: 'bottom top', onUpdate: self => {
      const dir = self.direction < 0 ? -1 : 1, boost = 1 + Math.min(Math.abs(self.getVelocity()) / 300, 5);
      gsap.to(marq, { timeScale: dir * boost, duration: .25, overwrite: true });
      if (calm) calm.kill();
      calm = gsap.delayedCall(.25, () => gsap.to(marq, { timeScale: dir, duration: 1.2, overwrite: true }));
    } });

    splitWords('.open .sec-title, .sch-copy .sec-title, .ex-title, .results .sec-title');
    rise('.open .lead', '.open .lead');
    rise('.sch-copy .sub, #fullSched', '.sch-copy');
    rise('.events .sec-sub, #filters .chip', '#filters', { stagger: .05 });
    rise('.ev-note', '.ev-note');
    rise('.exhibit .sec-sub', '.exhibit .sec-sub');
    rise('.results .sec-sub', '.results .sec-sub');
    // Each timeline circle glows while its row is in the middle of the screen.
    document.querySelectorAll('.sch-list li').forEach(li => ScrollTrigger.create({ trigger: li, start: 'top 70%', end: 'bottom 30%', toggleClass: 'lit' }));

    gsap.timeline({ scrollTrigger: enter('.ex-card', 'top 85%') })
      .from('.ex-card', { autoAlpha: 0, duration: .6 })
      .from('.ex-card li', { autoAlpha: 0, x: 40, duration: .7, ease: 'power3.out', stagger: .12 }, '<.1')
      .from('.ex-ico', { scale: .3, rotation: -40, duration: .7, ease: 'back.out(2.2)', stagger: .12, clearProps: 'transform' }, '<.1');
    rise('.ex-side .btn', '.ex-side .btn');

    // Event tiles: the photo tilts toward the cursor and a soft spotlight follows it (pointer devices only).
    if (matchMedia('(hover:hover) and (pointer:fine)').matches) {
      document.querySelectorAll('#cards .card, #cards .tile-more').forEach(card => {
        const t = card.querySelector('.thumb');
        gsap.set(t, { transformPerspective: 600 });
        const rx = gsap.quickTo(t, 'rotationX', { duration: .5, ease: 'power3' }), ry = gsap.quickTo(t, 'rotationY', { duration: .5, ease: 'power3' });
        card.addEventListener('pointermove', e => {
          const r = card.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
          rx((.5 - y / r.height) * 10); ry((x / r.width - .5) * 12);
          card.style.setProperty('--mx', x + 'px'); card.style.setProperty('--my', y + 'px');
        });
        card.addEventListener('pointerleave', () => { rx(0); ry(0); });
      });
    }
  } else {
    // Inner pages: the banner settles in, the crumbs and subtitle rise, and the title letters lift into place.
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .from('.pg-hero', { autoAlpha: 0, duration: .8 })
      .from('.crumbs, .pg-sub, .pg-hero .btn, .pg-divider', { autoAlpha: 0, y: 18, duration: .7, stagger: .1 }, .2)
      .from('.pg-dates li', { autoAlpha: 0, y: 14, scale: .92, duration: .6, ease: 'back.out(1.8)', stagger: .1 }, .6);
    splitChars('.pg-title', .15);
    gsap.to('.pg-hero-in', { yPercent: 30, opacity: .2, ease: 'none', scrollTrigger: { trigger: '.pg-hero', start: 'top top', end: 'bottom top', scrub: true } });
    rise('#evFilters .chip, #evCount', '#evFilters', { stagger: .05 });
  }

  // Shared by every page: section headings, the CTA band, the exhibition collage and the footer.
  splitWords('.pg-h2, .cta-copy h2');
  rise('.cta-copy p, .cta-act .btn', '.cta', { delay: .25 });
  if (has('.cta-trophy')) gsap.from('.cta-trophy', { autoAlpha: 0, scale: .82, duration: 1.1, ease: 'power3.out', scrollTrigger: enter('.cta', 'top 85%') });
  rise('.foot > *', 'footer', { stagger: .1 });
  if (has('.collage')) {
    // Photos drop onto the table one by one, then the collage drifts a little on scroll.
    lock('.collage img, .scribble');
    gsap.timeline({ scrollTrigger: enter('.collage', 'top 80%'), onComplete: () => release('.collage img, .scribble') })
      .from('.collage img', { autoAlpha: 0, y: 110, rotation: 0, scale: .8, duration: 1, ease: 'power3.out', stagger: .16 })
      .from('.scribble', { autoAlpha: 0, scale: .5, rotation: -30, duration: .8, ease: 'back.out(1.8)' }, '-=.4');
    gsap.to('.collage', { yPercent: -6, ease: 'none', scrollTrigger: { trigger: '.collage', start: 'top bottom', end: 'bottom top', scrub: 1 } });
  }

  // Cards and rows rise in staggered batches and their icons pop. Home schedule rows sit on artwork frames, so they only fade.
  const onArt = el => !!el.closest('.sch-list');
  gsap.set('.reveal', { autoAlpha: 0, y: (i, el) => onArt(el) ? 0 : 28 });
  lock('.reveal');
  ScrollTrigger.batch('.reveal', { start: 'top 94%', once: true, onEnter: batch => {
    gsap.to(batch, { autoAlpha: 1, y: 0, duration: .65, stagger: .06, ease: 'power3.out', overwrite: true, onComplete: () => release(batch) });
    const icons = batch.flatMap(el => [...el.querySelectorAll(':scope > i, .sch-day, .tt-date, .xb-ico, .ct-ico')]);
    if (icons.length) {
      lock(icons);
      gsap.from(icons, { autoAlpha: 0, scale: .4, rotation: (i, el) => el.matches('.sch-day, .tt-date') ? 0 : -25, duration: .75, ease: 'back.out(2.2)', stagger: .07, delay: .12, onComplete: () => release(icons) });
    }
    const pics = batch.flatMap(el => [...el.querySelectorAll('.sch-thumb img, .tt-pic img, .ev-pic img')]);
    if (pics.length) { lock(pics); gsap.from(pics, { scale: 1.25, duration: 1.2, ease: 'power3.out', stagger: .08, onComplete: () => release(pics) }); }
  } });

  addEventListener('load', () => ScrollTrigger.refresh());
  document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
}

/* ---------- links like events.html#quiz land on that item once the page is built ---------- */
const hashTarget = PAGE !== 'home' && location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
if (hashTarget) {
  const go = () => window.__lenis ? window.__lenis.scrollTo(hashTarget, { immediate: true, force: true, offset: PAGE === 'schedule' ? -140 : -96 }) : hashTarget.scrollIntoView();
  // Jump once fonts are in, then again after the layout refresh that follows, so a late refresh cannot undo it.
  addEventListener('load', () => Promise.resolve(document.fonts && document.fonts.ready).then(() => requestAnimationFrame(() => { go(); setTimeout(go, 350); })));
}
