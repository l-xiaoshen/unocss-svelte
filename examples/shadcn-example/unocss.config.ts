import { tailwindcss } from "@unocss-svelte/tailwindcss"
import { type Theme } from "@unocss/preset-wind4"
import { defineConfig } from "unocss"
import { shadcn } from "@unocss-svelte/shadcn"

export default defineConfig<Theme>({
	presets: [shadcn({ official: true }), tailwindcss()],
})
