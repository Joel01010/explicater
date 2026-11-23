// Live check: real chat.deepseek.com in headless chromium — does #chat-input
// exist, and does fill()+Enter work? Never sends a message (no login here).
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const browser = await chromium.launch({
	executablePath: '/usr/bin/chromium',
	headless: true,
	args: ['--no-sandbox', '--disable-gpu'],
});
try {
	const page = await browser.newPage();
	await page.goto('https://chat.deepseek.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
	await page.waitForTimeout(5000);
	console.log('URL:', page.url());
	console.log('TITLE:', await page.title());
	const input = page.locator('#chat-input');
	const visible = await input.isVisible().catch(() => false);
	console.log('#chat-input visible:', visible);
	if (visible) {
		await input.fill('Explain this:\n\nprobe text');
		assert.equal(await input.inputValue(), 'Explain this:\n\nprobe text');
		console.log('LIVE PASS: fill works on the real provider page (not sent)');
	} else {
		const textareas = await page.locator('textarea').count();
		const bodyText = (await page.locator('body').innerText().catch(() => '')).slice(0, 300);
		console.log('textarea count:', textareas);
		console.log('body snippet:', JSON.stringify(bodyText));
	}
} finally {
	await browser.close();
}