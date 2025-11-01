# IdeaBoard Design Flow (Minimalistisk)

## Agentisk Designproces: Fra Vision til Godkendt Design-Artefakt

```mermaid
graph TD
    %% Styling for at opnå et 'minimalistisk, elegant' look
    classDef puriotelement fill:#F0F8FF,stroke:#005A87,stroke-width:2px,font-weight:bold
    classDef operator fill:#E6E6FA,stroke:#6A5ACD,stroke-width:2px
    classDef agent fill:#FAFAD2,stroke:#B8860B,stroke-width:2px
    classDef final fill:#90EE90,stroke:#228B22,stroke-width:3px

    %% 1. KREATION & PRIORITERING (Startpunktet)
    A[Bruger/Puriot \n **IDÉ**]::operator
    A -->|Prioriteres på| B{IdeaBoard/Design Backlog}
    B -->|Tildeles| C(Senior Operator \n **(Input & Prompt Forberedelse)**):::operator

    %% 2. ORKESTRERING (Master-Agentens Rolle)
    C -->|Instruerer| D(Master Orchestrator \n **(Aflæser IdeaBoard)**):::agent
    D -->|Fordeler Task til| E(Design Agent \n **(Skaber Visuel Kontrakt)**):::agent

    %% 3. DESIGN ARTEFAKT (Skabelsen)
    E --> F[Visuelt Flow Diagram \n (Mermaid/PlantUML)]:::puriotelement
    F -->|Output i| G(Feature Branch)

    %% 4. KVALITETSSIKRING & GODKENDELSE
    G --> H(Senior Operator \n **(Review af Design Artefakt)**):::operator
    H -- "Design Fejl/Justering" --> E
    H -- "Godkendt Design" --> I(Master Orchestrator \n **(Trigger Implementering)**):::agent

    %% 5. EKSEKVERING (De andre Agenter tager over)
    I --> J(Build/Test Agenter \n **(Implementerer Godkendt Design)**):::agent
    J --> K[Final Design Artefakt]:::final
    K --> L[Opdatering af \n **AGENTS_STATUS.md**]

    D ~~~ I
    E ~~~ F
```


