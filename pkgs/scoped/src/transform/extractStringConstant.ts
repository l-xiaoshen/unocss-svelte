import type { AST } from "svelte/compiler"
import { walk, type Visitors } from "zimmerframe"
import type { ASTType, FoundClasses, WalkState } from "./types"

export function extractStringConstant(node: AST.ExpressionTag): FoundClasses[] {
	const foundClasses: FoundClasses[] = []

	const visitor: Visitors<ASTType, WalkState> = {
		_(node, { next, stop, path }) {
			if (isPathAllKnown(path)) {
				next()
			} else {
				stop()
			}
		},
		ConditionalExpression(node, { next }) {
			next()
		},
		LogicalExpression(node, { next }) {
			next()
		},
		Literal(node) {
			foundClasses.push({
				start: node.start,
				end: node.end,
				classes: String(node.value),
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
		return path.every((node) => visitorKeys.includes(node.type))
	}

	walk(node.expression as ASTType, {} as WalkState, visitor)

	return foundClasses
}
