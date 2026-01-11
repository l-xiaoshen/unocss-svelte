import { UnoCSSSvelteScoped } from "@unocss-svelte/scoped"
import { sveltekit } from "@sveltejs/kit/vite"
import { defineConfig } from "vite"

export default defineConfig({
	plugins: [UnoCSSSvelteScoped({ css: "src/routes/layout.css" }), sveltekit()],
})
