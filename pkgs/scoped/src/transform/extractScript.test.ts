import { expect, test } from "bun:test"

import TVCompatTest from "./test/TVCompat.test.svelte?raw"
import { parse } from "svelte/compiler"
import { extractTVClassesLiteral } from "./extractScript"
import type { FoundClasses } from "./types"
import { extractClasses } from "./extractClasses"

test("extractTVClassesLiteral", () => {
	const ast = parse(TVCompatTest, { modern: true })

	const foundClasses: FoundClasses[] = extractClasses(ast, {
		tailwindVariant: true,
	})

	const allClasses = foundClasses.map((f) => f.classes)

	expect(allClasses).toEqual([
		"focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
		"bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs",
		"bg-destructive hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60 text-white shadow-xs",
		"bg-background hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 border shadow-xs",
		"bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-xs",
		"hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
		"text-primary underline-offset-4 hover:underline",
		"h-9 px-4 py-2 has-[>svg]:px-3",
		"h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
		"h-10 rounded-md px-6 has-[>svg]:px-4",
		"size-9",
		"size-8",
		"size-10",
	])
})
