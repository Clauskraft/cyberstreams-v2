// packages/agent-ops/src/ui/AgentDashboard.tsx

import React, { useState, useEffect } from 'react';
import { AgentStateResponse, AgentStatus } from './types';

// Mock data for initial rendering / fallback
const INITIAL_STATE: AgentStateResponse = { systemStatus: 'Degraded', activeAgents: [] };
const AGENT_STATE_ENDPOINT = '/agent-ops/state'; 

// Minimalistisk, monospaced styling (Connery Style)
const style = {
    dashboardContainer: { padding: '30px', backgroundColor: '#0F0F0F', color: '#FFFFFF', fontFamily: 'Consolas, "Courier New", monospace' },
    title: { fontSize: '24px', fontWeight: 'normal' as 'normal', marginBottom: '25px', color: '#D4AF37', borderBottom: '1px solid #333', paddingBottom: '10px' },
    agentGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' },
    card: (status: string) => {
        let borderColor = '#222';
        if (status === 'Ready') borderColor = '#228B22'; 
        else if (status === 'Working') borderColor = '#00CED1';
        else if (status === 'Error') borderColor = '#DC143C';
        return {
            border: `1px solid ${borderColor}`, padding: '20px', minHeight: '120px', transition: 'all 0.3s ease',
            backgroundColor: '#1A1A1A', boxShadow: `0 0 5px ${borderColor}40`, position: 'relative' as 'relative',
        };
    },
    statusIndicator: (status: string, color: string) => ({
        display: 'inline-block', position: 'absolute' as 'absolute', top: '10px', right: '10px',
        width: '10px', height: '10px', borderRadius: '50%', backgroundColor: color,
        boxShadow: status === 'Working' ? `0 0 5px 2px ${color}80` : 'none',
    }),
};

const AgentDashboard: React.FC = () => {
    const [state, setState] = useState<AgentStateResponse>(INITIAL_STATE);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAgentState = async () => {
            try {
                const response = await fetch(AGENT_STATE_ENDPOINT);
                const data: AgentStateResponse = await response.json();
                setState(data);
            } catch (error) {
                setState({ systemStatus: 'Degraded', activeAgents: [] }); 
            } finally {
                setIsLoading(false);
            }
        };
        fetchAgentState();
    }, []);

    if (isLoading) {
        return <div style={{...style.dashboardContainer, color: '#D4AF37'}}>Loading Agent Briefing...</div>;
    }

    return (
        <div style={style.dashboardContainer}>
            <h1 style={style.title}>ORCHESTRATION STATUS: {state.systemStatus.toUpperCase()}</h1>
            <div style={style.agentGrid}>
                {state.activeAgents.map((agent: AgentStatus) => {
                    const statusColor = agent.status === 'Ready' ? '#90EE90' : agent.status === 'Working' ? '#00FFFF' : '#FA8072';
                    const borderColor = style.card(agent.status).border.split(' ')[2];
                    return (
                        <div key={agent.id} style={style.card(agent.status)}>
                            <div style={style.statusIndicator(agent.status, statusColor)}></div>
                            <h3 style={{fontSize: '18px', fontWeight: 'bold', marginBottom: '5px', color: '#FFFFFF'}}>{agent.id.toUpperCase()}</h3>
                            <p style={{fontSize: '14px', color: '#AAA', marginBottom: '10px'}}>{agent.lastTask}</p>
                            <span style={{ color: borderColor }}>// STATUS: {agent.status.toUpperCase()}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AgentDashboard;

