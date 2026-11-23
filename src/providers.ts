export interface Provider {
	id: string;
	name: string;
	url: string;
	host: string;
	// Ordered composer selectors; first match wins. Generic fallbacks last.
	inputSelectors: string[];
}

export const PROVIDERS: Provider[] = [
	{
		id: 'deepseek',
		name: 'DeepSeek',
		url: 'https://chat.deepseek.com/',
		host: 'chat.deepseek.com',
		inputSelectors: ['#chat-input', 'textarea[placeholder="Message DeepSeek"]', 'textarea'],
	},
	{
		id: 'chatgpt',
		name: 'ChatGPT',
		url: 'https://chatgpt.com/',
		host: 'chatgpt.com',
		inputSelectors: ['#prompt-textarea', 'div[contenteditable="true"]', 'textarea'],
	},
	{
		id: 'claude',
		name: 'Claude',
		url: 'https://claude.ai/new',
		host: 'claude.ai',
		inputSelectors: ['div[contenteditable="true"]', 'fieldset div[role="textbox"]', 'textarea'],
	},
	{
		id: 'gemini',
		name: 'Gemini',
		url: 'https://gemini.google.com/app',
		host: 'gemini.google.com',
		inputSelectors: ['rich-textarea div[contenteditable="true"]', 'div.ql-editor', 'div[contenteditable="true"]', 'textarea'],
	},
	{
		id: 'grok',
		name: 'Grok',
		url: 'https://grok.com/',
		host: 'grok.com',
		inputSelectors: ['textarea[placeholder*="Ask"]', 'textarea', 'div[contenteditable="true"]'],
	},
	{
		id: 'perplexity',
		name: 'Perplexity',
		url: 'https://www.perplexity.ai/',
		host: 'perplexity.ai',
		inputSelectors: ['textarea[placeholder*="Ask"]', 'textarea', 'div[contenteditable="true"]'],
	},
];

export function getProvider(id: string): Provider {
	return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0];
}