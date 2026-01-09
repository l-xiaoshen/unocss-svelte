import type { UnoGenerator } from "@unocss/core"
import MagicString from "magic-string"
import { parse } from "svelte/compiler"
import { extractClasses } from "./extractClasses"
import { transform, type Selector, type SelectorComponent } from "lightningcss"
import type { UnoCSSSvelteScopedOptions } from ".."

// from @unocss/transformer-compile-class
export function hash(str: string) {
	let i
	let l
	let hval = 0x811c9dc5

	for (i = 0, l = str.length; i < l; i++) {
		hval ^= str.charCodeAt(i)
		hval += (hval << 1) + (hval << 4) + (hval << 7) + (hval << 8) + (hval << 24)
	}
	return `00000${(hval >>> 0).toString(36)}`.slice(-6)
}

export async function transformSvelte(code: string, uno: UnoGenerator, options: UnoCSSSvelteScopedOptions) {
	const ast = parse(code, { modern: true })
	const classes = extractClasses(ast)

	if (classes.length === 0) {
		return null
	}

	const allClasses = classes.map((c) => c.classes).join(" ")
	const result = await uno.generate(allClasses, {
		preflights: false,
		minify: false,
		safelist: true,
	})

	result.layers = result.layers.filter((l) => result.getLayer(l)?.trim() !== "")

	if (result.layers.length === 0) {
		return null
	}

	const cssString = options.generateLayers
		? result.layers.map((l) => `@layer ${l} \n{\n${result.getLayer(l)}\n}`).join("\n")
		: result.css

	const { code: cssCode } = transform({
		filename: "style.css",
		code: Buffer.from(cssString),
		visitor: {
			Selector(selector) {
				if (!needTransformSelector(selector, result.matched)) {
					return
				}
				return selector.map<SelectorComponent>((s) => {
					if (isClassSelector(s) && result.matched.has(s.name)) {
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
			},
		},
	})

	const string = new MagicString(code)

	if (ast.css) {
		string.appendRight(ast.css.content.end, `\n${cssCode.toString()}\n`)
	} else {
		string.append(`<style>\n${cssCode.toString()}\n</style>`)
	}

	return string
}

function isClassSelector(selector: SelectorComponent): selector is SelectorComponent & { type: "class" } {
	return selector.type === "class"
}

function needTransformSelector(selector: Selector, matchedClasses: Set<string>) {
	if (selector.some((s) => s.type === "class" && matchedClasses.has(s.name))) {
		return true
	}

	return false
}
