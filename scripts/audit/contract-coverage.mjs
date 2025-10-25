import fs from "node:fs"; import yaml from "yaml";
if (!fs.existsSync("packages/contracts/openapi.yaml")) { console.error("OpenAPI not found"); process.exit(2); }
const api = yaml.parse(fs.readFileSync("packages/contracts/openapi.yaml","utf8"));
const paths = Object.keys(api.paths||{});
const impl = new Set(["/api/v1/health","/api/v1/search","/api/v1/activity/stream"]);
const spec = new Set(paths.map(p=> (p.startsWith("/api/v1")? p : "/api/v1"+(p.startsWith("/")?p:"/"+p)) ));
const missingInImpl = [...spec].filter(p=>!impl.has(p));
const missingInSpec = [...impl].filter(p=>!spec.has(p));
console.log(JSON.stringify({specCount: spec.size, implCount: impl.size, missingInImpl, missingInSpec}, null, 2));
if (missingInImpl.length || missingInSpec.length) process.exit(2);
