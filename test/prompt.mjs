// Assert the prompt includes the full note when present, falls back otherwise.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { buildPrompt } = createRequire(import.meta.url)('../dist/deepseek-test.js');
const { getProvider, PROVIDERS } = createRequire(import.meta.url)('../dist/providers-test.js');

const note = { name: 'CDC Notes', content: '# Replication\nReads binary transaction logs (Oracle Redo Logs).\n' };
const withNote = buildPrompt('reads binary transaction logs', note);
assert.ok(withNote.includes('CDC Notes'));
assert.ok(withNote.includes(note.content));
assert.ok(withNote.includes('reads binary transaction logs'));
assert.ok(withNote.indexOf(note.content) < withNote.indexOf('explain this'));

assert.equal(buildPrompt('sel'), 'Explain this:\n\nsel');
assert.equal(buildPrompt('sel', { name: 'Empty', content: '   ' }), 'Explain this:\n\nsel');
console.log('PROMPT TEST PASS');
// provider table sanity
assert.equal(getProvider('deepseek').host, 'chat.deepseek.com');
assert.equal(getProvider('nonexistent').id, 'deepseek'); // fallback
assert.ok(PROVIDERS.length >= 6);
for (const p of PROVIDERS) { assert.ok(p.url.startsWith('https://')); assert.ok(p.inputSelectors.length); }
console.log('PROVIDER TEST PASS');
