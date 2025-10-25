import Parser from "rss-parser";
import crypto from "crypto";

const parser = new Parser();

// Feed sources to process - using real, publicly accessible feeds
const FEED_SOURCES = [
  {
    id: "ars-technica",
    name: "Ars Technica Security Feed",
    url: "https://feeds.arstechnica.com/arstechnica/index",
    risk: "medium"
  },
  {
    id: "hacker-news",
    name: "Hacker News – Security",
    url: "https://news.ycombinator.com/rss",
    risk: "low"
  },
  {
    id: "thehackernews",
    name: "The Hacker News",
    url: "https://feeds.thehackernews.com/feed.rss",
    risk: "high"
  }
];

// Mock document store (in production: OpenSearch)
const indexedDocuments = [];

/**
 * Normalize feed item to standard document schema
 */
function normalizeDocument(feedItem, source) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  return {
    id: `${source.id}-${id.substring(0, 8)}`,
    title: feedItem.title || feedItem.name || "Untitled",
    content: feedItem.content || feedItem.contentSnippet || feedItem.summary || feedItem.description || "",
    source_id: source.id,
    source_name: source.name,
    url: feedItem.link || feedItem.url || "",
    risk: source.risk || "low",
    published_at: feedItem.pubDate ? new Date(feedItem.pubDate).toISOString() : now,
    fetched_at: now,
    tags: Array.isArray(feedItem.categories) 
      ? feedItem.categories.map(c => (typeof c === "string" ? c : c.name || "")).filter(Boolean)
      : ["security"],
    metadata: {
      feed_item_id: feedItem.guid || feedItem.id || null,
      category: feedItem.categories?.[0] || null,
      author: feedItem.author || feedItem.creator || null
    }
  };
}

/**
 * Fetch and parse RSS feed
 */
async function fetchFeed(source) {
  try {
    console.log(`📡 Fetching feed: ${source.name}`);
    
    const feed = await Promise.race([
      parser.parseURL(source.url),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10000))
    ]);
    
    const documents = (feed.items || []).slice(0, 10).map(item => normalizeDocument(item, source));
    console.log(`   ✅ Parsed ${documents.length} items from ${source.name}`);
    return documents;
  } catch (error) {
    console.error(`   ❌ Error fetching ${source.name}:`, error.message);
    return [];
  }
}

/**
 * Index documents (mock - in production: POST to OpenSearch cyber-docs alias)
 */
async function indexDocuments(documents) {
  if (documents.length === 0) {
    console.log("⚠️  No documents to index");
    return;
  }

  console.log(`📝 Indexing ${documents.length} documents to cyber-docs alias`);
  
  // In production: POST /cyber-docs/_bulk to OpenSearch
  // Mock: store in memory
  indexedDocuments.push(...documents);
  
  console.log(`   ✅ Successfully indexed ${documents.length} documents`);
  console.log(`   📊 Total indexed: ${indexedDocuments.length}`);
  
  // Log audit trail
  documents.forEach(doc => {
    const hash = crypto.createHash("sha256").update(JSON.stringify(doc)).digest("hex").substring(0, 16);
    console.log(`   [AUDIT] source=${doc.source_id} url=${doc.url.substring(0, 60)}... bytes=${JSON.stringify(doc).length} hash=${hash}`);
  });
}

/**
 * Bootstrap worker - fetch all sources and index
 */
async function bootstrap() {
  console.log("\n" + "=".repeat(70));
  console.log("🚀 Cyberstreams V2 – RSS Worker Bootstrap");
  console.log("=".repeat(70) + "\n");

  let totalIndexed = 0;

  // Fetch all sources sequentially
  for (const source of FEED_SOURCES) {
    const documents = await fetchFeed(source);
    await indexDocuments(documents);
    totalIndexed += documents.length;
    console.log("");
  }

  console.log("=".repeat(70));
  console.log(`✅ Worker Bootstrap Complete`);
  console.log(`   Total Documents Indexed: ${totalIndexed}`);
  console.log(`   Total in Store: ${indexedDocuments.length}`);
  console.log("=".repeat(70) + "\n");

  // Print sample documents for verification
  if (indexedDocuments.length > 0) {
    console.log("📋 Sample Indexed Documents:\n");
    indexedDocuments.slice(0, 3).forEach((doc, idx) => {
      console.log(`[${idx + 1}] ${doc.title.substring(0, 60)}${doc.title.length > 60 ? "..." : ""}`);
      console.log(`    Source: ${doc.source_name}`);
      console.log(`    Risk: ${doc.risk}`);
      console.log(`    URL: ${doc.url.substring(0, 70)}${doc.url.length > 70 ? "..." : ""}`);
      console.log(`    Tags: ${doc.tags.join(", ") || "—"}`);
      console.log("");
    });
  }

  return totalIndexed;
}

/**
 * Continuous worker loop (fetch and index at intervals)
 */
async function runContinuous() {
  const FETCH_INTERVAL = process.env.FETCH_INTERVAL_MS || 3600000; // 1 hour default

  console.log(`⏰ Worker polling enabled (interval: ${FETCH_INTERVAL / 1000}s)`);

  setInterval(async () => {
    console.log(`\n[${new Date().toISOString()}] Running scheduled fetch...`);
    for (const source of FEED_SOURCES) {
      const documents = await fetchFeed(source);
      await indexDocuments(documents);
    }
  }, FETCH_INTERVAL);
}

/**
 * Main entry point
 */
async function main() {
  try {
    // Bootstrap: fetch and index initial data
    await bootstrap();

    // Optional: Run continuous polling
    if (process.env.WORKER_MODE === "continuous") {
      await runContinuous();
      // Keep process alive
      setInterval(() => {}, 1000);
    }
  } catch (error) {
    console.error("❌ Worker error:", error);
    process.exit(1);
  }
}

main();
