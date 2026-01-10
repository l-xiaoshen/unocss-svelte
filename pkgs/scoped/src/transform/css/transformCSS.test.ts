import { test } from "bun:test"
import {
	transform,
	type ReturnedDeclaration,
	type ReturnedMediaQuery,
	type ReturnedRule,
	type SelectorComponent,
	type StyleSheet,
} from "lightningcss"

test("transformCSS", () => {
	const css = `

        /* layer: properties */
        @property --un-bg-opacity {
            syntax: "<percentage>";
            inherits: false;
            initial-value: 100%;
        }
        /* layer: default */
        .bg-blue-500 {
            background-color: color-mix(
                in srgb,
                var(--colors-blue-500) var(--un-bg-opacity),
                transparent
            );
        }
        @supports (color: color-mix(in lab, red, red)) {
            .bg-blue-500 {
                background-color: color-mix(
                    in oklab,
                    var(--colors-blue-500) var(--un-bg-opacity),
                    transparent
                );
            }
        }
    `

	let stylesheet: StyleSheet<ReturnedDeclaration, ReturnedMediaQuery>
	transform({
		filename: "style.css",
		code: Buffer.from(css),
		visitor: {
			StyleSheet(s) {
				stylesheet = s
			},
		},
	})
})
