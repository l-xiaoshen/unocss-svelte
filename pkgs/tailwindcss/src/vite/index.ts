import type { Plugin } from "vite"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { parseTailwindThemeToUno } from "../theme"
import { definePreset, type Preset } from "@unocss/core"
import type { Theme } from "@unocss/preset-wind4"
import { transform } from "lightningcss"

export interface TailwindSupportOptions {
	/** Path to the CSS file containing Tailwind theme variables (relative to project root) */
	css?: string
}

export async function UnoCSSTailwindSupport(
	updateDefaults: (preset: Preset<Theme>) => void,
	options: TailwindSupportOptions = {},
): Promise<Plugin> {
	let root: string

	const plugin: Plugin = {
		name: "unocss-svelte-tailwindcss-support",
		configResolved(config) {
			root = config.root
		},
		async buildStart() {
			if (options.css) {
				try {
					const cssPath = resolve(root, options.css)
					const css = await readFile(cssPath, "utf-8")
					const theme = parseTailwindThemeToUno(css)

					const preset = definePreset<Theme>({
						name: "tailwindcss-themes",
						theme,
					})
					updateDefaults(preset)

					console.log("[unocss-tailwindcss] Loaded theme from:", options.css)
				} catch (error) {
					if ((error as NodeJS.ErrnoException).code === "ENOENT") {
						console.warn("[unocss-tailwindcss] CSS file not found:", options.css)
					} else {
						console.error("[unocss-tailwindcss] Error reading CSS file:", error)
					}
				}
			}
		},
		transform: {
			filter: {
				id: /\.css$/,
			},
			handler(code, id, options) {
				const result = transform({
					filename: id,
					code: Buffer.from(code),
					visitor: {
						Rule: {
							import(rule) {
								if (rule.value.url == "tailwindcss") {
									return []
								}
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
