import type { UnoGenerator, UnocssPluginContext } from "@unocss/core"
import MagicString from "magic-string"
import { parse } from "svelte/compiler"
import { extractClasses } from "./extractClasses"
import { transformMarkupClasses, transformStyleDirectives } from "./css"
import type { UnoCSSSvelteScopedOptions } from ".."
import type { ExtractOptions } from "./types"

export { hash } from "./hash"

export async function transformSvelte(
	code: string,
	uno: UnoGenerator,
	unoCtx: UnocssPluginContext,
	options: UnoCSSSvelteScopedOptions,
	extractOptions: ExtractOptions = {},
) {
	const ast = parse(code, { modern: true })
	const classes = extractClasses(ast, extractOptions)

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
		const preflightCSS = await generatePreflights(uno)
		injectCSS(string, ast.css.content, preflightCSS, generatedCSS)
	} else {
		const preflightCSS = await generatePreflights(uno)
		appendStyleBlock(string, preflightCSS, generatedCSS)
	}

	//this is for dev
	string.append(`\n\n${classes.map((c) => `<!-- ${c.classes} -->`).join("\n")}`)

	return string
}

async function generatePreflights(uno: UnoGenerator) {
	const { css } = await uno.generate("", {
		preflights: false,
		minify: false,
		safelist: false,
	})
	return css?.trim() ? css : null
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
