#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

const base = path.resolve(process.cwd(), 'data/Cyberfeeds');
const file = fs.existsSync(path.join(base,'darkweb.yaml'))
  ? path.join(base,'darkweb.yaml')
  : path.join(base,'darkweb.template.yaml');

const arr = YAML.parse(fs.readFileSync(file,'utf8')) || [];
const req = ['id','name','url','type','risk','enabled'];
let errs = 0;
arr.forEach((o,i)=>{
  for (const k of req) if (!(k in o)) { console.log(`row ${i}: missing ${k}`); errs++; }
  if (!['forum','market','paste','blog'].includes(o.type)) { console.log(`row ${i}: unexpected type ${o.type}`); errs++; }
});
process.exit(errs?1:0);
