// Застосовує збережену або системну тему до першого малювання, щоб не було спалаху.
// Винесено в окремий файл, бо CSP у Tauri дозволяє лише script-src 'self'.
try {
  var t = localStorage.getItem('mcs.theme')
  var dark = t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches
  if (dark) document.documentElement.classList.add('dark')
} catch {
  /* сховище недоступне */
}
