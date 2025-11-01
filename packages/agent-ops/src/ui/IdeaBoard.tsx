// packages/agent-ops/src/ui/IdeaBoard.tsx

import React from 'react';
import { IdeaTask } from './types';

// Mock data, baseret på AGENTS_STATUS.md (Royal Planning Grid)
const MOCK_TASKS: IdeaTask[] = [
    { id: 't1', title: 'PII-Strategi Design', responsibleAgent: 'Design', status: 'Agent Work' },
    { id: 't2', title: 'OpenSearch API Wireup', responsibleAgent: 'Build', status: 'Agent Work' },
    { id: 't3', title: 'IdeaBoard Flow Diagram', responsibleAgent: 'Design', status: 'Review/Accepted' },
    { id: 't4', title: 'CI Workflow Design', responsibleAgent: 'Test', status: 'Ideation' },
    { id: 't5', title: 'Docker Implementation', responsibleAgent: 'Build', status: 'Review/Accepted' },
];

// Styling for Royal Planning Grid
const royalStyle = {
    container: { padding: '30px', backgroundColor: '#141414', color: '#FFFFFF', fontFamily: 'Georgia, serif' },
    title: { fontSize: '32px', textAlign: 'center' as 'center', marginBottom: '30px', color: '#F0E68C', borderBottom: '2px solid #333', paddingBottom: '10px' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', minHeight: '500px' },
    column: { border: '1px solid #333', padding: '15px', backgroundColor: '#1C1C1C', borderRadius: '2px' },
    columnTitle: { color: '#F0E68C', fontSize: '18px', borderBottom: '1px solid #444', paddingBottom: '10px', marginBottom: '15px', fontFamily: 'Consolas, monospace' },
    taskCard: (agent: string) => {
        let agentColor = '#AAA';
        if (agent === 'Design') agentColor = '#228B22'; // Grøn
        else if (agent === 'Build') agentColor = '#00CED1'; // Cyan
        else if (agent === 'Test') agentColor = '#B8860B'; // Guld
        return {
            backgroundColor: '#FFFFFF', color: '#000000', padding: '12px', margin: '10px 0',
            borderRadius: '1px', borderLeft: `5px solid ${agentColor}`, boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            fontFamily: 'Arial, sans-serif',
        }
    },
    taskTitle: { fontSize: '14px', fontWeight: 600, marginBottom: '4px' }
};

const IdeaBoard: React.FC = () => {
    const columns = ['Ideation', 'Agent Work', 'Review/Accepted'];

    return (
        <div style={royalStyle.container}>
            <h1 style={royalStyle.title}>PROJECT ROADMAP - OCTOBER (The Royal Planning Grid)</h1>
            <div style={royalStyle.grid}>
                {columns.map(col => (
                    <div key={col} style={royalStyle.column}>
                        <h2 style={royalStyle.columnTitle}>{col.toUpperCase()}</h2> 
                        {MOCK_TASKS
                            .filter(task => task.status === col)
                            .map(task => {
                                let agentColor = task.responsibleAgent === 'Design' ? '#228B22' : task.responsibleAgent === 'Build' ? '#00CED1' : '#B8860B';
                                return (
                                    <div key={task.id} style={royalStyle.taskCard(task.responsibleAgent)}>
                                        <p style={royalStyle.taskTitle}>{task.title}</p>
                                        <small style={{fontSize: '11px', marginTop: '5px', color: agentColor}}>
                                            Ansvarlig: {task.responsibleAgent}
                                        </small>
                                    </div>
                                );
                            })}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default IdeaBoard;

