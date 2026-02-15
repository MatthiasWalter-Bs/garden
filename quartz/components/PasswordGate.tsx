import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
// @ts-ignore
import script from "./scripts/passwordGate.inline"
import style from "./styles/passwordGate.scss"

const PasswordGate: QuartzComponent = ({ fileData, cfg }: QuartzComponentProps) => {
  const isProtected = fileData.frontmatter?.protected === true
  const passwordHash = fileData.frontmatter?.["password-hash"] as string | undefined

  if (!isProtected || !passwordHash) {
    return null
  }

  return (
    <div id="password-gate" class="password-gate" data-password-hash={passwordHash}>
      <div class="password-gate-card">
        <h2>{cfg.pageTitle}</h2>
        <p>This page is protected.</p>
        <form id="password-gate-form">
          <input
            id="password-gate-input"
            type="password"
            placeholder="Enter password"
            autocomplete="off"
          />
          <button type="submit">Unlock</button>
        </form>
        <p id="password-gate-error" class="password-gate-error"></p>
      </div>
    </div>
  )
}

PasswordGate.css = style
PasswordGate.afterDOMLoaded = script

export default (() => PasswordGate) satisfies QuartzComponentConstructor
