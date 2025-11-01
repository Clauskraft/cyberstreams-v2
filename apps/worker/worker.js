import fetch from "node-fetch";
import {
  getOpenSearchClient,
  getOpenSearchIndex,
  getOpenSearchPipeline,
  ensureOpenSearchResources,
  isOpenSearchEnabled,
  waitForOpenSearchReady
} from "./opensearch-client.js";
import { createWorkerEngine } from "./src/worker-engine.js";

const openSearchEnabled = isOpenSearchEnabled();
let openSearchClient = null;
let openSearchIndex = "cyber-docs";
let ingestPipeline = "cyberstreams-default-pipeline";

const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 10000);
const FETCH_INTERVAL_MS = Number(process.env.FETCH_INTERVAL_MS || 3600000);

const engine = createWorkerEngine({
  requestTimeoutMs: REQUEST_TIMEOUT_MS,
  fetchFn: fetch,
  fetchIntervalMs: FETCH_INTERVAL_MS,
  logger: console,
  openSearch: {
    enabled: openSearchEnabled,
    getClient: () => openSearchClient,
    getIndex: () => openSearchIndex,
    getPipeline: () => ingestPipeline,
    ensureResources: ensureOpenSearchResources,
    waitForReady: waitForOpenSearchReady
  }
});

async function bootstrap() {
  if (openSearchEnabled) {
    openSearchClient = getOpenSearchClient();
    await ensureOpenSearchResources();
    openSearchIndex = getOpenSearchIndex();
    ingestPipeline = getOpenSearchPipeline();
  }
  return engine.bootstrap();
}

async function runContinuous() {
  return engine.runContinuous();
}

async function main() {
  try {
    await bootstrap();

    if (process.env.WORKER_MODE === "continuous") {
      await runContinuous();
      setInterval(() => {}, 1000);
    }
  } catch (error) {
    console.error("❌ Worker error:", error);
    process.exit(1);
  }
}

export function getMemoryStoreDocuments() {
  return engine.getMemoryStoreDocuments();
}

main();
 
