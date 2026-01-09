import { createRecoveryConfigLoader } from "@unocss/config"
import { createGenerator, UnoGenerator } from "@unocss/core"
import type { Plugin } from "vite"
import { transformSvelte } from "./transform/transform"

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

	const plugin: Plugin = {
		name: "vite-plugin-svelte-unocss-svelte-scoped",

		transform: {
			filter: {
				id: /\.svelte$/,
			},
			async handler(code, id, options) {
				await ready
				const result = await transformSvelte(code, uno, unocssOptions)

				if (!result) {
					return
				}

				return {
					code: result.toString(),
					map: result.generateMap(),
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
