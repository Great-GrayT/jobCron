// One-off generator for public/ornaments/*.svg (Button 3 flourish artwork).
// potrace is NOT a project dependency — install it ad-hoc to regenerate:
//   npm i -D potrace && node trace-ornaments.js && npm rm potrace
const potrace = require('potrace');
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'public', 'ornaments');
const files = ['persian-vine.png', 'paisley-line.png', 'paisley-color.png'];
let i = 0;
function next() {
  if (i >= files.length) return;
  const f = files[i++];
  const opts = { threshold: 170, turdSize: 3, optTolerance: 0.6, blackOnWhite: true, color: '#caa64a', background: 'transparent' };
  potrace.trace(path.join(dir, f), opts, (err, svg) => {
    if (err) { console.log(f, 'ERR', err.message); return next(); }
    const out = path.join(dir, f.replace('.png', '.svg'));
    fs.writeFileSync(out, svg);
    console.log(f, '->', path.basename(out), (svg.length / 1024).toFixed(1) + 'KB');
    next();
  });
}
next();
