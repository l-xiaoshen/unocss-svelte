import type { Expression, Node as ESTreeNode } from "estree"
import type { Node } from "acorn"
import type { AST } from "svelte/compiler"

export type FoundClasses = {
	start: number
	end: number
	classes: string
	type?: "literal" | "clsx_object_key" | "class_directive"
}

export type FragmentChildType = AST.Fragment["nodes"][number]

export type WalkState = {}

export type ASTType = Expression & AST.BaseNode & AST.SvelteNode & Node
