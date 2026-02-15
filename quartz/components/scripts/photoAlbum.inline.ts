interface AlbumImage {
  name: string
}

function renderGrid(container: HTMLElement, images: AlbumImage[], baseUrl: string, album: string) {
  container.innerHTML = ""

  const grid = document.createElement("div")
  grid.className = "photo-album-grid"

  images.forEach((img, index) => {
    const item = document.createElement("button")
    item.className = "photo-album-item"
    item.dataset.index = String(index)
    item.setAttribute("aria-label", `View ${img.name}`)

    const imgEl = document.createElement("img")
    imgEl.src = `${baseUrl}/${album}/${img.name}`
    imgEl.alt = img.name
    imgEl.loading = "lazy"

    item.appendChild(imgEl)
    grid.appendChild(item)
  })

  container.appendChild(grid)
}

function openLightbox(
  images: AlbumImage[],
  startIndex: number,
  baseUrl: string,
  album: string,
): () => void {
  let current = startIndex

  const overlay = document.createElement("div")
  overlay.className = "photo-album-lightbox"

  const imgEl = document.createElement("img")
  imgEl.className = "photo-album-lightbox-img"

  const counter = document.createElement("div")
  counter.className = "photo-album-lightbox-counter"

  const prevBtn = document.createElement("button")
  prevBtn.className = "photo-album-lightbox-prev"
  prevBtn.setAttribute("aria-label", "Previous image")
  prevBtn.textContent = "\u2039"

  const nextBtn = document.createElement("button")
  nextBtn.className = "photo-album-lightbox-next"
  nextBtn.setAttribute("aria-label", "Next image")
  nextBtn.textContent = "\u203A"

  const closeBtn = document.createElement("button")
  closeBtn.className = "photo-album-lightbox-close"
  closeBtn.setAttribute("aria-label", "Close lightbox")
  closeBtn.textContent = "\u00D7"

  overlay.appendChild(imgEl)
  overlay.appendChild(counter)
  overlay.appendChild(prevBtn)
  overlay.appendChild(nextBtn)
  overlay.appendChild(closeBtn)
  document.body.appendChild(overlay)

  function show(index: number) {
    current = index
    imgEl.src = `${baseUrl}/${album}/${images[current].name}`
    imgEl.alt = images[current].name
    counter.textContent = `${current + 1} / ${images.length}`
    prevBtn.style.display = images.length > 1 ? "" : "none"
    nextBtn.style.display = images.length > 1 ? "" : "none"
  }

  function prev() {
    show((current - 1 + images.length) % images.length)
  }

  function next() {
    show((current + 1) % images.length)
  }

  function close() {
    overlay.remove()
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === "Escape") close()
    else if (e.key === "ArrowLeft") prev()
    else if (e.key === "ArrowRight") next()
  }

  function onOverlayClick(e: MouseEvent) {
    if (e.target === overlay) close()
  }

  let touchStartX = 0
  function onTouchStart(e: TouchEvent) {
    touchStartX = e.touches[0].clientX
  }
  function onTouchEnd(e: TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStartX
    if (Math.abs(dx) > 50) {
      if (dx > 0) prev()
      else next()
    }
  }

  prevBtn.addEventListener("click", prev)
  nextBtn.addEventListener("click", next)
  closeBtn.addEventListener("click", close)
  overlay.addEventListener("click", onOverlayClick)
  overlay.addEventListener("touchstart", onTouchStart)
  overlay.addEventListener("touchend", onTouchEnd)
  document.addEventListener("keydown", onKey)

  void overlay.offsetWidth
  overlay.classList.add("photo-album-lightbox-visible")

  show(current)

  return () => {
    document.removeEventListener("keydown", onKey)
    overlay.remove()
  }
}

document.addEventListener("nav", () => {
  const container = document.getElementById("photo-album")
  if (!container) return

  const baseUrl = container.dataset.baseUrl
  const album = container.dataset.album
  if (!baseUrl || !album) return

  let cleanupLightbox: (() => void) | null = null

  fetch(`${baseUrl}/${album}/manifest.json`)
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to load manifest: ${res.status}`)
      return res.json()
    })
    .then((data: { images: AlbumImage[] }) => {
      if (!data.images || data.images.length === 0) {
        container.innerHTML = '<div class="photo-album-empty">No photos found.</div>'
        return
      }

      renderGrid(container, data.images, baseUrl, album)

      const grid = container.querySelector(".photo-album-grid")
      if (grid) {
        grid.addEventListener("click", (e) => {
          const item = (e.target as HTMLElement).closest(".photo-album-item") as HTMLElement | null
          if (!item) return
          const index = parseInt(item.dataset.index || "0", 10)
          cleanupLightbox = openLightbox(data.images, index, baseUrl, album)
        })
      }
    })
    .catch((err) => {
      console.error("Photo album error:", err)
      container.innerHTML = '<div class="photo-album-error">Failed to load album.</div>'
    })

  window.addCleanup(() => {
    if (cleanupLightbox) cleanupLightbox()
  })
})
