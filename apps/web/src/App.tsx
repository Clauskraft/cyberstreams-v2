import { useCallback, useEffect, useMemo, useState } from "react";
import CVIAnalyzer from "./CVIAnalyzer";
import { OsintPanel, DEFAULT_OSINT_TOOLS } from "@cyberstreams/osint-panel";
import AgentDashboard from "@cyberstreams/agent-ops/src/ui/AgentDashboard";
import IdeaBoard from "@cyberstreams/agent-ops/src/ui/IdeaBoard";

const DEFAULT_API_BASE =
  (typeof window !== "undefined" && (window as any).__CYBERSTREAMS_API_BASE__) ||
  (import.meta.env?.VITE_API_BASE as string | undefined) ||
  "http://127.0.0.1:8081/api/v1";

const ADMIN_TABS = ["overview", "services", "models", "agents", "actions", "cvi", "osint", "agentops"] as const;
type AdminTab = (typeof ADMIN_TABS)[number];

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

type ServiceStatus = {
  id: string;
  name: string;
  description: string;
  status: "running" | "stopped" | "degraded" | "unknown";
  lastHeartbeat?: string | null;
  controllable?: boolean;
};

type ModelProvider = {
  id: string;
  name: string;
  description: string;
  status: "available" | "degraded" | "offline";
  default?: boolean;
  latencyMs?: number;
};

type AgentProfile = {
  id: string;
  name: string;
  role: string;
  description: string;
  lastRun?: string | null;
  enabled: boolean;
  entryPoint: string;
};

type AdminAction = {
  id: string;
  label: string;
  description: string;
  command: string;
  icon?: string;
};

const DEFAULT_SERVICES: ServiceStatus[] = [
  {
    id: "api",
    name: "API Gateway",
    description: "Fastify REST API serving search, auth, and telemetry",
    status: "running",
    lastHeartbeat: new Date().toISOString(),
    controllable: true,
  },
  {
    id: "worker",
    name: "RSS & Indexer Worker",
    description: "Ingests feeds, normalises documents, and pushes to OpenSearch",
    status: "running",
    lastHeartbeat: new Date().toISOString(),
    controllable: true,
  },
  {
    id: "opensearch",
    name: "OpenSearch Cluster",
    description: "Search index `cyber-docs` for live querying",
    status: "degraded",
    controllable: false,
  },
  {
    id: "minio",
    name: "MinIO Object Store",
    description: "Stores raw artefacts, quarantined intel, and attachments",
    status: "stopped",
    controllable: false,
  },
];

const DEFAULT_MODELS: ModelProvider[] = [
  {
    id: "xai",
    name: "X-API",
    description: "Operational LLM decisioning (Railway deployment)",
    status: "available",
    latencyMs: 800,
    default: true,
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "Fallback GPT endpoints for enrichment",
    status: "degraded",
    latencyMs: 950,
  },
  {
    id: "azure-openai",
    name: "Azure OpenAI",
    description: "Enterprise-grade compliance with EU residency",
    status: "offline",
  },
];

const DEFAULT_AGENTS: AgentProfile[] = [
  {
    id: "build-agent",
    name: "Build Agent",
    role: "Implementation",
    description: "Implements API endpoints, worker pipelines, and infrastructure",
    enabled: true,
    entryPoint: ".cursor/agents/build/agent.md",
    lastRun: new Date().toISOString(),
  },
  {
    id: "design-agent",
    name: "Design Agent",
    role: "Architecture & Security",
    description: "Produces RFCs, performs threat models, and reviews configs",
    enabled: true,
    entryPoint: ".cursor/agents/design/agent.md",
    lastRun: null,
  },
  {
    id: "test-agent",
    name: "Test Agent",
    role: "QA & Validation",
    description: "Generates smoke, integration, and contract tests",
    enabled: true,
    entryPoint: ".cursor/agents/test/agent.md",
    lastRun: null,
  },
  {
    id: "release-agent",
    name: "Release Agent",
    role: "Operations",
    description: "Prepares release notes, checks health, and coordinates deploys",
    enabled: false,
    entryPoint: ".cursor/agents/release/agent.md",
    lastRun: null,
  },
  {
    id: "master-agent",
    name: "Orchestrator Agent",
    role: "Master Coordinator",
    description: "Orchestrates agent collaboration, escalates blockers, and aligns delivery with business goals",
    enabled: true,
    entryPoint: ".cursor/agents/master/agent.md",
    lastRun: null,
  },
];

