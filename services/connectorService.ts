
import { Connector, ConnectorConfig } from '../types';
import { SYSTEM_CONNECTORS } from './connectors/registry';
import { GoogleGenAI } from "@google/genai";
import { saveLocalApiKey } from './storageService';
import { verifyOpenAIKey } from './openaiService';

const USER_CONNECTORS_KEY = 'enexus_user_connectors';
const CONNECTED_PROVIDERS_KEY = 'enexus_connected_providers'; // Stores configs for system connectors

// --- Storage Helpers ---

interface StoredConfig {
    [providerId: string]: ConnectorConfig;
}

const getStoredConfigs = (): StoredConfig => {
    try {
        const stored = localStorage.getItem(CONNECTED_PROVIDERS_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch (e) { return {}; }
};

const getUserConnectors = (): Connector[] => {
    try {
        const stored = localStorage.getItem(USER_CONNECTORS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error("Failed to load user connectors", e);
        return [];
    }
};

const saveUserConnectors = (connectors: Connector[]) => {
    try {
        localStorage.setItem(USER_CONNECTORS_KEY, JSON.stringify(connectors));
    } catch (e) {
        console.error("Failed to save user connectors", e);
    }
};

/**
 * Fetch all connectors (System + User Defined)
 * Merges static system definition with local connection state
 */
export const fetchConnectors = async (): Promise<Connector[]> => {
    // 1. Get System Connectors (Base)
    const systemConnectors = [...SYSTEM_CONNECTORS];
    
    // 2. Get Connection States (Configs)
    const storedConfigs = getStoredConfigs();

    // 3. Hydrate System Connectors
    const hydratedSystem = systemConnectors.map(c => {
        const config = storedConfigs[c.id];
        if (config && config.apiKey) {
            return { ...c, status: 'connected' as const, userConfig: config };
        }
        return { ...c, status: 'available' as const };
    });

    // 4. Get User Connectors
    const userConnectors = getUserConnectors();

    // 5. Merge
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve([...userConnectors, ...hydratedSystem]);
        }, 300);
    });
};

/**
 * Real-world connection logic.
 * 1. Simulates network request to provider's auth endpoint.
 * 2. Validates format.
 * 3. Saves to secure storage (LocalStorage for demo).
 */
export const verifyAndConnectConnector = async (id: string, config: ConnectorConfig): Promise<Connector> => {
    // Special handling for Google Gemini to perform real verification
    if (id === 'google' && config.apiKey) {
        try {
            const ai = new GoogleGenAI({ apiKey: config.apiKey });
            // Try to list models as a lightweight verification
            await ai.models.list();
            
            // If successful, save globally for the app to use
            saveLocalApiKey(config.apiKey);
        } catch (e: any) {
            console.error("Gemini Verification Failed", e);
            throw new Error(`Verification failed: ${e.message || "Invalid API Key"}`);
        }
    }

    // Special handling for OpenAI to perform real verification
    if (id === 'openai' && config.apiKey) {
        try {
            await verifyOpenAIKey(config.apiKey);
        } catch (e: any) {
             console.error("OpenAI Verification Failed", e);
             throw new Error(`Verification failed: ${e.message || "Invalid API Key"}`);
        }
    }

    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const systemConnector = SYSTEM_CONNECTORS.find(c => c.id === id);
            
            // --- 1. Validation Logic (Mock) ---
            if (systemConnector) {
                if (systemConnector.validationRegex && config.apiKey) {
                    const regex = new RegExp(systemConnector.validationRegex);
                    if (!regex.test(config.apiKey)) {
                        reject(new Error("Invalid API Key format."));
                        return;
                    }
                } else if (config.apiKey && config.apiKey.length < 5) {
                    reject(new Error("API Key is too short."));
                    return;
                }
            }

            // --- 2. Persist State ---
            const configs = getStoredConfigs();
            configs[id] = config;
            localStorage.setItem(CONNECTED_PROVIDERS_KEY, JSON.stringify(configs));

            // --- 3. Return Updated Connector ---
            if (systemConnector) {
                resolve({ 
                    ...systemConnector, 
                    status: 'connected', 
                    userConfig: config 
                });
            } else {
                // Should technically not happen for system connectors via this specific method
                reject(new Error("Connector not found in registry"));
            }

        }, 1500); // Simulate verification delay
    });
};

export const disconnectConnector = async (id: string): Promise<Connector | null> => {
    // Check if system
    const systemConnector = SYSTEM_CONNECTORS.find(c => c.id === id);
    if (systemConnector) {
        const configs = getStoredConfigs();
        delete configs[id];
        localStorage.setItem(CONNECTED_PROVIDERS_KEY, JSON.stringify(configs));
        
        // If disconnecting Google, also clear the global key
        if (id === 'google') {
            saveLocalApiKey('');
        }
        
        return { ...systemConnector, status: 'available', userConfig: undefined };
    }
    
    // Check if user (Custom models are usually deleted, not just disconnected)
    return null;
};

/**
 * Add a new custom connector (User defined)
 */
export const addCustomConnector = async (data: {
    name: string;
    description?: string;
    endpoint: string;
    apiKey: string;
    modelId?: string;
    category?: 'llm' | 'image';
}): Promise<Connector> => {
    const newConnector: Connector = {
        id: `custom_${Date.now()}`,
        name: data.name,
        description: data.description || 'Custom OpenAI-compatible endpoint.',
        providerId: 'openai', // Default to generic openai icon for custom models
        category: data.category || 'llm',
        status: 'connected', 
        type: 'custom_api',
        version: 'Custom',
        color: 'bg-gray-100 text-gray-800',
        authType: 'apiKey',
        capabilities: (data.category === 'image' ? ['image'] : ['text']) as ('text' | 'image')[],
        userConfig: {
            endpoint: data.endpoint,
            apiKey: data.apiKey,
            modelId: data.modelId
        }
    };

    const current = getUserConnectors();
    const updated = [newConnector, ...current];
    saveUserConnectors(updated);

    return newConnector;
};

/**
 * Remove a custom connector
 */
export const removeCustomConnector = async (id: string): Promise<void> => {
    const current = getUserConnectors();
    const updated = current.filter(c => c.id !== id);
    saveUserConnectors(updated);
};

/**
 * Update an existing custom connector
 */
export const updateCustomConnector = async (id: string, data: {
    name: string;
    endpoint?: string;
    apiKey?: string;
    modelId?: string;
    category?: 'llm' | 'image';
    command?: string;
    args?: string[];
}): Promise<Connector | null> => {
    const current = getUserConnectors();
    const index = current.findIndex(c => c.id === id);
    
    if (index === -1) return null;

    const updatedConnector = {
        ...current[index],
        name: data.name,
        category: data.category || current[index].category || 'llm',
        capabilities: ((data.category || current[index].category) === 'image' ? ['image'] : ['text']) as ('text' | 'image')[],
        userConfig: {
            ...current[index].userConfig,
            endpoint: data.endpoint,
            apiKey: data.apiKey,
            modelId: data.modelId,
            command: data.command,
            args: data.args
        }
    };

    current[index] = updatedConnector;
    saveUserConnectors(current);
    return updatedConnector;
};
