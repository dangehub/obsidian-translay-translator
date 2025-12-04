import {
	App,
	MarkdownView,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	Modal,
} from "obsidian";
import { TranslationSession } from "./src/translator";
import { FloatingFab } from "./src/fab";
import { DictionaryStore } from "./src/dictionary";
import * as path from "path";

export interface KissTranslatorSettings {
	apiType: "simple" | "openai";
	apiUrl: string;
	apiKey: string;
	model: string;
	fromLang: string;
	toLang: string;
	systemPrompt: string;
	userPrompt: string;
	skipSelectors: string[];
	uiScope: string;
	uiScopes: string[];
	recentUiScopes: string[];
	hideOriginal: boolean;
	autoTranslateOnOpen: boolean;
}

const DEFAULT_SETTINGS: KissTranslatorSettings = {
	apiType: "openai",
	apiUrl: "https://api.openai.com/v1/chat/completions",
	apiKey: "",
	model: "gpt-4o-mini",
	fromLang: "auto",
	toLang: "zh",
	systemPrompt:
		"You are a translation engine. Preserve meaning, formatting, punctuation, and code blocks. Do not add explanations.",
	userPrompt:
		"Translate the following text from {from} to {to}. Reply with translation only.\n\n{text}",
	skipSelectors: [
		'body > div.modal-container.mod-dim > div.modal.mod-settings.mod-sidebar-layout > div.modal-content.vertical-tabs-container > div.vertical-tab-header',
	],
	uiScope: "ui-global",
	uiScopes: ["ui-global"],
	recentUiScopes: ["ui-global"],
	hideOriginal: false,
	autoTranslateOnOpen: false,
};

export default class KissTranslatorPlugin extends Plugin {
	settings: KissTranslatorSettings;
	session: TranslationSession | null = null;
	uiSession: TranslationSession | null = null;
	private fab: FloatingFab | null = null;
	private dictStore: DictionaryStore | null = null;
	private scopeMenuEl: HTMLElement | null = null;
	private scopeMenuHandler: ((ev: MouseEvent) => void) | null = null;

	async onload() {
		await this.loadSettings();
		this.dictStore = new DictionaryStore(this.getTranslationDir());
		await this.dictStore.ensureReady();

		this.addCommand({
			id: "kiss-translate-current",
			name: "Translate current note (inline)",
			callback: () => this.translateActive(),
		});

		this.addCommand({
			id: "kiss-clear-translation",
			name: "Clear translations on current note",
			callback: () => this.clearActive(),
		});

		this.addCommand({
			id: "kiss-toggle-original",
			name: "Toggle show original text",
			callback: () => this.toggleOriginal(),
		});

		this.addCommand({
			id: "kiss-set-ui-scope",
			name: "Set UI dictionary scope",
			callback: () => this.promptUiScope(),
		});

		if (this.settings.autoTranslateOnOpen) {
			this.registerEvent(
				this.app.workspace.on("file-open", () => {
					this.translateActive();
				})
			);
		}

		this.addSettingTab(new KissSettingTab(this.app, this));

		this.fab = new FloatingFab(this);
		this.fab.mount();
	}

	onunload() {
		this.session?.clear();
		this.session = null;
		this.uiSession?.clear();
		this.uiSession = null;
		this.fab?.unmount();
		this.dictStore?.flush().catch((err) => console.error(err));
		this.closeScopeMenu();
	}

	private getActiveMarkdownView(): MarkdownView | null {
		return this.app.workspace.getActiveViewOfType(MarkdownView);
	}

	private ensureSession(view: MarkdownView) {
		if (!this.session || this.session.view !== view) {
			this.session = new TranslationSession(view, this.settings, {
				dictionary: this.dictStore || undefined,
				scopeId: view.file?.path || "note-unknown",
			});
		} else {
			this.session.updateSettings(this.settings);
		}
	}

	private translateActive() {
		const view = this.getActiveMarkdownView();
		if (!view) {
			new Notice("KISS Translator: 请在阅读模式下打开一个 Markdown 窗口再试。");
			return;
		}
		this.ensureSession(view);
		this.session?.translate().catch((err) => {
			console.error(err);
			new Notice(`KISS Translator: ${err.message}`);
		});
	}

