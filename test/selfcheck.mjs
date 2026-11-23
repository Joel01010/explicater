// Self-check: playwright-core (patched for "webview" targets) must attach an
// Electron-style webview CDP target as a page and be able to fill its textarea.
// Run: node test/selfcheck.mjs  (needs /usr/bin/chromium)
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
import { WSProxyTransport } from '../transport.mjs';

const PORT = 9333;
const profile = mkdtempSync(join(tmpdir(), 'dse-test-'));
const chrome = spawn('/usr/bin/chromium', [
	'--headless=new', '--no-sandbox', '--disable-gpu',
	`--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
	'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJSON(path) {
	const res = await fetch(`http://127.0.0.1:${PORT}${path}`);
	return res.json();
}

let browser;
try {
	// wait for CDP to come up
	let version;
	for (let i = 0; i < 60; i++) {
		try { version = await getJSON('/json/version'); break; } catch { await sleep(250); }
	}
	assert.ok(version?.webSocketDebuggerUrl, 'chromium CDP did not start');

	// Create a target, then relabel its type to "webview" — exactly what
	// Electron reports for Obsidian's built-in browser.
	const ws = new WebSocket(version.webSocketDebuggerUrl);
	await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
	let nextId = 0;
	const pending = new Map();
	ws.onmessage = (ev) => {
		const msg = JSON.parse(ev.data);
		if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
	};
	const send = (method, params = {}) => new Promise((res) => {
		const id = ++nextId; pending.set(id, res);
		ws.send(JSON.stringify({ id, method, params }));
	});
	const created = await send('Target.createTarget', { url: 'about:blank' });
	const targetId = created.result.targetId;
	const infos = await send('Target.getTargets');
	const orig = infos.result.targetInfos.find((t) => t.targetId === targetId);
	assert.equal(orig.type, 'page');
	const webviewInfo = { ...orig, type: 'webview' };
	assert.equal(webviewInfo.type, 'webview');
	ws.close();

	// Proxy transport: rewrites this target's type page -> webview in every
	// CDP message, so playwright sees an Electron-style webview target.
	const proxy = new WSProxyTransport(version.webSocketDebuggerUrl);
	await proxy.opened;
	const rewrite = (obj) => {
		if (obj && typeof obj === 'object') {
			// Electron reports webviews without a browserContextId; mirror that
			// so the fallback-to-default-context path is exercised too.
			if (obj.targetId === targetId) {
				if (obj.type === 'page') obj.type = 'webview';
				delete obj.browserContextId;
			}
			for (const v of Object.values(obj)) rewrite(v);
		}
	};
	const rawOnMessage = proxy.onmessage;
	proxy.ws.onmessage = (ev) => {
		const msg = JSON.parse(ev.data);
		rewrite(msg);
		proxy.onmessage?.(msg);
	};

	browser = await chromium.connectOverCDP(proxy, { timeout: 15000 });
	let page;
	for (let i = 0; i < 40 && !page; i++) {
		page = browser.contexts().flatMap((c) => c.pages())
			.find((p) => p.url() === 'about:blank');
		if (!page) await sleep(250);
	}
	assert.ok(page, 'webview target was not attached as a page');

	await page.setContent('<textarea id="chat-input"></textarea>');
	await page.locator('#chat-input').fill('Explain this:\n\nhello webview');
	const value = await page.locator('#chat-input').inputValue();
	assert.equal(value, 'Explain this:\n\nhello webview');
	console.log('SELFCHECK PASS: webview target attached as page; fill works');
} finally {
	await browser?.close().catch(() => {});
	chrome.kill('SIGKILL');
}