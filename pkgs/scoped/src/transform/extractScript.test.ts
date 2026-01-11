import { expect, test } from "bun:test"

import TVCompatTest from "./test/TVCompat.test.svelte?raw"
import { parse } from "svelte/compiler"
import { extractTVClassesLiteral } from "./extractScript"

test("extractTVClassesLiteral", () => {
	const ast = parse(TVCompatTest, { modern: true })
	if (!ast.instance) {
		return
	}
	const foundClasses = extractTVClassesLiteral(ast.instance).map((f) => f.classes)
	expect(foundClasses).toEqual([
		"font-semibold text-white text-sm py-1 px-4 rounded-full active:opacity-80",
		"bg-blue-500 hover:bg-blue-700",
		"bg-purple-500 hover:bg-purple-700",
		"bg-green-500 hover:bg-green-700",
		"opacity-50 bg-gray-500 pointer-events-none",
		"bg-green-100 text-green-700 dark:text-green-800",
	])
})