	translateUIWithFab() {
		const target =
			document.querySelector<HTMLElement>(".modal.mod-settings") ||
			document.querySelector<HTMLElement>(".modal-container .mod-settings") ||
			document.querySelector<HTMLElement>(".workspace-split.mod-vertical") ||
			document.body;

		if (!target) {
			new Notice("KISS Translator: 未找到可翻译的界面。");
			return;
		}

		if (!this.uiSession) {
			this.uiSession = new TranslationSession(null, this.settings, {
				dictionary: this.dictStore || undefined,
				scopeId: this.settings.uiScope || "ui-global",
			});
		} else {
			this.uiSession.updateSettings(this.settings);
		}

		if (this.uiSession.hasTranslations()) {
			this.uiSession.clear();
			new Notice("KISS Translator: 已清除翻译。");
			return;
		}

		this.uiSession.translate(target).catch((err) => {
			console.error(err);
			new Notice(`KISS Translator: ${err.message}`);
		});
	}

	private clearActive() {
		const view = this.getActiveMarkdownView();
		if (!view) return;
		this.ensureSession(view);
		this.session?.clear();
	}

	private toggleOriginal() {
		this.settings.hideOriginal = !this.settings.hideOriginal;
		this.saveSettings();
		if (this.session) {
			this.session.updateSettings(this.settings);
			this.session.applyOriginalVisibility();
		}
		new Notice(
			this.settings.hideOriginal
				? "KISS Translator: 已隐藏原文"
				: "KISS Translator: 显示原文"
		);
	}

	private promptUiScope() {
		const modal = new UIScopeModal(this.app, this.settings.uiScope, async (val) => {
			await this.setUiScope(val);
		});
		modal.open();
	}

	async setUiScope(val: string) {
		const scope = val.trim() || "ui-global";
		this.settings.uiScope = scope;
		const list = [scope, ...this.settings.recentUiScopes];
		this.settings.recentUiScopes = Array.from(new Set(list)).slice(0, 5);
		if (!this.settings.uiScopes.includes(scope)) {
			this.settings.uiScopes.push(scope);
		}
		await this.saveSettings();
		this.uiSession = null; // 重置以清空缓存
	}

	private async renameScope(oldName: string, newName: string) {
		if (!newName) return;
		await this.dictStore?.renameScope(oldName, newName);
		this.settings.uiScopes = this.settings.uiScopes.map((s) =>
			s === oldName ? newName : s
		);
		this.settings.recentUiScopes = this.settings.recentUiScopes.map((s) =>
			s === oldName ? newName : s
		);
		if (this.settings.uiScope === oldName) {
			this.settings.uiScope = newName;
		}
		await this.saveSettings();
		this.uiSession = null;
	}

