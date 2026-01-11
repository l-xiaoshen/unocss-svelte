import { createRecoveryConfigLoader } from "@unocss/config"
import { createGenerator, type UnocssPluginContext } from "@unocss/core"
import type { Plugin, PluginOption } from "vite"
import { transformSvelte } from "./transform/transform"
import transformerDirectives from "@unocss/transformer-directives"
import MagicString from "magic-string"
import { UnoCSSTailwindSupport } from "@unocss-svelte/tailwindcss/vite"

const PREFLIGHT_VIRTUAL_ID = "virtual:uno-preflight.css"
const RESOLVED_PREFLIGHT_VIRTUAL_ID = "\0" + PREFLIGHT_VIRTUAL_ID

export type UnoCSSSvelteScopedOptions = {
	/** Path to the CSS file containing Tailwind theme variables (relative to project root) */
	css?: string
}

export async function UnoCSSSvelteScoped(options: UnoCSSSvelteScopedOptions = {}): Promise<PluginOption[]> {
	const loadConfig = createRecoveryConfigLoader()
	const uno = await createGenerator()

	if (uno.config.transformers?.length) {
		throw new Error(
			'Due to the differences in normal UnoCSS global usage and Svelte Scoped usage, "config.transformers" will be ignored. You can still use transformers in CSS files with the "cssFileTransformers" option.',
		)
	}

	const configReady = loadConfig(process.cwd(), "unocss.config.ts").then(async ({ config, sources }) => {
		await uno.setConfig(config)
		return { config, sources }
	})

	const ctx: UnocssPluginContext = {
		ready: configReady,
		uno,
	} as UnocssPluginContext

	let isSvelteKit = false

	const plugin: Plugin = {
		name: "unocss-svelte-scoped",

		configResolved(config) {
			isSvelteKit = config.plugins.some((p) => p.name?.includes("vite-plugin-sveltekit"))
		},

		resolveId(id) {
			if (id === PREFLIGHT_VIRTUAL_ID) {
				return RESOLVED_PREFLIGHT_VIRTUAL_ID
			}
		},

		async load(id) {
			if (id === RESOLVED_PREFLIGHT_VIRTUAL_ID) {
				const { css } = await uno.generate("", {
					preflights: true,
					safelist: true,
					extendedInfo: false,
				})
				return css
			}
		},

		transform: {
			order: "pre",
			filter: {
				id: {
					include: [/\.svelte$/, /\.css$/],
				},
			},
			async handler(code, id) {
				await configReady

				if (id.endsWith(".svelte")) {
					return transformSvelteFile(code, id)
				}

				if (isSvelteKit && id.endsWith(".css")) {
					return transformCSSFile(code, id)
				}
			},
		},
	}

	async function transformSvelteFile(code: string, id: string) {
		const result = await transformSvelte(code, uno, ctx, options)
		if (!result) {
			return
		}
		return {
			code: result.toString(),
			map: result.generateMap(),
		}
	}

	async function transformCSSFile(code: string, id: string) {
		const transformer = transformerDirectives()
		const s = new MagicString(code)

		await transformer.transform(s, id, ctx)

		if (!s.hasChanged()) {
			return
		}

		const { css: preflightCSS } = await uno.generate("", {
			preflights: true,
			safelist: true,
			extendedInfo: false,
		})

		if (preflightCSS?.trim()) {
			s.append(preflightCSS)
		}

		return {
			code: s.toString(),
			map: s.generateMap(),
		}
	}

	const plugins: PluginOption[] = [plugin]

	const tailwindcssSupportNeeded = uno.config.presets?.some((p) => p.name === "tailwindcss")
	if (tailwindcssSupportNeeded) {
		plugins.push(
			UnoCSSTailwindSupport(
				(themePreset) => {
					const defaults = uno.defaults
					defaults.presets = [themePreset, ...(defaults.presets ?? [])]
					uno.setConfig(uno.userConfig, defaults)
				},
				{ css: options.css },
			),
		)
	}
	return plugins
}
