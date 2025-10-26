import fs from "node:fs";
import path from "node:path";
import yaml from "yaml";

const dir = "data/Cyberfeeds";
const req = ["id", "name", "url", "type", "enabled"];
const skipPatterns = [/^profiles\.ya?ml$/i, /^keywords\.ya?ml$/i];
let errs = 0;

if (!fs.existsSync(dir)) {
  console.error("missing folder: " + dir);
  process.exit(2);
}

for (const filename of fs.readdirSync(dir)) {
  if (!filename.endsWith(".yaml")) continue;
  if (skipPatterns.some((rx) => rx.test(filename))) continue;

  const fullPath = path.join(dir, filename);
  const arr = yaml.parse(fs.readFileSync(fullPath, "utf8")) || [];
  arr.forEach((o, i) => {
    for (const k of req) {
      if (!(k in o)) {
        console.log(`${filename}[${i}]: missing ${k}`);
        errs++;
      }
    }
  });
}

process.exit(errs ? 2 : 0);
