// Environment configuration for the application

export interface AppConfig {
  // Database configuration
  isLocal: boolean;
  databaseConnectionString: string;
  
  // LLM configuration (only used when isLocal = false)
  llm: {
    provider: 'chatgpt' | 'ollama' | 'gemini' | 'none';
    apiEndpoint?: string;
    apiKey?: string;
    model?: string;
  };
}

// Get configuration from environment variables or use defaults
const getEnvVar = (key: string, defaultValue: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return (import.meta.env[key] as string) || defaultValue;
  }
  return defaultValue;
};

const getEnvBool = (key: string, defaultValue: boolean): boolean => {
  const value = getEnvVar(key, String(defaultValue));
  return value === 'true' || value === '1';
};

// Application configuration
export const appConfig: AppConfig = {
  // Use local SQLite by default (in-browser)
  // Set VITE_IS_LOCAL=false to use SQL Server
  isLocal: getEnvBool('VITE_IS_LOCAL', true),
  
  // SQL Server connection string (only used when isLocal = false)
  // Example: "Server=localhost;Database=Finanzas;Trusted_Connection=True;"
  databaseConnectionString: getEnvVar(
    'VITE_DB_CONNECTION_STRING', 
    'Server=localhost;Database=Finanzas;Trusted_Connection=True;'
  ),
  
  // LLM configuration
  llm: {
    // Provider: 'chatgpt', 'ollama', 'gemini', or 'none'
    provider: getEnvVar('VITE_LLM_PROVIDER', 'none') as AppConfig['llm']['provider'],
    
    // API endpoint for the LLM service
    // For ChatGPT: https://api.openai.com/v1/chat/completions
    // For Ollama: http://localhost:11434/api/generate
    // For Gemini: https://generativelanguage.googleapis.com/v1beta/models
    apiEndpoint: getEnvVar('VITE_LLM_API_ENDPOINT', ''),
    
    // API key (for ChatGPT and Gemini)
    apiKey: getEnvVar('VITE_LLM_API_KEY', ''),
    
    // Model name
    // For ChatGPT: gpt-4, gpt-3.5-turbo, etc.
    // For Ollama: llama2, codellama, etc.
    // For Gemini: gemini-pro, gemini-pro-vision, etc.
    model: getEnvVar('VITE_LLM_MODEL', ''),
  },
};

// Helper function to check if LLM is enabled
export const isLLMEnabled = (): boolean => {
  return !appConfig.isLocal && appConfig.llm.provider !== 'none';
};

// Export database type for type checking
export type DatabaseType = 'sqlite' | 'sqlserver';

export const getDatabaseType = (): DatabaseType => {
  return appConfig.isLocal ? 'sqlite' : 'sqlserver';
};
