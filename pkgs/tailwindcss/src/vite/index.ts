import { definePreset, type Preset } from "@unocss/core"
import type { Theme } from "@unocss/preset-wind4"
import { transform } from "lightningcss"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import type { Plugin } from "vite"
import { parseTailwindThemeToUno } from "../theme"

export interface TailwindSupportOptions {
	/** Path to the CSS file containing Tailwind theme variables (relative to project root) */
	css?: string
}

/**
 * Load a Tailwind CSS theme file and return a UnoCSS preset.
 * @param cssPath - Path to the CSS file (relative to cwd or absolute)
 * @returns A UnoCSS preset with the parsed theme, or undefined if loading fails
 */
export async function loadTailwindThemePreset(cssPath: string): Promise<Preset<Theme> | undefined> {
	try {
		const resolvedPath = resolve(process.cwd(), cssPath)
		const css = await readFile(resolvedPath, "utf-8")
		const theme = parseTailwindThemeToUno(css)

		const preset = definePreset<Theme>({
			name: "tailwindcss-themes",
			theme,
		})

		console.log("[unocss-tailwindcss] Loaded theme from:", cssPath)
		return preset
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			console.warn("[unocss-tailwindcss] CSS file not found:", cssPath)
		} else {
			console.error("[unocss-tailwindcss] Error reading CSS file:", error)
		}
		return undefined
	}
}

export async function UnoCSSTailwindSupport(options: TailwindSupportOptions = {}): Promise<Plugin> {
	// if (options.css) {
	// 	const preset = await loadTailwindThemePreset(options.css)
	// 	if (preset) {
	// 		updateDefaults(preset)
	// 	}
	// }

	const plugin: Plugin = {
		name: "unocss-svelte-tailwindcss-support",
		transform: {
			filter: {
				id: /\.css$/,
			},
			order: "pre",
			handler(code, id, options) {
				const uri = new URL(id, "file://")

				if (!uri.pathname.endsWith(".css")) {
					return
				}

				const result = transform({
					filename: id,
					code: Buffer.from(code),
					minify: false,
					customAtRules: {
						theme: {
							body: "declaration-list",
							prelude: "<custom-ident>",
						},
					},
					visitor: {
						Rule: {
							import(rule) {
								if (rule.value.url == "tailwindcss" || rule.value.url == "tw-animate-css") {
									return []
								}
							},
							custom: {
								theme(rule) {
									return []
								},
							},
						},
					},
				})

				return {
					code: result.code.toString(),
					map: result.map ? result.map.toString() : undefined,
				}
			},
		},
	}

	return plugin
}
