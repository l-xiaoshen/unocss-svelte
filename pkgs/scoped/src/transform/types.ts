import type { Expression, Node as ESTreeNode } from "estree"
import type { Node } from "acorn"
import type { AST } from "svelte/compiler"

export type ExtractOptions = {
	shadcn?: boolean
	tailwindVariant?: boolean
}

export type FoundClassesType = "literal" | "clsx_object_key" | "class_directive" | "style_at_rule"

export type FoundClassInfo = {
	type: "style_at_rule"
}

export type FoundClasses = {
	start: number
	end: number
	classes: string
	type: FoundClassesType
}

export type FragmentChildType = AST.Fragment["nodes"][number]

export type WalkState = {}

export type ASTType = Expression & AST.BaseNode & AST.SvelteNode & Node
