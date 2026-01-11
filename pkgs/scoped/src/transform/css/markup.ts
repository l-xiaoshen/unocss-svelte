import type { UnoGenerator } from "@unocss/core"
import { transform, type Selector, type SelectorComponent } from "lightningcss"
import type { FoundClasses } from "../types"

/**
 * Transform Svelte markup classes into scoped CSS
 */
export async function transformMarkupClasses(uno: UnoGenerator, classes: FoundClasses[]) {
	const allClasses = classes
		.filter((c) => c.type !== "style_at_rule")
		.map((c) => c.classes)
		.join(" ")

	const result = await uno.generate(allClasses, {
		preflights: false,
		minify: true,
		safelist: false,
	})

	result.layers = result.layers.filter((l) => result.getLayer(l)?.trim() !== "")

	if (result.layers.length === 0) {
		return null
	}

	const cssString = result.css

	const { code: cssCode } = transform({
		filename: "style.css",
		code: Buffer.from(cssString),
		visitor: {
			Selector(selector) {
				if (!needsGlobalWrapper(selector, result.matched)) {
					return
				}
				return wrapSelectorsWithGlobal(selector, result.matched)
			},
		},
	})

	return cssCode
}

function wrapSelectorsWithGlobal(selector: Selector, matchedClasses: Set<string>): Selector {
	return selector.map<SelectorComponent>((s) => {
		if (isClassSelector(s) && matchedClasses.has(s.name)) {
			return {
				type: "pseudo-class",
				kind: "custom-function",
				name: "global",
				arguments: [
					{
						type: "token",
						value: {
							type: "delim",
							value: ".",
						},
					},
					{
						type: "token",
						value: {
							type: "ident",
							value: s.name,
						},
					},
				],
			}
		}
		return s
	})
}

function isClassSelector(selector: SelectorComponent): selector is SelectorComponent & { type: "class" } {
	return selector.type === "class"
}

function needsGlobalWrapper(selector: Selector, matchedClasses: Set<string>) {
	return selector.some((s) => s.type === "class" && matchedClasses.has(s.name))
}
