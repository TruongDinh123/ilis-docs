import { JSDOM } from 'jsdom';
import fs from 'node:fs';
const html = fs.readFileSync(process.env.TEMP + '/ilis_src/index_utf8.html', 'utf8');
const dom = new JSDOM(html);
const d = dom.window.document;
function skel(el, depth, max, out) {
  if (depth > max) return;
  for (const c of el.children) {
    const t = (c.tagName === 'DIV' || c.tagName === 'SECTION' || c.tagName==='UL'||c.tagName==='OL') ? '' : '';
    const txt = [...c.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join(' ').slice(0, 60);
    out.push('  '.repeat(depth) + c.tagName.toLowerCase() + (c.id ? '#' + c.id : '') + (c.className ? '.' + String(c.className).replace(/\s+/g, '.') : '') + (txt ? '  "' + txt + '"' : ''));
    skel(c, depth + 1, max, out);
  }
}
const target = process.argv[2];
const max = Number(process.argv[3] || 3);
const el = target === 'body' ? d.body : d.querySelector(target);
const out = [];
skel(el, 0, max, out);
console.log(out.join('\n'));
