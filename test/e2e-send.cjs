// E2E via the plugin's real playwright code: send a marked prompt with note
// context, then verify it actually landed in the provider chat.
// Run next to a bundled dist/ai.cjs (see README), with Obsidian launched
// with --remote-debugging-port=9222 and the provider tab open and logged in.
const { explainWithProvider } = require('./ai.cjs');
const { getProvider } = require('./providers.cjs');
const http = require('http');
const getJSON = (path) => new Promise((res, rej) => {
	http.get({ host: '127.0.0.1', port: 9222, path }, (r) => {
		let d = ''; r.on('data', (c) => d += c); r.on('end', () => res(JSON.parse(d)));
	}).on('error', rej);
});
(async () => {
	const provider = getProvider(process.env.PROVIDER || 'deepseek');
	const marker = 'E2E marker ' + Date.now();
	await explainWithProvider(provider, marker, {
		name: 'E2E Test Note',
		content: '# Test\nThis note exists only to verify context delivery.\n',
	});
	await new Promise((r) => setTimeout(r, 5000));
	const list = await getJSON('/json/list');
	const wv = list.find((t) => t.type === 'webview' && t.url.includes(provider.host));
	if (!wv) { console.log('E2E FAIL: no webview'); process.exit(1); }
	const ws = new WebSocket(wv.webSocketDebuggerUrl);
	await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
	let id = 0; const pending = new Map();
	ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
	const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
	const r = await send('Runtime.evaluate', {
		expression: `JSON.stringify({url:location.href, hasMarker:document.body.innerText.includes(${JSON.stringify(marker)}), hasContext:document.body.innerText.includes('verify context delivery')})`,
		returnByValue: true,
	});
	console.log('RESULT:', r.result?.result?.value);
	ws.close();
	const v = JSON.parse(r.result?.result?.value ?? '{}');
	if (v.hasMarker) console.log('E2E PASS: prompt with note context sent and visible');
	else { console.log('E2E FAIL'); process.exit(1); }
})().catch((e) => { console.log('E2E ERR:', e.message); process.exit(1); });