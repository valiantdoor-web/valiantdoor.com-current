import fs from 'node:fs'
import path from 'node:path'
import { load } from 'cheerio'

const root = path.resolve('public')
const pages = []
const walk = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name)
    if (entry.isDirectory()) walk(full)
    else if (entry.name === 'index.html') pages.push(full)
  }
}
walk(root)

const routeFor = (file) => {
  const relative = path.relative(root, path.dirname(file)).split(path.sep).join('/')
  return relative ? `/${relative}` : '/'
}
const routeFiles = new Map(pages.map((file) => [routeFor(file), file]))
const vercelConfig = JSON.parse(fs.readFileSync(path.resolve('vercel.json'), 'utf8'))
const redirects = new Set((vercelConfig.redirects || []).map(({ source }) => source.replace(/\/$/, '') || '/'))
const failures = []
let anchors = 0
let controls = 0
let localTargets = 0

const resolvePublicTarget = (pathname) => {
  let decoded
  try { decoded = decodeURIComponent(pathname) } catch { return null }
  const normalized = path.normalize(path.join(root, decoded))
  if (normalized !== root && !normalized.startsWith(`${root}${path.sep}`)) return null
  const candidates = [normalized, `${normalized}.html`, path.join(normalized, 'index.html')]
  return candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) || null
}

for (const file of pages) {
  const route = routeFor(file)
  const html = fs.readFileSync(file, 'utf8')
  const $ = load(html)
  const ids = new Set($('[id]').map((_, el) => $(el).attr('id')).get())
  const inlineScriptText = $('script:not([type="application/ld+json"])').map((_, el) => $(el).html() || '').get().join('\n')
  const localScriptText = $('script[src]').map((_, el) => {
    const src = ($(el).attr('src') || '').split('?')[0]
    if (!src.startsWith('/')) return ''
    const scriptFile = resolvePublicTarget(src)
    return scriptFile ? fs.readFileSync(scriptFile, 'utf8') : ''
  }).get().join('\n')
  const scriptText = `${inlineScriptText}\n${localScriptText}`

  $('a').each((_, element) => {
    anchors += 1
    const href = ($(element).attr('href') || '').trim()
    const label = ($(element).attr('aria-label') || $(element).text() || '').trim().replace(/\s+/g, ' ').slice(0, 90)
    if (!href || href === '#' || /^javascript:\s*(?:void\(0\))?\s*;?$/i.test(href)) {
      const classes = ($(element).attr('class') || '').split(/\s+/).filter(Boolean)
      const isScriptedAnchor = href === '#' && classes.some((className) =>
        scriptText.includes(`.${className}`) && scriptText.includes('setAttribute("href"')
      )
      if (!isScriptedAnchor) failures.push(`${route}: dead anchor "${label}" has href="${href}"`)
      return
    }
    if (/^(tel:|mailto:|sms:)/i.test(href)) {
      if (!href.split(':')[1]?.trim()) failures.push(`${route}: empty contact target on "${label}"`)
      return
    }
    if (/^(https?:)?\/\//i.test(href)) return
    let target
    try { target = new URL(href, `https://local.test${route.endsWith('/') ? route : `${route}/`}`) }
    catch { failures.push(`${route}: invalid href "${href}" on "${label}"`); return }
    if (target.origin !== 'https://local.test') return
    if (target.hash && target.pathname === route && !ids.has(decodeURIComponent(target.hash.slice(1)))) {
      failures.push(`${route}: missing fragment ${target.hash} on "${label}"`)
      return
    }
    if (target.pathname !== route || !target.hash) {
      localTargets += 1
      const normalizedTarget = target.pathname.replace(/\/$/, '') || '/'
      if (!resolvePublicTarget(target.pathname) && !redirects.has(normalizedTarget)) failures.push(`${route}: missing local target ${target.pathname} on "${label}"`)
    }
  })

  $('button, input[type="button"], input[type="submit"], [role="button"]').each((_, element) => {
    controls += 1
    const node = $(element)
    const label = (node.attr('aria-label') || node.attr('value') || node.text() || '').trim().replace(/\s+/g, ' ').slice(0, 90)
    const type = (node.attr('type') || '').toLowerCase()
    const form = node.closest('form')
    const id = node.attr('id') || ''
    const hasDataHook = Object.keys(element.attribs || {}).some((name) => name.startsWith('data-'))
    const hasScriptBinding = Boolean(id && (
      scriptText.includes(`getElementById("${id}")`) || scriptText.includes(`getElementById('${id}')`) ||
      scriptText.includes(`#${id}`)
    ))
    const hasBehavior = Boolean(
      node.attr('onclick') || hasDataHook || hasScriptBinding ||
      node.attr('aria-controls') || node.attr('popovertarget') ||
      (form.length && (type === 'submit' || element.tagName === 'input'))
    )
    if (!hasBehavior && !node.is('[disabled]')) failures.push(`${route}: button-like control "${label}" has no declared behavior`)
  })

  $('form').each((_, element) => {
    const form = $(element)
    const action = (form.attr('action') || '').trim()
    if (action === '#') failures.push(`${route}: form uses placeholder action="#"`)
  })
}

console.log(`Audited ${pages.length} public HTML routes, ${anchors} anchors, ${controls} button-like controls, and ${localTargets} local targets.`)
if (failures.length) {
  console.error(`Found ${failures.length} potential dead interactions:`)
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}
console.log('No static dead clicks or missing local destinations found.')
