# Cyberstreams V2 – Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `RAILWAY_API_SERVICE` | Railway service ID for the API deployment | `cyberstreams-api` |
| `RAILWAY_WORKER_SERVICE` | Railway service ID for the worker deployment | `cyberstreams-worker` |
| `OPENSEARCH_URL` | OpenSearch endpoint URL | `http://localhost:9200` |
| `OPENSEARCH_USERNAME` | OpenSearch admin username | `admin` |
| `OPENSEARCH_PASSWORD` | OpenSearch admin password | `SecurePass123!` |
| `RAILWAY_TOKEN` | Railway CLI access token (never commit—store in secrets manager) | `*** rotate and store in Railway/GitHub secrets ***` |
| `GEMINI_API_KEY` | Google Gemini API key | `*** rotate and store in secret vault ***` |
| `OPENAI_API_KEY` | OpenAI API key | `*** optional: keep blank unless needed ***` |
| `ANTHROPIC_API_KEY` | Anthropic Claude API key | `*** optional ***` |
| `SERPER_API_KEY` | Serper search API key | `*** optional ***` |
| `GOOGLE_API_KEY` | Google API key for custom search | `*** optional ***` |
| `GOOGLE_CSE_ID` | Google Custom Search Engine ID | `*** optional ***` |
| `HUGGINGFACE_API_TOKEN` | HuggingFace access token | `*** optional ***` |
| `NOTION_TOKEN` | Notion integration token | `*** optional ***` |

> Copy these into your local `.env` file to match the current Railway services and OpenSearch instance. Never commit the `.env` file—use `.env.example` or this document for reference.

