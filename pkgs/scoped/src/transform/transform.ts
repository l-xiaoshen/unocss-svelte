import type { UnoGenerator, UnocssPluginContext } from "@unocss/core"
import MagicString from "magic-string"
import { parse } from "svelte/compiler"
import { extractClasses } from "./extractClasses"
import { transformMarkupClasses, transformStyleDirectives } from "./css"
import type { UnoCSSSvelteScopedOptions } from ".."

export { hash } from "./hash"

export async function transformSvelte(
	code: string,
	uno: UnoGenerator,
	unoCtx: UnocssPluginContext,
	options: UnoCSSSvelteScopedOptions,
) {
	const ast = parse(code, { modern: true })
	const classes = extractClasses(ast)

	if (classes.length === 0) {
		return null
	}

	const generatedCSS = await transformMarkupClasses(uno, classes)
	const preflightCSS = await generatePreflights(uno)

	const string = new MagicString(code)

	if (ast.css) {
		const transformedStyles = await transformStyleDirectives(ast.css, unoCtx)
		if (transformedStyles) {
			string.update(ast.css.content.start, ast.css.content.end, transformedStyles)
		}
		injectCSS(string, ast.css.content, preflightCSS, generatedCSS)
	} else {
		appendStyleBlock(string, preflightCSS, generatedCSS)
	}

	return string
}

async function generatePreflights(uno: UnoGenerator) {
	const { css } = await uno.generate("", {
		preflights: true,
		minify: false,
		safelist: true,
	})
	return css?.trim() ? css : null
}

function injectCSS(
	string: MagicString,
	content: { start: number; end: number },
	preflightCSS: string | null,
	generatedCSS: Uint8Array | null,
) {
	if (preflightCSS) {
		string.appendLeft(content.start, `\n/*preflight*/\n:global\n{\n${preflightCSS}\n}\n`)
	}
	if (generatedCSS) {
		string.appendRight(content.end, "\n" + generatedCSS.toString())
	}
}

function appendStyleBlock(string: MagicString, preflightCSS: string | null, generatedCSS: Uint8Array | null) {
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
