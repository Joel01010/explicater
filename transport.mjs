// Minimal CDP WebSocket transport (Node 22+ global WebSocket), shaped for
// playwright-core's connectOverCDP(transport): send/close/onmessage/onclose.
export class WSProxyTransport {
	constructor(url) {
		this.onmessage = null;
		this.onclose = null;
		this.ws = new WebSocket(url);
		this.ws.onmessage = (ev) => this.onmessage?.(JSON.parse(ev.data));
		this.ws.onclose = () => this.onclose?.();
		this.opened = new Promise((resolve, reject) => {
			this.ws.onopen = resolve;
			this.ws.onerror = () => reject(new Error(`CDP WebSocket failed: ${url}`));
		});
	}
	send(message) { this.ws.send(JSON.stringify(message)); }
	close() { this.ws.close(); }
}