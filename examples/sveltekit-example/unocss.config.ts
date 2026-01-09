import presetWind4, { type Theme } from "@unocss/preset-wind4"
import { defineConfig } from "unocss"

export default defineConfig<Theme>({
	presets: [presetWind4()],
})
