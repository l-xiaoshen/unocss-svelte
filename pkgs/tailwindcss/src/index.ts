import { definePreset, type Preset } from "@unocss/core"
import { presetWind4, type Theme } from "@unocss/preset-wind4"

export {
	parseTailwindCSSThemes,
	parseThemeProperty,
	toUnoTheme,
	parseTailwindThemeToUno,
	type ThemeDeclaration,
	type ParsedThemeProperty,
} from "./theme"

const tailwindcssPreset = definePreset<Theme>(async () => {
	return {
		name: "tailwindcss",
		presets: [presetWind4()],
	} satisfies Preset<Theme>
})

export { tailwindcssPreset as tailwindcss }
