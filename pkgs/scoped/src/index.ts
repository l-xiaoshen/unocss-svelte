import { createRecoveryConfigLoader } from "@unocss/config"
import { createGenerator, type UnoGenerator, type UnocssPluginContext, type UserConfig } from "@unocss/core"
import type { Plugin, PluginOption, ViteDevServer } from "vite"
import { transformSvelte } from "./transform/transform"
import transformerDirectives from "@unocss/transformer-directives"
import MagicString from "magic-string"
import { loadTailwindThemePreset, UnoCSSTailwindSupport } from "@unocss-svelte/tailwindcss/vite"
import { ClassRegistry } from "./registry"

const DEFAULT_PREFLIGHT_PATH = "/preflight.css"

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
	css?: string
	preflightPath?: string
}

export async function UnoCSSSvelteScoped(options: UnoCSSSvelteScopedOptions = {}): Promise<PluginOption[]> {
	const loadConfig = createRecoveryConfigLoader()
	const preflightPath = options.preflightPath ?? DEFAULT_PREFLIGHT_PATH

	let sharedConfig: UserConfig = {}
	let sharedDefaults: UserConfig | undefined
	let registry: ClassRegistry
	let isSvelteKit = false

	let tailwindcssSupportNeeded = false
	let shadcnSupportNeeded = false
	let tailwindVariantSupportNeeded = false

	const initialUno = await createGenerator()
	const configReady = loadConfig(process.cwd(), "unocss.config.ts").then(async ({ config, sources }) => {
		await initialUno.setConfig(config, initialUno.defaults)
		sharedConfig = config
		sharedDefaults = initialUno.defaults
		registry = new ClassRegistry(preflightPath, sharedConfig, sharedDefaults)
		return { config, sources }
	})

	await configReady

	if (initialUno.config.transformers?.length) {
		throw new Error(
			'Due to the differences in normal UnoCSS global usage and Svelte Scoped usage, "config.transformers" will be ignored. You can still use transformers in CSS files with the "cssFileTransformers" option.',
		)
	}

	const presetNames = await resolvePresetNames(initialUno.config.presets)
	tailwindcssSupportNeeded = presetNames.includes("tailwindcss")
	shadcnSupportNeeded = presetNames.includes("shadcn")
	tailwindVariantSupportNeeded = tailwindcssSupportNeeded && shadcnSupportNeeded

	if (tailwindcssSupportNeeded && options.css) {
		const preset = await loadTailwindThemePreset(options.css)
		if (preset) {
			sharedConfig.presets = sharedConfig.presets ? [...sharedConfig.presets, preset] : [preset]
		}
	}

	async function createFreshGenerator(): Promise<UnoGenerator> {
		const uno = await createGenerator()
		await uno.setConfig(sharedConfig, sharedDefaults)
		return uno
	}

	function createContext(uno: UnoGenerator): UnocssPluginContext {
		return {
			ready: Promise.resolve({ config: sharedConfig, sources: [] }),
			uno,
		} as unknown as UnocssPluginContext
	}

	async function transformSvelteFile(code: string, id: string) {
		const uno = await createFreshGenerator()
		const result = await transformSvelte(code, uno, createContext(uno), options, {
			shadcn: shadcnSupportNeeded,
			tailwindVariant: tailwindVariantSupportNeeded,
		})

		if (!result) {
			if (registry.update(id, null)) {
				registry.triggerHMR()
			}
			return
		}

		if (registry.update(id, result.extractedClasses)) {
			registry.triggerHMR()
		}

		return {
			code: result.code.toString(),
			map: result.code.generateMap(),
		}
	}

	async function transformCSSFile(code: string, id: string) {
		const uno = await createFreshGenerator()
		const transformer = transformerDirectives()
		const s = new MagicString(code)

		await transformer.transform(s, id, createContext(uno))

		if (!s.hasChanged()) return

		return {
			code: s.toString(),
			map: s.generateMap(),
		}
	}

	const plugin: Plugin = {
		name: "unocss-svelte-scoped",

		configResolved(config) {
			isSvelteKit = config.plugins.some((p) => p.name?.includes("vite-plugin-sveltekit"))
		},

		configureServer(server: ViteDevServer) {
			registry.setServer(server)

			server.middlewares.use(async (req, res, next) => {
				if (req.url === preflightPath) {
					try {
						const css = await registry.generatePreflightCSS()
						res.setHeader("Content-Type", "text/css")
						res.setHeader("Cache-Control", "no-cache")
						res.end(css)
					} catch (error) {
						console.error("Error generating preflight CSS:", error)
						res.statusCode = 500
						res.end("/* Error generating preflight CSS */")
					}
					return
				}
				next()
			})
		},

		watchChange(id, change) {
			if (change.event === "delete" && id.endsWith(".svelte")) {
				if (registry.update(id, null)) {
					registry.triggerHMR()
				}
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

		async generateBundle() {
			const css = await registry.generatePreflightCSS()
			this.emitFile({
				type: "asset",
				fileName: preflightPath.startsWith("/") ? preflightPath.slice(1) : preflightPath,
				source: css,
			})
		},
	}

	const plugins: PluginOption[] = [plugin]

	if (tailwindcssSupportNeeded) {
		plugins.push(UnoCSSTailwindSupport())
	}

	return plugins
}
