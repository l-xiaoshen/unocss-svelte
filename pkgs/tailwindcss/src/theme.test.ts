import { test, expect, describe } from "bun:test"
import { parseThemeProperty, parseTailwindCSSThemes, toUnoTheme, parseTailwindThemeToUno } from "."

describe("parseThemeProperty", () => {
	test("parses color namespace", () => {
		expect(parseThemeProperty("--color-red-500")).toEqual({
			namespace: "color",
			name: "red-500",
		})
	})

	test("parses font namespace", () => {
		expect(parseThemeProperty("--font-sans")).toEqual({
			namespace: "font",
			name: "sans",
		})
	})

	test("parses text namespace", () => {
		expect(parseThemeProperty("--text-xl")).toEqual({
			namespace: "text",
			name: "xl",
		})
	})

	test("parses font-weight namespace", () => {
		expect(parseThemeProperty("--font-weight-bold")).toEqual({
			namespace: "font-weight",
			name: "bold",
		})
	})

	test("parses tracking namespace", () => {
		expect(parseThemeProperty("--tracking-wide")).toEqual({
			namespace: "tracking",
			name: "wide",
		})
	})

	test("parses leading namespace", () => {
		expect(parseThemeProperty("--leading-tight")).toEqual({
			namespace: "leading",
			name: "tight",
		})
	})

	test("parses breakpoint namespace", () => {
		expect(parseThemeProperty("--breakpoint-sm")).toEqual({
			namespace: "breakpoint",
			name: "sm",
		})
	})

	test("parses container namespace", () => {
		expect(parseThemeProperty("--container-sm")).toEqual({
			namespace: "container",
			name: "sm",
		})
	})

	test("parses spacing namespace", () => {
		expect(parseThemeProperty("--spacing-4")).toEqual({
			namespace: "spacing",
			name: "4",
		})
	})

	test("parses radius namespace", () => {
		expect(parseThemeProperty("--radius-sm")).toEqual({
			namespace: "radius",
			name: "sm",
		})
	})

	test("parses shadow namespace", () => {
		expect(parseThemeProperty("--shadow-md")).toEqual({
			namespace: "shadow",
			name: "md",
		})
	})

	test("parses inset-shadow namespace", () => {
		expect(parseThemeProperty("--inset-shadow-xs")).toEqual({
			namespace: "inset-shadow",
			name: "xs",
		})
	})

	test("parses drop-shadow namespace", () => {
		expect(parseThemeProperty("--drop-shadow-md")).toEqual({
			namespace: "drop-shadow",
			name: "md",
		})
	})

	test("parses blur namespace", () => {
		expect(parseThemeProperty("--blur-md")).toEqual({
			namespace: "blur",
			name: "md",
		})
	})

	test("parses perspective namespace", () => {
		expect(parseThemeProperty("--perspective-near")).toEqual({
			namespace: "perspective",
			name: "near",
		})
	})

	test("parses aspect namespace", () => {
		expect(parseThemeProperty("--aspect-video")).toEqual({
			namespace: "aspect",
			name: "video",
		})
	})

	test("parses ease namespace", () => {
		expect(parseThemeProperty("--ease-out")).toEqual({
			namespace: "ease",
			name: "out",
		})
	})

	test("parses animate namespace", () => {
		expect(parseThemeProperty("--animate-spin")).toEqual({
			namespace: "animate",
			name: "spin",
		})
	})
})

describe("parseTailwindCSSThemes", () => {
	test("extracts declarations from @theme block", () => {
		const css = `
@theme inline {
    --radius-sm: calc(var(--radius) - 4px);
    --color-primary: #3490dc;
}
`
		const declarations = parseTailwindCSSThemes(css)
		expect(declarations).toEqual([
			{ property: "--radius-sm", value: " calc(var(--radius) - 4px)" },
			{ property: "--color-primary", value: " #3490dc" },
		])
	})

	test("ignores non-theme at-rules", () => {
		const css = `
@media (min-width: 768px) {
    .test { color: red; }
}
@theme {
    --color-test: blue;
}
`
		const declarations = parseTailwindCSSThemes(css)
		expect(declarations).toEqual([{ property: "--color-test", value: " blue" }])
	})
})

