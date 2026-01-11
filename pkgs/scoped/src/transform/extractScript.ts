import type { AST } from "svelte/compiler"
import { walk } from "zimmerframe"
import type { FoundClasses } from "./types"

type Path = (string | { type: "array" } | { type: "wildcard" })[]

const supportedLiteralParentPath: Path[] = [
	["base"],
	["variants", { type: "wildcard" }, { type: "wildcard" }],
	["slots", { type: "wildcard" }],
	["compoundVariants", { type: "array" }, "class"],
	["compoundSlots", { type: "array" }, "class"],
]

type State = {
	path?: Path
}

function comparePath(pattern: Path, actualPath: Path): boolean {
	if (pattern.length !== actualPath.length) {
		return false
	}

	return pattern.every((segment, i) => {
		const actualSegment = actualPath[i]

		// Wildcard in pattern matches any string in actual path
		if (typeof segment === "object" && segment.type === "wildcard") {
			return typeof actualSegment === "string"
		}

		// Both strings - exact match required
		if (typeof segment === "string" && typeof actualSegment === "string") {
			return segment === actualSegment
		}

		// Both objects - types must match (e.g., array === array)
		if (typeof segment === "object" && typeof actualSegment === "object") {
			return segment.type === actualSegment.type
		}

		return false
	})
}

export function extractTVClassesLiteral(node: AST.Script) {
	const foundClasses: FoundClasses[] = []

	type NodeType = AST.BaseNode & AST.SvelteNode

	walk(node as NodeType, {} as State, {
		Literal(node, { state }) {
			const currentPath = state.path
			if (!currentPath) {
				return
			}
			const pathMatch = supportedLiteralParentPath.some((p) => comparePath(p, currentPath))
			if (pathMatch && typeof node.value === "string") {
				foundClasses.push({
					start: node.start,
					end: node.end,
					classes: node.value,
					type: "literal",
				})
			}
		},
		CallExpression(node, { next }) {
			if (node.callee.type === "Identifier" && node.callee.name === "tv") {
				next({
					path: [],
				})
			}
		},
		ObjectExpression(node, { next, state, stop }) {
			if (!state.path) {
				return stop()
			}

			next({
				...state,
			})
		},
		Property(node, { next, state, stop, visit }) {
			if (!state.path) {
				return stop()
			}

			const key = node.key

			if (key.type === "Identifier") {
				visit(node.value as NodeType, {
					path: [...state.path, key.name],
				})
				return
			}

			if (key.type === "Literal" && typeof key.value === "string") {
				visit(node.value as NodeType, {
					path: [...state.path, key.value],
				})
				return
			}

			return stop()
		},
		ArrayExpression(node, { next, state, stop }) {
			if (!state.path) {
				return stop()
			}

			next({
				path: [...state.path, { type: "array" }],
			})
		},
	})

	return foundClasses
}
