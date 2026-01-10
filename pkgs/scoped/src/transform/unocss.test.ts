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

	const firstCSS = result.css

	await uno.generate("bg-red-500", {
		preflights: false,
		safelist: false,
		extendedInfo: true,
	})

	await uno.generate("bg-red-500 bg-blue-500", {
		preflights: false,
		safelist: false,
		extendedInfo: true,
	})

	const result2 = await uno.generate("", {
		preflights: true,
		safelist: false,
		extendedInfo: true,
	})

	console.log(firstCSS === result2.css)
	console.log(firstCSS.length, result2.css.length)
})
