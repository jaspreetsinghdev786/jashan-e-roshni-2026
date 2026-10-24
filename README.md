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
