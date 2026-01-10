import { createRecoveryConfigLoader } from "@unocss/config"
import { createGenerator, UnoGenerator, type UnocssPluginContext } from "@unocss/core"
import type { Plugin } from "vite"
import { transformSvelte } from "./transform/transform"
import transformerDirectives from "@unocss/transformer-directives"
import MagicString from "magic-string"

const unoPreflightVirtualModuleId = "virtual:uno-preflight.css"
const resolvedUnoPreflightVirtualModuleId = "\0" + unoPreflightVirtualModuleId

export type UnoCSSSvelteScopedOptions = {}

export function UnoCSSSvelteScoped(unocssOptions: UnoCSSSvelteScopedOptions = {}): Plugin {
	const loadConfig = createRecoveryConfigLoader()
	let uno: UnoGenerator
	const _uno = createGenerator().then((r) => {
		uno = r
		if (uno.config.transformers?.length)
			throw new Error(
				'Due to the differences in normal UnoCSS global usage and Svelte Scoped usage, "config.transformers" will be ignored. You can still use transformers in CSS files with the "cssFileTransformers" option.',
			)
		return r
	})

	const ready = reloadConfig()

	async function reloadConfig() {
		await _uno
		const { config, sources } = await loadConfig(process.cwd(), "unocss.config.ts")
		await uno.setConfig(config)
		return { config, sources }
	}

	const unoCtx = {
		ready: ready,
		uno: uno!,
	} as UnocssPluginContext

	let isSvelteKit = false

	const plugin: Plugin = {
		name: "vite-plugin-svelte-unocss-svelte-scoped",
		configResolved(config) {
			isSvelteKit = config.plugins.some((p) => p.name?.includes("vite-plugin-sveltekit"))
		},
		transform: {
			filter: {
				id: {
					include: [/\.svelte$/, /\.css$/],
				},
			},
			async handler(code, id, options) {
				const lastPart = id.split("/").pop()
				if (!lastPart) {
					return
				}

				const filename = new URL(lastPart, "file://").pathname

				await ready
				const uno = await _uno
				unoCtx.uno = uno

				await uno.setConfig(uno.userConfig, uno.defaults)

				if (id.endsWith(".svelte")) {
					const result = await transformSvelte(code, uno, unoCtx, unocssOptions)

					if (!result) {
						return
					}

					return {
						code: result.toString(),
						map: result.generateMap(),
					}
				}

				if (!isSvelteKit) {
					return
				}

				if (filename.endsWith(".css")) {
					const transformer = transformerDirectives()

					const string = new MagicString(code)

					await transformer.transform(string, id, unoCtx)

					if (!string.hasChanged()) {
						return
					}

					const { css: preflightCSS } = await uno.generate("", {
						preflights: true,
						safelist: true,
						extendedInfo: false,
					})
					if (preflightCSS && preflightCSS.trim() !== "") {
						string.append(preflightCSS)
					}

					return {
						code: string.toString(),
						map: string.generateMap(),
					}
				}
			},
			order: "pre",
		},

		resolveId(id) {
			if (id === unoPreflightVirtualModuleId) return resolvedUnoPreflightVirtualModuleId
		},
		async load(id) {
			if (id === resolvedUnoPreflightVirtualModuleId) {
				const uno = await _uno
				const { css } = await uno.generate("", {
					preflights: true,
					safelist: true,
					extendedInfo: false,
				})
				return css
			}
		},
	}

	return plugin
}
