@startuml
skinparam handwritten true
skinparam backgroundColor #F0F0F0
skinparam defaultFontName Arial
skinparam sequence {
    ArrowColor #1E90FF
    LifeLineBorderColor #1E90FF
    LifeLineBackgroundColor #ADD8E6
    ActorBorderColor #000080
}

title PII (Personally Identifiable Information) Handling Architecture

actor "End User" as U

box "Frontend / IdeaBoard" #E6E6FA
    participant "UI/Input Form" as UI
end box

box "Backend / Cyberstream Core" #DAF7A6
    participant "Fastify Gateway" as FG
    participant "PII Validation Service" as VS
    database "PII Token Store (Key/Value)" as TS
    database "Main Database (Pseudonymized)" as DB
end box

U -> UI : 1. Indsender data (med PII)
UI -> FG : 2. Data Sendes (krypteret, TLS)
FG -> VS : 3. **Validation & Hashing**
activate VS

alt PII Detected
    VS -> TS : 4a. Generer Unikt Token (f.eks., UUID)
    TS -> VS : 4b. Gem Token (Nøgle: Token, Værdi: PII Data)
    VS -> FG : 4c. Returner **Token (Pseudo-ID)**
    FG -> DB : 5. Gem Pseudo-ID og Øvrige Data
    DB --> FG : 6. Kvittering
    FG --> UI : 7. Kvittering til Bruger
else No PII Detected
    VS -> FG : 4'. Ingen PII fundet
    FG -> DB : 5'. Gem Rådata
    DB --> FG : 6'. Kvittering
    FG --> UI : 7'. Kvittering til Bruger
end

deactivate VS

@enduml


