"""Browser tests for the Jashan-e-Roshni 2026 site (home page plus the four inner pages).

Run:  python tests/run_tests.py
Needs: pip install playwright, plus a Chromium (set CHROME_EXE to use a specific build).
"""
import os, re, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
URL = (ROOT / 'index.html').as_uri()
SHOTS = ROOT / 'tests' / 'shots'
SHOTS.mkdir(exist_ok=True)
FORM = 'https://docs.google.com/forms/d/e/1FAIpQLSefK4H5KSlPgQSePCbdjxbbpJH_i1PkcbDin3u6LYbnbNJ8yA/viewform?usp=header'

results = []
def check(name, ok, detail=''):
    results.append((name, bool(ok), detail))
    print(('PASS ' if ok else 'FAIL ') + name + (f'  [{detail}]' if detail and not ok else ''))

def snap(pg, name):
    # Full-page captures are slow with software WebGL, so hide the canvas and never fail the run on a timeout.
    pg.add_style_tag(content='#diya3d{visibility:hidden!important}')
    try:
        pg.screenshot(path=str(SHOTS / name), full_page=True, timeout=90000)
    except Exception as e:
        print('SKIP screenshot', name, str(e)[:60])

def chrome_exe():
    if os.environ.get('CHROME_EXE'):
        return os.environ['CHROME_EXE']
    cand = Path(os.environ.get('LOCALAPPDATA', '')) / 'ms-playwright'
    for d in sorted(cand.glob('chromium-*/chrome-win64/chrome.exe'), reverse=True):
        return str(d)
    return None

def lum(rgb):
    def f(c):
        c /= 255
        return c / 12.92 if c <= .03928 else ((c + .055) / 1.055) ** 2.4
    r, g, b = rgb
    return .2126 * f(r) + .7152 * f(g) + .0722 * f(b)

def ratio(a, b):
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + .05) / (lo + .05)

def parse_rgb(s):
    return [float(x) for x in re.findall(r'[\d.]+', s)[:3]]

def open_page(browser, width=1280, height=800, **ctx):
    c = browser.new_context(viewport={'width': width, 'height': height}, **ctx)
    pg = c.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    pg.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' else None)
    pg.goto(URL)
    pg.wait_for_timeout(600)
    return c, pg, errs

def finish_intro(pg):
    pg.wait_for_function("!document.querySelector('#loader') || getComputedStyle(document.querySelector('#loader')).display==='none'", timeout=15000)

def scroll_through(pg):
    h = pg.evaluate('document.documentElement.scrollHeight')
    y = 0
    while y < h:
        pg.mouse.wheel(0, 500); pg.wait_for_timeout(220); y += 500
        h = pg.evaluate('document.documentElement.scrollHeight')
    pg.wait_for_timeout(1200)

