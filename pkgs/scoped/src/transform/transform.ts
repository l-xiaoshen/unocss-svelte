import type { UnoGenerator, UnocssPluginContext } from "@unocss/core"
import MagicString from "magic-string"
import { parse } from "svelte/compiler"
import { extractClasses } from "./extractClasses"
import { transformMarkupClasses, transformStyleDirectives } from "./css"
import type { UnoCSSSvelteScopedOptions } from ".."
import type { ExtractOptions } from "./types"

export { hash } from "./hash"

export type TransformSvelteResult = {
	code: MagicString
	/** All class strings extracted from this file */
	extractedClasses: Set<string>
}

export async function transformSvelte(
	code: string,
	uno: UnoGenerator,
	unoCtx: UnocssPluginContext,
	options: UnoCSSSvelteScopedOptions,
	extractOptions: ExtractOptions = {},
): Promise<TransformSvelteResult | null> {
	const ast = parse(code, { modern: true })
	const classes = extractClasses(ast, extractOptions)

	// Collect all unique class strings for the registry
	const extractedClasses = new Set<string>()
	for (const c of classes) {
		// Split class strings and add individual classes
		for (const cls of c.classes.split(/\s+/)) {
			if (cls.trim()) {
				extractedClasses.add(cls.trim())
			}
		}
	}

	if (classes.length === 0) {
		return null
	}

	const generatedCSS = await transformMarkupClasses(uno, classes)

	const string = new MagicString(code)

	if (ast.css) {
		const transformedStyles = await transformStyleDirectives(ast.css, unoCtx)
		if (transformedStyles) {
			string.update(ast.css.content.start, ast.css.content.end, transformedStyles)
		}
		// No longer inject preflight CSS per-component - it goes to global /preflight.css
		injectCSS(string, ast.css.content, null, generatedCSS)
	} else {
		// No longer inject preflight CSS per-component - it goes to global /preflight.css
		appendStyleBlock(string, null, generatedCSS)
	}

	//this is for dev
	string.append(`\n\n${classes.map((c) => `<!-- ${c.classes} -->`).join("\n")}`)

	return {
		code: string,
		extractedClasses,
	}
}

function injectCSS(
	string: MagicString,
	content: { start: number; end: number },
	preflightCSS: string | null,
	generatedCSS: string | null,
) {
	if (preflightCSS) {
		string.appendLeft(content.start, `\n/*preflight*/\n:global\n{\n${preflightCSS}\n}\n`)
	}
	if (generatedCSS) {
		string.appendRight(content.end, "\n/*generated*/\n" + generatedCSS.toString())
	}
}

function appendStyleBlock(string: MagicString, preflightCSS: string | null, generatedCSS: string | null) {
	let newCSS = ""

	if (preflightCSS) {
		newCSS += `/*preflight*/\n:global\n{\n${preflightCSS}\n}\n`
	}
	if (generatedCSS) {
		newCSS += generatedCSS.toString()
	}

	if (newCSS) {
		string.append(`\n\n<style>\n${newCSS}\n</style>`)
	}
}
