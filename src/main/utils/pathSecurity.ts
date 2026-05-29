import fs from 'fs'
import path from 'path'

/**
 * Validate that `child` path is strictly inside `parent` directory.
 * Uses fs.realpath to resolve symlinks and path.relative to avoid
 * prefix-matching bypasses on Windows (e.g. C:\...\Tempfake starts with C:\...\Temp).
 *
 * @param parent - The parent directory path
 * @param child - The child path to validate
 * @returns true if child is inside parent, false otherwise
 */
export function isPathInside(parent: string, child: string): boolean {
  try {
    const realParent = fs.realpathSync(parent)
    let realChild: string
    try {
      realChild = fs.realpathSync(child)
    } catch {
      realChild = path.resolve(child)
    }
    const rel = path.relative(realParent, realChild)
    return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel)
  } catch {
    return false
  }
}
