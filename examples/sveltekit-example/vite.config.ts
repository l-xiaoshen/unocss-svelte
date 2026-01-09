import { sveltekit } from "@sveltejs/kit/vite"
import { defineConfig } from "vite"
import { UnoCSSSvelteScoped } from "@unocss-svelte/scoped"
import Inspect from "vite-plugin-inspect"

export default defineConfig({
	plugins: [UnoCSSSvelteScoped(), sveltekit(), Inspect()],
	css: {
		// transformer: "lightningcss",
	},
})
