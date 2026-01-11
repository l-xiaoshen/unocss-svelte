import { createRecoveryConfigLoader } from "@unocss/config"
import { createGenerator, type UnocssPluginContext } from "@unocss/core"
import type { Plugin, PluginOption } from "vite"
import { transformSvelte } from "./transform/transform"
import transformerDirectives from "@unocss/transformer-directives"
import MagicString from "magic-string"
import { loadTailwindThemePreset, UnoCSSTailwindSupport } from "@unocss-svelte/tailwindcss/vite"

const PREFLIGHT_VIRTUAL_ID = "virtual:uno-preflight.css"
const RESOLVED_PREFLIGHT_VIRTUAL_ID = "\0" + PREFLIGHT_VIRTUAL_ID

/**
 * Resolve preset names from potentially unresolved presets (Promises).
 * Presets defined with definePreset(async () => ...) return Promises when called.
 */
async function resolvePresetNames(presets: unknown[] | undefined): Promise<string[]> {
	if (!presets) return []

	const names: string[] = []
	for (const p of presets) {
		try {
			const resolved = p instanceof Promise ? await p : p
			if (resolved && typeof resolved === "object" && "name" in resolved && typeof resolved.name === "string") {
				names.push(resolved.name)
			}
		} catch {
			// Ignore resolution errors
		}
	}
	return names
}

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
		await uno.setConfig(config, uno.defaults)
		return { config, sources }
	})

	await configReady

	// Resolve presets to check their names (presets may be Promises from definePreset)
	const presetNames = await resolvePresetNames(uno.config.presets)
	const tailwindcssSupportNeeded = presetNames.includes("tailwindcss")
	const shadcnSupportNeeded = presetNames.includes("shadcn")
	const tailwindVariantSupportNeeded = tailwindcssSupportNeeded && shadcnSupportNeeded

	if (tailwindcssSupportNeeded && options.css) {
		console.log("Loading tailwindcss theme")

		const preset = await loadTailwindThemePreset(options.css)
		if (preset) {
			const newConfig = {
				...uno.userConfig,
			}

			if (newConfig.presets) {
				newConfig.presets.push(preset)
			} else {
				newConfig.presets = [preset]
			}

			await uno.setConfig(newConfig, uno.defaults)
		}
	}

	const ctx: UnocssPluginContext = {
		ready: configReady,
		uno,
	} as UnocssPluginContext

	await configReady

	let isSvelteKit = false

	console.log("tailwindcssSupportNeeded", tailwindcssSupportNeeded)
	console.log("shadcnSupportNeeded", shadcnSupportNeeded)
	console.log("tailwindVariantSupportNeeded", tailwindVariantSupportNeeded)

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
					preflights: false,
					safelist: false,
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
				// // console.log(Object.keys(uno.config.theme))
				// console.log(Object.keys(uno.config.theme.colors))

				if (id.endsWith(".svelte")) {
					await uno.setConfig(uno.userConfig, uno.defaults)
					return transformSvelteFile(code, id)
				}

				if (isSvelteKit && id.endsWith(".css")) {
					await uno.setConfig(uno.userConfig, uno.defaults)
					return transformCSSFile(code, id)
				}
			},
		},
	}

	async function transformSvelteFile(code: string, id: string) {
		const result = await transformSvelte(code, uno, ctx, options, {
			shadcn: shadcnSupportNeeded,
			tailwindVariant: tailwindVariantSupportNeeded,
		})
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

		return {
			code: s.toString(),
			map: s.generateMap(),
		}
	}

	const plugins: PluginOption[] = [plugin]

	if (tailwindcssSupportNeeded) {
		plugins.push(UnoCSSTailwindSupport())
	}

	return plugins
}
