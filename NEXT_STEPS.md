# Next Steps: ThreatActor CRUD Integration

## Generated Files

✅ apps/api/src/schemas/threat-actor.js  
✅ apps/api/src/routes/threat-actor.js  
✅ infra/opensearch/templates/threat-actor_template.json  
✅ openapi_additions.yaml  

## Manual Integration Steps

### 1. Register Routes in Server

Edit `apps/api/src/server.js` and add:

```javascript
import { threatActorRoutes } from './routes/threat-actor.js';

// In registerRoutes function:
await threatActorRoutes(app, { logger, opensearchService });
```

### 2. Update OpenAPI Contract

1. Open `packages/contracts/openapi.yaml`
2. Open `openapi_additions.yaml`
3. Copy paths from additions to openapi.yaml
4. Copy schemas from additions to openapi.yaml

### 3. Create OpenSearch Index Template

Run this command to create the index template:

```bash
curl -X PUT "localhost:9200/_index_template/threat-actor_template" \
  -H 'Content-Type: application/json' \
  -d @infra/opensearch/templates/threat-actor_template.json
```

### 4. Verify Integration

Run tests:
```bash
npm test
```

Check OpenAPI contract:
```bash
npm run audit:contract
```

## Testing

Test the endpoints:

```bash
# Create
curl -X POST http://localhost:8080/api/v1/threat-actors \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"field1":"value1"}'

# List
curl http://localhost:8080/api/v1/threat-actors \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get by ID
curl http://localhost:8080/api/v1/threat-actors/ID \
  -H "Authorization: Bearer YOUR_TOKEN"

# Update
curl -X PUT http://localhost:8080/api/v1/threat-actors/ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"field1":"updated_value"}'

# Delete
curl -X DELETE http://localhost:8080/api/v1/threat-actors/ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```
