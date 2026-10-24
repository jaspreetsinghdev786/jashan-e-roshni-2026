# jashan-e-roshni-2026

Website for **Jashan-e-Roshni 2026**, the festival of lights by the Department of Computational Sciences, MRSPTU Bathinda.
Mehndi on 28 October, finals on 5 November, exhibition and prize distribution on 6 November.

## Pages

- `index.html`: home
- `schedule.html`: full timetable, day by day
- `events.html`: all 13 competitions with their rules
- `exhibition.html`: exhibition details and price tagging
- `contact.html`: venue, social links, map and questions

Plain HTML, CSS and JavaScript. Open `index.html` in a browser; no build step.
Event data (rules, timings, schedule) lives in `app.js`.

## Tests

```bash
pip install playwright
python tests/run_tests.py
```

## Deployments

One codebase, two Vercel sites on separate domains. `build.js` stamps the department on `<html data-dept="…">`, which removes the department popup, hides the days that department cannot enter and bakes in the matching wording.

| Audience | Build | URL |
|---|---|---|
| Computational Sciences (all events) | `node build.js cs` then `vercel --prod` inside `dist/cs` | https://jashan-e-roshni-2026-eight.vercel.app |
| Other departments (5 Nov only) | `node build.js other` then `vercel --prod` inside `dist/other` | https://jashan-e-roshni-2026-open.vercel.app |

The two are separate deployments, so no path on one reaches the other. The root folder (with the popup) still runs as-is for local preview. `dist/` is ignored by git; each `dist/<dept>/.vercel` folder holds that site's project link. `node build.js all` still produces a combined site with the other-departments copy under `/open/` if a single domain is ever wanted.

Tests: `python tests/test_gate.py` builds both sites and runs the unit and integration checks (needs Playwright plus Edge or Chrome).
