// packages/agent-ops/src/services/pii-service.ts
// PII Validation Service (VS) & Token Store (TS) Implementering

import { v4 as uuidv4 } from 'uuid'; // Kræver 'uuid' package

// Mock Token Store (TS) - In-memory lagring til demonstration
const PII_TOKEN_STORE: Map<string, { email?: string; name?: string }> = new Map();

// Felter der betragtes som PII og skal tokeniseres/pseudonymiseres
const PII_FIELDS = ['email', 'name', 'phone'];

/**
 * Simulerer PII Validation Service (VS) og Tokenization.
 */
export function tokenizePII(data: { [key: string]: any }): { token: string; pseudonymizedData: { [key: string]: any } } {
    const token = uuidv4();
    const piiData: { [key: string]: any } = {};
    const pseudonymizedData = { ...data };
    let containsPII = false;

    // 1. Identificer og fjern PII-felter
    for (const field of PII_FIELDS) {
        if (data[field]) {
            piiData[field] = data[field];
            delete pseudonymizedData[field]; // Fjerner fra hoveddata
            containsPII = true;
        }
    }

    // 2. Gem Token og Data i PII Token Store (TS)
    if (containsPII) {
        PII_TOKEN_STORE.set(token, piiData);
        // Tilføj det nye token til de pseudonymiserede data for kobling
        pseudonymizedData.piiToken = token;
    } else {
        // Hvis ingen PII, returneres data uden token
        return { token: '', pseudonymizedData: data }; 
    }

    return { token, pseudonymizedData };
}

/**
 * Henter de oprindelige PII-data fra Token Store (TS) ved brug af tokenet.
 * Dette er kun for autoriserede systemer/processer.
 */
export function retrievePII(token: string): { [key: string]: any } | null {
    if (PII_TOKEN_STORE.has(token)) {
        return PII_TOKEN_STORE.get(token)!;
    }
    return null;
}


