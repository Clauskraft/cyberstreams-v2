import { Client } from "@opensearch-project/opensearch";

let cachedClient = null;
let resourcesEnsured = false;

function getConfig() {
  const {
    OPENSEARCH_URL,
    OPENSEARCH_USERNAME,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_INDEX,
    OPENSEARCH_PIPELINE,
    OPENSEARCH_ALIAS,
    OPENSEARCH_ALLOW_INSECURE
  } = process.env;

  return {
    url: OPENSEARCH_URL || "",
    username: OPENSEARCH_USERNAME || "",
    password: OPENSEARCH_PASSWORD || "",
    index: OPENSEARCH_INDEX || "cyber-docs",
    pipeline: OPENSEARCH_PIPELINE || "cyberstreams-default-pipeline",
    alias: OPENSEARCH_ALIAS || "cyber-docs",
    allowInsecure: (OPENSEARCH_ALLOW_INSECURE || "false").toLowerCase() === "true"
  };
}

export function isOpenSearchEnabled() {
  return Boolean(getConfig().url);
}

export function resetOpenSearchClient() {
  cachedClient = null;
  resourcesEnsured = false;
}

export function getOpenSearchClient() {
  const config = getConfig();

  if (!config.url) {
    throw new Error("OPENSEARCH_URL not configured");
  }

  if (!cachedClient) {
    cachedClient = new Client({
      node: config.url,
      auth: config.username
        ? { username: config.username, password: config.password }
        : undefined,
      ssl: {
        rejectUnauthorized: !config.allowInsecure
      }
    });
  }

  return cachedClient;
}

export function getOpenSearchIndex() {
  return getConfig().index;
}

export function getOpenSearchAlias() {
  return getConfig().alias;
}

export function getOpenSearchPipeline() {
  return getConfig().pipeline;
}

export function getOpenSearchConfig() {
  return getConfig();
}

export async function ensureOpenSearchResources() {
  if (!isOpenSearchEnabled()) {
    return false;
  }

  if (resourcesEnsured) {
    return true;
  }

  const client = getOpenSearchClient();
  const index = getOpenSearchIndex();
  const alias = getOpenSearchAlias();
  const pipeline = getOpenSearchPipeline();

  // Ensure index exists with proper mappings
  const indexExists = await client.indices.exists({ index });
  const existsBody = typeof indexExists === "boolean" ? indexExists : indexExists.body;
  if (!existsBody) {
    await client.indices.create({
      index,
      body: {
        settings: {
          index: {
            number_of_shards: 1,
            number_of_replicas: 0
          },
          analysis: {
            analyzer: {
              cyberstreams_html: {
                type: "custom",
                tokenizer: "standard",
                char_filter: ["html_strip"],
                filter: ["lowercase", "stop", "porter_stem"]
              }
            }
          }
        },
        mappings: {
          dynamic: "true",
          properties: {
            id: { type: "keyword" },
            title: {
              type: "text",
              analyzer: "cyberstreams_html",
              fields: {
                keyword: { type: "keyword", ignore_above: 256 }
              }
            },
            content: {
              type: "text",
              analyzer: "cyberstreams_html"
            },
            source_id: { type: "keyword" },
            source_name: { type: "keyword" },
            url: { type: "keyword" },
            risk: { type: "keyword" },
            tags: { type: "keyword" },
            published_at: { type: "date" },
            fetched_at: { type: "date" },
            ingested_at: { type: "date" },
            metadata: {
              type: "object",
              dynamic: true
            }
          }
        }
      }
    });
  }

  // Ensure alias exists and points to the index
  if (alias && alias !== index) {
    const aliasExists = await client.indices.existsAlias({ index, name: alias });
    const aliasBody = typeof aliasExists === "boolean" ? aliasExists : aliasExists.body;
    if (!aliasBody) {
      await client.indices.putAlias({
        index,
        name: alias
      });
    }
  }

  // Ensure ingest pipeline exists
  try {
    await client.ingest.getPipeline({ id: pipeline });
  } catch (error) {
    if (error?.statusCode === 404) {
      await client.ingest.putPipeline({
        id: pipeline,
        body: {
          description: "Cyberstreams default pipeline – enrich documents with ingest metadata",
          processors: [
            {
              set: {
                field: "ingested_at",
                value: "{{_ingest.timestamp}}"
              }
            },
            {
              remove: {
                field: "metadata.null",
                ignore_missing: true
              }
            }
          ]
        }
      });
    } else {
      throw error;
    }
  }

  resourcesEnsured = true;
  return true;
}

export async function waitForOpenSearchReady(timeoutMs = 10000) {
  if (!isOpenSearchEnabled()) {
    return false;
  }

  const client = getOpenSearchClient();
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const health = await client.cluster.health();
      const status = health.body?.status || health.status;
      if (["green", "yellow"].includes(status)) {
        return true;
      }
    } catch (error) {
      // swallow and retry until timeout
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return false;
}

export async function deleteDocumentById(id) {
  if (!isOpenSearchEnabled()) {
    return false;
  }

  const client = getOpenSearchClient();
  const index = getOpenSearchIndex();

  try {
    await client.delete({ index, id, refresh: "wait_for" });
    return true;
  } catch (error) {
    if (error?.statusCode === 404) {
      return false;
    }
    throw error;
  }
}