const DEFAULT_ACTIONS: AdminAction[] = [
  {
    id: "sync",
    label: "Synchronize Sources",
    description: "Run worker bootstrap to fetch and index latest data",
    command: "npm run start:worker",
    icon: "📡",
  },
  {
    id: "deploy",
    label: "Deploy to Railway",
    description: "Trigger make deploy sequence (api + worker)",
    command: "make deploy",
    icon: "☁️",
  },
  {
    id: "audit",
    label: "Run Security Audits",
    description: "Execute scripts/audit and summarise findings",
    command: "npm run audit:sources && npm run audit:contract",
    icon: "🛡️",
  },
];

export function App() {
  const [apiBase, setApiBase] = useState<string>(DEFAULT_API_BASE);
  const DEFAULT_API_KEY =
    (typeof window !== "undefined" && (window as any).__CYBERSTREAMS_API_KEY__) ||
    (import.meta.env.VITE_API_KEY as string | undefined) ||
    (typeof window !== "undefined" ? window.localStorage.getItem("cyberstreams.apiKey") || "" : "");
  const [apiKey, setApiKey] = useState<string>(DEFAULT_API_KEY);
  const [jwt, setJwt] = useState<string>("");
  const [query, setQuery] = useState("ransomware");
  const [source, setSource] = useState("all");
  const [risk, setRisk] = useState("all");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamLogs, setStreamLogs] = useState<string[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [services, setServices] = useState<ServiceStatus[]>(DEFAULT_SERVICES);
  const [models, setModels] = useState<ModelProvider[]>(DEFAULT_MODELS);
  const [agents, setAgents] = useState<AgentProfile[]>(DEFAULT_AGENTS);
  const [actions, setActions] = useState<AdminAction[]>(DEFAULT_ACTIONS);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [actionLogs, setActionLogs] = useState<string[]>([]);
  const [actionRunning, setActionRunning] = useState<string | null>(null);
  const [commandResult, setCommandResult] = useState<string | null>(null);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [draftDescription, setDraftDescription] = useState<string>("");

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

  const logAction = useCallback((message: string) => {
    setActionLogs((prev) => [message, ...prev].slice(0, 200));
  }, []);

  const fetchAdminState = useCallback(async () => {
    setAdminLoading(true);
    setAdminError(null);
    try {
      const params = new URLSearchParams();
      if (!jwt && apiKey) params.set("apiKey", apiKey);
      if (jwt) params.set("token", jwt);

      const res = await fetch(`${apiBase}/admin/state?${params.toString()}`, {
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setServices(data.services || []);
      setModels(data.models || []);
      setAgents(data.agents || []);
      setActions(data.actions || DEFAULT_ACTIONS);
      setActionLogs(data.actionLogs || []);
      logAction(`${new Date().toISOString()} – Admin state synchronised`);
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : "Failed to load admin state");
      logAction(`${new Date().toISOString()} – Admin state load failed`);
    } finally {
      setAdminLoading(false);
    }
  }, [apiBase, headers, logAction, apiKey, jwt]);

  const ensureJwt = useCallback(async () => {
    if (jwt.trim()) {
      return jwt.trim();
    }
    if (!apiKey.trim()) {
      throw new Error("API key required to obtain JWT");
    }

    const res = await fetch(`${apiBase}/auth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey.trim(),
      },
      body: JSON.stringify({ scopes: ["search", "stream", "admin"], expiresIn: 3600 }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    if (!data?.access_token) {
      throw new Error("Token mangler i svar");
    }
    setJwt(data.access_token);
    logAction(`${new Date().toISOString()} – JWT issued automatically`);
    return data.access_token as string;
  }, [apiBase, apiKey, jwt, logAction]);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const token = await ensureJwt();

      const params = new URLSearchParams({ q: query });
      if (source !== "all") params.set("source", source);
      if (risk !== "all") params.set("risk", risk);
      const res = await fetch(`${apiBase}/search?${params.toString()}`, {
        headers: {
          ...headers,
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as SearchResponse;
      setResults(data);
      logAction(`${new Date().toISOString()} – Search completed (${data.total} hits)`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, [query, risk, source, apiBase, headers, ensureJwt, logAction]);

  const handleGetJwt = useCallback(async () => {
    try {
      setError(null);
      await ensureJwt();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, [ensureJwt]);

  const handleServiceAction = useCallback(
    async (serviceId: string, action: "start" | "stop" | "restart") => {
      try {
        const token = await ensureJwt();
        const params = new URLSearchParams();
        params.set("token", token);
        const res = await fetch(`${apiBase}/admin/services/${serviceId}?${params.toString()}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...headers,
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message || `HTTP ${res.status}`);
        }
        logAction(`${new Date().toISOString()} – Service ${serviceId} ${action} scheduled`);
      } catch (error) {
        setAdminError(error instanceof Error ? error.message : "Failed to control service");
      }
    },
    [apiBase, headers, ensureJwt, logAction]
  );

  const setActiveModel = useCallback(
    async (modelId: string) => {
      try {
        const token = await ensureJwt();
        const res = await fetch(`${apiBase}/admin/models/${modelId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...headers,
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message || `HTTP ${res.status}`);
        }
        logAction(`${new Date().toISOString()} – Model provider switch requested (${modelId})`);
      } catch (error) {
        setAdminError(error instanceof Error ? error.message : "Failed to set model provider");
      }
    },
    [apiBase, headers, ensureJwt, logAction]
  );

  const toggleAgent = useCallback(
    async (agentId: string) => {
      try {
        const token = await ensureJwt();
        const res = await fetch(`${apiBase}/admin/agents/${agentId}/toggle`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...headers,
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message || `HTTP ${res.status}`);
        }
        const payload = await res.json();
        setAgents((prev) =>
          prev.map((agent) => (agent.id === agentId ? { ...agent, enabled: payload.enabled } : agent))
        );
        logAction(`${new Date().toISOString()} – Agent ${agentId} toggled ${payload.enabled ? "on" : "off"}`);
      } catch (error) {
        setAdminError(error instanceof Error ? error.message : "Failed to toggle agent");
      }
    },
    [apiBase, headers, ensureJwt, logAction]
  );

  const runAgent = useCallback(
    async (agentId: string) => {
      try {
        const token = await ensureJwt();
        const res = await fetch(`${apiBase}/admin/agents/${agentId}/run`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...headers,
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message || `HTTP ${res.status}`);
        }
        logAction(`${new Date().toISOString()} – Agent ${agentId} run requested`);
      } catch (error) {
        setAdminError(error instanceof Error ? error.message : "Failed to run agent");
      }
    },
    [apiBase, headers, ensureJwt, logAction]
  );

  const updateAgentDescription = useCallback(
    async (agentId: string, description: string) => {
      try {
        const token = await ensureJwt();
        const res = await fetch(`${apiBase}/admin/agents/${agentId}/description`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...headers,
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ description }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message || `HTTP ${res.status}`);
        }
        setAgents((prev) =>
          prev.map((agent) => (agent.id === agentId ? { ...agent, description } : agent))
        );
        logAction(`${new Date().toISOString()} – Agent ${agentId} description updated`);
        setEditingAgentId(null);
        setDraftDescription("");
      } catch (error) {
        setAdminError(error instanceof Error ? error.message : "Failed to update agent description");
      }
    },
    [apiBase, headers, ensureJwt, logAction]
  );

  const handleActionTrigger = useCallback(
    async (actionId: AdminAction["id"]) => {
      setActionRunning(actionId);
      setCommandResult(null);
      try {
        const token = await ensureJwt();
        const res = await fetch(`${apiBase}/admin/actions/${actionId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...headers,
            Authorization: `Bearer ${token}`,
          },
        });
        const payload = await res.json();
        if (!res.ok) {
          throw new Error(payload.message || `HTTP ${res.status}`);
        }
        setCommandResult(payload.message || "Action accepted");
        logAction(`${new Date().toISOString()} – ${payload.message || actionId} triggered`);
      } catch (error) {
        setAdminError(error instanceof Error ? error.message : "Failed to trigger action");
      } finally {
        setActionRunning(null);
      }
    },
    [apiBase, headers, ensureJwt, logAction]
  );

  useEffect(() => {
    fetchAdminState();
  }, [fetchAdminState]);

  useEffect(() => {
    if (!streaming) return;

    const activityUrl = `${apiBase}/activity/stream`;
    const adminUrl = `${apiBase}/admin/events`;

    try {
      const activitySource = new EventSource(activityUrl, {
        withCredentials: !!jwt,
      });

      activitySource.onmessage = (event) => {
        setStreamLogs((prev) => [event.data, ...prev].slice(0, 50));
      };

      const adminSource = new EventSource(adminUrl, {
        withCredentials: !!jwt,
      });

      adminSource.addEventListener("admin", (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "service_status") {
            setServices((prev) =>
              prev.map((service) =>
                service.id === payload.payload.id
                  ? { ...service, status: payload.payload.status, lastHeartbeat: payload.payload.lastHeartbeat }
                  : service
              )
            );
          } else if (payload.type === "model_default") {
            setModels((prev) =>
              prev.map((model) => ({
                ...model,
                default: model.id === payload.payload.id,
              }))
            );
          } else if (payload.type === "agent_status") {
            setAgents((prev) =>
              prev.map((agent) =>
                agent.id === payload.payload.id ? { ...agent, enabled: payload.payload.enabled } : agent
              )
            );
          } else if (payload.type === "agent_run") {
            setAgents((prev) =>
              prev.map((agent) =>
                agent.id === payload.payload.id ? { ...agent, lastRun: payload.payload.lastRun } : agent
              )
            );
          } else if (payload.type === "agent_description") {
            setAgents((prev) =>
              prev.map((agent) =>
                agent.id === payload.payload.id ? { ...agent, description: payload.payload.description } : agent
              )
            );
          } else if (payload.type === "action_triggered") {
            logAction(`${new Date().toISOString()} – ${payload.payload.label} triggered`);
          } else if (payload.type === "action_completed") {
            logAction(`${new Date().toISOString()} – ${payload.payload.label} completed`);
          }
        } catch (err) {
          console.error("Failed to process admin event", err);
        }
      });

      activitySource.onerror = () => {
        activitySource.close();
        setStreaming(false);
      };
      adminSource.onerror = () => {
        adminSource.close();
        setStreaming(false);
      };

      return () => {
        activitySource.close();
        adminSource.close();
      };
    } catch (err) {
      console.error("Failed to establish SSE connection", err);
      setStreaming(false);
    }
  }, [apiBase, streaming, jwt, logAction]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("cyberstreams.apiKey", apiKey);
    }
  }, [apiKey]);

  const apiBaseIsLocal = useMemo(() => apiBase.includes("127.0.0.1") || apiBase.includes("localhost"), [apiBase]);

  return (
    <div className="app">
      <header>
        <h1>Cyberstreams Operations Board</h1>
        <p>Supervisor console for services, models, agents & live intelligence</p>
      </header>

      <section className="admin-tabs" data-test="admin-tabs">
        <nav>
          {ADMIN_TABS.map((tab) => (
            <button
              key={tab}
              className={tab === activeTab ? "tab active" : "tab"}
              onClick={() => setActiveTab(tab)}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </nav>
        <div className="tab-content">
          {activeTab === "overview" && (
            <div className="grid">
              <div className="card">
                <h3>Environment</h3>
                <ul className="kv">
                  <li>
                    <strong>API Base:</strong> {apiBase}
                  </li>
                  <li>
                    <strong>JWT Loaded:</strong> {jwt ? "Yes" : "No"}
                  </li>
                  <li>
                    <strong>Streaming:</strong> {streaming ? "Active" : "Stopped"}
                  </li>
                </ul>
              </div>
              <div className="card">
                <h3>Services</h3>
                <ul className="kv">
                  {services.map((service) => (
                    <li key={service.id}>
                      <span>{service.name}</span>
                      <span className={`badge badge-${service.status}`}>{service.status.toUpperCase()}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card">
                <h3>Model Providers</h3>
                <ul className="kv">
                  {models.map((model) => (
                    <li key={model.id}>
                      <span>
                        {model.name}
                        {model.default ? " (default)" : ""}
                      </span>
                      <span className={`badge badge-${model.status}`}>{model.status.toUpperCase()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {activeTab === "services" && (
            <div className="list">
              {services.map((service) => (
                <article key={service.id} className="card">
                  <header className="card-header">
                    <div>
                      <h3>{service.name}</h3>
                      <p>{service.description}</p>
                    </div>
                    <span className={`badge badge-${service.status}`}>{service.status.toUpperCase()}</span>
                  </header>
                  <footer className="card-footer">
                    <span>
                      Last heartbeat: {" "}
                      {service.lastHeartbeat ? new Date(service.lastHeartbeat).toLocaleString() : "—"}
                    </span>
                    <div className="footer-actions">
                      <button
                        disabled={!service.controllable || service.status === "running"}
                        onClick={() => handleServiceAction(service.id, "start")}
                      >
                        Start
                      </button>
                      <button
                        disabled={!service.controllable || service.status === "stopped"}
                        onClick={() => handleServiceAction(service.id, "stop")}
                      >
                        Stop
                      </button>
                      <button
                        disabled={!service.controllable}
                        onClick={() => handleServiceAction(service.id, "restart")}
                      >
                        Restart
                      </button>
                    </div>
                  </footer>
                </article>
              ))}
            </div>
          )}

          {activeTab === "models" && (
            <div className="list">
              {models.map((model) => (
                <article key={model.id} className="card">
                  <header className="card-header">
                    <div>
                      <h3>{model.name}</h3>
                      <p>{model.description}</p>
                    </div>
                    <span className={`badge badge-${model.status}`}>{model.status.toUpperCase()}</span>
                  </header>
                  <footer className="card-footer">
                    <span>Latency: {model.latencyMs ? `${model.latencyMs}ms` : "n/a"}</span>
                    <button disabled={model.status !== "available"} onClick={() => setActiveModel(model.id)}>
                      Set Active
                    </button>
                  </footer>
                </article>
              ))}
            </div>
          )}

          {activeTab === "agents" && (
            <div className="list">
              {agents.map((agent) => (
                <article key={agent.id} className="card">
                  <header className="card-header">
                    <div>
                      <h3>{agent.name}</h3>
                      <p>{agent.description}</p>
                    </div>
                    <span className={`badge ${agent.enabled ? "badge-running" : "badge-stopped"}`}>
                      {agent.enabled ? "ENABLED" : "DISABLED"}
                    </span>
                  </header>
                  <ul className="kv">
                    <li>
                      <strong>Role:</strong> {agent.role}
                    </li>
                    <li>
                      <strong>Entry:</strong> {agent.entryPoint}
                    </li>
                    <li>
                      <strong>Last run:</strong> {agent.lastRun ? new Date(agent.lastRun).toLocaleString() : "—"}
                    </li>
                  </ul>
                  {editingAgentId === agent.id ? (
                    <div className="agent-editor">
                      <textarea value={draftDescription} onChange={(e) => setDraftDescription(e.target.value)} rows={4} />
                      <div className="agent-editor-actions">
                        <button onClick={() => updateAgentDescription(agent.id, draftDescription.trim())}>Save</button>
                        <button className="secondary" onClick={() => { setEditingAgentId(null); setDraftDescription(""); }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}
                  <footer className="card-footer">
                    <div className="footer-actions">
                      <button onClick={() => toggleAgent(agent.id)}>{agent.enabled ? "Disable" : "Enable"}</button>
                      <button onClick={() => runAgent(agent.id)}>Run Agent</button>
                      <button
                        onClick={() => {
                          setEditingAgentId(agent.id);
                          setDraftDescription(agent.description);
                        }}
                      >
                        Edit Description
                      </button>
                    </div>
                  </footer>
                </article>
              ))}
            </div>
          )}

          {activeTab === "actions" && (
            <div className="actions-board">
              <div className="actions-grid">
                {actions.map((action) => (
                  <button
                    key={action.id}
                    className={actionRunning === action.id ? "action busy" : "action"}
                    onClick={() => handleActionTrigger(action.id)}
                    disabled={Boolean(actionRunning)}
                  >
                    {action.icon ? <span className="icon">{action.icon}</span> : null}
                    <span className="label">{action.label}</span>
                    <span className="desc">{action.description}</span>
                  </button>
                ))}
              </div>
              {commandResult && <div className="command-result">{commandResult}</div>}
              <div className="action-logs">
                <h4>Activity Log</h4>
                <ul>
                  {actionLogs.length === 0 ? <li>No actions executed yet.</li> : null}
                  {actionLogs.map((log, idx) => (
                    <li key={idx}>{log}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {activeTab === "cvi" && (
            <div className="card">
              <CVIAnalyzer />
            </div>
          )}

          {activeTab === "osint" && (
            <div className="card">
              <h3>Dark Web OSINT Toolkit</h3>
              <p className="text-sm text-gray-400 mb-4">
                Søg på tværs af Tor- og åbne kilder, anvend foruddefinerede værktøjer og deleger søgninger til agenter.
              </p>
              <OsintPanel
                tools={DEFAULT_OSINT_TOOLS}
                onSearch={(q, cat) => {
                  logAction(`${new Date().toISOString()} – OSINT søgning trigget: ${q || "(tom)"}${cat ? ` [${cat}]` : ""}`);
                  setQuery(q || "");
                  if (cat) {
                    setSource(cat.toLowerCase());
                  }
                }}
              />
              <div className="osint-results mt-6">
                <h4 className="text-sm font-semibold mb-2">Seneste søgning</h4>
                <p className="text-xs text-gray-500">Viderestil direkte til søgefeltet ovenfor for at udføre en fuldtekst søgning i indekset.</p>
              </div>
            </div>
          )}
          {activeTab === "agentops" && (
            <section className="space-y-6">
              <AgentDashboard />
              <IdeaBoard />
            </section>
          )}
        </div>
      </section>

      <section className="connection">
        <h2>API Credentials</h2>
        <div>
          <label htmlFor="apiBase">API Base URL</label>
          <input
            id="apiBase"
            className="form-input"
            data-test="api-base-input"
            value={apiBase}
            onChange={(e) => setApiBase(e.target.value)}
          />
          {apiBaseIsLocal && (
            <p className="text-xs text-amber-500">⚠️ Husk at indstille API Base til Railway når du er på produktion.</p>
          )}
        </div>
        <div>
          <label>X-API-Key</label>
          <input
            data-test="api-key-input"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="key_test_1234567890abcdef"
          />
        </div>
        <div>
          <label>JWT Token</label>
          <textarea data-test="jwt-textarea" value={jwt} onChange={(e) => setJwt(e.target.value)} rows={2} />
        </div>
        <button data-test="get-jwt-button" onClick={handleGetJwt}>
          Get JWT (requires API key)
        </button>
      </section>

      <section className="search">
        <h2>Search Documents</h2>
        <div className="controls">
          <input
            data-test="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search query (e.g., ransomware)"
            disabled={!apiKey && !jwt}
          />
          {!apiKey && !jwt && <p className="text-xs text-red-500">Indtast API Key eller JWT for at søge</p>}
          <select value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="all">All Sources</option>
            <option value="ars-technica">Ars Technica</option>
            <option value="hacker-news">Hacker News</option>
            <option value="thehackernews">The Hacker News</option>
            <option value="darkfail">Dark.fail Monitor</option>
            <option value="globaleaks">GlobaLeaks</option>
            <option value="styx-market">STYX Market</option>
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


