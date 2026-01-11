import { tailwindcss } from "@unocss-svelte/tailwindcss"
import { type Theme } from "@unocss/preset-wind4"
import { defineConfig } from "unocss"

export default defineConfig<Theme>({
	presets: [tailwindcss()],
})
