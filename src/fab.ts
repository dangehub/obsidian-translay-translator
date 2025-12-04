import type KissTranslatorPlugin from "../main";
import { Platform } from "obsidian";

const FAB_ID = "kiss-obsidian-fab";

export class FloatingFab {
	private plugin: KissTranslatorPlugin;
	private el: HTMLDivElement | null = null;
	private dragging = false;
	private offsetX = 0;
	private offsetY = 0;
	private state: "off" | "empty" | "active" = "off";
	private longPressTimer: NodeJS.Timeout | null = null;
	private touchStart: { x: number; y: number } | null = null;

	constructor(plugin: KissTranslatorPlugin) {
		this.plugin = plugin;
	}

	mount() {
		if (this.el) return;

		const isMobile = Platform.isMobileApp || Platform.isMobile;

		const fab = document.createElement("div");
		fab.id = FAB_ID;
		fab.textContent = "译";
		fab.title = isMobile
			? "双击开关词典翻译，长按打开菜单，拖动可移动"
			: "双击开关词典翻译，右键打开菜单，拖动可移动";
		fab.className = "kiss-fab";

		const startDrag = (evt: MouseEvent | TouchEvent) => {
			const { clientX, clientY } = this.getPoint(evt);
			const rect = fab.getBoundingClientRect();
			this.offsetX = clientX - rect.left;
			this.offsetY = clientY - rect.top;
			if (evt instanceof TouchEvent) {
				this.touchStart = { x: clientX, y: clientY };
				this.dragging = false; // 等移动阈值后再开始拖动
			} else {
				this.dragging = true;
			}
			evt.preventDefault();
		};

		const onMove = (evt: MouseEvent | TouchEvent) => {
			const { clientX, clientY } = this.getPoint(evt);
			if (!this.dragging && this.touchStart) {
				const dx = Math.abs(clientX - this.touchStart.x);
				const dy = Math.abs(clientY - this.touchStart.y);
				if (dx > 4 || dy > 4) {
					this.dragging = true;
				}
			}
			if (!this.dragging) return;
			const x = clientX - this.offsetX;
			const y = clientY - this.offsetY;
			fab.style.left = `${Math.max(0, Math.min(window.innerWidth - 44, x))}px`;
			fab.style.top = `${Math.max(0, Math.min(window.innerHeight - 44, y))}px`;
		};

		const endDrag = () => {
			this.dragging = false;
			this.touchStart = null;
		};

		fab.addEventListener("mousedown", startDrag);
		fab.addEventListener("touchstart", (evt) => {
			startDrag(evt);
			if (this.longPressTimer) clearTimeout(this.longPressTimer);
			this.longPressTimer = setTimeout(() => {
				this.longPressTimer = null;
				if (!this.dragging) {
					const pt = this.getPoint(evt);
					this.plugin.openScopeMenu(pt.clientX, pt.clientY);
				}
			}, 550);
		});
		window.addEventListener("mousemove", onMove);
		window.addEventListener("touchmove", onMove);
		window.addEventListener("mouseup", endDrag);
		window.addEventListener("touchend", () => {
			if (this.longPressTimer) {
				clearTimeout(this.longPressTimer);
				this.longPressTimer = null;
			}
			endDrag();
		});

		let lastTap = 0;
		const handleActivate = (evt: Event) => {
			if (this.dragging) return;
			evt.preventDefault();
			const now = Date.now();
			if (now - lastTap < 320) {
				lastTap = 0;
				this.plugin.toggleUiDictionaryTranslations();
			} else {
				lastTap = now;
				setTimeout(() => {
					if (lastTap === now) {
						lastTap = 0;
					}
				}, 320);
			}
		};

		fab.addEventListener("click", (evt) => {
			if (isMobile) return; // 移动端用 touchend 处理双击
			handleActivate(evt);
		});

		fab.addEventListener("touchend", (evt) => {
			if (this.longPressTimer) {
				clearTimeout(this.longPressTimer);
				this.longPressTimer = null;
			}
			if (this.dragging) {
				endDrag();
				return;
			}
			endDrag();
			handleActivate(evt);
		});

		fab.addEventListener("contextmenu", (evt) => {
			if (isMobile) return;
			evt.preventDefault();
			this.plugin.openScopeMenu(evt.clientX, evt.clientY);
		});

		document.body.appendChild(fab);
		this.el = fab;
	}

	setState(state: "off" | "empty" | "active") {
		if (!this.el) return;
		this.state = state;
		this.el.classList.remove("kiss-fab-active", "kiss-fab-idle", "kiss-fab-empty");
		if (state === "active") {
			this.el.classList.add("kiss-fab-active");
		} else if (state === "empty") {
			this.el.classList.add("kiss-fab-empty");
		} else {
			this.el.classList.add("kiss-fab-idle");
		}
	}

	unmount() {
		this.el?.remove();
		this.el = null;
	}

	private getPoint(evt: MouseEvent | TouchEvent) {
		if (evt instanceof TouchEvent) {
			const touch = evt.touches[0] || evt.changedTouches[0];
			return { clientX: touch.clientX, clientY: touch.clientY };
		}
		return { clientX: evt.clientX, clientY: evt.clientY };
	}
}
