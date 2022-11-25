import commonjs from "@rollup/plugin-commonjs"
import resolve from "@rollup/plugin-node-resolve"
import svelte from "rollup-plugin-svelte"
import { terser } from "rollup-plugin-terser"
import postcss from "rollup-plugin-postcss"
import svg from "rollup-plugin-svg"
import json from "rollup-plugin-json"
import nodePolyfills from "rollup-plugin-polyfill-node"
import copy from "rollup-plugin-copy2"
import tar from "tar"
import fs from "fs"
import pkg from "./package.json"
import crypto from "crypto"
import { validate } from "@budibase/backend-core/plugins"

const ignoredWarnings = [
  "unused-export-let",
  "css-unused-selector",
  "module-script-reactive-declaration",
  "a11y-no-onchange",
]

// Custom plugin to clean the dist folder before building
const clean = () => ({
  buildStart() {
    const dist = "./dist/"
    if (fs.existsSync(dist)) {
      fs.readdirSync(dist).forEach(path => {
        if (path.endsWith(".tar.gz")) {
          fs.unlinkSync(dist + path)
        }
      })
    }
  },
})

// Custom plugin to hash the JS bundle and write it in the schema
const hash = () => ({
  writeBundle() {
    // Generate JS hash
    const fileBuffer = fs.readFileSync("dist/plugin.min.js")
    const hashSum = crypto.createHash("sha1")
    hashSum.update(fileBuffer)
    const hex = hashSum.digest("hex")

    // Read and parse existing schema from dist folder
    const schema = JSON.parse(fs.readFileSync("./dist/schema.json", "utf8"))

    // Write updated schema to dist folder, pretty printed as JSON again
    const newSchema = {
      ...schema,
      hash: hex,
      version: pkg.version,
    }
    fs.writeFileSync("./dist/schema.json", JSON.stringify(newSchema, null, 2))
  },
})

// Custom plugin to bundle up our files after building
const bundle = () => ({
  async writeBundle() {
    const bundleName = `${pkg.name}-${pkg.version}.tar.gz`
    return tar
        .c({ gzip: true, cwd: "dist" }, [
          "plugin.min.js",
          "schema.json",
          "package.json",
        ])
        .pipe(fs.createWriteStream(`dist/${bundleName}`))
  },
})

const validateSchema = () => ({
  buildStart() {
    const schema = fs.readFileSync("schema.json", "utf8")
    validate(JSON.parse(schema))
  }
})

export default {
  input: "index.js",
  output: {
    sourcemap: process.env.ROLLUP_WATCH ? "inline" : false,
    format: "iife",
    file: "dist/plugin.min.js",
    name: "plugin",
    globals: {
      svelte: "svelte",
      "svelte/internal": "svelte_internal",
    },
  },
  external: ["svelte", "svelte/internal"],
  plugins: [
    validateSchema(),
    clean(),
    svelte({
      emitCss: true,
      onwarn: (warning, handler) => {
        // Ignore some warnings
        if (!ignoredWarnings.includes(warning.code)) {
          handler(warning)
        }
      },
    }),
    postcss(),
    commonjs(),
    nodePolyfills(),
    resolve({
      preferBuiltins: true,
      browser: true,
      skip: ["svelte", "svelte/internal"],
    }),
    svg(),
    json(),
    terser(),
    copy({
      assets: ["schema.json", "package.json"],
    }),
    hash(),
    bundle(),
  ],
}
