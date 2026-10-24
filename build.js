// Builds department-specific copies of the site.
//   node build.js cs      -> dist/cs      (Computational Sciences: every event)
//   node build.js other   -> dist/other   (other departments: open days only)
//   node build.js all     -> dist/all     (one site: CS at /, other departments at /open/)
// The department is stamped on <html data-dept="…">; app.js then skips the
// department popup and hides the days that department cannot take part in.
const fs = require('fs'), path = require('path');
const mode = process.argv[2];
if (!['cs', 'other', 'all'].includes(mode)) { console.error('usage: node build.js cs|other|all'); process.exit(1); }

const emit = (dept, out) => {
  fs.mkdirSync(out, { recursive: true });
  for (const f of fs.readdirSync('.')) {
    if (/\.html$/.test(f)) {
      let html = fs.readFileSync(f, 'utf8').replace('<html lang="en">', `<html lang="en" data-dept="${dept}">`);
      if (dept === 'other') {
        // Bake in what app.js would do at runtime, so nothing CS-only flashes before the script runs.
        html = html
          .replace(/(<[a-z0-9]+ [^>]*data-other="([^"]*)"[^>]*>)[^<]*/g, '$1$2')   // alternate wording
          .replace(/[ \t]*<(li|a)[^>]*data-day="[02]"[^>]*>.*?<\/\1>[ \t]*\r?\n?/g, '')  // 28 Oct and 6 Nov pills
          .replace(/content="[^"]*Mehndi on 28 October[^"]*"/g, 'content="Inter-department finals on 5 November 2026. Department of Computational Sciences, MRSPTU."');
      }
      fs.writeFileSync(path.join(out, f), html);
    } else if (/\.(js|css|ico|png|webp|svg|webmanifest|txt)$/.test(f) && f !== 'build.js') {
      fs.copyFileSync(f, path.join(out, f));
    }
  }
  fs.cpSync('assets', path.join(out, 'assets'), { recursive: true });
};
const out = path.join('dist', mode);
// Overwrite in place: dist/<mode>/.vercel holds that site's project link and must survive rebuilds.
fs.mkdirSync(out, { recursive: true });
for (const f of fs.readdirSync(out)) if (f !== '.vercel') fs.rmSync(path.join(out, f), { recursive: true, force: true });
if (mode === 'all') { emit('cs', out); emit('other', path.join(out, 'open')); }
else emit(mode, out);
console.log(`built ${out}`);
