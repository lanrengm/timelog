import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";
import fs from 'fs';
import AdmZip from 'adm-zip';

const dev = (process.argv[2] === "dev");

const context = await esbuild.context({
  entryPoints: ["src/main.ts"],
  outfile: dev ? "main.js" : "dist/main.js",
  bundle: true,
  format: "cjs",
  target: "es2018",
  logLevel: "info",
  sourcemap: dev ? "inline" : false,
  minify: dev ? false : true,
  treeShaking: dev ? false : true,
  loader: {
    '.svg': 'text',
    '.html': 'text',
  },
  define: {
    DEV: dev ? "null" : "true"
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
  fs.copyFileSync('./manifest.json', './dist/manifest.json');
  if (fs.existsSync('./styles.css')) fs.copyFileSync('./styles.css', './dist/styles.css');
  const distZip = new AdmZip();
  
  distZip.addLocalFile('dist/manifest.json');
  distZip.addLocalFile('dist/styles.css');
  distZip.addLocalFile('dist/main.js');
  distZip.writeZip('dist/obsidian-timelog.zip');
  process.exit(0);
}
