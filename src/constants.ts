import packageJson from '../package.json'

export const APP_CONFIG = {
    title: 'LLMChat',
    version: `v${packageJson.version}`
} as const