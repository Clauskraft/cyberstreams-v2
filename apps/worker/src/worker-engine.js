import Parser from "rss-parser";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

import {
  ensureOpenSearchResources,
  getOpenSearchClient,
  getOpenSearchIndex,
  getOpenSearchPipeline,
  isOpenSearchEnabled,
  waitForOpenSearchReady
} from "../opensearch-client.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_MEMORY_LIMIT = 500;

function createSilentLogger() {
  return {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {}
  };
}

async function loadFeedSourcesFromDisk(logger) {
  try {
    const feedsPath = path.resolve(__dirname, "../../../data/Cyberfeeds/rss-feeds.yaml");
    const file = await readFile(feedsPath, "utf8");
    const parsed = YAML.parse(file) || [];
    return parsed.filter((feed) => feed.enabled !== false);
  } catch (error) {
    logger.warn("Failed to load feed sources from disk", {
      error: error instanceof Error ? error.message : String(error)
    });
    return [];
  }
}

function normaliseDocument(feed, item, fetchedAt) {
  const publishedAt = item.isoDate || item.pubDate || fetchedAt;
  const risk = feed.risk || "medium";
  const tags = Array.isArray(feed.tags) ? feed.tags : [];

  return {
    id: item.guid || item.id || item.link || `${feed.id}-${Buffer.from(item.title || "untitled").toString("hex")}`,
    title: item.title ?? "Untitled document",
    content: item.contentSnippet || item.content || item.summary || "",
    url: item.link || item.id || null,
    source_id: feed.id,
    source_name: feed.name,
    risk,
    tags,
    published_at: new Date(publishedAt).toISOString(),
    fetched_at: fetchedAt,
    metadata: {
      categories: item.categories || tags,
      author: item.creator || item.author || null
    }
  };
}

async function fetchFeed(feed, fetchFn, parser, logger, requestTimeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetchFn(feed.url, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const raw = await response.text();
    const parsed = await parser.parseString(raw);
    const fetchedAt = new Date().toISOString();
    const items = parsed.items || [];

    return items.map((item) => normaliseDocument(feed, item, fetchedAt));
  } catch (error) {
    logger.error("Feed ingestion failed", {
      feed: feed.id,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function ensureOpenSearch(openSearch, logger) {
  if (!openSearch?.enabled) {
    return;
  }

  const waitForReady = openSearch.waitForReady || waitForOpenSearchReady;
  const ensureResources = openSearch.ensureResources || ensureOpenSearchResources;

  await waitForReady();
  logger.debug("OpenSearch cluster ready");
  await ensureResources();
  logger.debug("OpenSearch resources ensured");
}

async function indexDocuments(documents, openSearch, logger) {
  if (!openSearch?.enabled || documents.length === 0) {
    return;
  }

  const client = openSearch.getClient ? openSearch.getClient() : getOpenSearchClient();
  const index = openSearch.getIndex ? openSearch.getIndex() : getOpenSearchIndex();
  const pipeline = openSearch.getPipeline ? openSearch.getPipeline() : getOpenSearchPipeline();

  const body = [];
  for (const doc of documents) {
    const action = { index: { _index: index } };
    if (pipeline) {
      action.index.pipeline = pipeline;
    }
    body.push(action, doc);
  }

  await client.bulk({ refresh: "wait_for", body });
  logger.info("Indexed documents into OpenSearch", {
    count: documents.length,
    index
  });
}

export function createWorkerEngine(options = {}) {
  const logger = options.logger || console || createSilentLogger();
  const fetchFn = options.fetchFn || globalThis.fetch;
  const parser = new Parser();
  const memoryStore = [];
  const memoryLimit = options.memoryLimit || DEFAULT_MEMORY_LIMIT;
  const requestTimeoutMs = options.requestTimeoutMs || 10000;
  const fetchIntervalMs = options.fetchIntervalMs || 3600000;
  let intervalRef = null;
  let bootstrapped = false;

  async function resolveFeedSources() {
    if (options.feedSources?.length) {
      return options.feedSources.filter((feed) => feed.enabled !== false);
    }

    const diskFeeds = await loadFeedSourcesFromDisk(logger);
    if (diskFeeds.length > 0) {
      return diskFeeds;
    }

    return [
      {
        id: "ars-technica",
        name: "Ars Technica Security",
        url: "https://feeds.arstechnica.com/arstechnica/index",
        risk: "medium"
      }
    ];
  }

  function updateMemoryStore(documents) {
    memoryStore.unshift(...documents);
    if (memoryStore.length > memoryLimit) {
      memoryStore.length = memoryLimit;
    }
  }

  async function runIngestionCycle() {
    const feeds = await resolveFeedSources();
    const documents = [];
    let failures = 0;

    for (const feed of feeds) {
      try {
        const docs = await fetchFeed(feed, fetchFn, parser, logger, requestTimeoutMs);
        documents.push(...docs);
        updateMemoryStore(docs);
      } catch (error) {
        failures += 1;
      }
    }

    try {
      await indexDocuments(documents, options.openSearch, logger);
    } catch (error) {
      logger.error("Failed to index documents", {
        error: error instanceof Error ? error.message : String(error)
      });
    }

    return {
      totalIndexed: documents.length,
      feedsProcessed: feeds.length,
      failures
    };
  }

  async function bootstrap() {
    if (!bootstrapped && (options.openSearch?.enabled ?? isOpenSearchEnabled())) {
      await ensureOpenSearch(options.openSearch, logger);
    }

    bootstrapped = true;
    const result = await runIngestionCycle();
    logger.info("Worker bootstrap complete", result);
    return result;
  }

  async function runContinuous() {
    await bootstrap();

    if (intervalRef) {
      clearInterval(intervalRef);
    }

    intervalRef = setInterval(() => {
      runIngestionCycle().catch((error) => {
        logger.error("Scheduled ingestion failed", {
          error: error instanceof Error ? error.message : String(error)
        });
      });
    }, fetchIntervalMs);
  }

  function getMemoryStoreDocuments() {
    return [...memoryStore];
  }

  return {
    bootstrap,
    runContinuous,
    runOnce: runIngestionCycle,
    getMemoryStoreDocuments
  };
}

export default {
  createWorkerEngine
};

