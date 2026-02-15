// Password protection inline script
// Checks for password in frontmatter and prompts user if set

;(function() {
  // Check if page has password protection
  const body = document.body
  const hasPassword = body.dataset.password || document.querySelector('meta[name="password"]')?.content
  
  if (!hasPassword) return

  const correctPassword = hasPassword
  const pageTitle = document.title
  
  // Create password overlay
  const overlay = document.createElement('div')
  overlay.id = 'password-overlay'
  overlay.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.9);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 999999;
      font-family: system-ui, -apple-system, sans-serif;
    ">
      <div style="
        background: var(--light, #fafafa);
        padding: 2rem;
        border-radius: 8px;
        max-width: 400px;
        width: 90%;
        text-align: center;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      ">
        <h2 style="margin: 0 0 1rem 0; color: var(--dark, #2b2b2b);">🔒 Passwort geschützt</h2>
        <p style="color: var(--gray, #666); margin-bottom: 1.5rem;">
          Diese Seite ist passwortgeschützt.
        </p>
        <input 
          type="password" 
          id="password-input"
          placeholder="Passwort eingeben..."
          style="
            width: 100%;
            padding: 0.75rem;
            border: 2px solid var(--lightgray, #e5e5e5);
            border-radius: 4px;
            font-size: 1rem;
            margin-bottom: 1rem;
            box-sizing: border-box;
          "
        >
        <button 
          id="password-submit"
          style="
            width: 100%;
            padding: 0.75rem;
            background: var(--secondary, #2563eb);
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 1rem;
            cursor: pointer;
          "
        >
          Zugang freischalten
        </button>
        <p id="password-error" style="
          color: #dc2626;
          margin-top: 1rem;
          margin-bottom: 0;
          font-size: 0.875rem;
          display: none;
        ">
          Falsches Passwort. Bitte versuche es erneut.
        </p>
      </div>
    </div>
  `
  
  // Hide content initially
  const content = document.querySelector('.center') || document.querySelector('article') || document.body
  const originalDisplay = content.style.display
  content.style.visibility = 'hidden'
  
  document.body.appendChild(overlay)
  
  // Check password
  const checkPassword = () => {
    const input = document.getElementById('password-input')
    const error = document.getElementById('password-error')
    
    if (input.value === correctPassword) {
      overlay.remove()
      content.style.visibility = 'visible'
      // Store in session storage so user doesn't have to re-enter
      sessionStorage.setItem('pwd-' + location.pathname, '1')
    } else {
      error.style.display = 'block'
      input.value = ''
      input.focus()
    }
  }
  
  // Check if already authenticated this session
  if (sessionStorage.getItem('pwd-' + location.pathname)) {
    overlay.remove()
    content.style.visibility = 'visible'
    return
  }
  
  // Event listeners
  document.getElementById('password-submit').addEventListener('click', checkPassword)
  document.getElementById('password-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') checkPassword()
  })
  document.getElementById('password-input').focus()
})()
