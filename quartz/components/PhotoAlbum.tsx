import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
// @ts-ignore
import script from "./scripts/photoAlbum.inline"
import style from "./styles/photoAlbum.scss"

interface Options {
  immichUrl: string
}

export default ((opts?: Partial<Options>) => {
  const immichUrl = opts?.immichUrl ?? ""

  const PhotoAlbum: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
    const immichKey = fileData.frontmatter?.immich_key as string | undefined

    if (!immichKey || !immichUrl) {
      return null
    }

    return (
      <div id="photo-album" data-immich-url={immichUrl} data-immich-key={immichKey}>
        <div class="photo-album-loading">Loading album...</div>
      </div>
    )
  }

  PhotoAlbum.css = style
  PhotoAlbum.afterDOMLoaded = script

  return PhotoAlbum
}) satisfies QuartzComponentConstructor<Partial<Options>>
