import { chromium, type Browser, type Page } from 'playwright-core';
import type { Provider } from './providers';

export const CDP_ENDPOINT = 'http://127.0.0.1:9222';

// Drives the provider's tab inside Obsidian's built-in browser (an Electron
// <webview>, reachable only because Obsidian was started with
// --remote-debugging-port=9222 and playwright-core is patched to attach
// "webview" targets — see patch.mjs).
export async function explainWithProvider(
	provider: Provider,
	text: string,
	note?: { name: string; content: string }
): Promise<void> {
	let browser: Browser;
	try {
		browser = await chromium.connectOverCDP(CDP_ENDPOINT, { timeout: 5000 });
	} catch {
		throw new Error(
			"Can't reach Obsidian's debug port 9222. Close Obsidian and reopen it with the \"Obsidian (Scholium)\" launcher."
		);
	}
	try {
		const page = await findProviderPage(browser, provider);
		try {
			await page.locator(provider.inputSelectors.join(', ')).first()
				.waitFor({ state: 'visible', timeout: 30000 });
		} catch {
			throw new Error(
				`${provider.name} input box not found — if the tab shows a login page, sign in once in that tab, then try again.`
			);
		}
		// shortcut: React composers (verified on DeepSeek) ignore Playwright's
		// fill() and trusted Enter on this webview; native value setter +
		// input event + DOM KeyboardEvent is the verified-working path.
		const prompt = buildPrompt(text, note);
		const submitted = await page.evaluate(
			({ msg, selectors }) => {
				let el: HTMLElement | null = null;
				for (const s of selectors) {
					el = document.querySelector<HTMLElement>(s);
					if (el) break;
				}
				if (!el) return 'NO_INPUT';
				el.focus();
				if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
					const proto = el instanceof HTMLTextAreaElement
						? HTMLTextAreaElement.prototype
						: HTMLInputElement.prototype;
					Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, msg);
				} else {
					// contenteditable (ChatGPT/Claude/Gemini): select-all + insertText
					// keeps React/ProseMirror state in sync.
					const sel = window.getSelection()!;
					const range = document.createRange();
					range.selectNodeContents(el);
					sel.removeAllRanges();
					sel.addRange(range);
					document.execCommand('insertText', false, msg);
				}
				el.dispatchEvent(new Event('input', { bubbles: true }));
				for (const type of ['keydown', 'keypress', 'keyup']) {
					el.dispatchEvent(new KeyboardEvent(type, {
						key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
						bubbles: true, cancelable: true,
					}));
				}
				return 'OK';
			},
			{ msg: prompt, selectors: provider.inputSelectors }
		);
		if (submitted !== 'OK') throw new Error(`${provider.name} input box vanished before typing.`);
		// Verify the send landed: composer clears or the prompt appears in the chat.
		const deadline = Date.now() + 8000;
		for (;;) {
			const state = await page.evaluate(
				({ msg, selectors }) => {
					let el: HTMLElement | null = null;
					for (const s of selectors) {
						el = document.querySelector<HTMLElement>(s);
						if (el) break;
					}
					const value =
						el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement
							? el.value
							: el?.innerText ?? '';
					return { value, sent: document.body.innerText.includes(msg.slice(0, 60)) };
				},
				{ msg: prompt, selectors: provider.inputSelectors }
			);
			if (!state.value.trim() || state.sent) break;
			if (Date.now() > deadline)
				throw new Error(`Typed the prompt but ${provider.name} did not send it — try again.`);
			await new Promise((r) => setTimeout(r, 400));
		}
	} finally {
		await browser.close();
	}
}

export function buildPrompt(text: string, note?: { name: string; content: string }): string {
	if (!note?.content.trim()) return `Explain this:\n\n${text}`;
	return (
		`Here is the full note "${note.name}" for context:\n\n` +
		`${note.content}\n\n---\n\n` +
		`Using that context, explain this:\n\n${text}`
	);
}

async function findProviderPage(browser: Browser, provider: Provider): Promise<Page> {
	const deadline = Date.now() + 20000;
	for (;;) {
		for (const ctx of browser.contexts()) {
			const page = ctx.pages().find((p) => p.url().includes(provider.host));
			if (page) return page;
		}
		if (Date.now() > deadline)
			throw new Error(`No ${provider.name} tab found in the built-in browser.`);
		await new Promise((r) => setTimeout(r, 500));
	}
}