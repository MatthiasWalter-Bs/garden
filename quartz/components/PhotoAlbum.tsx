import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
// @ts-ignore
import script from "./scripts/photoAlbum.inline"
import style from "./styles/photoAlbum.scss"

const PhotoAlbum: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
  const shareUrl = fileData.frontmatter?.onedrive_album as string | undefined

  if (!shareUrl) {
    return null
  }

  return (
    <div id="photo-album" data-share-url={shareUrl}>
      <div class="photo-album-loading">Loading album...</div>
    </div>
  )
}

PhotoAlbum.css = style
PhotoAlbum.afterDOMLoaded = script

export default (() => PhotoAlbum) satisfies QuartzComponentConstructor
