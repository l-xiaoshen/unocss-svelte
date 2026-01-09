/// <reference path="./declarations.d.ts" />

import { parse } from "svelte/compiler"
import { describe, test, expect } from "bun:test"
import { extractClasses } from "./extractClasses"

// Test fixtures
import StaticClassTest from "./test/StaticClass.test.svelte?raw"
import AttributeClassTest from "./test/AttributeClass.test.svelte?raw"
import ClsxClassTest from "./test/ClsxClass.test.svelte?raw"
import ClassDirectiveTest from "./test/ClassDirective.test.svelte?raw"

function getClasses(source: string): string[] {
	const ast = parse(source, { modern: true })
	return extractClasses(ast).map((f) => f.classes)
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
})
