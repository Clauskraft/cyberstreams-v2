import fs from "node:fs"; import path from "node:path"; import yaml from "yaml";
const dir="data/Cyberfeeds"; const req = ["id","name","url","type","enabled"]; let errs=0;
if (!fs.existsSync(dir)) { console.error("missing folder: "+dir); process.exit(2); }
for (const f of fs.readdirSync(dir).filter(x=>x.endsWith(".yaml"))){
  const arr=yaml.parse(fs.readFileSync(path.join(dir,f),"utf8"))||[];
  arr.forEach((o,i)=>{ for(const k of req){ if(!(k in o)){ console.log(`${f}[${i}]: missing ${k}`); errs++; } } });
}
process.exit(errs?2:0);
