import { build } from 'esbuild';
import { copyFileSync, mkdirSync } from 'node:fs';

await build({
	entryPoints: ['src/main.ts'],
	bundle: true,
	platform: 'node',
	format: 'cjs',
	target: 'es2022',
	external: ['obsidian', 'electron'],
	outfile: 'dist/main.js',
	minify: true,
	logLevel: 'info',
});
mkdirSync('dist', { recursive: true });
copyFileSync('manifest.json', 'dist/manifest.json');