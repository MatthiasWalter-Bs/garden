async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

function getStorageKey(slug: string): string {
  return `password-gate:${slug}`
}

document.addEventListener("nav", () => {
  const gate = document.getElementById("password-gate") as HTMLElement | null
  if (!gate) return

  const expectedHash = gate.dataset.passwordHash
  if (!expectedHash) return

  const slug = window.location.pathname
  const storageKey = getStorageKey(slug)

  // Check if already authenticated
  if (localStorage.getItem(storageKey) === expectedHash) {
    gate.classList.add("password-gate-hidden")
    return
  }

  // Show the gate
  gate.classList.remove("password-gate-hidden")

  const form = document.getElementById("password-gate-form") as HTMLFormElement
  const input = document.getElementById("password-gate-input") as HTMLInputElement
  const error = document.getElementById("password-gate-error") as HTMLElement

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    const password = input.value
    if (!password) return

    const hash = await hashPassword(password)
    if (hash === expectedHash) {
      localStorage.setItem(storageKey, expectedHash)
      gate.classList.add("password-gate-hidden")
    } else {
      error.textContent = "Wrong password."
      gate.classList.remove("password-gate-shake")
      // Force reflow to restart animation
      void gate.offsetWidth
      gate.classList.add("password-gate-shake")
      input.value = ""
      input.focus()
    }
  }

  form.addEventListener("submit", handleSubmit)
  window.addCleanup(() => form.removeEventListener("submit", handleSubmit))

  input.focus()
})