describe("toUnoTheme", () => {
	test("converts color declarations to nested structure", () => {
		const declarations = [
			{ property: "--color-red-500", value: "#ef4444" },
			{ property: "--color-red-600", value: "#dc2626" },
			{ property: "--color-primary", value: "#3490dc" },
			{ property: "--color-sidebar-foreground", value: "var(--sidebar-foreground)" },
		]

		const theme = toUnoTheme(declarations)
		expect(theme.colors).toEqual({
			red: {
				"500": "#ef4444",
				"600": "#dc2626",
			},
			primary: "#3490dc",
			sidebar: {
				foreground: "var(--sidebar-foreground)",
			},
		})
	})

	test("converts font declarations", () => {
		const declarations = [
			{ property: "--font-sans", value: "ui-sans-serif, system-ui" },
			{ property: "--font-mono", value: "ui-monospace" },
		]

		const theme = toUnoTheme(declarations)
		expect(theme.font).toEqual({
			sans: "ui-sans-serif, system-ui",
			mono: "ui-monospace",
		})
	})

	test("converts text declarations", () => {
		const declarations = [
			{ property: "--text-sm", value: "0.875rem" },
			{ property: "--text-xl", value: "1.25rem" },
		]

		const theme = toUnoTheme(declarations)
		expect(theme.text).toEqual({
			sm: { fontSize: "0.875rem" },
			xl: { fontSize: "1.25rem" },
		})
	})

	test("converts fontWeight declarations", () => {
		const declarations = [
			{ property: "--font-weight-bold", value: "700" },
			{ property: "--font-weight-semibold", value: "600" },
		]

		const theme = toUnoTheme(declarations)
		expect(theme.fontWeight).toEqual({
			bold: "700",
			semibold: "600",
		})
	})

	test("converts spacing declarations", () => {
		const declarations = [
			{ property: "--spacing-4", value: "1rem" },
			{ property: "--spacing-8", value: "2rem" },
		]

		const theme = toUnoTheme(declarations)
		expect(theme.spacing).toEqual({
			"4": "1rem",
			"8": "2rem",
		})
	})

	test("converts radius declarations", () => {
		const declarations = [
			{ property: "--radius-sm", value: "0.125rem" },
			{ property: "--radius-lg", value: "0.5rem" },
		]

		const theme = toUnoTheme(declarations)
		expect(theme.radius).toEqual({
			sm: "0.125rem",
			lg: "0.5rem",
		})
	})

	test("converts shadow declarations", () => {
		const declarations = [
			{ property: "--shadow-sm", value: "0 1px 2px rgba(0,0,0,0.05)" },
			{ property: "--shadow-md", value: "0 4px 6px rgba(0,0,0,0.1)" },
		]

		const theme = toUnoTheme(declarations)
		expect(theme.shadow).toEqual({
			sm: "0 1px 2px rgba(0,0,0,0.05)",
			md: "0 4px 6px rgba(0,0,0,0.1)",
		})
	})

	test("converts breakpoint declarations", () => {
		const declarations = [
			{ property: "--breakpoint-sm", value: "640px" },
			{ property: "--breakpoint-md", value: "768px" },
		]

		const theme = toUnoTheme(declarations)
		expect(theme.breakpoint).toEqual({
			sm: "640px",
			md: "768px",
		})
	})

	test("converts inset-shadow declarations", () => {
		const declarations = [{ property: "--inset-shadow-xs", value: "inset 0 1px 1px rgba(0,0,0,0.05)" }]

		const theme = toUnoTheme(declarations)
		expect(theme.insetShadow).toEqual({
			xs: "inset 0 1px 1px rgba(0,0,0,0.05)",
		})
	})

	test("converts drop-shadow declarations", () => {
		const declarations = [{ property: "--drop-shadow-md", value: "drop-shadow(0 4px 3px rgba(0,0,0,0.1))" }]

		const theme = toUnoTheme(declarations)
		expect(theme.dropShadow).toEqual({
			md: "drop-shadow(0 4px 3px rgba(0,0,0,0.1))",
		})
	})

	test("converts blur declarations", () => {
		const declarations = [
			{ property: "--blur-sm", value: "4px" },
			{ property: "--blur-md", value: "12px" },
		]

		const theme = toUnoTheme(declarations)
		expect(theme.blur).toEqual({
			sm: "4px",
			md: "12px",
		})
	})

	test("converts ease declarations", () => {
		const declarations = [
			{ property: "--ease-in", value: "cubic-bezier(0.4, 0, 1, 1)" },
			{ property: "--ease-out", value: "cubic-bezier(0, 0, 0.2, 1)" },
		]

		const theme = toUnoTheme(declarations)
		expect(theme.ease).toEqual({
			in: "cubic-bezier(0.4, 0, 1, 1)",
			out: "cubic-bezier(0, 0, 0.2, 1)",
		})
	})

	test("converts animate declarations", () => {
		const declarations = [{ property: "--animate-spin", value: "spin 1s linear infinite" }]

		const theme = toUnoTheme(declarations)
		expect(theme.animate).toEqual({
			spin: "spin 1s linear infinite",
		})
	})
})

describe("parseTailwindThemeToUno", () => {
	test("parses full CSS to UnoCSS theme", () => {
		const css = `
@theme inline {
    --radius-sm: calc(var(--radius) - 4px);
    --radius-md: calc(var(--radius) - 2px);
    --radius-lg: var(--radius);
    --color-background: var(--background);
    --color-foreground: var(--foreground);
    --color-primary: var(--primary);
    --color-primary-foreground: var(--primary-foreground);
    --spacing-4: 1rem;
    --font-sans: ui-sans-serif, system-ui;
    --text-sm: 0.875rem;
    --font-weight-bold: 700;
    --breakpoint-sm: 640px;
    --shadow-md: 0 4px 6px rgba(0,0,0,0.1);
    --ease-out: cubic-bezier(0, 0, 0.2, 1);
}
`

		const theme = parseTailwindThemeToUno(css)

		expect(theme.radius).toEqual({
			sm: " calc(var(--radius) - 4px)",
			md: " calc(var(--radius) - 2px)",
			lg: " var(--radius)",
		})

		expect(theme.colors).toEqual({
			background: " var(--background)",
			foreground: " var(--foreground)",
			primary: {
				DEFAULT: " var(--primary)",
				foreground: " var(--primary-foreground)",
			},
		})

		expect(theme.spacing).toEqual({ "4": " 1rem" })
		expect(theme.font).toEqual({ sans: " ui-sans-serif, system-ui" })
		expect(theme.text).toEqual({ sm: { fontSize: " 0.875rem" } })
		expect(theme.fontWeight).toEqual({ bold: " 700" })
		expect(theme.breakpoint).toEqual({ sm: " 640px" })
		expect(theme.shadow).toEqual({ md: " 0 4px 6px rgba(0,0,0,0.1)" })
		expect(theme.ease).toEqual({ out: " cubic-bezier(0, 0, 0.2, 1)" })
	})

	test("unsupported properties are ignored", () => {
		const css = `
@theme inline {
    --border: oklch(0.929 0.013 255.508);
}
`
		const theme = parseTailwindThemeToUno(css)
		expect(theme.colors).toEqual({
			border: " oklch(0.929 0.013 255.508)",
		})
	})
})
