import { useEffect, useMemo, useState } from "react";

const API_BASE_DEFAULT = "https://api-production-a9b1.up.railway.app/api/v1";

type DocumentHit = {
  id: string;
  title: string;
  content: string;
  source_id: string;
  source_name: string;
  url: string;
  risk: string;
  published_at: string;
  fetched_at: string;
  tags?: string[];
};

type SearchResponse = {
  total: number;
  hits: DocumentHit[];
  aggregations: {
    sources: Record<string, number>;
    risks: Record<string, number>;
  };
  _meta: {
    limit: number;
    offset: number;
    took_ms: number;
  };
};

export function App() {
  const [apiBase, setApiBase] = useState<string>(API_BASE_DEFAULT);
  const [apiKey, setApiKey] = useState<string>("");
  const [jwt, setJwt] = useState<string>("");
  const [query, setQuery] = useState("ransomware");
  const [source, setSource] = useState("all");
  const [risk, setRisk] = useState("all");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamLogs, setStreamLogs] = useState<string[]>([]);
  const [streaming, setStreaming] = useState(false);

  const headers = useMemo(() => {
    const h: Record<string, string> = {};
    if (apiKey.trim()) {
      h["X-API-Key"] = apiKey.trim();
    }
    if (jwt.trim()) {
      h["Authorization"] = `Bearer ${jwt.trim()}`;
    }
    return h;
  }, [apiKey, jwt]);

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ q: query });
      if (source !== "all") params.set("source", source);
      if (risk !== "all") params.set("risk", risk);

      const res = await fetch(`${apiBase}/search?${params.toString()}`, {
        headers,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as SearchResponse;
      setResults(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setResults(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleGetJwt() {
    setError(null);
    try {
      const res = await fetch(`${apiBase}/auth/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify({ scopes: ["search", "stream"], expiresIn: 3600 }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setJwt(data.access_token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  useEffect(() => {
    if (!streaming) return;
    const evtSource = new EventSource(`${apiBase}/activity/stream`, {
      withCredentials: false,
    });

    evtSource.onmessage = (event) => {
      setStreamLogs((prev) => [event.data, ...prev].slice(0, 50));
    };

    evtSource.onerror = () => {
      evtSource.close();
      setStreaming(false);
    };

    return () => evtSource.close();
  }, [apiBase, streaming]);

  return (
    <div className="app">
      <header>
        <h1>Cyberstreams Web Console</h1>
        <p>Realtime threat search &amp; stream monitor</p>
      </header>

      <section className="connection">
        <div>
          <label>API Base URL</label>
          <input value={apiBase} onChange={(e) => setApiBase(e.target.value)} />
        </div>
        <div>
          <label>X-API-Key</label>
          <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="key_test_1234567890abcdef" />
        </div>
        <div>
          <label>JWT Token</label>
          <textarea value={jwt} onChange={(e) => setJwt(e.target.value)} rows={2} />
        </div>
        <button onClick={handleGetJwt}>Get JWT (requires API key)</button>
      </section>

      <section className="search">
        <h2>Search Documents</h2>
        <div className="controls">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search query (e.g., ransomware)"
          />
          <select value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="all">All Sources</option>
            <option value="ars-technica">Ars Technica</option>
            <option value="hacker-news">Hacker News</option>
            <option value="thehackernews">The Hacker News</option>
          </select>
          <select value={risk} onChange={(e) => setRisk(e.target.value)}>
            <option value="all">All Risk Levels</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <button onClick={handleSearch} disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
        {error && <p className="error">{error}</p>}
        {results && (
          <div className="results">
            <p>
              Found <strong>{results.total}</strong> documents in {results._meta.took_ms}ms
            </p>
            <ul>
              {results.hits.map((hit) => (
                <li key={hit.id}>
                  <h3>
                    <a href={hit.url} target="_blank" rel="noopener noreferrer">
                      {hit.title}
                    </a>
                  </h3>
                  <p>{hit.content}</p>
                  <small>
                    Source: {hit.source_name} • Risk: {hit.risk} • Published: {new Date(hit.published_at).toLocaleString()}
                  </small>
                  {hit.tags?.length ? <div className="tags">Tags: {hit.tags.join(", ")}</div> : null}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="stream">
        <h2>Activity Stream (SSE)</h2>
        <div className="controls">
          <button onClick={() => setStreaming((prev) => !prev)}>
            {streaming ? "Stop Stream" : "Start Stream"}
          </button>
        </div>
        <div className="log">
          {streamLogs.length === 0 ? <p>No events yet.</p> : null}
          <ul>
            {streamLogs.map((log, index) => (
              <li key={index}>{log}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
