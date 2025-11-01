const opensearchModule = await import(new URL("../../lib/opensearch-client.js", import.meta.url));

export const {
  ensureOpenSearchResources,
  getOpenSearchClient,
  getOpenSearchIndex,
  getOpenSearchPipeline,
  isOpenSearchEnabled,
  waitForOpenSearchReady
} = opensearchModule;

