#!/usr/bin/env node

// Upload a folder of images to Cloudflare R2 as a photo album.
//
// Setup (one-time):
//   1. Install wrangler: npm install -g wrangler
//   2. Login: wrangler login
//
// Usage:
//   node upload-album.mjs <local-folder> <album-name>
//
// Example:
//   node upload-album.mjs ~/Photos/steffi-jan steffi-jan

import { execSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"

const BUCKET = process.env.R2_BUCKET || "garden-albums"
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"])

const [, , localDir, albumName] = process.argv

if (!localDir || !albumName) {
  console.error("Usage: node upload-album.mjs <local-folder> <album-name>")
  console.error("Example: node upload-album.mjs ~/Photos/vacation vacation-2025")
  process.exit(1)
}

const resolvedDir = path.resolve(localDir)
if (!fs.existsSync(resolvedDir)) {
  console.error(`Directory not found: ${resolvedDir}`)
  process.exit(1)
}

const files = fs.readdirSync(resolvedDir).filter((f) => {
  const ext = path.extname(f).toLowerCase()
  return IMAGE_EXTENSIONS.has(ext)
})

if (files.length === 0) {
  console.error("No image files found in", resolvedDir)
  process.exit(1)
}

console.log(`\nUploading ${files.length} images to ${BUCKET}/${albumName}/...\n`)

for (const file of files) {
  const localPath = path.join(resolvedDir, file)
  const remotePath = `${albumName}/${file}`
  console.log(`  ${file}`)
  execSync(`wrangler r2 object put "${BUCKET}/${remotePath}" --file "${localPath}"`, {
    stdio: "inherit",
  })
}

// Generate and upload manifest
const manifest = {
  images: files.map((name) => ({ name })),
}

const manifestPath = path.join(resolvedDir, "_manifest.json")
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))

console.log(`\n  manifest.json (${files.length} images)`)
execSync(
  `wrangler r2 object put "${BUCKET}/${albumName}/manifest.json" --file "${manifestPath}" --content-type "application/json"`,
  { stdio: "inherit" },
)

fs.unlinkSync(manifestPath)

console.log(`\nDone! Album "${albumName}" uploaded with ${files.length} images.`)
console.log(`\nIn your note's frontmatter, add:`)
console.log(`  photo_album: ${albumName}`)
