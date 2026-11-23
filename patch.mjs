// Patch playwright-core so Electron <webview> CDP targets (Obsidian's built-in
// browser) are attached as pages. Upstream only accepts type "page"/"other".
import { readFileSync, writeFileSync } from 'node:fs';

const file = 'node_modules/playwright-core/lib/coreBundle.js';
let src = readFileSync(file, 'utf8');
let changed = 0;

const from = 'if (targetInfo.type === "page" || treatOtherAsPage) {';
const to = 'if (targetInfo.type === "page" || targetInfo.type === "webview" || treatOtherAsPage) {';
if (src.includes(from)) {
	const n = src.split(from).length - 1;
	src = src.split(from).join(to);
	changed += n;
	console.log(`patch: webview target filter applied to ${n} site(s)`);
} else if (!src.includes(to)) {
	throw new Error('patch: target filter not found — playwright-core layout changed');
}

// package.ts reads package.json/browsers.json from __dirname at module init;
// inside a bundled Obsidian plugin __dirname is electron.asar, which crashes
// the require. Inline both JSON files instead — connectOverCDP never launches
// browsers, so the registry descriptors are inert.
import { readFileSync as read } from 'node:fs';
const pkgJSON = read('node_modules/playwright-core/package.json', 'utf8');
const browsersJSON = read('node_modules/playwright-core/browsers.json', 'utf8');
const pkgFrom = 'packageJSON = require(import_path8.default.join(packageRoot, "package.json"));';
const pkgTo = `packageJSON = ${pkgJSON.trim()};`;
if (src.includes(pkgFrom)) { src = src.split(pkgFrom).join(pkgTo); changed++; console.log('patch: inlined packageJSON'); }
else if (!/packageJSON = \{/.test(src)) throw new Error('patch: packageJSON init not found');

const regFrom = 'registry = new Registry(require(import_path19.default.join(packageRoot, "browsers.json")));';
const regTo = `registry = new Registry(${browsersJSON.trim()});`;
if (src.includes(regFrom)) { src = src.split(regFrom).join(regTo); changed++; console.log('patch: inlined browsers.json'); }
else if (!/new Registry\(\{/.test(src)) throw new Error('patch: registry init not found');

if (changed) writeFileSync(file, src);
else console.log('patch: already applied');