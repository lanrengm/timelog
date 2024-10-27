import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";

const dev = (process.argv[2] === "dev");

const context = await esbuild.context({
	entryPoints: ["src/main.ts"],
	outfile: "main.js",
	bundle: true,
	format: "cjs",
	target: "es2018",
	logLevel: "info",
	sourcemap: dev ? "inline": false,
	treeShaking: true,
	loader: {
		'.svg': 'text'
	},
	external: [
		"obsidian",
		"electron",
		"@codemirror/autocomplete",
		"@codemirror/collab",
		"@codemirror/commands",
		"@codemirror/language",
		"@codemirror/lint",
		"@codemirror/search",
		"@codemirror/state",
		"@codemirror/view",
		"@lezer/common",
		"@lezer/highlight",
		"@lezer/lr",
		...builtins],
});

if (dev) {
	await context.watch();
} else {
	await context.rebuild();
	process.exit(0);
}