with sync_playwright() as p:
    exe = chrome_exe()
    browser = p.chromium.launch(executable_path=exe, args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])

    # 1. load, console, structure
    c, pg, errs = open_page(browser)
    finish_intro(pg)
    benign = ('favicon', 'fonts.g', 'unpkg', 'net::ERR', 'Failed to load resource')
    hard = [e for e in errs if not any(b in e for b in benign)]
    check('no JS errors on load', not hard, '; '.join(hard)[:300])
    check('html lang set', pg.evaluate("document.documentElement.lang") == 'en')
    check('exactly one h1', pg.locator('h1').count() == 1)
    check('main landmark present', pg.locator('main').count() == 1)
    check('skip link is first focus stop', (pg.keyboard.press('Tab') or True) and pg.evaluate("document.activeElement.className") == 'skip')

    # 2. content integrity
    cards = pg.locator('.card')
    check('13 event cards', cards.count() == 13, str(cards.count()))
    by_day = {d: pg.locator(f'.card[data-day="{d}"]').count() for d in (0, 1, 2)}
    check('cards by day 1/7/5', by_day == {0: 1, 1: 7, 2: 5}, str(by_day))
    check('every card has a Read rules button', pg.locator('.card .rules-btn').count() == 13)
    check('cards are compact tiles (no full rule lists)', pg.locator('.card .rl').count() == 0)
    check('rules dialog exists and starts closed', pg.evaluate("!!document.querySelector('#rulesDialog') && !document.querySelector('#rulesDialog').open"))
    check('every tile has a thumbnail slot and a title', pg.evaluate("[...document.querySelectorAll('.card')].every(c=>c.querySelector('.thumb')&&c.querySelector('h3').textContent.trim().length>2)"))
    check('schedule shows 3 dated summary cards', pg.locator('#schList .sch-card').count() == 3)
    check('event dates strip lists 28 Oct, 05 Nov, 06 Nov', pg.evaluate("[...document.querySelectorAll('.sd-dates b')].map(b=>b.textContent).join(',')") == '28,05,06')
    text = pg.evaluate('document.body.innerText')
    check('no em or en dashes in visible text', not re.search('[–—]', text), repr(re.findall('.{15}[–—].{15}', text)[:2]))
    pg.locator('.card[data-day="2"] .rules-btn').first.scroll_into_view_if_needed(); pg.locator('.card[data-day="2"] .rules-btn').first.click(); pg.wait_for_timeout(400)
    check('Day 2 popup says Computational Sciences students', 'Computational Sciences students' in pg.inner_text('#rd-body')); pg.keyboard.press('Escape')

    # 3. filters
    shown = "getComputedStyle(document.querySelector('.tile-more')).display!=='none'"
    check('All shows 10 tiles plus And Many More', pg.evaluate(shown))
    expect = {'all': 10, 'cultural': 4, 'art': 6, 'perf': 2, 'creative': 4, 'fun': 2}
    for key, n in expect.items():
        pg.click(f'.chip[data-f="{key}"]'); pg.wait_for_timeout(250)
        vis = pg.evaluate("[...document.querySelectorAll('.card')].filter(c=>getComputedStyle(c).display!=='none').length")
        pressed = pg.get_attribute(f'.chip[data-f="{key}"]', 'aria-pressed')
        check(f'filter {key} shows {n}', vis == n and pressed == 'true', f'{vis} {pressed}')

    pg.click('.chip[data-f="all"]'); pg.wait_for_timeout(300)
    pg.locator('.tile-more').scroll_into_view_if_needed(); pg.locator('.tile-more').click(); pg.wait_for_timeout(400)
    vis = pg.evaluate("[...document.querySelectorAll('.card')].filter(c=>getComputedStyle(c).display!=='none').length")
    check('And Many More reveals all 13 events', vis == 13 and not pg.evaluate(shown), str(vis))

    # 3b. rules popup
    pg.click('.chip[data-f="fun"]'); pg.click('.chip[data-f="all"]'); pg.wait_for_timeout(300)
    quiz = pg.locator('.card', has_text='Quiz')
    quiz.scroll_into_view_if_needed(); pg.wait_for_timeout(600)
    quiz.locator('.rules-btn').click(); pg.wait_for_timeout(500)
    check('rules popup opens on button click', pg.evaluate("document.querySelector('#rulesDialog').open"))
    n = pg.evaluate("document.querySelectorAll('#rd-body .rl li').length")
    check('popup lists all 5 Quiz rules', n == 5, str(n))
    check('popup shows title and awards', pg.evaluate("/Quiz/.test(document.querySelector('#rd-title').textContent)&&/Awards: 1st, 2nd/.test(document.querySelector('#rd-body').textContent)"))
    check('focus moves into popup', pg.evaluate("document.querySelector('#rulesDialog').contains(document.activeElement)"))
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    check('Escape closes popup', not pg.evaluate("document.querySelector('#rulesDialog').open"))
    quiz.click(position={'x': 40, 'y': 40}); pg.wait_for_timeout(400)
    check('clicking the card also opens popup', pg.evaluate("document.querySelector('#rulesDialog').open"))
    pg.click('.rd-x'); pg.wait_for_timeout(300)
    check('close button closes popup', not pg.evaluate("document.querySelector('#rulesDialog').open"))
    for i in (0, 5, 9):
        btn = pg.locator('.rules-btn').nth(i)
        btn.scroll_into_view_if_needed(); pg.wait_for_timeout(300); btn.click(); pg.wait_for_timeout(250)
        ok = pg.evaluate("document.querySelectorAll('#rd-body .rl li').length") > 0
        pg.keyboard.press('Escape'); pg.wait_for_timeout(150)
        check(f'popup works for card {i + 1}', ok)

    # 3c. schedule popups
    pg.locator('#fullSched').scroll_into_view_if_needed(); pg.wait_for_timeout(400)
    pg.click('#fullSched'); pg.wait_for_timeout(400)
    n_slots = pg.evaluate("document.querySelectorAll('#rd-body .slot').length")
    check('full timetable popup lists all 9 slots', n_slots == 9, str(n_slots))
    pg.keyboard.press('Escape'); pg.wait_for_timeout(250)
    pg.locator('.sch-card[data-day="2"]').click(); pg.wait_for_timeout(400)
    n2 = pg.evaluate("document.querySelectorAll('#rd-body .slot').length")
    check('Day 2 card popup lists its 4 slots', n2 == 4, str(n2))
    pg.keyboard.press('Escape'); pg.wait_for_timeout(250)

    # 4. form links
    links = pg.evaluate("[...document.querySelectorAll('.js-form')].map(a=>[a.href,a.target,a.rel])")
    check('all register links point at the Google Form', len(links) >= 3 and all(l[0] == FORM and l[1] == '_blank' and 'noopener' in l[2] for l in links), str(links)[:200])
    labels = pg.evaluate("[...document.querySelectorAll('.js-form')].map(a=>a.innerText.trim())")
    check('register CTAs use the reference labels', set(labels) <= {'Register', 'Register Now', 'Be Part of the Showcase'}, str(labels))

    # 5. nav anchors and exhibition details
    hrefs = pg.evaluate("[...document.querySelectorAll('.nav nav a:not(.nav-cta)')].map(a=>a.getAttribute('href'))")
    check('nav links go to home and the four pages', hrefs == ['#top', 'schedule.html', 'events.html', 'exhibition.html', 'contact.html'] and all((ROOT / h).exists() for h in hrefs[1:]), str(hrefs))
    pg.locator('[data-ex="open"]').scroll_into_view_if_needed(); pg.click('[data-ex="open"]'); pg.wait_for_timeout(400)
    check('exhibition item opens its details', pg.evaluate("document.querySelector('#rulesDialog').open && /Open Participation/.test(document.querySelector('#rd-title').textContent)"))
    pg.keyboard.press('Escape'); pg.wait_for_timeout(250)

    # 6. buttons single line
    heights = pg.evaluate("[...document.querySelectorAll('.exhibit .btn,.chip')].map(b=>b.getBoundingClientRect().height)")
    check('buttons and chips do not wrap (<=56px tall)', max(heights) <= 56, str(max(heights)))
    c.close()

    # 7. hero banner
    c, pg, errs = open_page(browser, width=1366, height=768)
    finish_intro(pg); pg.wait_for_timeout(1500)
    size = "src=>new Promise(r=>{const i=new Image();i.onload=()=>r([i.naturalWidth,i.naturalHeight]);i.onerror=()=>r(null);i.src=src})"
    loaded = pg.evaluate(size, 'assets/hero-plate.webp')
    check('hero plate image loads at 1672x941', loaded == [1672, 941], str(loaded))
    check('tablet banner and phone diya images load', pg.evaluate(size, 'assets/hero-banner.webp') == [1520, 514] and pg.evaluate(size, 'assets/hero-diya.webp') == [860, 730])
    st = pg.evaluate("(()=>{const r=document.querySelector('.hero').getBoundingClientRect();return [r.width,r.height]})()")
    check('hero keeps the plate aspect ratio at 1366px', abs(st[0] / st[1] - 1672 / 941) < 0.02, str(st))
    check('hero fits in a 1366x768 viewport', st[1] <= 780, str(st))
    slots = pg.evaluate("""(()=>{const u=innerWidth/1672,q=s=>document.querySelector(s).getBoundingClientRect();
      return {reg:Math.abs(q('.hn-reg').left/u-1447)<2, d1:Math.abs(q('.dates li').left/u-98)<2, cta:Math.abs(q('.hero-cta .btn.gold').top/u-702)<2}})()""")
    check('nav pill, date boxes and buttons sit on the plate slots', all(slots.values()), str(slots))
    band = pg.evaluate("""(()=>{const s=document.querySelector('.strip').getBoundingClientRect(),u=s.width/1672,q=e=>e.getBoundingClientRect();
      const d=[...document.querySelectorAll('.sd-dates li')].map(e=>Math.round((q(e).left-s.left)/u)), f=[...document.querySelectorAll('.facts li')].map(e=>Math.round((q(e).top-s.top)/u));
      const t=[...document.querySelectorAll('.facts li')].every(e=>{const r=document.createRange();r.selectNodeContents(e);return r.getBoundingClientRect().right<=s.left+1450*u});
      return {ratio:s.width/s.height, d, f, t}})()""")
    check('dates strip keeps the band aspect ratio', abs(band['ratio'] - 1672 / 325) < 0.03, str(band))
    check('dates and venue rows sit in the band boxes', band['d'] == [312, 471, 629] and band['f'] == [49, 131, 212] and band['t'], str(band))
    pg.locator('#schList').scroll_into_view_if_needed(); pg.wait_for_timeout(1800)
    sch = pg.evaluate("""(()=>{const s=document.querySelector('.schedule').getBoundingClientRect(),k=s.width/1976,q=e=>e.getBoundingClientRect();
      const day=[...document.querySelectorAll('.sch-day')].map(e=>{const r=q(e);return [Math.round((r.left+r.width/2-s.left)/k),Math.round((r.top+r.height/2-s.top)/k)]});
      const card=[...document.querySelectorAll('.sch-card')].map(e=>[Math.round((q(e).left-s.left)/k),Math.round((q(e).top-s.top)/k)]);
      return {ratio:s.width/s.height, day, card}})()""")
    check('schedule keeps the artwork aspect ratio', abs(sch['ratio'] - 1976 / 796) < 0.03, str(sch))
    check('schedule dates sit in the circles and cards in the frames', all(abs(d[0] - 841) <= 2 and abs(d[1] - c) <= 3 for d, c in zip(sch['day'], (160, 376, 590)))
          and all(abs(c[0] - 943) <= 2 and abs(c[1] - y) <= 2 for c, y in zip(sch['card'], (81, 289, 506))), str(sch))
    pg.evaluate("window.__lenis ? window.__lenis.scrollTo(0, {immediate: true}) : scrollTo(0, 0)"); pg.wait_for_timeout(800)
    check('fixed bar stays hidden over the hero on desktop', pg.evaluate("getComputedStyle(document.querySelector('#nav')).visibility") == 'hidden')
    boxes = pg.evaluate("""(()=>{const q=s=>document.querySelector(s).getBoundingClientRect();const W=innerWidth;
      const txt=s=>{const r=document.createRange();r.selectNodeContents(document.querySelector(s));return r.getBoundingClientRect()};
      const h=document.querySelector('.hero h1'), hr=document.createRange(); hr.setStart(h,0); hr.setEndBefore(h.querySelector('span'));
      return {h1:hr.getBoundingClientRect().right/W, sub:txt('.h-sub').right/W, cta:q('.hero-cta').bottom}})()""")
    check('headline stays left of the diya (right edge < 62% of width)', boxes['h1'] < 0.62, str(boxes))
    check('subline stays left of the diya', boxes['sub'] < 0.5, str(boxes))
    check('hero buttons sit above the fold', boxes['cta'] < 768, str(boxes))
    pg.screenshot(path=str(SHOTS / 'hero-dark.png'))
    c.close()

    # 8. responsive overflow + screenshots
    for w in (375, 768, 1280, 1920):
        c, pg, errs = open_page(browser, width=w, height=900)
        finish_intro(pg); scroll_through(pg)
        over = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        check(f'no horizontal overflow at {w}px', over <= 1, str(over))
        pg.evaluate('window.scrollTo(0,0)'); pg.wait_for_timeout(500)
        snap(pg, f'full-{w}.png')
        c.close()

    # 9. reduced motion: everything visible
    c, pg, errs = open_page(browser, reduced_motion='reduce')
    pg.wait_for_timeout(800)
    vis = pg.evaluate("[...document.querySelectorAll('.reveal,h1,.h-sub,.hero-cta .btn')].every(e=>getComputedStyle(e).opacity==='1')")
    check('reduced motion shows all content immediately', vis)
    check('reduced motion shows no loader', pg.evaluate("!document.querySelector('#loader') || getComputedStyle(document.querySelector('#loader')).display==='none'"))
    c.close()

    # 10. light and dark contrast
    for scheme in ('dark', 'light'):
        c, pg, errs = open_page(browser, color_scheme=scheme)
        finish_intro(pg); pg.wait_for_timeout(600)
        pairs = pg.evaluate("""() => ['.exhibit .btn.gold','.nav .nav-cta','.chip.active'].map(s => {
            const e = document.querySelector(s), cs = getComputedStyle(e);
            return [s, cs.color, cs.backgroundColor, cs.backgroundImage];
        })""")
        for s, fg, bg, img in pairs:
            if bg.startswith('rgba(0, 0, 0, 0)'):
                continue
            check(f'{scheme}: {s} contrast >= 4.5', ratio(parse_rgb(fg), parse_rgb(bg)) >= 4.5, f'{fg} on {bg}')
        body = pg.evaluate("[getComputedStyle(document.body).color, getComputedStyle(document.documentElement).backgroundColor]")
        check(f'{scheme}: body text contrast >= 7', ratio(parse_rgb(body[0]), parse_rgb(body[1])) >= 7, str(body))
        muted = pg.evaluate("[getComputedStyle(document.querySelector('.sub')).color, getComputedStyle(document.documentElement).backgroundColor]")
        check(f'{scheme}: muted text contrast >= 4.5', ratio(parse_rgb(muted[0]), parse_rgb(muted[1])) >= 4.5, str(muted))
        pg.screenshot(path=str(SHOTS / f'hero-{scheme}.png'))
        scroll_through(pg); pg.evaluate('window.scrollTo(0,0)'); pg.wait_for_timeout(400)
        snap(pg, f'full-{scheme}.png')
        c.close()

    # 11. inner pages: schedule, events, exhibition, contact
    PAGES = {'schedule': 'Schedule', 'events': 'Events', 'exhibition': 'Exhibition', 'contact': 'Contact'}
    for name, label in PAGES.items():
        for w in (1280, 375):
            c = browser.new_context(viewport={'width': w, 'height': 900})
            pg = c.new_page(); errs = []
            pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
            pg.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' else None)
            pg.add_init_script("addEventListener('load', () => { window.__mapAtLoad = !!document.querySelector('.ct-map iframe'); })")
            pg.goto((ROOT / f'{name}.html').as_uri()); pg.wait_for_timeout(700)
            if name == 'contact':
                check(f'contact {w}px: heavy Google map does not hold up page load', pg.evaluate('window.__mapAtLoad') is False)
            hard = [e for e in errs if not any(b in e for b in benign)]
            check(f'{name} {w}px: no JS errors', not hard, '; '.join(hard)[:300])
            check(f'{name} {w}px: one h1 and current nav link', pg.locator('h1').count() == 1 and pg.evaluate("document.querySelector('.nav nav a[aria-current=page]').textContent") == label)
            scroll_through(pg)
            check(f'{name} {w}px: no horizontal overflow', pg.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth') <= 1)
            hidden = pg.evaluate("[...document.querySelectorAll('.reveal,.pg-title,.pg-sub,.crumbs')].filter(e=>getComputedStyle(e).opacity<0.99 && e.offsetParent).length")
            check(f'{name} {w}px: everything is visible after scrolling', hidden == 0, str(hidden))
            if w == 1280:
                local = pg.evaluate("[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')).filter(h=>!/^(https?:|#|mailto:)/.test(h))")
                missing = sorted({h.split('#')[0] for h in local if not (ROOT / h.split('#')[0]).exists()})
                check(f'{name}: every local link points to a real page', not missing, str(missing))
                forms = pg.evaluate("[...document.querySelectorAll('.js-form')].map(a=>a.href)")
                check(f'{name}: register buttons open the Google Form', forms and all(f == FORM for f in forms), str(forms)[:120])
                if name == 'schedule':
                    check('schedule: all 9 timetable slots across 3 days', pg.locator('.tt-slot').count() == 9 and pg.locator('.tt-day').count() == 3)
                    anchors = pg.evaluate("[...document.querySelectorAll('.tt-slot a.tag')].map(a=>a.getAttribute('href'))")
                    ids = {s for s in ('quiz', 'essay-writing', 'best-out-of-waste', 'debate', 'technical-poster-chart-making', 'turban-tying', 'diya-thali-decoration', 'rangoli', 'decoration', 'singing', 'digital-reel-making')}
                    check('schedule: event tags link to their events', len(anchors) >= 10 and all(a == 'exhibition.html' or a.split('#')[1] in ids for a in anchors), str(anchors)[:200])
                if name == 'events':
                    check('events: 13 events, each with rules and awards', pg.locator('.ev-item').count() == 13 and pg.evaluate("[...document.querySelectorAll('.ev-item')].every(e=>e.querySelectorAll('.rl li').length>0 && /Awards:/.test(e.textContent))"))
                    pg.locator('#evFilters .chip[data-f="perf"]').scroll_into_view_if_needed(); pg.click('#evFilters .chip[data-f="perf"]'); pg.wait_for_timeout(300)
                    vis = pg.evaluate("[...document.querySelectorAll('.ev-item')].filter(e=>getComputedStyle(e).display!=='none').length")
                    check('events: Performing Arts filter shows 2 and updates the count', vis == 2 and pg.inner_text('#evCount') == '2 of 13 events', f"{vis} {pg.inner_text('#evCount')}")
                if name == 'exhibition':
                    check('exhibition: three detail blocks and the price tag', pg.locator('.xb').count() == 3 and pg.locator('.price-tag dt').count() == 4)
                if name == 'contact':
                    socials = pg.evaluate("[...document.querySelectorAll('.ct-social a')].map(a=>a.href)")
                    check('contact: department Instagram and Facebook links', any('mrsptu_computational_sciences' in s for s in socials) and any('Computational-Sciences-Department' in s for s in socials), str(socials))
                    pg.locator('.ct-map').scroll_into_view_if_needed(); pg.wait_for_timeout(800)
                    check('contact: map loads when scrolled to, plus five questions', pg.locator('.ct-map iframe').count() == 1 and pg.locator('.faq details').count() == 5)
            c.close()

    # 12. links from the timetable land on the right event
    c = browser.new_context(viewport={'width': 1280, 'height': 900}); pg = c.new_page()
    pg.goto((ROOT / 'events.html').as_uri() + '#quiz'); pg.wait_for_timeout(1200)
    top = pg.evaluate("document.getElementById('quiz').getBoundingClientRect().top")
    check('events.html#quiz scrolls to the Quiz rules', 0 <= top < 300, str(top))
    c.close()

    # 13. phones: light mode for smooth native scrolling and quick images
    PHONE = dict(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    for name in ('index', 'schedule', 'events', 'exhibition', 'contact'):
        c = browser.new_context(**PHONE); pg = c.new_page()
        pg.goto((ROOT / f'{name}.html').as_uri()); pg.wait_for_timeout(1200)
        st = pg.evaluate("""() => {
          const vis = e => e.offsetParent || getComputedStyle(e).position === 'fixed';
          const all = [...document.querySelectorAll('body *')].filter(vis);
          return {
            lite: document.documentElement.classList.contains('lite'),
            lenis: !!window.__lenis || document.documentElement.classList.contains('lenis'),
            embers: getComputedStyle(document.querySelector('#sparks')).display !== 'none',
            blur: all.filter(e => (getComputedStyle(e).backdropFilter || 'none') !== 'none').map(e => e.className).slice(0, 4),
            blend: all.filter(e => getComputedStyle(e).mixBlendMode !== 'normal').map(e => e.className || e.tagName).slice(0, 4),
            loops: document.getAnimations().filter(a => a.effect && a.effect.getTiming().iterations === Infinity && !(a.effect.target && a.effect.target.classList.contains('marquee-track'))).map(a => a.animationName || 'anim').slice(0, 4),
          };
        }""")
        check(f'phone {name}: light mode is on', st['lite'])
        check(f'phone {name}: native scrolling (no smooth-scroll script)', not st['lenis'])
        check(f'phone {name}: no ember canvas', not st['embers'])
        check(f'phone {name}: no backdrop blur while scrolling', not st['blur'], str(st['blur']))
        check(f'phone {name}: no blend-mode layers', not st['blend'], str(st['blend']))
        check(f'phone {name}: no endless effects except the marquee', not st['loops'], str(st['loops']))
        used = pg.evaluate("""() => {
          const out = new Set();
          document.querySelectorAll('img').forEach(i => { if (i.offsetParent && i.getAttribute('src')) out.add(i.getAttribute('src')); });
          document.querySelectorAll('*').forEach(e => {
            if (!e.offsetParent && e !== document.body) return;
            for (const pseudo of [null, '::before', '::after'])
              (getComputedStyle(e, pseudo).backgroundImage.match(/url\\("?([^")]+)"?\\)/g) || []).forEach(u => out.add(u.replace(/^url\\("?|"?\\)$/g, '')));
          });
          return [...out].filter(u => /\\.webp/.test(u)).map(u => decodeURIComponent(u.replace(/^.*?assets\\//, 'assets/')));
        }""")
        heavy = [u for u in used if (ROOT / u).exists() and (ROOT / u).stat().st_size > 120000]
        check(f'phone {name}: no image over 120 KB used', not heavy, str(heavy))
        c.close()

    # 14. phones: content is already shown when it scrolls into view (no section-by-section pop-in)
    c = browser.new_context(**PHONE); pg = c.new_page()
    pg.goto((ROOT / 'index.html').as_uri()); pg.wait_for_timeout(1200)
    for sel in ('.benefits li', '#cards .card', '.rs-cards li'):
        pg.evaluate(f"(() => {{ const e = document.querySelector('{sel}'); scrollTo({{ top: e.getBoundingClientRect().top + scrollY - innerHeight - 60, behavior: 'instant' }}); }})()")
        pg.wait_for_timeout(700)
        op = pg.evaluate(f"getComputedStyle(document.querySelector('{sel}')).opacity")
        check(f'phone: {sel} is shown before it enters the screen', op == '1', op)
    c.close()

    # 15. desktop keeps the full effects
    c = browser.new_context(viewport={'width': 1440, 'height': 900}); pg = c.new_page()
    pg.goto((ROOT / 'index.html').as_uri()); pg.wait_for_timeout(1200)
    d = pg.evaluate("({lite: document.documentElement.classList.contains('lite'), lenis: !!window.__lenis, embers: getComputedStyle(document.querySelector('#sparks')).display !== 'none'})")
    check('desktop: full effects stay on (smooth scroll, embers)', not d['lite'] and d['lenis'] and d['embers'], str(d))
    c.close()

    browser.close()

failed = [r for r in results if not r[1]]
print(f'\n{len(results) - len(failed)}/{len(results)} passed')
sys.exit(1 if failed else 0)
