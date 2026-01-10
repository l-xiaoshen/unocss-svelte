import type { UnoGenerator } from "@unocss/core"
import MagicString from "magic-string"
import { parse, type AST, type PreprocessorGroup } from "svelte/compiler"
import { extractClasses } from "./extractClasses"
import { transform, type Selector, type SelectorComponent } from "lightningcss"
import type { UnoCSSSvelteScopedOptions } from ".."
import type { FoundClasses } from "./types"

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

	const appendCSS = await transformSvelteMarkup(uno, classes)

	const string = new MagicString(code)

	const atRules = classes.filter((c): c is FoundClasses & { type: "style_at_rule" } => c.type === "style_at_rule")
	for (const atRule of atRules) {
		console.log(atRule.classes)
		await transformSvelteAtRule(uno, atRule, string)
	}

	const { css: preflightCSS } = await uno.generate("", {
		preflights: true,
		minify: false,
		safelist: true,
	})

	if (ast.css) {
		if (preflightCSS && preflightCSS.trim() !== "") {
			string.appendLeft(ast.css.content.start, `\n:global\n{\n${preflightCSS}\n}\n`)
		}

		if (appendCSS) {
			string.appendRight(ast.css.content.end, "\n" + appendCSS.toString())
		}
	} else {
		let newCSS = ""
		if (preflightCSS && preflightCSS.trim() !== "") {
			newCSS += `:global\n{\n${preflightCSS}\n}\n`
		}

		if (appendCSS) {
			newCSS += appendCSS.toString()
		}

		string.append(`\n\n<style>\n${newCSS}\n</style>`)
	}

	return string
}

async function transformSvelteMarkup(uno: UnoGenerator, classes: FoundClasses[]) {
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

	return cssCode
}

async function transformSvelteAtRule(
	unocss: UnoGenerator,
	atRule: FoundClasses & { type: "style_at_rule" },
	string: MagicString,
) {
	return null //TODO: Implement
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
