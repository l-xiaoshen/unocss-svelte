import { definePreset, type Preset } from "@unocss/core"
import { type Theme } from "@unocss/preset-wind4"

export type ShadcnSupportOptions = {
	official?: boolean
}

const shadcn = definePreset<ShadcnSupportOptions, Theme>(async () => {
	return {
		name: "shadcn",
	} satisfies Preset<Theme>
})

export { shadcn }
