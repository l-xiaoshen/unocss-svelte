import { parse } from "css-tree"
import { walk } from "zimmerframe"
import type { Theme } from "@unocss/preset-wind4"

export type ThemeDeclaration = {
	property: string
	value: string
}

export type ParsedThemeProperty = {
	namespace: TailwindNamespace
	name: string
}

/**
 * Tailwind CSS theme namespaces mapped to UnoCSS Theme keys
 */
const TAILWIND_NAMESPACE_MAP = {
	color: "colors",
	font: "font",
	text: "text",
	"font-weight": "fontWeight",
	tracking: "tracking",
	leading: "leading",
	breakpoint: "breakpoint",
	container: "container",
	spacing: "spacing",
	radius: "radius",
	shadow: "shadow",
	"inset-shadow": "insetShadow",
	"drop-shadow": "dropShadow",
	blur: "blur",
	perspective: "perspective",
	aspect: "aspect",
	ease: "ease",
	animate: "animate",
} as const

type TailwindNamespace = keyof typeof TAILWIND_NAMESPACE_MAP
type UnoThemeKey = (typeof TAILWIND_NAMESPACE_MAP)[TailwindNamespace]

/**
 * Ordered list of namespaces for matching (longer prefixes first)
 */
const NAMESPACE_PREFIXES: TailwindNamespace[] = [
	"font-weight",
	"inset-shadow",
	"drop-shadow",
	"breakpoint",
	"container",
	"perspective",
	"tracking",
	"leading",
	"spacing",
	"animate",
	"shadow",
	"aspect",
	"color",
	"radius",
	"blur",
	"ease",
	"font",
	"text",
]

/**
 * Parse a Tailwind CSS theme property like `--color-red-500` into namespace and name
 */
export function parseThemeProperty(property: string): ParsedThemeProperty | null {
	if (!property.startsWith("--")) return null

	const withoutPrefix = property.slice(2)

	for (const namespace of NAMESPACE_PREFIXES) {
		if (withoutPrefix.startsWith(`${namespace}-`)) {
			const name = withoutPrefix.slice(namespace.length + 1)
			if (name) {
				return { namespace, name }
			}
		}
	}

	return null
}

/**
 * Parse CSS string and extract all declarations from @theme blocks
 */
export function parseTailwindCSSThemes(css: string): ThemeDeclaration[] {
	const tree = parse(css, {
		positions: true,
	})

	if (tree.type !== "StyleSheet") {
		throw new Error("Unexpected tree type")
	}

	const declarations: ThemeDeclaration[] = []

	for (const node of tree.children) {
		walk(
			node,
			{},
			{
				StyleSheet(node, { next }) {
					next()
				},
				Atrule(node, { next }) {
					if (node.name !== "theme") {
						return
					}
					next()
				},
				Block(node, { visit }) {
					for (const child of node.children) {
						visit(child)
					}
				},
				Declaration(node) {
					if (node.value.type !== "Raw") {
						throw new Error("Unexpected value type")
					}

					declarations.push({
						property: node.property,
						value: node.value.value,
					})
				},
			},
		)
	}

	return declarations
}

/**
 * Convert Tailwind CSS theme declarations to UnoCSS Theme object
 */
export function toUnoTheme(declarations: ThemeDeclaration[]): Theme {
	const theme: Theme = {}

	for (const { property, value } of declarations) {
		const parsed = parseThemeProperty(property)
		if (!parsed) continue

		const { namespace, name } = parsed
		const unoKey = TAILWIND_NAMESPACE_MAP[namespace]

		switch (unoKey) {
			case "colors":
				theme.colors ??= {}
				setNestedColor(theme.colors, name, value)
				break

			case "font":
				theme.font ??= {}
				theme.font[name] = value
				break

			case "text":
				theme.text ??= {}
				theme.text[name] ??= {}
				theme.text[name].fontSize = value
				break

			case "fontWeight":
				theme.fontWeight ??= {}
				theme.fontWeight[name] = value
				break

			case "tracking":
				theme.tracking ??= {}
				theme.tracking[name] = value
				break

			case "leading":
				theme.leading ??= {}
				theme.leading[name] = value
				break

			case "breakpoint":
				theme.breakpoint ??= {}
				theme.breakpoint[name] = value
				break

			case "container":
				theme.container ??= {}
				theme.container[name] = value
				break

			case "spacing":
				theme.spacing ??= {}
				theme.spacing[name] = value
				break

			case "radius":
				theme.radius ??= {}
				theme.radius[name] = value
				break

			case "shadow":
				theme.shadow ??= {}
				theme.shadow[name] = value
				break

			case "insetShadow":
				theme.insetShadow ??= {}
				theme.insetShadow[name] = value
				break

			case "dropShadow":
				theme.dropShadow ??= {}
				theme.dropShadow[name] = value
				break

			case "blur":
				theme.blur ??= {}
				theme.blur[name] = value
				break

			case "perspective":
				theme.perspective ??= {}
				theme.perspective[name] = value
				break

			case "ease":
				theme.ease ??= {}
				theme.ease[name] = value
				break

			case "animate":
				theme.animate ??= {}
				theme.animate[name] = value
				break

			case "aspect":
				// aspect is not directly in Theme type
				// could be handled via extendTheme or custom property
				break
		}
	}

	return theme
}

/**
 * Set a potentially nested color value
 * e.g., "red-500" becomes { red: { 500: value } }
 * e.g., "sidebar-foreground" becomes { sidebar: { foreground: value } }
 */
function setNestedColor(colors: Record<string, any>, name: string, value: string): void {
	const parts = name.split("-")

	if (parts.length <= 1) {
		colors[name] = value
		return
	}

	// Check if last part looks like a shade (number or known suffix)
	const lastPart = parts.at(-1)!
	const isShade = /^\d+$/.test(lastPart) || ["foreground", "DEFAULT"].includes(lastPart)

	if (isShade) {
		const colorName = parts.slice(0, -1).join("-")
		const shade = lastPart

		if (typeof colors[colorName] === "string") {
			// Convert existing string to object with DEFAULT
			const existing = colors[colorName]
			colors[colorName] = { DEFAULT: existing }
		}

		colors[colorName] ??= {}
		if (typeof colors[colorName] === "object") {
			colors[colorName][shade] = value
		}
	} else {
		// Treat as flat color name
		colors[name] = value
	}
}

/**
 * Parse Tailwind CSS and convert directly to UnoCSS Theme
 */
export function parseTailwindThemeToUno(css: string): Theme {
	const declarations = parseTailwindCSSThemes(css)
	return toUnoTheme(declarations)
}
