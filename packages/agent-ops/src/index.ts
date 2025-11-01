import Fastify from 'fastify';
import agentOpsPlugin, { AgentStateResponse } from './services/fastify-plugin';

const PORT = Number(process.env.AGENT_OPS_PORT || process.env.PORT || 8080);

export async function createAgentOpsServer() {
  const app = Fastify({ logger: true });
  app.register(agentOpsPlugin);
  return app;
}

export async function startAgentOpsServer() {
  const app = await createAgentOpsServer();
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    app.log.info(`Agent Ops server listening on port ${PORT}`);
    return app;
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  startAgentOpsServer();
}

export type { AgentStateResponse };
export { agentOpsPlugin };

