/// <reference path="./declarations.d.ts" />

import { describe, expect, test } from "bun:test"
import { parse } from "svelte/compiler"
import { extractClasses } from "./extractClasses"

// Test fixtures
import AttributeClassTest from "./test/AttributeClass.test.svelte?raw"
import ClassDirectiveTest from "./test/ClassDirective.test.svelte?raw"
import ClsxClassTest from "./test/ClsxClass.test.svelte?raw"
import StaticClassTest from "./test/StaticClass.test.svelte?raw"
import StyleAtRuleTest from "./test/StyleAtRule.test.svelte?raw"
import CNCompatTest from "./test/CNCompat.test.svelte?raw"

function getClasses(source: string): string[] {
	const ast = parse(source, { modern: true })
	return extractClasses(ast, {
		tailwindVariant: true,
		shadcn: true,
	}).map((f) => f.classes)
}

describe("extractClasses", () => {
	test("StaticClass - simple static class attributes", () => {
		expect(getClasses(StaticClassTest)).toEqual(["a b c", "d e f g h", "\n    i\n    j\n    k\n"])
	})

	test("AttributeClass - attribute class attributes", () => {
		expect(getClasses(AttributeClassTest)).toEqual(["a", "b", "c", "d", "e ", " ", "f", "g ", "h "])
	})

	test("ClsxClass - clsx class attributes", () => {
		expect(getClasses(ClsxClassTest)).toEqual(["a", "b", "c d", "e f", "g"])
	})

	test("ClassDirective - class directive attributes", () => {
		expect(getClasses(ClassDirectiveTest)).toEqual(["a", "b"])
	})

	test("StyleAtRule - style at rule attributes", () => {
		expect(getClasses(StyleAtRuleTest)).toEqual(["a b c d e f g h i j k l m n o p q r s t u v w x y z"])
	})

	test("CNCompat", () => {
		expect(getClasses(CNCompatTest)).toEqual(["a b c", "d e f", "g h i", "j k l", "m n o"])
	})
})
