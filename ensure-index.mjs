// Ensures content/index.md exists before build.
// The Quartz Syncer plugin deletes it because it's not an Obsidian note.
import { existsSync, writeFileSync } from "fs"

const indexPath = "content/index.md"
if (!existsSync(indexPath)) {
  writeFileSync(indexPath, `---\ntitle: Welcome\npublish: true\n---\n\n# Welcome to my Digital Garden\n\nA collection of notes, ideas, and thoughts.\n`)
  console.log("Created missing content/index.md")
}
