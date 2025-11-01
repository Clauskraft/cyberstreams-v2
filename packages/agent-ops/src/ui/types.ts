export type AgentStatusType = 'Ready' | 'Working' | 'Error';

export interface AgentStatus {
    id: string;
    status: AgentStatusType;
    lastTask: string;
}

export interface AgentStateResponse {
    systemStatus: 'Operational' | 'Degraded';
    activeAgents: AgentStatus[];
}

export interface IdeaTask {
    id: string;
    title: string;
    responsibleAgent: 'Design' | 'Build' | 'Test';
    status: 'Ideation' | 'Agent Work' | 'Review/Accepted';
}

