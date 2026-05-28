#!/usr/bin/env node
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/**
 * Verify that naiveui-overrides.ts constants match the values in tokens.css.
 * Run with: node scripts/verify-theme-sync.mjs
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const tokensPath = resolve(root, 'src/renderer/src/assets/tokens.css')
const overridesPath = resolve(root, 'src/renderer/src/theme/naiveui-overrides.ts')

function readFile(path) {
  try {
    return readFileSync(path, 'utf-8')
  } catch (e) {
    console.error(`Error reading ${path}: ${e.message}`)
    process.exit(1)
  }
}

const tokensContent = readFile(tokensPath)
const overridesContent = readFile(overridesPath)

/** Extract a CSS custom property value from tokens.css */
function getTokenValue(name) {
  const regex = new RegExp(`${name}:\\s*([^;]+);`)
  const match = tokensContent.match(regex)
  return match ? match[1].trim() : null
}

/** Extract a const declaration value from the TS file */
function getConstValue(name) {
  const regex = new RegExp(`const\\s+${name}\\s*=\\s*['"\`]([^'"\`]+)['"\`]`)
  const match = overridesContent.match(regex)
  return match ? match[1].trim() : null
}

const checks = [
  { token: '--color-primary', constName: 'PRIMARY' },
  { token: '--color-brand-blue', constName: 'INFO' },
  { token: '--color-success-text', constName: 'SUCCESS' },
  { token: '--color-warning', constName: 'WARNING' },
  { token: '--color-error', constName: 'ERROR' },
  { token: '--color-canvas', constName: 'CANVAS' },
  { token: '--color-surface', constName: 'SURFACE' },
  { token: '--color-ink', constName: 'INK' },
  { token: '--color-stone', constName: 'STONE' },
  { token: '--color-hairline', constName: 'HAIRLINE' },
  { token: '--color-hairline-hover', constName: 'HAIRLINE_HOVER' },
  { token: '--color-brand-blue-200', constName: 'BRAND_BLUE_200' },
  { token: '--color-brand-blue-deep', constName: 'BRAND_BLUE_DEEP' },
  { token: '--color-warning-bg', constName: 'WARNING_BG' },
  { token: '--color-success-bg', constName: 'SUCCESS_BG' },
  { token: '--color-error-bg', constName: 'ERROR_BG' }
]

let mismatches = 0
let missing = 0

console.log('Verifying theme token sync...\n')

for (const { token, constName } of checks) {
  const tokenValue = getTokenValue(token)
  const constValue = getConstValue(constName)

  if (!tokenValue) {
    console.log(`  SKIP: Token ${token} not found in tokens.css`)
    continue
  }

  if (!constValue) {
    console.log(`  MISSING: Constant ${constName} not found in naiveui-overrides.ts`)
    missing++
    continue
  }

  // Normalize: tokens.css may have rgba() while TS uses hex; compare loosely for rgba warning border
  if (tokenValue !== constValue) {
    // Special case: warning border is an rgba expression in CSS but a full border string in TS
    if (token === '--color-warning-border' && constValue.includes(tokenValue)) {
      console.log(`  OK: ${constName} includes ${token} value (border string)`)
      continue
    }

    console.log(`  MISMATCH: ${token} = "${tokenValue}" vs ${constName} = "${constValue}"`)
    mismatches++
  } else {
    console.log(`  OK: ${constName} matches ${token}`)
  }
}

console.log('\n' + '-'.repeat(40))

if (mismatches === 0 && missing === 0) {
  console.log('All checked tokens are in sync.')
  process.exit(0)
} else {
  console.log(`Result: ${mismatches} mismatch(es), ${missing} missing.`)
  process.exit(1)
}
