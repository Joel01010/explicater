import { defineConfig, globalIgnores } from 'eslint/config';
import obsidianmd from 'eslint-plugin-obsidianmd';

export default defineConfig([
	globalIgnores(['node_modules', 'dist', 'test', '*.mjs', '*.cjs', 'main.js']),
	...obsidianmd.configs.recommended,
	{
		files: ['src/**/*.ts'],
		languageOptions: {
			parserOptions: {
				projectService: { allowDefaultProject: ['eslint.config.*'] },
			},
		},
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
		},
	},
	{
		// ai.ts page.evaluate callbacks run INSIDE the provider's web page (a
		// remote Chromium target), not Obsidian's renderer: plain document /
		// instanceof / setTimeout are correct there, and execCommand('insertText')
		// is the only React/ProseMirror-safe way to fill contenteditable composers.
		files: ['src/ai.ts'],
		rules: {
			'obsidianmd/prefer-active-doc': 'off',
			'obsidianmd/prefer-instanceof': 'off',
			'obsidianmd/prefer-window-timers': 'off',
			'@typescript-eslint/no-deprecated': 'off',
		},
	},
]);