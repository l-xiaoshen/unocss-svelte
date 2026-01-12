import type { UnoGenerator, UserConfig } from "@unocss/core"
import { createGenerator } from "@unocss/core"
import type { ViteDevServer } from "vite"

const HMR_DEBOUNCE_MS = 50

export class ClassRegistry {
	private classes = new Map<string, Set<string>>()
	private preflightCache: string | null = null
	private preflightDirty = true
	private hmrDebounceTimer: ReturnType<typeof setTimeout> | null = null
	private server: ViteDevServer | null = null
	private preflightPath: string

	constructor(
		preflightPath: string,
		private config: UserConfig,
		private defaults: UserConfig | undefined,
	) {
		this.preflightPath = preflightPath
	}

	setServer(server: ViteDevServer) {
		this.server = server
	}

	private async createGenerator(): Promise<UnoGenerator> {
		const uno = await createGenerator()
		await uno.setConfig(this.config, this.defaults)
		return uno
	}

	async generatePreflightCSS(): Promise<string> {
		if (!this.preflightDirty && this.preflightCache !== null) {
			return this.preflightCache
		}

		const uno = await this.createGenerator()

		const allClasses = new Set<string>()
		for (const classes of this.classes.values()) {
			for (const cls of classes) {
				allClasses.add(cls)
			}
		}

		const classString = Array.from(allClasses).join(" ")

		await uno.generate(classString, {
			preflights: false,
			minify: false,
			safelist: false,
		})

		const { css } = await uno.generate("", {
			preflights: true,
			minify: false,
			safelist: true,
		})

		this.preflightCache = css
		this.preflightDirty = false

		return css
	}

	triggerHMR() {
		if (this.hmrDebounceTimer) {
			clearTimeout(this.hmrDebounceTimer)
		}

		this.hmrDebounceTimer = setTimeout(() => {
			this.hmrDebounceTimer = null
			if (this.server) {
				this.server.ws.send({
					type: "custom",
					event: "unocss-preflight-update",
					data: { path: this.preflightPath },
				})
				this.server.ws.send({
					type: "full-reload",
					path: this.preflightPath,
				})
			}
		}, HMR_DEBOUNCE_MS)
	}

	update(fileId: string, newClasses: Set<string> | null): boolean {
		const oldClasses = this.classes.get(fileId)

		if (newClasses === null || newClasses.size === 0) {
			if (oldClasses && oldClasses.size > 0) {
				this.classes.delete(fileId)
				this.preflightDirty = true
				return true
			}
			return false
		}

		if (!oldClasses) {
			this.classes.set(fileId, newClasses)
			this.preflightDirty = true
			return true
		}

		if (oldClasses.size !== newClasses.size) {
			this.classes.set(fileId, newClasses)
			this.preflightDirty = true
			return true
		}

		for (const cls of newClasses) {
			if (!oldClasses.has(cls)) {
				this.classes.set(fileId, newClasses)
				this.preflightDirty = true
				return true
			}
		}

		return false
	}
}
