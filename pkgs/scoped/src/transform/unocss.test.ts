import { createGenerator } from "@unocss/core"
import { describe, test, expect } from "bun:test"
import { presetWind4 } from "@unocss/preset-wind4"

test("unocss", async () => {
	const uno = await createGenerator({
		presets: [
			// @ts-expect-error
			presetWind4(),
		],
	})

	const result = await uno.generate("", {
		preflights: true,
		safelist: false,
		extendedInfo: true,
	})

	console.log(result)

	for (const layer of result.layers) {
		console.log(result.getLayer(layer))
	}
})
