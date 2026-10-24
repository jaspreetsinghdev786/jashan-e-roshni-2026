// Builds a department-specific copy of the site into dist/<dept>.
// Usage: node build.js cs | other
// The chosen department is stamped on <html data-dept="…">; app.js then skips the
// department popup and hides the days that department cannot take part in.
const fs = require('fs'), path = require('path');
const dept = process.argv[2];
if (!['cs', 'other'].includes(dept)) { console.error('usage: node build.js cs|other'); process.exit(1); }
const out = path.join('dist', dept);
// Overwrite in place: dist/<dept>/.vercel holds that site's project link and must survive rebuilds.
fs.mkdirSync(out, { recursive: true });
for (const f of fs.readdirSync(out)) if (f !== '.vercel') fs.rmSync(path.join(out, f), { recursive: true, force: true });
for (const f of fs.readdirSync('.')) {
  if (/\.html$/.test(f)) {
    fs.writeFileSync(path.join(out, f), fs.readFileSync(f, 'utf8').replace('<html lang="en">', `<html lang="en" data-dept="${dept}">`));
  } else if (/\.(js|css|ico|png|webp|svg|webmanifest|txt)$/.test(f) && f !== 'build.js') {
    fs.copyFileSync(f, path.join(out, f));
  }
}
fs.cpSync('assets', path.join(out, 'assets'), { recursive: true });
console.log(`built ${out}`);