	private async deleteScope(name: string) {
		if (name === "ui-global") return; // 保留默认
		await this.dictStore?.removeScope(name);
		this.settings.uiScopes = this.settings.uiScopes.filter((s) => s !== name);
		this.settings.recentUiScopes = this.settings.recentUiScopes.filter(
			(s) => s !== name
		);
		if (this.settings.uiScope === name) {
			this.settings.uiScope = "ui-global";
		}
		await this.saveSettings();
		this.uiSession = null;
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private getTranslationDir() {
		const adapter = this.app.vault.adapter as any;
		const basePath: string | undefined = adapter?.basePath;
		if (basePath) {
			return path.join(
				basePath,
				".obsidian",
				"plugins",
				this.manifest.id,
				"translation"
			);
		}
		return path.join(process.cwd(), "translation");
	}

	openScopeMenu(x: number, y: number) {
		this.closeScopeMenu();
		const menu = document.createElement("div");
		menu.className = "kiss-scope-menu";
		menu.style.left = `${x}px`;
		menu.style.top = `${y}px`;

		const title = document.createElement("div");
		title.textContent = "选择 UI 词典";
		title.className = "kiss-scope-menu-title";
		menu.appendChild(title);

		const recentWrapper = document.createElement("div");
		recentWrapper.className = "kiss-scope-recent";
		recentWrapper.textContent = "最近";
		menu.appendChild(recentWrapper);

		const recentList = document.createElement("div");
		recentList.className = "kiss-scope-menu-list";
		(this.settings.recentUiScopes || []).slice(0, 3).forEach((scope) => {
			const item = document.createElement("div");
			item.textContent = scope;
			item.className = "kiss-scope-menu-item";
			item.onclick = async () => {
				await this.setUiScope(scope);
				this.closeScopeMenu();
			};
			recentList.appendChild(item);
		});
		menu.appendChild(recentList);

		const listWrap = document.createElement("div");
		listWrap.className = "kiss-scope-list-wrap";

		const addRow = document.createElement("div");
		addRow.className = "kiss-scope-add-row";
		const addInput = document.createElement("input");
		addInput.placeholder = "新增词典";
		const addBtn = document.createElement("button");
		addBtn.textContent = "添加";
		addInput.onclick = (e) => e.stopPropagation();
		addBtn.onclick = async (e) => {
			e.stopPropagation();
			await this.setUiScope(addInput.value);
			this.closeScopeMenu();
		};
		addRow.appendChild(addInput);
		addRow.appendChild(addBtn);
		listWrap.appendChild(addRow);

		const fullList = document.createElement("div");
		fullList.className = "kiss-scope-full-list";
		(this.settings.uiScopes || []).forEach((scope) => {
			const row = document.createElement("div");
			row.className = "kiss-scope-row";

			const name = document.createElement("span");
			name.textContent = scope === this.settings.uiScope ? `* ${scope}` : scope;
			name.className = "kiss-scope-name";
			name.onclick = async () => {
				await this.setUiScope(scope);
				this.closeScopeMenu();
			};

			const renameBtn = document.createElement("button");
			renameBtn.textContent = "改名";
			renameBtn.onclick = async (e) => {
				e.stopPropagation();
				row.replaceChildren();
				const input = document.createElement("input");
				input.value = scope;
				const ok = document.createElement("button");
				ok.textContent = "保存";
				const cancel = document.createElement("button");
				cancel.textContent = "取消";
				ok.onclick = async (ev) => {
					ev.stopPropagation();
					const val = input.value.trim();
					if (!val) return;
					await this.renameScope(scope, val);
					this.closeScopeMenu();
				};
				cancel.onclick = (ev) => {
					ev.stopPropagation();
					this.closeScopeMenu();
					this.openScopeMenu(x, y);
				};
				row.appendChild(input);
				row.appendChild(ok);
				row.appendChild(cancel);
				input.focus();
			};

			const delBtn = document.createElement("button");
			delBtn.textContent = "删除";
			delBtn.onclick = async (e) => {
				e.stopPropagation();
				await this.deleteScope(scope);
				this.closeScopeMenu();
			};

			row.appendChild(name);
			row.appendChild(renameBtn);
			row.appendChild(delBtn);
			fullList.appendChild(row);
		});

		listWrap.appendChild(fullList);
		menu.appendChild(listWrap);

		document.body.appendChild(menu);
		this.scopeMenuEl = menu;

		this.scopeMenuHandler = (evt: MouseEvent) => {
			if (!menu.contains(evt.target as Node)) {
				this.closeScopeMenu();
			}
		};
		setTimeout(() => {
			if (this.scopeMenuHandler) {
				document.addEventListener("click", this.scopeMenuHandler);
			}
		}, 0);
	}

	closeScopeMenu() {
		if (this.scopeMenuEl) {
			this.scopeMenuEl.remove();
			this.scopeMenuEl = null;
		}
		if (this.scopeMenuHandler) {
			document.removeEventListener("click", this.scopeMenuHandler);
			this.scopeMenuHandler = null;
		}
	}
}

class KissSettingTab extends PluginSettingTab {
	plugin: KissTranslatorPlugin;

	constructor(app: App, plugin: KissTranslatorPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "KISS Translator (Obsidian)" });

