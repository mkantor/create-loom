#!/usr/bin/env node

import * as JSONC from 'comment-json'
import nodeChildProcess from 'node:child_process'
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import * as nodePath from 'node:path'
import { parseArgs } from 'node:util'

const templateDirectory = `${import.meta.dirname}/../template`

// This is overkill for now, but reserves space for future options (because
// `create-loom --foo` is an error).
const { positionals: cliArgs } = parseArgs({
  args: process.argv.slice(2), // remove `execPath` and `filename`
  strict: true,
  allowPositionals: true,
})

if (cliArgs[0] === undefined) {
  throw new Error('Missing required path argument')
}

const path = nodePath.resolve(process.cwd(), cliArgs[0])

/**
 * Create and move to the project directory.
 */
await mkdir(path, { recursive: true })
process.chdir(path)

/**
 * Create `package.json`.
 */
nodeChildProcess.execSync('npm init --yes')

/**
 * Add dependencies.
 */
nodeChildProcess.execSync('npm install --save-dev typescript @types/node')
nodeChildProcess.execSync('npm install @superhighway/silk @superhighway/loom')

/**
 * Copy `src`, `.gitignore`, etc to the project from the template directory.
 */
await cp(templateDirectory, path, { recursive: true })

/**
 * Create `tsconfig.json`.
 */
nodeChildProcess.execSync('npx tsc --init')

/**
 * Edit `tsconfig.json` to add necessary configuration.
 */
type MinimalCompilerOptions = {
  jsx?: string
  jsxFactory?: string
  jsxFragmentFactory?: string
  outDir?: string
  types?: string[]
}
const tsConfigSource = (
  await readFile(`${path}/tsconfig.json`, {
    encoding: 'utf-8',
  })
)
  // Clean up some comments that will be irrelevant after config manipulation:
  .replace('// "outDir": "./dist",\n', '')
  .replace(
    /\/\/ For nodejs:\n\s*\/\/ "lib": \["esnext"\],\n\s*\/\/ "types": \["node"\],\n\s*\/\/ and npm install -D @types\/node\n/,
    '',
  )
const tsConfig = JSONC.parse(tsConfigSource)
if (
  typeof tsConfig !== 'object' ||
  tsConfig === null ||
  !('compilerOptions' in tsConfig)
) {
  throw new Error(
    'TypeScript config was not an object with a `compilerOptions` property',
  )
}
const compilerOptions: unknown = tsConfig['compilerOptions']
if (typeof compilerOptions !== 'object' || compilerOptions === null) {
  throw new Error('TypeScript config `compilerOptions` was not an object')
}
// Note this is still a reference to the property of `tsConfig`.
const assignableCompilerOptions: MinimalCompilerOptions = compilerOptions
// `tsc --init` includes `jsx`, but it's nice to keep all `jsx*` properties
// adjacent, so delete and create a new property of the same name rather than
// updating the extant one.
delete assignableCompilerOptions.jsx
assignableCompilerOptions.jsx = 'react'
assignableCompilerOptions.jsxFactory = 'createElement'
assignableCompilerOptions.jsxFragmentFactory = 'createElement'
assignableCompilerOptions.types = ['node']
assignableCompilerOptions.outDir = 'dist'
const updatedTSConfigSource = JSONC.stringify(tsConfig, null, 2)
await writeFile(`${path}/tsconfig.json`, updatedTSConfigSource)

/**
 * Edit `package.json` to add scripts and other necessary properties.
 */
const scripts = {
  build: 'npm run compile; npm run copy-non-typescript-files',
  clean: 'rm -rf dist* *.tsbuildinfo',
  compile: 'tsc --build',
  'copy-non-typescript-files': './copy-non-typescript-files',
  start: 'npm run clean && npm run build; node .',
}
const packageManifestPath = `${path}/package.json`
const packageManifest = (
  await import(packageManifestPath, {
    with: { type: 'json' },
  })
).default
packageManifest.scripts = scripts
packageManifest.main = 'dist/index.js'
packageManifest.type = 'module'
await writeFile(
  packageManifestPath,
  `${JSON.stringify(packageManifest, null, 2)}\n`,
)
