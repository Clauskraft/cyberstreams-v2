#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

const ids = (process.env.IDS || (process.argv.find(a=>a.startsWith('--ids='))||'').split('=')[1] || '').split(',').map(s=>s.trim()).filter(Boolean);
if (!ids.length) { console.error('usage: IDS=id1,id2 node scripts/darkweb/toggle-sources.mjs'); process.exit(2); }

const base = path.resolve(process.cwd(), 'data/Cyberfeeds');
const file = fs.existsSync(path.join(base,'darkweb.yaml'))
  ? path.join(base,'darkweb.yaml')
  : path.join(base,'darkweb.template.yaml');

const arr = YAML.parse(fs.readFileSync(file,'utf8')) || [];
let changed = 0;
for (const o of arr) { if (ids.includes(o.id)) { o.enabled = true; changed++; } }
fs.writeFileSync(file, YAML.stringify(arr));
console.log(`enabled ${changed} sources in ${file}`);
