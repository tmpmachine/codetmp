let environment = {
	activeEnvironment: 'development', // production or development

	production: {
		previewUrl: 'https://preview.codetmp7.dev/',
		previewUrlPWA: 'https://pwa.codetmp7.dev/',
	},
	development: {
		previewUrl: 'http://localhost:8202/',
		previewUrlPWA: 'http://localhost:8203/',
	},
};

export function GetEnv() {
	return environment[environment.activeEnvironment];
}
