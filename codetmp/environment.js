let environment = {
    activeEnvironment: 'production', // production or development
    
    production: {
        previewUrl: 'https://preview.codetmp7.dev/',
        previewUrlPWA: 'https://pwa.codetmp7.dev/', 
    }, 
    development: {
        previewUrl: 'http://localhost:8001/',
        previewUrlPWA: 'http://localhost:8002/', 
    }
};

export function GetEnv() {
    return environment[environment.activeEnvironment];
}