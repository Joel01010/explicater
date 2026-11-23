import { App, Notice, Plugin, PluginSettingTab, Setting, TFile, WorkspaceLeaf } from 'obsidian';
import { explainWithProvider } from './ai';
import { getProvider, PROVIDERS, type Provider } from './providers';

interface ExplicaterSettings {
	providerId: string;
}

const DEFAULT_SETTINGS: ExplicaterSettings = { providerId: 'deepseek' };

// Minimal shapes for the internal APIs this plugin touches (web viewer core
// plugin + workspace leaf internals), so the rest of the code stays typed.
interface InternalPlugin {
	enabled: boolean;
	enable(): Promise<void>;
}
interface AppWithInternals extends App {
	internalPlugins?: { getPluginById?(id: string): InternalPlugin | undefined };
}
interface LeafParent {
	children?: unknown[];
}

export default class ExplicaterPlugin extends Plugin {
	settings: ExplicaterSettings = DEFAULT_SETTINGS;
	private busy = false;

	async onload() {
		const loaded = (await this.loadData()) as Partial<ExplicaterSettings> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded);
		this.addSettingTab(new ExplainSettingTab(this.app, this));

		this.registerEvent(
			this.app.workspace.on('editor-menu', (menu, editor) => {
				const selection = editor.getSelection();
				if (!selection.trim()) return;
				menu.addItem((item) =>
					item
						.setTitle('Explain with AI')
						.setIcon('sparkles')
						.onClick(() => this.explain(selection))
				);
			})
		);
		this.addCommand({
			id: 'explain-selection',
			name: 'Explain selection with AI',
			editorCallback: (editor) => {
				const selection = editor.getSelection();
				if (selection.trim()) void this.explain(selection);
				else new Notice('Select some text first.');
			},
		});
	}

	private async explain(text: string) {
		if (this.busy) return;
		this.busy = true;
		const provider = getProvider(this.settings.providerId);
		try {
			const file = this.app.workspace.getActiveFile();
			const note =
				file instanceof TFile && file.extension === 'md'
					? { name: file.basename, content: await this.app.vault.read(file) }
					: undefined;
			const leaf = await this.openProviderPane(provider);
			await explainWithProvider(provider, text, note);
			this.app.workspace.setActiveLeaf(leaf, { focus: false });
			new Notice(`Sent to ${provider.name}.`);
		} catch (e) {
			new Notice(`Explicater: ${(e as Error).message ?? e}`, 10000);
		} finally {
			this.busy = false;
		}
	}

	private async openProviderPane(provider: Provider): Promise<WorkspaceLeaf> {
		// The web viewer core plugin must be on for a "webviewer" leaf to exist.
		const webviewer = (this.app as AppWithInternals).internalPlugins?.getPluginById?.('webviewer');
		if (webviewer && !webviewer.enabled) await webviewer.enable();

		const existing = this.app.workspace
			.getLeavesOfType('webviewer')
			.find((l) => {
				const state = l.getViewState().state as { url?: unknown } | undefined;
				const url = typeof state?.url === 'string' ? state.url : '';
				return url.includes(provider.host);
			});
		if (existing) {
			// Keep the AI in a right-hand split next to the note, not a tab in
			// the main group. Only move it when it isn't already alone in its pane.
			const siblings = (existing.parent as LeafParent | null)?.children ?? [];
			if (siblings.length <= 1) return existing;
			const noteLeaf = this.app.workspace.getMostRecentLeaf();
			const split = this.app.workspace.createLeafBySplit(
				noteLeaf && noteLeaf !== existing ? noteLeaf : existing,
				'vertical'
			);
			const state = existing.getViewState();
			await existing.setViewState({ type: 'empty', state: {} });
			await split.setViewState({ ...state, active: true });
			return split;
		}

		const leaf = this.app.workspace.getLeaf('split', 'vertical');
		await leaf.setViewState({
			type: 'webviewer',
			state: { url: provider.url, navigate: true },
			active: true,
		});
		return leaf;
	}
}

class ExplainSettingTab extends PluginSettingTab {
	constructor(app: App, private plugin: ExplicaterPlugin) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('AI provider')
			.setDesc(
				'Which chat service the right-click "Explain" action uses. It opens in the built-in browser as a side pane; sign in once per provider. Requires the debug-port launcher.'
			)
			.addDropdown((dd) => {
				for (const p of PROVIDERS) dd.addOption(p.id, p.name);
				dd.setValue(this.plugin.settings.providerId);
				dd.onChange(async (value) => {
					this.plugin.settings.providerId = value;
					await this.plugin.saveData(this.plugin.settings);
				});
			});

		containerEl.createEl('p', {
			text: 'All providers use the same mechanism with their standard input selectors. DeepSeek is verified end-to-end; if another provider fails, its error notice will say so.',
			cls: 'setting-item-description',
		});
	}
}