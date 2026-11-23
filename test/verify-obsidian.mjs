// Verify via CDP that Obsidian loaded the deepseek-explain plugin.
const list = await (await fetch('http://127.0.0.1:9222/json/list')).json();
console.log('targets:', list.map((t) => `${t.type} ${t.url.slice(0, 80)}`).join(' | '));
const main = list.find((t) => t.type === 'page' && t.url.startsWith('app://'));
if (!main) { console.log('NO_MAIN_WINDOW'); process.exit(1); }
const ws = new WebSocket(main.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
const send = (id, method, params) => ws.send(JSON.stringify({ id, method, params }));
const result = await new Promise((res) => {
	ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id === 1) res(m); };
	send(1, 'Runtime.evaluate', {
		expression: `(() => {
			const p = window.app?.plugins?.plugins?.['deepseek-explain'];
			return JSON.stringify({
				loaded: !!p,
				enabled: window.app?.plugins?.enabledPlugins?.has('deepseek-explain') ?? false,
				webviewer: !!window.app?.internalPlugins?.getPluginById?.('webviewer')?.enabled,
				version: window.app?.version ?? null,
			});
		})()`,
		returnByValue: true,
	});
});
console.log('PLUGIN_STATE:', result.result?.result?.value ?? JSON.stringify(result));
ws.close();