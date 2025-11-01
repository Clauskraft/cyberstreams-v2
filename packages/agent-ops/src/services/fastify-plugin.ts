// packages/agent-ops/src/services/fastify-plugin.ts

import { FastifyPluginAsync } from 'fastify';

// Simpel type definition (kun Reply er nødvendig her)
export interface AgentStateResponse {
    systemStatus: 'Operational' | 'Degraded';
    activeAgents: { id: string; status: 'Ready' | 'Working' | 'Error'; lastTask: string }[];
}

const agentOpsPlugin: FastifyPluginAsync = async (fastify, opts) => {

    const mockAgentState: AgentStateResponse = {
        systemStatus: 'Operational',
        activeAgents: [
            { id: 'master', status: 'Ready', lastTask: 'Orchestrating Deployment' },
            { id: 'build', status: 'Ready', lastTask: 'Completed Docker Image' },
            { id: 'test', status: 'Ready', lastTask: 'Designing CI Strategy' },
            { id: 'design', status: 'Ready', lastTask: 'Completed UI/UX Visual Contract' },
        ],
    };

    /**
     * @route GET /agent-ops/state
     * Returnerer den aktuelle status for de orkestrerede agenter.
     */
    fastify.get<{ Reply: AgentStateResponse }>('/agent-ops/state', async (request, reply) => {
        return reply.send(mockAgentState);
    });

    // Her ville de andre API endpoints (POST /agent-ops/tasks, GET /agent-ops/ideas) komme
    
    fastify.log.info('Agent Ops Fastify Plugin loaded.');
};

export default agentOpsPlugin;
