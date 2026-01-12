import type { AST } from "svelte/compiler"
import { walk, type Visitors } from "zimmerframe"
import type { ASTType, ExtractOptions, FoundClasses, WalkState } from "./types"

export function extractStringConstant(node: AST.ExpressionTag, options: ExtractOptions = {}): FoundClasses[] {
	const foundClasses: FoundClasses[] = []

	const visitor: Visitors<ASTType, WalkState> = {
		_(node, { next, stop, path }) {
			if (isPathAllKnown(path)) {
				next()
			}
		},
		ConditionalExpression(node, { next }) {
			next()
		},
		LogicalExpression(node, { next, visit }) {
			next()
		},
		Literal(node) {
			foundClasses.push({
				start: node.start,
				end: node.end,
				classes: String(node.value),
				type: "literal",
			})
		},
		TemplateLiteral(node, { next }) {
			if (node.quasis) {
				for (const quasi of node.quasis) {
					const quasiNode = quasi as typeof quasi & AST.BaseNode
					foundClasses.push({
						start: quasiNode.start,
						end: quasiNode.end,
						classes: quasiNode.value.raw,
						type: "literal",
					})
				}
			}
			next()
		},
		ArrayExpression(node, { next }) {
			next()
		},
		ObjectExpression(node, { next, visit }) {
			for (const property of node.properties) {
				if (property.type !== "Property") {
					continue
				}

				const propertyNode = property as typeof property & AST.BaseNode
				const key = propertyNode.key
				const keyNode = propertyNode.key as typeof key & AST.BaseNode
				if (keyNode.type === "Identifier") {
					foundClasses.push({
						start: keyNode.start,
						end: keyNode.end,
						classes: keyNode.name,
						type: "clsx_object_key",
					})
				} else if (keyNode.type === "Literal") {
					visit(keyNode as ASTType)
				}
			}
			next()
		},
	}

	const visitorKeys = Object.keys(visitor)

	function isPathAllKnown(path: ASTType[]) {
		if (path.length === 0) {
			return true
		}

		for (const node of path) {
			if (visitorKeys.includes(node.type)) {
				continue
			}

			if (options.shadcn && node.type === "CallExpression") {
				if (node.callee.type === "Identifier" && node.callee.name === "cn") {
					continue
				}
			}

			return false
		}

		return true
	}

	walk(node.expression as ASTType, {} as WalkState, visitor)

	return foundClasses
}
