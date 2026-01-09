import type { AST } from "svelte/compiler"
import { walk } from "zimmerframe"
import type { FoundClasses, FragmentChildType, WalkState } from "./types"
import { extractStringConstant } from "./extractStringConstant"

export function extractClasses(ast: AST.Root): FoundClasses[] {
	const foundClasses: FoundClasses[] = []
	for (const node of ast.fragment.nodes) {
		foundClasses.push(...extractClassesInMarkup(node))
	}
	return foundClasses
}

export function extractClassesInMarkup(ast: FragmentChildType): FoundClasses[] {
	type SvelteASTType = AST.SvelteNode & AST.BaseNode

	const foundClasses: FoundClasses[] = []

	walk(ast as SvelteASTType, {} as WalkState, {
		Attribute(node) {
			if (node.name !== "class") {
				return
			}

			if (node.value === true) {
				return
			}

			if (Array.isArray(node.value)) {
				for (const value of node.value) {
					if (value.type === "Text") {
						foundClasses.push({
							start: value.start,
							end: value.end,
							classes: value.data,
						})
					} else if (value.type === "ExpressionTag") {
						foundClasses.push(...extractStringConstant(value))
					}
				}
				return
			}

			if (node.value.type === "ExpressionTag") {
				foundClasses.push(...extractStringConstant(node.value))
				return
			}

			console.error(`Unexpected attribute value type: ${node.value.type}`)
		},
		ClassDirective(node) {
			type Position = { character: number }
			type NameLoc = { start: Position; end: Position }

			const name_loc = node.name_loc as NameLoc | null | undefined
			if (!name_loc) {
				console.error(`Unexpected class directive name location: ${node.name_loc}`)
				return
			}

			foundClasses.push({
				start: name_loc.start.character,
				end: name_loc.end.character,
				classes: node.name,
			})
		},
	})

	return foundClasses.filter((f) => f.classes !== "")
}
