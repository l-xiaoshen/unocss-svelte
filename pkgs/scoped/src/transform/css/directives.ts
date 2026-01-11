import type { UnocssPluginContext } from "@unocss/core"
import type { AST } from "svelte/compiler"
import MagicString from "magic-string"
import transformerDirectives from "@unocss/transformer-directives"

/**
 * Transform @apply directives in Svelte style blocks
 */
export async function transformStyleDirectives(ast: AST.CSS.StyleSheet, unoCtx: UnocssPluginContext) {
	const transformer = transformerDirectives()
	const string = new MagicString(ast.content.styles)

	await transformer.transform(string, "virtual.css", unoCtx)

	if (!string.hasChanged()) {
		return null
	}

	return string.toString()
}
