const serviceName = process.env.RAILWAY_SERVICE_NAME || process.env.SERVICE || "";

if (/worker/i.test(serviceName)) {
  console.log("[startup] Detected worker service → loading apps/worker/worker.js");
  await import("./apps/worker/worker.js");
} else {
  console.log("[startup] Detected API service → loading apps/api/server.js");
  await import("./apps/api/server.js");
}

