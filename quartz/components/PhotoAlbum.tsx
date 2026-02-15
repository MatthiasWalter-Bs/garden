import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
// @ts-ignore
import script from "./scripts/photoAlbum.inline"
import style from "./styles/photoAlbum.scss"

interface Options {
  baseUrl: string
}

export default ((opts?: Partial<Options>) => {
  const baseUrl = opts?.baseUrl ?? ""

  const PhotoAlbum: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
    const album = fileData.frontmatter?.photo_album as string | undefined

    if (!album || !baseUrl) {
      return null
    }

    return (
      <div id="photo-album" data-base-url={baseUrl} data-album={album}>
        <div class="photo-album-loading">Loading album...</div>
      </div>
    )
  }

  PhotoAlbum.css = style
  PhotoAlbum.afterDOMLoaded = script

  return PhotoAlbum
}) satisfies QuartzComponentConstructor<Partial<Options>>
