import type { VercelRequest, VercelResponse } from "@vercel/node"

interface DriveItem {
  name: string
  file?: { mimeType: string }
  image?: { width: number; height: number }
  thumbnails?: { large?: { url: string }; medium?: { url: string }; small?: { url: string } }[]
  "@content.downloadUrl"?: string
}

interface AlbumImage {
  name: string
  url: string
  width: number
  height: number
  thumbnailUrl: string
}

// Encode a OneDrive sharing URL into the shares API token format
// See: https://learn.microsoft.com/en-us/onedrive/developer/rest-api/api/shares_get
function encodeSharingUrl(shareUrl: string): string {
  const base64 = Buffer.from(shareUrl, "utf-8")
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\//g, "_")
    .replace(/\+/g, "-")
  return "u!" + base64
}

function isImageMime(mimeType: string): boolean {
  return mimeType.startsWith("image/")
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const shareUrl = req.query.share
  if (!shareUrl || typeof shareUrl !== "string") {
    return res.status(400).json({ error: "Missing ?share= parameter (OneDrive sharing URL)" })
  }

  try {
    const shareToken = encodeSharingUrl(shareUrl)
    const apiUrl =
      `https://api.onedrive.com/v1.0/shares/${shareToken}/root/children` +
      `?$select=name,file,image,@content.downloadUrl` +
      `&$expand=thumbnails` +
      `&$top=200`

    const apiRes = await fetch(apiUrl)

    if (!apiRes.ok) {
      const text = await apiRes.text()
      return res.status(apiRes.status).json({ error: `OneDrive API error: ${text}` })
    }

    const data = await apiRes.json()
    const items: DriveItem[] = data.value || []

    const images: AlbumImage[] = items
      .filter((item) => item.file && isImageMime(item.file.mimeType))
      .map((item) => {
        const thumbSet = item.thumbnails?.[0]
        const thumb = thumbSet?.large || thumbSet?.medium || thumbSet?.small
        return {
          name: item.name,
          url: item["@content.downloadUrl"] || "",
          width: item.image?.width || 0,
          height: item.image?.height || 0,
          thumbnailUrl: thumb?.url || item["@content.downloadUrl"] || "",
        }
      })
      .filter((img) => img.url)

    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=600")
    return res.status(200).json({ images })
  } catch (err: any) {
    console.error("Album API error:", err)
    return res.status(500).json({ error: err.message || "Internal server error" })
  }
}