		new Setting(containerEl)
			.setName("API 类型")
			.setDesc("选择简单文本接口或 OpenAI 兼容接口。")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("openai", "OpenAI 兼容 (chat/completions)")
					.addOption("simple", "简单文本接口 (LibreTranslate)")
					.setValue(this.plugin.settings.apiType)
					.onChange(async (value) => {
						this.plugin.settings.apiType =
							value as KissTranslatorSettings["apiType"];
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("API URL")
			.setDesc("翻译接口地址，OpenAI 兼容用 /v1/chat/completions，或 LibreTranslate 兼容。")
			.addText((text) =>
				text
					.setPlaceholder("https://api.openai.com/v1/chat/completions")
					.setValue(this.plugin.settings.apiUrl)
					.onChange(async (value) => {
						this.plugin.settings.apiUrl = value.trim();
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("API Key")
			.setDesc("可选，如果接口需要鉴权请填写。")
			.addText((text) =>
				text
					.setPlaceholder("sk-...")
					.setValue(this.plugin.settings.apiKey)
					.onChange(async (value) => {
						this.plugin.settings.apiKey = value.trim();
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("模型 (OpenAI)")
			.setDesc("OpenAI 兼容模式下使用的模型，如 gpt-4o-mini。")
			.addText((text) =>
				text
					.setPlaceholder("gpt-4o-mini")
					.setValue(this.plugin.settings.model)
					.onChange(async (value) => {
						this.plugin.settings.model = value.trim();
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("源语言")
			.setDesc("使用 auto 自动检测。")
			.addText((text) =>
				text
					.setPlaceholder("auto")
					.setValue(this.plugin.settings.fromLang)
					.onChange(async (value) => {
						this.plugin.settings.fromLang = value.trim() || "auto";
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("目标语言")
			.setDesc("翻译成的语言，例如 zh、en、ja。")
			.addText((text) =>
				text
					.setPlaceholder("zh")
					.setValue(this.plugin.settings.toLang)
					.onChange(async (value) => {
						this.plugin.settings.toLang = value.trim() || "zh";
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("隐藏原文")
			.setDesc("切换后重新翻译时将隐藏原文，仅显示译文。")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.hideOriginal)
					.onChange(async (value) => {
						this.plugin.settings.hideOriginal = value;
						await this.plugin.saveSettings();
						this.plugin.session?.updateSettings(this.plugin.settings);
						this.plugin.session?.applyOriginalVisibility();
					})
			);

		new Setting(containerEl)
			.setName("打开笔记自动翻译")
			.setDesc("打开笔记时自动翻译（阅读模式）。")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.autoTranslateOnOpen)
					.onChange(async (value) => {
						this.plugin.settings.autoTranslateOnOpen = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("不翻译的选择器")
			.setDesc("一行一个 CSS 选择器。匹配到的元素及其子节点不会被翻译。默认包含设置侧边栏。")
			.addTextArea((text) =>
				text
					.setPlaceholder(
						".workspace-ribbon\nbody > ... > .vertical-tab-header"
					)
					.setValue(this.plugin.settings.skipSelectors.join("\n"))
					.onChange(async (value) => {
						const list = value
							.split(/\n|,/)
							.map((s) => s.trim())
							.filter(Boolean);
						this.plugin.settings.skipSelectors = list;
						await this.plugin.saveSettings();
						this.plugin.session?.updateSettings(this.plugin.settings);
						this.plugin.uiSession?.updateSettings(this.plugin.settings);
					})
			);

		new Setting(containerEl)
			.setName("UI 词典名")
			.setDesc("悬浮球翻译 UI 时使用的词典作用域，例如 ui-global 或具体插件名。")
			.addText((text) =>
				text
					.setPlaceholder("ui-global")
					.setValue(this.plugin.settings.uiScope)
					.onChange(async (value) => {
						await this.plugin.setUiScope(value);
					})
			);

		new Setting(containerEl)
			.setName("System prompt (OpenAI)")
			.setDesc("可选。可使用占位符 {from} {to}。")
			.addTextArea((text) =>
				text
					.setPlaceholder(
						"You are a translation engine. Preserve meaning and formatting."
					)
					.setValue(this.plugin.settings.systemPrompt)
					.onChange(async (value) => {
						this.plugin.settings.systemPrompt = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("User prompt (OpenAI)")
			.setDesc("必填。可使用占位符 {text} {from} {to}。")
			.addTextArea((text) =>
				text
					.setPlaceholder(
						"Translate the following text from {from} to {to}. Reply with translation only.\n\n{text}"
					)
					.setValue(this.plugin.settings.userPrompt)
					.onChange(async (value) => {
						this.plugin.settings.userPrompt = value;
						await this.plugin.saveSettings();
					})
			);
	}
}

class UIScopeModal extends Modal {
	private value: string;
	private onSubmit: (val: string) => void;

	constructor(app: App, current: string, onSubmit: (val: string) => void) {
		super(app);
		this.value = current || "ui-global";
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h3", { text: "设置当前 UI 词典名" });
		const input = contentEl.createEl("input", { value: this.value });
		input.style.width = "100%";
		input.focus();

		const btn = contentEl.createEl("button", { text: "确定" });
		btn.onclick = () => {
			this.onSubmit(input.value.trim());
			this.close();
		};
	}
}
