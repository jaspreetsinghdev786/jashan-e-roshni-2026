"""Unit and integration tests for the date gate, the department gate and the two builds.

Run:  python tests/test_gate.py
Needs: pip install playwright, Node (for build.js) and Edge or Chrome installed.

Unit tests call the page's own functions (isPast, closedTo, live) through page.evaluate
with `?today=` pinning the date. Integration tests load every page of the root build
(Computational Sciences) and the /open/ build (other departments) over HTTP and check
what each one renders.
"""
import os, subprocess, sys, threading, functools
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
PORT = 8799
PAGES = ['index', 'schedule', 'events', 'exhibition', 'contact']

results = []
def check(group, name, ok, detail=''):
    results.append((group, name, bool(ok), str(detail)))
    print(f"{'PASS' if ok else 'FAIL'} [{group}] {name}" + (f"  -> {detail}" if not ok else ''))

def serve():
    handler = functools.partial(SimpleHTTPRequestHandler, directory=str(ROOT))
    handler.log_message = lambda *a, **k: None
    srv = ThreadingHTTPServer(('127.0.0.1', PORT), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv

def launch(p):
    for ch in ('msedge', 'chrome'):
        try:
            return p.chromium.launch(channel=ch)
        except Exception:
            pass
    return p.chromium.launch()

def page(browser, url):
    ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
    pg = ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(url)
    pg.wait_for_timeout(400)
    return ctx, pg, errs

def build():
    for m in ('cs', 'other'):
        subprocess.run(['node', 'build.js', m], cwd=ROOT, check=True, capture_output=True)

# ---------- unit tests: the gate functions inside app.js ----------
def unit(browser):
    base = f'http://127.0.0.1:{PORT}/index.html'
    cases = [
        # (today, expected isPast for day 0,1,2)
        ('2026-10-24', [False, False, False]),
        ('2026-10-28', [False, False, False]),  # the day itself still shows
        ('2026-10-29', [True, False, False]),
        ('2026-11-05', [True, False, False]),
        ('2026-11-06', [True, True, False]),
        ('2026-11-07', [False, False, False]),  # fest over: nothing hidden
        ('2027-01-01', [False, False, False]),
    ]
    for today, want in cases:
        ctx, pg, errs = page(browser, f'{base}?today={today}')
        got = pg.evaluate('[0,1,2].map(d => isPast(d))')
        check('unit', f'isPast on {today}', got == want, f'got {got}, want {want}')
        n = pg.evaluate('live(SUMMARY).length')
        check('unit', f'live(SUMMARY) on {today}', n == want.count(False), f'got {n}')
        ctx.close()

    ctx, pg, errs = page(browser, f'{base}?today=not-a-date')
    check('unit', 'bad ?today falls back to the real clock', pg.evaluate('!isNaN(TODAY)'))
    check('unit', 'DAYS carry an open flag', pg.evaluate('[0,1,2].map(d => DAYS[d].open)') == [False, True, False])
    check('unit', 'closedTo is off without a stamped department', pg.evaluate('[0,1,2].map(d => closedTo(d))') == [False, False, False])
    check('unit', 'SCHEDULE days all exist in DAYS', pg.evaluate('SCHEDULE.every(s => DAYS[s.day])'))
    check('unit', 'every COMPS event has a time', pg.evaluate('COMPS.every(c => /\\d{2}:\\d{2} [AP]M/.test(c.when))'))
    check('unit', 'no page errors', not errs, errs)
    ctx.close()

    # stamped builds
    for dept, want in (('cs', [False, False, False]), ('other', [True, False, True])):
        ctx, pg, errs = page(browser, f'http://127.0.0.1:{PORT}/dist/{dept}/index.html?today=2026-10-24')
        check('unit', f'SITE_DEPT stamped as {dept}', pg.evaluate('SITE_DEPT') == dept)
        got = pg.evaluate('[0,1,2].map(d => closedTo(d))')
        check('unit', f'closedTo on {dept} build', got == want, f'got {got}')
        ctx.close()

# ---------- integration tests: every page of both builds ----------
EXPECT = {
    'cs':    {'days': 3, 'events': 13, 'pills': 3, 'cards': 13, 'sch': 3},
    'other': {'days': 1, 'events': 7,  'pills': 1, 'cards': 7,  'sch': 1},
}
def integration(browser):
    for dept in ('cs', 'other'):
        base = f'http://127.0.0.1:{PORT}/dist/{dept}/'
        want = EXPECT[dept]
        for name in PAGES:
            ctx, pg, errs = page(browser, f'{base}{name}.html?today=2026-10-24')
            pg.wait_for_timeout(800)
            check(dept, f'{name}: loads with no page errors', not errs, errs)
            broken = pg.evaluate('[...document.images].filter(i => i.complete && i.naturalWidth === 0 && !i.closest(".ev-pic,.thumb")).map(i => i.getAttribute("src"))')
            check(dept, f'{name}: no broken images', not broken, broken)
            hrefs = pg.evaluate('[...document.querySelectorAll("a[href$=\'.html\']")].map(a => a.getAttribute("href"))')
            check(dept, f'{name}: internal links stay relative', all(not h.startswith('/') for h in hrefs), hrefs[:5])
            nav_hrefs = pg.evaluate('[...document.querySelectorAll("nav a")].map(a => a.href).filter(h => h.endsWith(".html"))')
            check(dept, f'{name}: nav links point inside this build', all(f'/dist/{dept}/' in u for u in nav_hrefs), nav_hrefs[:3])

            if name == 'index':
                check(dept, 'home: schedule cards', pg.evaluate('document.querySelectorAll(".sch-card").length') == want['sch'])
                check(dept, 'home: event tiles', pg.evaluate('document.querySelectorAll("#cards .card").length') == want['cards'])
                check(dept, 'home: And Many More tile only with many events', pg.evaluate('!!document.querySelector(".tile-more")') == (dept == 'cs'))
                check(dept, 'home: hero date boxes visible', pg.evaluate('document.querySelectorAll(".dates li:not(.past)").length') == want['days'])
                if dept == 'other':
                    check(dept, 'home: other-department wording', 'every department' in pg.evaluate('document.querySelector(".h-sub").textContent + document.querySelector(".schedule .sub").textContent'))
                    check(dept, 'home: no 28 Oct tile', pg.evaluate('![...document.querySelectorAll("#cards .card")].some(c => c.dataset.day === "0")'))
                strip = pg.evaluate('document.querySelector(".marquee-track span").textContent')
                check(dept, 'home: marquee names only visible events', ('Mehndi' in strip) == (dept == 'cs') and ('Rangoli' in strip) == (dept == 'cs') and 'Quiz' in strip, strip[:80])
            if name == 'schedule':
                check(dept, 'schedule: day sections', pg.evaluate('document.querySelectorAll(".tt-day").length') == want['days'])
                check(dept, 'schedule: date pills', pg.evaluate('document.querySelectorAll(".pg-dates li:not(.past)").length') == want['pills'])
                check(dept, 'schedule: every slot links or labels an event', pg.evaluate('[...document.querySelectorAll(".tt-slot .tag")].every(t => t.textContent.trim().length > 0)'))
                if dept == 'other':
                    check(dept, 'schedule: only 5 Nov slots', pg.evaluate('[...document.querySelectorAll(".tt-day h2")].every(h => h.textContent.includes("5 November"))'))
            if name == 'events':
                check(dept, 'events: no department popup', not pg.evaluate('document.querySelector("#deptDialog").open'))
                check(dept, 'events: change-department chip hidden', pg.evaluate('document.querySelector("#deptChip").hidden'))
                check(dept, 'events: count', pg.evaluate('document.querySelector("#evCount").textContent') == f"{want['events']} of {want['events']} events")
                check(dept, 'events: 5 Nov events present for everyone', pg.evaluate('[...document.querySelectorAll(".ev-item .ev-day")].filter(e => e.textContent === "5 Nov").length') == 7)
                check(dept, 'events: 5 Nov labelled open to all incl. CS', pg.evaluate('[...document.querySelectorAll(".ev-item")].filter(e => e.dataset.day === "1").every(e => e.textContent.includes("including Computational Sciences"))'))
                # category filter still works on top of the department gate
                pg.click('#evFilters [data-f="fun"]'); pg.wait_for_timeout(300)
                shown = pg.evaluate('[...document.querySelectorAll(".ev-item:not(.hide) h2")].map(h => h.textContent)')
                check(dept, 'events: Fun filter', shown == ['Quiz', 'Debate'], shown)
            ctx.close()

    # root (unstamped) site: popup flow
    ctx, pg, errs = page(browser, f'http://127.0.0.1:{PORT}/events.html?today=2026-10-24')
    check('popup', 'asks for department on first visit', pg.evaluate('document.querySelector("#deptDialog").open'))
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    check('popup', 'Escape does not dismiss it', pg.evaluate('document.querySelector("#deptDialog").open'))
    pg.click('[data-dept="other"]'); pg.wait_for_timeout(400)
    check('popup', 'other department -> 7 events', pg.evaluate('document.querySelector("#evCount").textContent') == '7 of 13 events')
    pg.reload(); pg.wait_for_timeout(600)
    check('popup', 'choice remembered after reload', not pg.evaluate('document.querySelector("#deptDialog").open') and pg.evaluate('document.querySelector("#evCount").textContent') == '7 of 13 events')
    pg.click('#deptChip'); pg.wait_for_timeout(200); pg.click('[data-dept="cs"]'); pg.wait_for_timeout(400)
    check('popup', 'switch to CS -> 13 events', pg.evaluate('document.querySelector("#evCount").textContent') == '13 of 13 events')
    check('popup', 'no page errors', not errs, errs)
    ctx.close()

    # date gate end to end on the CS build
    ctx, pg, errs = page(browser, f'http://127.0.0.1:{PORT}/dist/cs/index.html?today=2026-10-29')
    check('date', 'after 28 Oct: 2 schedule cards', pg.evaluate('document.querySelectorAll(".sch-card").length') == 2)
    check('date', 'after 28 Oct: Mehndi tile gone', pg.evaluate('![...document.querySelectorAll("#cards .card h3")].some(h => h.textContent.includes("Mehndi"))'))
    ctx.close()
    ctx, pg, errs = page(browser, f'http://127.0.0.1:{PORT}/dist/cs/schedule.html?today=2026-11-06')
    check('date', 'on 6 Nov: only day 2 section', pg.evaluate('[...document.querySelectorAll(".tt-day h2")].map(h => h.textContent)') == ['Day 2, Friday 6 November 2026'])
    ctx.close()
    ctx, pg, errs = page(browser, f'http://127.0.0.1:{PORT}/dist/cs/schedule.html?today=2026-11-20')
    check('date', 'after the fest: all 3 days back', pg.evaluate('document.querySelectorAll(".tt-day").length') == 3)
    ctx.close()

def main():
    build()
    srv = serve()
    with sync_playwright() as p:
        browser = launch(p)
        unit(browser)
        integration(browser)
        browser.close()
    srv.shutdown()
    groups = {}
    for g, n, ok, d in results:
        groups.setdefault(g, [0, 0])[0 if ok else 1] += 1
    print('\n== breakdown ==')
    for g, (ok, bad) in groups.items():
        print(f'{g:8} {ok:3} passed {bad:3} failed')
    total_ok = sum(1 for r in results if r[2]); total = len(results)
    print(f'{"total":8} {total_ok:3} passed {total - total_ok:3} failed')
    sys.exit(0 if total_ok == total else 1)

if __name__ == '__main__':
    main()
