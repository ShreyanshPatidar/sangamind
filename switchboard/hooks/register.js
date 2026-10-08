// Switchboard — useful extras for Claude Code, each one a switch.
//
// Every feature is a userConfig toggle in ../.claude-plugin/plugin.json: it shows as a row in
// /config, and /switchboard opens a settings page listing them with their explanations. Each
// feature's functions start by checking their switch, so an off feature does nothing. Tunables
// (thresholds, patterns, colours) are in ../config.js.
//
// One file, one hook per event, wired by hand at the bottom: the engine takes each event once and
// follows `$` only within this file. A tool call runs through the features in a fixed order — the
// ones that ask first, the one that hides secrets last.

import CONFIG from '../config.js'

// ═══ Shared ══════════════════════════════════════════════════════════════════════════════════════

// What every feature shares: the tunables, which switches are on, and small text helpers.

function config() {
  return CONFIG
}

// Which features are on: the plugin's userConfig values, set once by register(). Every feature
// function starts by asking, so an off feature does nothing.
let options = {}
function setOptions(o) {
  options = o || {}
}
const enabled = (field) => options[field] !== false

const short =(s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s)
const baseName = (p) => String(p).split(/[\\/]/).pop()
const norm = (p) => String(p || '').replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase()
const ago = (ms) => (ms < 60000 ? 'just now' : Math.round(ms / 60000) + ' min ago')

function duration(ms) {
  if (ms >= 3600000) return Math.floor(ms / 3600000) + 'h ' + Math.round((ms % 3600000) / 60000) + 'm'
  if (ms >= 60000) return (ms / 60000).toFixed(1) + 'm'
  if (ms >= 1000) return (ms / 1000).toFixed(1) + 's'
  return Math.round(ms) + 'ms'
}

function tokens(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k'
  return String(n)
}

// The session's id, asked once.
let sessionIdCache = null
async function sessionId($) {
  if (!sessionIdCache) sessionIdCache = await $.session.id()
  return sessionIdCache
}

// ═══ Usage meter ═════════════════════════════════════════════════════════════════════════════════

// Usage meter: one line above the prompt with how full the context window is, the 5-hour and
// weekly plan limits with their reset countdowns, and what this chat has cost. /meter (or the
// line's Details button) opens a pane with the context by category, token totals and cache hits,
// time per tool and subagents.
//
// Everything is read locally: $.session.usage is the status line's own figures, and the context
// breakdown uses the local estimate, never the token-count API. Nothing reaches the model.


const METER_PANE = 'meter'

let usage = null // { context, rateLimits, cost }
let breakdown = null // the context by category, while the pane is open
let totals = null // this chat's token totals, kept in $.store so a reload keeps them
const tools = {} // { [tool]: { count, totalMs, maxMs } }
const agents = { running: 0, done: 0 }

const emptyTotals = () => ({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0, turns: 0 })

async function loadTotals($) {
  if (!totals) totals = (await $.store.get('meter:' + (await sessionId($)))) || emptyTotals()
  return totals
}

async function meterIsOpen($) {
  return (await $.ui.panes()).some((p) => p.id === METER_PANE)
}

async function refreshMeter($) {
  try {
    usage = await $.session.usage()
  } catch {
    // No session bound yet: keep the last reading.
  }
  if (await meterIsOpen($)) {
    try {
      breakdown = (await $.session.usage({ breakdown: 'summary' })).context.breakdown || null
    } catch {
      breakdown = null
    }
  }
  await recordHistory($)
  $.ui.invalidate('ui.render')
}

const openMeter = async ($, tab) => {
  if (tab) meterTab = tab
  await $.ui.open({ id: METER_PANE, title: 'Usage meter', focus: true, closeOnEscape: true, rows: config().settings.paneRows })
  await refreshMeter($)
}

const pct = (n) => (n == null ? '–' : Math.round(n) + '%')

function until(iso, now) {
  const at = Date.parse(iso || '')
  if (!Number.isFinite(at)) return ''
  let mins = Math.max(0, Math.round((at - now) / 60000))
  const days = Math.floor(mins / 1440)
  if (days >= 1) return days + 'd ' + Math.floor((mins % 1440) / 60) + 'h'
  const hours = Math.floor(mins / 60)
  mins %= 60
  return hours ? hours + 'h ' + mins + 'm' : mins + 'm'
}

function level(c, percent) {
  if (percent == null) return undefined
  if (percent >= c.usageMeter.alertAtPercent) return c.colors.alert
  if (percent >= c.usageMeter.warnAtPercent) return c.colors.warn
  return c.colors.ok
}


function cacheHit(t) {
  const all = t.input + t.cacheRead + t.cacheWrite
  return all ? Math.round((t.cacheRead / all) * 100) : null
}

// ── hooks, wired in register.js ─────────────────────────────────────────────

async function meterSessionStart($) {
  if (!enabled('usageMeter')) return
  const c = await config($)
  await loadTotals($)
  await $.command.register({ name: 'meter', immediate: true, description: 'Usage meter: context, plan limits, cost, cache hits, time per tool' })
  await refreshMeter($)
  // The reset countdowns move with the clock, not only with turns.
  $.clock.every(c.usageMeter.refreshSeconds * 1000, () => void refreshMeter($))
}

// After the turn: add its tokens to the chat's totals.
async function meterTurnComplete($, e) {
  if (!enabled('usageMeter')) return
  const u = e.usage
  if (u) {
    const t = await loadTotals($)
    t.input += u.input_tokens || 0
    t.output += u.output_tokens || 0
    t.cacheRead += u.cache_read_input_tokens || 0
    t.cacheWrite += u.cache_creation_input_tokens || 0
    if (!e.agentId) t.turns += 1
    await $.store.set('meter:' + (await sessionId($)), t)
  }
  await refreshMeter($)
}

// Around each tool call: how long it took; subagents as they start and finish.
async function meterToolCall($, e, next) {
  if (!enabled('usageMeter')) return next(e)
  const started = await $.clock.now()
  const isAgent = e.tool === 'Agent'
  if (isAgent) agents.running += 1
  let ran
  try {
    ran = await next(e)
    return ran
  } finally {
    const took = (await $.clock.now()) - started
    const row = tools[e.tool] || (tools[e.tool] = { count: 0, totalMs: 0, maxMs: 0, errors: 0, times: [] })
    row.count += 1
    row.totalMs += took
    row.maxMs = Math.max(row.maxMs, took)
    if (!ran || ran.isError || ran.deny !== undefined) row.errors += 1
    row.times.push(took)
    if (row.times.length > 200) row.times.shift()
    if (isAgent) {
      agents.running = Math.max(0, agents.running - 1)
      agents.done += 1
    }
  }
}

async function meterCommand($) {
  await openMeter($)
  return {}
}

// The meter's row above the prompt, or null.
// The band line at one level of detail, as pieces of text: 3 is the fullest (bars, "resets in"),
// 0 the shortest (short names and numbers). Each piece: { text, color?, bold?, dim? }.
function meterPieces(c, now, detail) {
  const m = c.usageMeter
  const pieces = []
  const gap = (wide) => pieces.length && pieces.push({ text: wide ? m.bandGap : '  ' })
  // One reading: a dim label, a short bar coloured by how close it is to the limit, the number
  // (bold only when it is alarming), and a dim note after it.
  const reading = (kind, percent, reset) => {
    gap(detail >= 2)
    const label = detail >= 2 ? m.limitNames[kind] || kind : m.shortNames[kind] || kind
    pieces.push({ text: label, dim: true, go: kind === 'context' ? 'context' : 'usage' }, { text: ' ' })
    if (detail >= 2) pieces.push({ text: miniBar(m.bandBarWidth, percent, m.bandBarGlyphs) + ' ', color: level(c, percent) })
    pieces.push({ text: pct(percent), bold: percent >= m.alertAtPercent, color: detail < 2 ? level(c, percent) : undefined })
    if (reset && detail >= 1) pieces.push({ text: (detail >= 3 ? '  ' + m.resetNote.replace('{time}', reset) : ' ' + reset), dim: true })
  }
  const ctx = usage.context && usage.context.percent
  if (ctx != null) reading('context', ctx, '')
  for (const limit of usage.rateLimits || []) reading(limit.kind, limit.percentUsed, until(limit.resetsAt, now))
  // Pay-as-you-go keys have no plan limits; a cost is only worth showing there.
  if (!(usage.rateLimits || []).length && usage.cost && usage.cost.usd > 0) {
    gap(detail >= 2)
    pieces.push({ text: '$' + usage.cost.usd.toFixed(2), dim: true })
  }
  return pieces
}

const piecesWidth = (pieces) => pieces.reduce((n, p) => n + p.text.length, 0)

// A band line's pieces as elements. A piece with `go` is a plain button: Tab and the arrows stop
// on it once Ctrl+Up has moved the keyboard to the band, and Enter opens where it leads.
function bandParts($, els, pieces, prefix) {
  return pieces.map((p, i) =>
    p.go
      ? els.Button({ key: prefix + '-' + i, label: p.text, plain: true, ...(p.dim ? { dimColor: true } : {}), onPress: () => void goTo($, p.go) })
      : els.Text({ ...(p.color ? { color: p.color } : {}), ...(p.bold ? { bold: true } : {}), ...(p.dim ? { dimColor: true } : {}), wrap: 'truncate-end', children: [p.text] }),
  )
}

// Where a band piece leads: a tab of the meter, the work log, or the other chats.
async function goTo($, where) {
  if (where === 'worklog') return openLog($, 'chat')
  if (where === 'chats') return $.command.run({ command: 'chats', args: '' })
  return openMeter($, where)
}

async function meterBand($, els, columns) {
  if (!enabled('usageMeter') || !usage) return null
  const c = await config($)
  const m = c.usageMeter
  const { Box, Text, Button } = els
  const now = await $.clock.now()
  const room = columns || 80
  // The fullest line that fits, details link included when it fits too.
  let pieces = []
  let withDetails = false
  for (let detail = 3; detail >= 0; detail--) {
    pieces = meterPieces(c, now, detail)
    if (piecesWidth(pieces) + m.bandGap.length + m.detailsLabel.length <= room) {
      withDetails = true
      break
    }
    if (piecesWidth(pieces) <= room) break
  }
  if (!pieces.length) return null
  const parts = bandParts($, els, pieces, 'm')
  if (withDetails) {
    parts.push(Text({ children: [m.bandGap] }))
    parts.push(Button({ key: 'meter-details', label: m.detailsLabel, hotkey: m.detailsHotkey, plain: true, dimColor: true, onPress: () => void openMeter($) }))
  }
  return Box({ flexDirection: 'row', children: parts })
}

function miniBar(width, percent, glyphs) {
  const filled = Math.max(0, Math.min(width, Math.round(((percent || 0) / 100) * width)))
  return glyphs[0].repeat(filled) + glyphs[1].repeat(width - filled)
}

// The meter's pane: four tabs, each a number key (1 Usage, 2 Context, 3 This chat, 4 Tools);
// Tab walks the buttons, the arrows scroll, Esc closes. Each reading is drawn as a card: a title
// with its figure flush right, a thin full-width bar, dim notes under it. Sections with nothing to
// say yet are left out rather than drawn as dashes and zeros.
let meterTab = 'usage'
const METER_TABS = [
  ['usage', '1', 'Usage'],
  ['context', '2', 'Context'],
  ['chat', '3', 'This chat'],
  ['tools', '4', 'Tools'],
]

// How the plan limits moved: one sample per kind every few minutes, kept for a week, shared by
// every chat on the machine ($.store is), so the trend is there however new this chat is.
async function recordHistory($) {
  const m = config().usageMeter
  const now = await $.clock.now()
  const history = (await $.store.get('meter:history')) || {}
  let changed = false
  for (const limit of (usage && usage.rateLimits) || []) {
    const list = history[limit.kind] || (history[limit.kind] = [])
    const last = list[list.length - 1]
    if (last && now - last[0] < m.historyEveryMinutes * 60000 && last[1] === limit.percentUsed) continue
    if (last && now - last[0] < m.historyEveryMinutes * 60000) list.pop()
    list.push([now, limit.percentUsed])
    while (list.length && now - list[0][0] > m.historyKeepDays * 86400000) list.shift()
    changed = true
  }
  if (changed) await $.store.set('meter:history', history)
}

// The rate a limit is filling at, in percent per hour, over the last `hours`; null without data.
function pace(list, now, hours) {
  const from = now - hours * 3600000
  const recent = (list || []).filter(([t]) => t >= from)
  if (recent.length < 2) return null
  const [t0, p0] = recent[0]
  const [t1, p1] = recent[recent.length - 1]
  if (t1 - t0 < 10 * 60000 || p1 < p0) return null // too short a stretch, or the window reset
  return (p1 - p0) / ((t1 - t0) / 3600000)
}

// Eight-level sparkline of a limit over `hours`, in `slots` columns.
function spark(list, now, hours, slots) {
  const levels = '▁▂▃▄▅▆▇█'
  const from = now - hours * 3600000
  const step = (hours * 3600000) / slots
  let out = ''
  let lastSeen = null
  for (let i = 0; i < slots; i++) {
    const end = from + (i + 1) * step
    const inSlot = (list || []).filter(([t]) => t >= end - step && t < end)
    if (inSlot.length) lastSeen = inSlot[inSlot.length - 1][1]
    out += lastSeen == null ? ' ' : levels[Math.min(7, Math.floor((lastSeen / 100) * 8))]
  }
  return out
}

function clock(iso) {
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return ''
  return d.toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })
}

async function meterPane($, e) {
  const c = await config($)
  const m = c.usageMeter
  const t = await loadTotals($)
  const { Box, Text, Button } = $.ui.resolve(e)
  const now = await $.clock.now()
  const width = Math.max(24, Math.min(m.paneMaxWidth, e.props.bodyColumns - 2))
  const rows = []
  const gap = () => rows.push(Text({ children: [' '] }))
  const heading = (s) => rows.push(Text({ bold: true, dimColor: true, children: [s.toUpperCase()] }))
  const note = (s, color) => rows.push(Text({ dimColor: !color, ...(color ? { color } : {}), wrap: 'truncate-end', children: [s] }))
  const titled = (title, figure, color) =>
    rows.push(
      Box({
        flexDirection: 'row',
        width,
        justifyContent: 'space-between',
        children: [Text({ wrap: 'truncate-end', children: [title] }), Text({ bold: true, ...(color ? { color } : {}), children: [figure] })],
      }),
    )
  const line = (percent, w = width) => {
    const used = Math.max(0, Math.min(w, Math.round(((percent || 0) / 100) * w)))
    rows.push(
      Box({
        flexDirection: 'row',
        children: [
          Text({ color: level(c, percent), children: [m.paneBarGlyphs[0].repeat(used)] }),
          Text({ dimColor: true, children: [m.paneBarGlyphs[1].repeat(w - used)] }),
        ],
      }),
    )
  }
  // A table row: name on the left, the figures in fixed columns on the right.
  const tableRow = (name, figures, bold) =>
    rows.push(
      Box({
        flexDirection: 'row',
        width,
        children: [
          Text({ bold: !!bold, wrap: 'truncate-end', children: [name] }),
          Box({ flexGrow: 1 }),
          Text({ bold: !!bold, children: [figures.map((f) => String(f).padStart(9)).join('')] }),
        ],
      }),
    )

  // The tabs: the current one highlighted and holding the focus.
  const tabs = []
  for (const [id, key, label] of METER_TABS) {
    tabs.push(
      Button({
        key: 'tab-' + id,
        label: key + ' ' + label,
        hotkey: key,
        variant: meterTab === id ? 'primary' : 'secondary',
        ...(meterTab === id ? { autoFocus: true } : {}),
        onPress: () => {
          meterTab = id
          $.ui.invalidate('ui.render')
        },
      }),
      Text({ children: [' '] }),
    )
  }
  rows.push(Box({ flexDirection: 'row', children: tabs }), Text({ dimColor: true, wrap: 'truncate-end', children: [m.paneKeysHint] }), Text({ children: [' '] }))

  if (!usage) {
    note(m.noReading)
    return Box({ flexDirection: 'column', children: rows })
  }
  const limits = usage.rateLimits || []

  if (meterTab === 'usage') {
    const history = (await $.store.get('meter:history')) || {}
    if (!limits.length) note(m.noLimits)
    for (const limit of limits) {
      const p = limit.percentUsed
      titled(m.paneLimitNames[limit.kind] || limit.kind, pct(p), level(c, p))
      line(p)
      const reset = until(limit.resetsAt, now)
      if (reset) note('Resets in ' + reset + (clock(limit.resetsAt) ? '  (' + clock(limit.resetsAt) + ')' : ''))
      const span = m.historyHours[limit.kind] || 24
      const rate = pace(history[limit.kind], now, Math.min(span, m.paceHours[limit.kind] || 1))
      const resetsIn = Date.parse(limit.resetsAt || '') - now
      if (rate != null && rate > 0) {
        const toFull = ((100 - p) / rate) * 3600000
        const pacePerHour = rate >= 1 ? rate.toFixed(0) : rate.toFixed(1)
        if (Number.isFinite(resetsIn) && toFull < resetsIn) note('At this pace (' + pacePerHour + '%/h) it runs out in ' + until(new Date(now + toFull).toISOString(), now) + ', before the reset', c.colors.warn)
        else note('At this pace (' + pacePerHour + '%/h) it lasts until the reset')
      } else if (rate === 0) {
        note('Not moving lately')
      }
      const sparkline = spark(history[limit.kind], now, span, width - 12)
      if (sparkline.trim()) note('Last ' + (span >= 48 ? span / 24 + 'd' : span + 'h') + '  ' + sparkline)
      gap()
    }
    if (!limits.length && usage.cost) note('Cost so far: $' + usage.cost.usd.toFixed(2))
  }

  if (meterTab === 'context') {
    const ctx = usage.context || {}
    const b = breakdown
    const percent = ctx.percent != null ? ctx.percent : b ? b.percentage : null
    const used = ctx.tokens != null ? ctx.tokens : b ? b.totalTokens : 0
    const of = ctx.window || (b ? b.maxTokens : 0)
    if (percent == null) note(m.noContextYet)
    else {
      titled(tokens(used) + ' of ' + tokens(of) + (ctx.percent == null ? '  (estimate before the first reply)' : ''), pct(percent), level(c, percent))
      line(percent)
    }
    if (b) {
      if (b.autoCompactThreshold) note('Auto-compacts at ' + tokens(b.autoCompactThreshold) + (b.isAutoCompactEnabled ? '' : ' (off)'))
      gap()
      heading('What takes the room')
      for (const cat of b.categories.filter((x) => x.tokens).sort((x, y) => y.tokens - x.tokens)) {
        const tag = cat.kind === 'deferred' ? '  loads on use' : cat.kind === 'free' ? '  free' : cat.kind === 'buffer' ? '  reserved' : ''
        tableRow(cat.name + tag, [tokens(cat.tokens)], cat.kind === 'used')
      }
      const top = (list, name, n) => [...(list || [])].sort((x, y) => y.tokens - x.tokens).slice(0, n).map((x) => [name(x), x.tokens])
      const block = (title, items) => {
        if (!items.length) return
        gap()
        heading(title)
        for (const [name, n] of items) tableRow(name, [tokens(n)])
      }
      block('Memory files', top(b.memoryFiles, (f) => f.path.replace(/\\/g, '/').split('/').slice(-2).join('/'), m.paneTopItems))
      block('Skills (' + (b.skills ? b.skills.includedSkills + ' of ' + b.skills.totalSkills : 0) + ')', top(b.skills && b.skills.skillFrontmatter, (s) => s.name, m.paneTopItems))
      const servers = {}
      for (const tool of b.mcpTools || []) servers[tool.serverName] = (servers[tool.serverName] || 0) + tool.tokens
      block('MCP servers', Object.entries(servers).sort((x, y) => y[1] - x[1]).slice(0, m.paneTopItems))
      block('Custom agents', top(b.agents, (a) => a.agentType, m.paneTopItems))
    }
  }

  if (meterTab === 'chat') {
    const hit = cacheHit(t)
    const started = (await $.session.usage()).startedAt
    tableRow('Started', [until(new Date(now + (now - started)).toISOString(), now) + ' ago'])
    tableRow('Turns', [t.turns])
    tableRow('Tokens read', [tokens(t.input + t.cacheRead + t.cacheWrite)])
    tableRow('  from cache', [tokens(t.cacheRead)])
    tableRow('  written to cache', [tokens(t.cacheWrite)])
    tableRow('  fresh', [tokens(t.input)])
    tableRow('Tokens written', [tokens(t.output)])
    if (hit != null) {
      gap()
      titled('Cache hits', hit + '%', hit >= m.goodCacheHit ? c.colors.ok : c.colors.warn)
      line(hit)
      note(m.cacheHint)
    }
    gap()
    tableRow('Subagents running', [agents.running])
    tableRow('Subagents done', [agents.done])
    if (!limits.length && usage.cost) tableRow('Cost', ['$' + usage.cost.usd.toFixed(2)])
  }

  if (meterTab === 'tools') {
    const list = Object.entries(tools).sort((x, y) => y[1].totalMs - x[1].totalMs)
    if (!list.length) note(m.noToolsYet)
    else {
      // p95: the time 95% of its calls finished within; a slow tail shows here before the average moves.
      const p95 = (samples) => {
        const sorted = [...samples].sort((x, y) => x - y)
        return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] || 0
      }
      tableRow('Tool', ['calls', 'failed', 'total', 'p95'], true)
      for (const [name, r] of list) tableRow(name, [r.count, r.errors || '', duration(r.totalMs), duration(p95(r.times))])
    }
    const recent = events.slice(-m.eventsShown).reverse()
    if (recent.length) {
      gap()
      heading('Recent events')
      for (const ev of recent) {
        const ago = Math.round((now - ev.at) / 1000)
        note((ago < 60 ? ago + 's' : Math.round(ago / 60) + 'm') + '  ' + ev.text, ev.isError ? c.colors.alert : undefined)
      }
    }
  }
  return Box({ flexDirection: 'column', children: rows })
}

// ═══ Output viewer ═══════════════════════════════════════════════════════════════════════════════

// Output viewer: see the whole of what a tool returned, and the pictures the session touched.
//
//   Under a long tool result: [ Open ] shows the whole output in a pane: code highlighted by the
//   file's language, diffs coloured, paged when long, a Copy button.
//   Under a result that read or named an image: [ View <name> ] draws it in the pane, and
//   [ Open in Photos ] opens the real file in the system viewer.
//   /viewer lists the recent outputs and images (grouped reads included); /viewer <path> views
//   an image or a text file directly.
//
// Drawing only: what the model reads is never changed, so this costs no tokens.
//
// Pictures: terminals with a pixel protocol (kitty, Ghostty, WezTerm) get the real image; every
// other terminal (Windows Terminal) gets a half-block drawing, two pixels per cell, decoded by
// scripts/pixels.ps1 with Windows' own System.Drawing.


const VIEWER_PANE = 'viewer'
const HALF_BLOCK = 0x2580 // ▀ : top pixel is the foreground, bottom pixel the background
const DEFAULT_COLOR = 0x01000000

const outputs = new Map() // tool_use_id → { id, tool, label, text, path, format, startLine, persisted, images: [abs paths] }
let view = { kind: 'list' } // or { kind: 'text', id, page } or { kind: 'image', path }
const pictures = new Map() // `${path}@${cols}x${rows}` → { cols, rows, cells, size } | { error } | 'loading'
let pixelTerminal = null

const lineCount = (s) => (s ? s.split('\n').length : 0)

// ── what each tool returned, as text worth reading ─────────────────────────

function asDiff(patch) {
  return (patch || [])
    .map((h) => '@@ -' + h.oldStart + ',' + h.oldLines + ' +' + h.newStart + ',' + h.newLines + ' @@\n' + h.lines.join('\n'))
    .join('\n')
}

function labelFor(tool, input) {
  const i = input || {}
  const said = i.description || i.command || i.file_path || i.pattern || i.url || i.query || i.prompt || ''
  return short(String(said).replace(/\s+/g, ' ').trim(), 70)
}

function describe(tool, input, ran) {
  const r = ran.result
  if (ran.isError) return { text: String(ran.text || r || ''), language: undefined }
  if (tool === 'Read' && r && r.type === 'text') return { text: r.file.content, path: r.file.filePath, startLine: r.file.startLine }
  if ((tool === 'Edit' || tool === 'Write') && r && r.structuredPatch && r.structuredPatch.length) {
    return { text: asDiff(r.structuredPatch), path: r.filePath, format: 'diff' }
  }
  if (tool === 'Write' && r && r.type === 'create') return { text: r.content, path: r.filePath }
  if ((tool === 'Bash' || tool === 'PowerShell') && r && typeof r.stdout === 'string') {
    return { text: r.stdout + (r.stderr ? (r.stdout ? '\n' : '') + r.stderr : ''), persisted: r.persistedOutputPath }
  }
  return { text: String(ran.text || '') }
}

// Absolute or relative paths to pictures named in some text, that exist on disk.
async function imagesIn($, c, tool, input, ran, text) {
  const found = []
  if (tool === 'Read' && ran.result && ran.result.type === 'image' && input.file_path) found.push(input.file_path)
  const ext = c.imageExtensions.join('|')
  const re = new RegExp('(?:[A-Za-z]:)?[\\w./\\\\ -]*?[\\w-]+\\.(?:' + ext + ')\\b', 'gi')
  const root = await $.session.cwd()
  for (const m of String(text || '').matchAll(re)) {
    const raw = m[0].trim()
    const abs = /^[A-Za-z]:|^[\\/]/.test(raw) ? raw : root + '/' + raw
    if (found.includes(abs)) continue
    try {
      if (await $.fs.exists(abs)) found.push(abs)
    } catch {
      // Not a path after all.
    }
    if (found.length >= c.imagesPerResult) break
  }
  return found
}

// The whole text of an output: a large Bash output lives in a file the engine saved.
async function fullText($, o) {
  if (o.persisted && !o.loadedPersisted) {
    try {
      o.text = await $.fs.read(o.persisted)
    } catch {
      // Kept what we had.
    }
    o.loadedPersisted = true
  }
  return o.text
}

function pages(text, size) {
  const out = []
  let page = ''
  for (const line of text.split('\n')) {
    const piece = line.length > size ? line.slice(0, size - 1) + '…' : line
    if (page.length + piece.length + 1 > size && page) {
      out.push(page)
      page = ''
    }
    page += (page ? '\n' : '') + piece
  }
  out.push(page)
  return out
}

// Strip what the Code element may not hold (only tab and newline among control characters).
const clean = (s) => s.replace(/\r\n?/g, '\n').replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '').replace(/[\x00-\x08\x0b-\x1f\x7f]/g, '')

// The Code element's props, with no field left undefined (the terminal refuses those).
function codeProps(o, source, page) {
  const props = { source }
  if (o.path) props.path = o.path
  if (o.format === 'diff') props.format = 'diff'
  else if (page === 0 && o.startLine) props.startLine = o.startLine
  return props
}

// ── pictures ────────────────────────────────────────────────────────────────

async function isPixelTerminal($) {
  if (pixelTerminal === null) {
    const c = (await config($)).outputViewer
    const said = ((await $.env.get('TERM_PROGRAM')) || '') + ' ' + ((await $.env.get('TERM')) || '')
    pixelTerminal = c.pixelTerminals.some((t) => said.toLowerCase().includes(t))
  }
  return pixelTerminal
}

async function drawPicture($, path, cols, rows) {
  const key = path + '@' + cols + 'x' + rows
  try {
    const r = await $.process.run(
      ['powershell', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $.plugin.root + '/scripts/pixels.ps1', path, String(cols), String(rows * 2)],
      { timeoutMs: 60000 },
    )
    if (r.exitCode !== 0) throw new Error(r.stderr.trim().split('\n')[0] || 'could not read the picture')
    const [head, body] = r.stdout.trim().split(/\r?\n/)
    const [w, h, ow, oh] = head.split(' ').map(Number)
    const px = Uint8Array.fromBase64(body.trim())
    const cellRows = h / 2
    const words = new Uint32Array(w * cellRows * 3)
    const color = (i) => (px[i + 3] < 128 ? DEFAULT_COLOR : (px[i + 2] << 16) | (px[i + 1] << 8) | px[i])
    for (let y = 0; y < cellRows; y++) {
      for (let x = 0; x < w; x++) {
        const at = (y * w + x) * 3
        words[at] = HALF_BLOCK
        words[at + 1] = color(((2 * y) * w + x) * 4)
        words[at + 2] = color(((2 * y + 1) * w + x) * 4)
      }
    }
    pictures.set(key, { cols: w, rows: cellRows, cells: new Uint8Array(words.buffer).toBase64(), size: ow + '×' + oh })
  } catch (err) {
    pictures.set(key, { error: String((err && err.message) || err) })
  }
  $.ui.invalidate('ui.render')
}

async function openFile($, path) {
  const c = (await config($)).outputViewer
  try {
    await $.process.run([...c.openWith, path.replace(/\//g, '\\')], { timeoutMs: 15000 })
  } catch {
    $.ui.toast('Could not open ' + baseName(path))
  }
}

// ── opening the pane ────────────────────────────────────────────────────────

async function show($, next) {
  view = next
  await $.ui.open({ id: VIEWER_PANE, title: 'Output viewer', focus: true, closeOnEscape: true, rows: config().settings.paneRows })
  $.ui.invalidate('ui.render')
}

// ── hooks ───────────────────────────────────────────────────────────────────

async function viewerSessionStart($) {
  if (!enabled('outputViewer')) return
  await config($)
  await $.command.register({
    name: 'viewer',
    immediate: true,
    description: 'Output viewer: recent tool outputs and images, or /viewer <path> to view a file or picture',
    argumentHint: '[path]',
  })
}

// Keep what each call returned, to show it whole later.
async function viewerToolCall($, e, next) {
  if (!enabled('outputViewer')) return next(e)
  const ran = await next(e)
  if (!ran || ran.deny !== undefined || !e.tool_use_id) return ran
  try {
    const c = (await config($)).outputViewer
    const d = describe(e.tool, e, ran)
    const text = d.text.length > c.maxStoredChars ? d.text.slice(0, c.maxStoredChars) : d.text
    const images = await imagesIn($, c, e.tool, e, ran, text)
    outputs.set(e.tool_use_id, { id: e.tool_use_id, tool: e.tool, label: labelFor(e.tool, e), ...d, text, images })
    while (outputs.size > c.keepOutputs) outputs.delete(outputs.keys().next().value)
  } catch {
    // The viewer never gets in a call's way.
  }
  return ran
}

// The buttons under a tool's result.
async function viewerToolResult($, e, next) {
  if (!enabled('outputViewer')) return next(e)
  const theirs = await next(e)
  const o = outputs.get(e.props.tool_use_id)
  if (!o || e.surface !== 'terminal') return theirs
  const c = (await config($)).outputViewer
  const isLong = lineCount(o.text) >= c.openButtonMinLines || !!o.persisted
  if (!isLong && !o.images.length) return theirs
  const { Box, Button, Text } = $.ui.resolve(e)
  const row = []
  if (isLong) {
    row.push(Button({ key: 'open-' + o.id, label: 'Open', dimColor: true, onPress: () => void show($, { kind: 'text', id: o.id, page: 0 }) }))
    row.push(Text({ dimColor: true, children: [' ' + lineCount(o.text) + ' lines  '] }))
  }
  for (const p of o.images) {
    row.push(Button({ key: 'img-' + o.id + '-' + p, label: 'View ' + short(baseName(p), 28), dimColor: true, onPress: () => void show($, { kind: 'image', path: p }) }))
    row.push(Text({ children: [' '] }))
  }
  const bar = Box({ flexDirection: 'row', children: row })
  return theirs ? Box({ flexDirection: 'column', children: [theirs, bar] }) : bar
}

// ── your own messages: [Image #4] and [Pasted text #1 +40 lines] ───────────

// Temporary: what the viewer saw, newest last, in trace.log beside the mod, to find why the
// message buttons do not show in a live session.
const traced = []
let traceDirty = false
async function trace($, what, data) {
  traced.push(new Date().toISOString() + ' ' + what + ' ' + JSON.stringify(data))
  while (traced.length > 60) traced.shift()
  traceDirty = true
}

// Written from a timer, never while drawing.
async function flushTrace($) {
  if (!traceDirty) return
  traceDirty = false
  try {
    await $.fs.write($.plugin.root + '/trace-' + (await sessionId($)).slice(0, 8) + '.log', traced.join('\n') + '\n')
  } catch (err) {
    traced.push('trace write failed: ' + String(err))
  }
}

const IMAGE_MARK = /\[Image #(\d+)\]/g
const PASTE_MARK = /\[Pasted text #(\d+)[^\]]*\]/g
let prompts = null // the prompts this chat sent, pastes expanded, newest last (kept in $.store)
let imagesDir = null // where the engine saved this chat's pasted images

async function sentPrompts($) {
  if (!prompts) prompts = (await $.store.get('prompts:' + (await sessionId($)))) || []
  return prompts
}

// Every prompt as it reaches the model, so a pasted block can be shown whole later.
async function viewerPromptSubmit($, e) {
  await trace($, 'prompt.submit', { origin: e.origin, attachments: e.attachments, text: String(e.text || '').slice(0, 160) })
  if (!enabled('outputViewer')) return
  const c = (await config($)).outputViewer
  const list = await sentPrompts($)
  list.push(String(e.text || '').slice(0, c.maxStoredChars))
  while (list.length > c.keepPrompts) list.shift()
  await $.store.set('prompts:' + (await sessionId($)), list)
}

// The engine saves a pasted image as <temp>/claude/<project>/<session>/images/<n>.png.
async function pastedImage($, n) {
  const id = await sessionId($)
  if (!imagesDir) {
    const temp = ((await $.env.get('TEMP')) || (await $.env.get('TMPDIR')) || '/tmp').replace(/\\/g, '/')
    try {
      for (const entry of await $.fs.list(temp + '/claude')) {
        const dir = temp + '/claude/' + entry.name + '/' + id + '/images'
        if (entry.kind === 'dir' && (await $.fs.exists(dir))) {
          imagesDir = dir
          break
        }
      }
    } catch {
      // No temp folder for pastes.
    }
  }
  if (!imagesDir) return null
  for (const ext of (await config($)).outputViewer.imageExtensions) {
    const path = imagesDir + '/' + n + '.' + ext
    if (await $.fs.exists(path)) return path
  }
  return null
}

// A pasted block's own text: the row shows placeholders, the stored prompt has them expanded.
// The row's words around the placeholders pin down which prompt it was and where each paste sits.
async function pastedText($, rowText, number) {
  const marks = [...rowText.matchAll(PASTE_MARK)]
  const pattern = rowText
    .split(PASTE_MARK)
    .filter((_, i) => i % 2 === 0)
    .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('([\\s\\S]*?)')
  const re = new RegExp('^\\s*' + pattern + '\\s*$')
  const list = await sentPrompts($)
  for (let i = list.length - 1; i >= 0; i--) {
    const m = list[i].match(re)
    if (!m) continue
    const k = marks.findIndex((mk) => mk[1] === String(number))
    return { text: m[k + 1] ?? list[i], whole: list[i] }
  }
  return null
}

async function showPaste($, rowText, number) {
  const found = await pastedText($, rowText, number)
  if (!found) return $.ui.toast('That paste is from before the viewer was on')
  const id = 'paste:' + number + ':' + found.whole.length
  outputs.set(id, { id, tool: 'Pasted text #' + number, label: '', text: found.text, images: [] })
  await show($, { kind: 'text', id, page: 0 })
}

async function showPastedImage($, n) {
  const path = await pastedImage($, n)
  if (!path) return $.ui.toast('Image #' + n + ' is not on disk any more')
  await show($, { kind: 'image', path })
}

// Under a message you sent: one button per pasted image and pasted block.
async function viewerUserMessage($, e, next) {
  if (!enabled('outputViewer')) return next(e)
  const theirs = await next(e)
  const text = String(e.props.text || '')
  await trace($, 'UserMessage', { surface: e.surface, origin: e.props.origin, isExpanded: e.props.isExpanded, text: text.slice(0, 160) })
  if (e.surface !== 'terminal' || e.props.origin.kind !== 'composer' || !/\[(Image|Pasted text) #\d+/.test(text)) return theirs
  const { Box, Button, Text } = $.ui.resolve(e)
  const row = [Text({ dimColor: true, children: ['  '] })]
  for (const m of text.matchAll(IMAGE_MARK)) {
    row.push(Button({ key: 'pimg-' + m[1], label: 'Image #' + m[1], dimColor: true, onPress: () => void showPastedImage($, m[1]) }), Text({ children: [' '] }))
  }
  for (const m of text.matchAll(PASTE_MARK)) {
    row.push(Button({ key: 'ptxt-' + m[1], label: 'Pasted text #' + m[1], dimColor: true, onPress: () => void showPaste($, text, m[1]) }), Text({ children: [' '] }))
  }
  const bar = Box({ flexDirection: 'row', flexWrap: 'wrap', children: row })
  await trace($, 'buttons', { buttons: (row.length - 1) / 2, hadTheirs: !!theirs })
  return theirs ? Box({ flexDirection: 'column', children: [theirs, bar] }) : bar
}

async function viewerCommand($, e) {
  const c = (await config($)).outputViewer
  const arg = String(e.args || '').trim().replace(/^["']|["']$/g, '')
  if (!arg) {
    await show($, { kind: 'list' })
    return {}
  }
  const root = await $.session.cwd()
  const abs = /^[A-Za-z]:|^[\\/]/.test(arg) ? arg : root + '/' + arg
  if (!(await $.fs.exists(abs))) return { text: 'No such file: ' + abs }
  const ext = baseName(abs).split('.').pop().toLowerCase()
  if (c.imageExtensions.includes(ext)) {
    await show($, { kind: 'image', path: abs })
    return {}
  }
  const id = 'file:' + abs
  outputs.set(id, { id, tool: 'File', label: abs, text: await $.fs.read(abs), path: abs, images: [] })
  await show($, { kind: 'text', id, page: 0 })
  return {}
}

function viewerClosed() {
  view = { kind: 'list' }
}

// ── the pane ──────────────────────────────────────────────────────────────
async function viewerPane($, e) {
  const c = (await config($)).outputViewer
  const els = $.ui.resolve(e)
  const { Box, Text, Button, Code } = els
  const cols = Math.max(20, e.props.bodyColumns)
  const rowsAvail = Math.max(6, ((e.props.scroll && e.props.scroll.bodyRows) || 24) - 4)
  const back = Button({ key: 'back', label: 'All', hotkey: 'b', onPress: () => void show($, { kind: 'list' }) })
  const close = Button({ key: 'close', label: 'Close', role: 'dismiss', onPress: () => void $.ui.close({ id: VIEWER_PANE }) })
  const gap = Text({ children: [' '] })

  if (view.kind === 'text') {
    const o = outputs.get(view.id)
    if (!o) return Box({ flexDirection: 'column', children: [Text({ children: ['That output is gone (the viewer keeps the last ' + c.keepOutputs + ').'] }), back] })
    const all = pages(clean(await fullText($, o)), c.pageChars)
    const page = Math.min(view.page, all.length - 1)
    const turn = (to) => () => void show($, { ...view, page: to })
    const buttons = []
    if (all.length > 1) {
      buttons.push(Button({ key: 'prev', label: 'Prev', hotkey: 'p', onPress: turn(Math.max(0, page - 1)) }), gap)
      buttons.push(Button({ key: 'next', label: 'Next', hotkey: 'n', onPress: turn(Math.min(all.length - 1, page + 1)) }), gap)
    }
    buttons.push(Button({ key: 'copy', label: 'Copy', hotkey: 'c', onPress: (press) => void $.ui.copy({ text: o.text, surface: press.surface }).then((r) => $.ui.toast(r.isCopied ? 'Copied' : 'Could not copy')) }), gap)
    if (o.path) buttons.push(Button({ key: 'reveal', label: 'Open file', hotkey: 'o', onPress: () => void openFile($, o.path) }), gap)
    for (const p of o.images) buttons.push(Button({ key: 'v-' + p, label: 'View ' + short(baseName(p), 20), onPress: () => void show($, { kind: 'image', path: p }) }), gap)
    buttons.push(back, gap, close)
    const head = o.tool + (o.label ? ' · ' + o.label : '') + (all.length > 1 ? '   page ' + (page + 1) + ' of ' + all.length : '')
    return Box({
      flexDirection: 'column',
      children: [
        Text({ bold: true, wrap: 'truncate-end', children: [head] }),
        Box({ flexDirection: 'row', flexWrap: 'wrap', children: buttons }),
        gap,
        Code(codeProps(o, all[page] || '(empty)', page)),
      ],
    })
  }

  if (view.kind === 'image') {
    const p = view.path
    const buttons = Box({
      flexDirection: 'row',
      children: [Button({ key: 'photos', label: 'Open in Photos', hotkey: 'o', variant: 'primary', onPress: () => void openFile($, p) }), gap, back, gap, close],
    })
    const head = Text({ bold: true, wrap: 'truncate-end', children: [baseName(p) + '   ' + p] })
    if ((await isPixelTerminal($)) && /\.png$/i.test(p) && els.Image) {
      return Box({ flexDirection: 'column', children: [head, buttons, gap, els.Image({ source: { file: p.replace(/\\/g, '/'), format: 'png' }, columns: cols, rows: rowsAvail, alt: baseName(p) })] })
    }
    if (!els.Raster) return Box({ flexDirection: 'column', children: [head, buttons, Text({ children: ['This surface cannot draw pictures here; use Open in Photos.'] })] })
    const key = p + '@' + cols + 'x' + rowsAvail
    const pic = pictures.get(key)
    if (!pic) {
      pictures.set(key, 'loading')
      void drawPicture($, p, cols, rowsAvail)
    }
    let body
    if (!pic || pic === 'loading') body = Text({ dimColor: true, children: ['Drawing ' + baseName(p) + '…'] })
    else if (pic.error) body = Text({ children: ['Could not draw it: ' + pic.error] })
    else body = Box({ flexDirection: 'column', children: [els.Raster({ key: 'pic', columns: pic.cols, rows: pic.rows, cells: pic.cells }), Text({ dimColor: true, children: [pic.size + ' px, drawn at ' + pic.cols + '×' + pic.rows * 2 + '. Open in Photos for full detail.'] })] })
    return Box({ flexDirection: 'column', children: [head, buttons, gap, body] })
  }

  // The list: recent outputs and every image seen.
  const recent = [...outputs.values()].filter((o) => !o.id.startsWith('file:')).slice(-c.recentInList).reverse()
  const images = []
  for (const o of outputs.values()) for (const p of o.images) if (!images.includes(p)) images.push(p)
  const rows = [Text({ bold: true, children: ['Recent tool outputs'] })]
  if (!recent.length) rows.push(Text({ dimColor: true, children: ['None yet in this session (since the viewer loaded).'] }))
  for (const o of recent) {
    rows.push(Button({ key: 'r-' + o.id, plain: true, label: short(o.tool + '  ' + (o.label || '') + '  (' + lineCount(o.text) + ' lines)', cols - 2), onPress: () => void show($, { kind: 'text', id: o.id, page: 0 }) }))
  }
  rows.push(gap, Text({ bold: true, children: ['Images'] }))
  if (!images.length) rows.push(Text({ dimColor: true, children: ['None yet. /viewer <path> views any picture.'] }))
  for (const p of images.slice(-c.recentInList).reverse()) {
    rows.push(Button({ key: 'i-' + p, plain: true, label: short(baseName(p) + '   ' + p, cols - 2), onPress: () => void show($, { kind: 'image', path: p }) }))
  }
  rows.push(gap, close)
  return Box({ flexDirection: 'column', children: rows })
}

// ═══ Work log ════════════════════════════════════════════════════════════════════════════════════

// Work log: what this chat did, for a look back before a commit or after being away.
//
//   Files changed (lines added/removed, and git's view of them now: uncommitted, new, committed)
//   Subagents run (type, task, how long, how it ended)
//   Turns (the prompt, how long it took, and the tool that took most of it)
//
// /worklog opens it, with a second view of today's other chats on the same project. Each chat's
// record is kept in $.store for a few days (../config.js), so it survives a reload or restart.


const LOG_PANE = 'worklog'

let rec = null // this chat's record
let current = null // the running main turn: { prompt, startedAt, tools: { label: ms } }
let tab = 'chat' // 'chat' | 'today'
let gitState = {} // path → 'uncommitted' | 'new' | 'committed'

async function record($) {
  if (!rec) {
    const id = await sessionId($)
    rec = (await $.store.get('log:' + id)) || { id, root: norm(await $.session.root()), title: '', startedAt: await $.clock.now(), updatedAt: 0, files: {}, agents: [], turns: [] }
  }
  return rec
}

async function save($) {
  const r = await record($)
  r.updatedAt = await $.clock.now()
  await $.store.set('log:' + r.id, r)
}

function patchCounts(patch) {
  let added = 0
  let removed = 0
  for (const h of patch || []) {
    for (const line of h.lines) {
      if (line.startsWith('+')) added++
      else if (line.startsWith('-')) removed++
    }
  }
  return { added, removed }
}

function turnLabel(e) {
  if (e.tool === 'Bash' || e.tool === 'PowerShell') return e.tool + ': ' + short(String(e.command || '').replace(/\s+/g, ' ').trim(), 40)
  if (e.tool === 'Agent') return 'Agent: ' + short(String(e.description || ''), 40)
  return e.tool
}

async function readGit($, r) {
  const paths = Object.keys(r.files)
  gitState = {}
  if (!paths.length) return
  try {
    const out = await $.process.run(['git', 'status', '--porcelain', '--', ...paths], { cwd: r.root, timeoutMs: 15000 })
    if (out.exitCode !== 0) return
    const listed = new Map()
    for (const line of out.stdout.split('\n')) {
      if (!line.trim()) continue
      const code = line.slice(0, 2)
      const path = norm(r.root + '/' + line.slice(3).trim().replace(/^"|"$/g, ''))
      listed.set(path, code.includes('?') || code.includes('A') ? 'new' : 'uncommitted')
    }
    for (const p of paths) gitState[p] = listed.get(norm(p)) || 'committed'
  } catch {
    // Not a git repository: no git column.
  }
}

async function sweep($) {
  const keep = (await config($)).workLog.keepDays * 86400000
  const now = await $.clock.now()
  for (const key of await $.store.keys()) {
    if (!key.startsWith('log:')) continue
    const r = await $.store.get(key)
    if (!r || now - r.updatedAt > keep) await $.store.delete(key)
  }
}

const startOfToday = (now) => {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

async function openLog($, which) {
  tab = which || 'chat'
  await readGit($, await record($))
  await $.ui.open({ id: LOG_PANE, title: 'Work log', focus: true, closeOnEscape: true, rows: config().settings.paneRows })
  $.ui.invalidate('ui.render')
}

async function logSessionStart($) {
  if (!enabled('workLog')) return
  await record($)
  await $.command.register({ name: 'worklog', immediate: true, description: 'Work log: files changed, subagents, where the time went; this chat and today' })
  await sweep($)
}

async function logPromptSubmit($, e) {
  if (!enabled('workLog')) return
  const text = String(e.text || '').replace(/\s+/g, ' ').trim()
  if (text && !text.startsWith('/')) {
    const r = await record($)
    if (!r.title) r.title = short(text, 60)
    current = { prompt: short(text, 60), startedAt: await $.clock.now(), tools: {}, steps: [] }
  }
}

// After a main turn: keep how long it took and where its time went.
async function logTurnComplete($, e) {
  if (!enabled('workLog') || e.agentId || !current) return
  const r = await record($)
  // Tool time can overlap (parallel calls), so it is capped at the turn's length; the rest is the model.
  const toolMs = Math.min(e.durationMs, current.steps.reduce((n, [, ms]) => n + ms, 0))
  const slowest = [...current.steps].sort((a, b) => b[1] - a[1]).slice(0, 3)
  r.turns.push({ prompt: current.prompt, ms: e.durationMs, tools: current.tools, toolMs, slowest })
  if (r.turns.length > 200) r.turns.splice(0, r.turns.length - 200)
  current = null
  await save($)
  if ((await $.ui.panes()).some((p) => p.id === LOG_PANE)) $.ui.invalidate('ui.render')
}

async function logToolCall($, e, next) {
  if (!enabled('workLog')) return next(e)
  const started = await $.clock.now()
  const isAgent = e.tool === 'Agent'
  const ran = await next(e)
  const took = (await $.clock.now()) - started
  const r = await record($)

  if (!e.agentId && current) {
    const label = turnLabel(e)
    current.tools[label] = (current.tools[label] || 0) + took
    current.steps.push([label, took])
  }
  if (isAgent) {
    r.agents.push({
      type: e.subagent_type || 'general-purpose',
      task: short(String(e.description || ''), 50),
      ms: took,
      status: ran && ran.deny !== undefined ? 'refused' : ran && ran.isError ? 'failed' : 'done',
    })
    await save($)
  }
  const res = ran && !ran.isError && ran.deny === undefined ? ran.result : null
  if (res && (e.tool === 'Edit' || e.tool === 'Write') && !res.staged) {
    const path = norm(res.filePath || e.file_path)
    const f = r.files[path] || (r.files[path] = { added: 0, removed: 0, edits: 0, created: false })
    if (e.tool === 'Write' && res.type === 'create') {
      f.created = true
      f.added += String(res.content || '').split('\n').length
    } else {
      const n = patchCounts(res.structuredPatch)
      f.added += n.added
      f.removed += n.removed
    }
    f.edits += 1
    await save($)
  }
  return ran
}

async function logCommand($) {
  await openLog($, 'chat')
  return {}
}

async function logPane($, e) {
  const c = (await config($)).workLog
  const r = await record($)
  const { Box, Text, Button } = $.ui.resolve(e)
  const rows = []
  const line = (s, props) => rows.push(Text({ ...(props || {}), children: [s] }))
  const gap = () => line(' ')
  const now = await $.clock.now()

  rows.push(
    Box({
      flexDirection: 'row',
      children: [
        Button({ key: 'tab-chat', label: 'This chat', hotkey: '1', variant: tab === 'chat' ? 'primary' : 'secondary', onPress: () => void openLog($, 'chat') }),
        Text({ children: [' '] }),
        Button({ key: 'tab-today', label: 'Today', hotkey: '2', variant: tab === 'today' ? 'primary' : 'secondary', onPress: () => void openLog($, 'today') }),
        Text({ children: [' '] }),
        Button({ key: 'close', label: 'Close', role: 'dismiss', onPress: () => void $.ui.close({ id: LOG_PANE }) }),
      ],
    }),
  )
  gap()

  if (tab === 'today') {
    const from = startOfToday(now)
    const chats = []
    for (const key of await $.store.keys()) {
      if (!key.startsWith('log:')) continue
      const other = await $.store.get(key)
      if (other && other.root === r.root && other.updatedAt >= from) chats.push(other)
    }
    chats.sort((a, b) => b.updatedAt - a.updatedAt)
    line('Today on this project: ' + chats.length + ' chat' + (chats.length === 1 ? '' : 's'), { bold: true })
    for (const ch of chats) {
      const files = Object.keys(ch.files).length
      const time = ch.turns.reduce((s, t) => s + (t.ms || 0), 0)
      gap()
      line((ch.id === r.id ? '▸ ' : '  ') + (ch.title || 'untitled'), { bold: ch.id === r.id })
      line('    ' + ch.turns.length + ' turns, ' + duration(time) + ' working, ' + files + ' files changed, ' + ch.agents.length + ' subagents', { dimColor: true })
      for (const p of Object.keys(ch.files).slice(0, 5)) line('    ' + p.split('/').slice(-2).join('/'), { dimColor: true })
    }
    return Box({ flexDirection: 'column', children: rows })
  }

  const working = r.turns.reduce((s, t) => s + (t.ms || 0), 0)
  line((r.title || 'This chat') + '   ' + r.turns.length + ' turns, ' + duration(working) + ' working', { bold: true })
  gap()

  const files = Object.entries(r.files)
  line('Files changed (' + files.length + ')', { bold: true })
  if (!files.length) line('  None yet.', { dimColor: true })
  for (const [path, f] of files.slice(-c.filesShown).reverse()) {
    const git = gitState[path]
    const where = path.startsWith(r.root + '/') ? path.slice(r.root.length + 1) : path
    line('  ' + short(where, 48).padEnd(50) + ('+' + f.added).padStart(6) + (' -' + f.removed).padStart(6) + '  ' + (f.created ? 'new file' : f.edits + ' edit' + (f.edits === 1 ? '' : 's')) + (git ? '  · ' + git : ''))
  }
  gap()

  line('Subagents (' + r.agents.length + ')', { bold: true })
  if (!r.agents.length) line('  None yet.', { dimColor: true })
  for (const a of r.agents.slice(-10).reverse()) line('  ' + short(a.type, 18).padEnd(20) + short(a.task, 40).padEnd(42) + duration(a.ms).padStart(7) + '  ' + a.status)
  gap()

  line('Turns (latest ' + Math.min(c.turnsShown, r.turns.length) + ')', { bold: true })
  if (!r.turns.length) line('  None yet.', { dimColor: true })
  const firstShown = r.turns.length - Math.min(c.turnsShown, r.turns.length)
  r.turns.slice(firstShown).forEach((t, i) => {
    const top = Object.entries(t.tools || {}).sort((a, b) => b[1] - a[1])[0]
    const share = top && t.ms ? top[1] / t.ms : 0
    line('  #' + String(firstShown + i + 1).padEnd(4) + duration(t.ms || 0).padStart(7) + '  ' + short(t.prompt, 46))
    if (t.toolMs != null) {
      line('         model ' + duration(Math.max(0, t.ms - t.toolMs)) + ' · tools ' + duration(t.toolMs), { dimColor: true })
      for (const [label, ms] of t.slowest || []) if (ms >= 1000) line('           ' + duration(ms).padStart(7) + '  ' + label, { dimColor: ms / t.ms < 0.5 })
    } else if (top && share >= 0.3) line('         ' + duration(top[1]) + ' in ' + top[0], { dimColor: share < 0.6 })
  })
  return Box({ flexDirection: 'column', children: rows })
}

// ═══ Hide secrets ════════════════════════════════════════════════════════════════════════════════

// Hide secrets: the values in the project's .env files (and well-known key formats) are replaced
// with [hidden: NAME] in every tool result before Claude reads it, so a `cat .env.local`, a
// printed config or a crash dump never puts a key into the conversation or the transcript.
//
// Two places: the tool call's own result (what the screen, the transcript and the model get),
// and each tool_result row as it is stored (which also covers errored calls).
// Public values (NEXT_PUBLIC_ and the like) and short values are left alone; see ../config.js.


let secrets = [] // [{ name, value, file }], longest value first
let patterns = [] // [{ name, re }]
let loadedAt = 0

function parseEnv(text) {
  const out = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const m = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_.-]*)\s*=\s*(.*)$/)
    if (!m) continue
    let value = m[2].trim()
    if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1)
    else value = value.replace(/\s+#.*$/, '')
    out.push({ name: m[1], value })
  }
  return out
}

async function envFilesUnder($, c, root) {
  const dirs = [root]
  if (c.searchSubfolders) {
    try {
      for (const entry of await $.fs.list(root)) {
        if (entry.kind === 'dir' && !c.skipFolders.includes(entry.name) && !entry.name.startsWith('.')) dirs.push(root + '/' + entry.name)
      }
    } catch {
      // Unreadable root: just the root's own files.
    }
  }
  const files = []
  for (const dir of dirs) {
    for (const name of c.envFiles) {
      const path = dir + '/' + name
      try {
        if (await $.fs.exists(path)) files.push(path)
      } catch {
        // Skip it.
      }
    }
  }
  return files
}

async function load($) {
  const c = (await config($)).hideSecrets
  const root = norm(await $.session.root())
  const found = new Map()
  for (const file of await envFilesUnder($, c, root)) {
    let text = ''
    try {
      text = await $.fs.read(file)
    } catch {
      continue
    }
    for (const { name, value } of parseEnv(text)) {
      if (value.length < c.minLength) continue
      if (c.publicPrefixes.some((p) => name.startsWith(p))) continue
      if (!found.has(value)) found.set(value, { name, value, file })
    }
  }
  secrets = [...found.values()].sort((a, b) => b.value.length - a.value.length)
  patterns = c.patterns.map((p) => ({ name: p.name, re: new RegExp(p.regex, 'g') }))
  loadedAt = await $.clock.now()
}

function scrub(text) {
  let out = text
  for (const s of secrets) if (out.includes(s.value)) out = out.split(s.value).join('[hidden: ' + s.name + ']')
  for (const p of patterns) out = out.replace(p.re, '[hidden: ' + p.name + ']')
  return out
}

// Walks a tool's result record, scrubbing every string; `changed` says whether anything was hidden.
function scrubDeep(value, state) {
  if (typeof value === 'string') {
    const out = scrub(value)
    if (out !== value) state.changed = true
    return out
  }
  if (Array.isArray(value)) return value.map((v) => scrubDeep(v, state))
  if (value && typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value)) out[k] = scrubDeep(v, state)
    return out
  }
  return value
}

function scrubBlocks(content, state) {
  if (typeof content === 'string') return scrubDeep(content, state)
  if (!Array.isArray(content)) return content
  return content.map((b) => {
    if (b && b.type === 'text' && typeof b.text === 'string') return { ...b, text: scrubDeep(b.text, state) }
    if (b && b.type === 'tool_result') return { ...b, content: scrubBlocks(b.content, state) }
    return b
  })
}

async function secretsSessionStart($) {
  if (!enabled('hideSecrets')) return
  await load($)
}

async function secretsToolCall($, e, next) {
  if (!enabled('hideSecrets')) return next(e)
  const c = (await config($)).hideSecrets
  if ((await $.clock.now()) - loadedAt > c.reloadMinutes * 60000) await load($)
  const ran = await next(e)
  if (!ran || ran.deny !== undefined || ran.isError || (!secrets.length && !patterns.length)) return ran
  const state = { changed: false }
  const result = scrubDeep(ran.result, state)
  if (!state.changed) return ran
  $.ui.toast('Hid a secret from Claude in ' + e.tool + ' output')
  return ran.context ? { result, context: ran.context } : { result }
}

// Every stored tool result, errored ones included: what the next request sends.
async function secretsAppend($, e, next) {
  if (!enabled('hideSecrets')) return next(e)
  if (!Array.isArray(e.message.content)) return next(e)
  const state = { changed: false }
  const content = scrubBlocks(e.message.content, state)
  return state.changed ? next({ ...e, message: { ...e.message, content } }) : next(e)
}

// ═══ Stop repeated failures ══════════════════════════════════════════════════════════════════════

// Stop repeated failures: when the exact same tool call has already failed the configured number
// of times since the user's last message, the next attempt is refused with a note telling Claude
// to read the error and change approach. A success, or a new message from the user, resets it.
//
// Costs about 50 tokens when it fires (the refusal Claude reads); saves the retries it stops.


const failures = new Map() // call key → failures since the user's last message

// The same call: same agent, same tool, same input (its free-text description aside).
function callKey(e) {
  const { tool_use_id, agentId, description, ...input } = e
  const ordered = Object.keys(input)
    .sort()
    .map((k) => [k, typeof input[k] === 'string' ? input[k].trim() : input[k]])
  return (agentId || 'main') + '|' + JSON.stringify(ordered)
}

function failuresPromptSubmit() {
  failures.clear()
}

async function failuresToolCall($, e, next) {
  if (!enabled('stopRepeatedFailures')) return next(e)
  const limit = (await config($)).stopRepeatedFailures.sameFailureLimit
  const key = callKey(e)
  const seen = failures.get(key) || 0
  if (seen >= limit) {
    $.ui.toast('Stopped a ' + e.tool + ' call that already failed ' + seen + ' times')
    return {
      deny:
        'This exact ' + e.tool + ' call has already failed ' + seen + ' times since the user\'s last message. ' +
        'Do not repeat it. Read the error, change the approach, or ask the user.',
    }
  }
  const ran = await next(e)
  if (ran && ran.isError) failures.set(key, seen + 1)
  else if (ran && ran.deny === undefined) failures.delete(key)
  return ran
}

// ═══ Confirm risky commands ══════════════════════════════════════════════════════════════════════

// Confirm risky commands: before a shell command that matches one of the rules in ../config.js
// (force push, hard reset, recursive delete, DROP/TRUNCATE, database pushes, production deploys),
// ask "Run / Don't run". Parts of a command that match an exception (deleting node_modules, .next,
// test-results…) are ignored. With nobody to ask, the command does not run.


// Which rule a command trips, if any.
function riskyRule(c, command) {
  let rest = String(command || '')
  for (const ex of c.exceptions) rest = rest.replace(new RegExp(ex, 'gi'), ' ')
  return c.rules.find((r) => new RegExp(r.regex, 'i').test(rest)) || null
}

async function riskyToolCall($, e, next) {
  if (!enabled('confirmRiskyCommands')) return next(e)
  const c = (await config($)).confirmRiskyCommands
  if (!c.tools.includes(e.tool)) return next(e)
  const command = String(e.command || '')
  const rule = riskyRule(c, command)
  if (!rule) return next(e)
  let answer = "Don't run"
  try {
    answer = await $.ui.ask(rule.name + ':\n\n' + short(command, 300) + '\n\nRun it?', { options: ['Run', "Don't run"], header: 'Risky' })
  } catch {
    // Nobody to ask: leave it unrun.
  }
  if (answer === 'Run') return next(e)
  return {
    deny: 'The user chose not to run this command (' + rule.name + '). Do not retry it or work around it; ask the user how to proceed.',
  }
}

// ═══ Parallel chats ══════════════════════════════════════════════════════════════════════════════

// Parallel chats: several Claude Code chats on one machine, working on the same project.
//
// Every chat with any of these features on keeps a small record of itself in the shared $.store
// (one store for every session on the machine) and reads the others':
//
//   chat:<sessionId>   { id, root, title, working, seen }   who is open, on which project, doing what
//   file:<path>        { session, title, at }               the last chat to change a file
//   test:last          { session, title, at }               who started the last test run
//   dev:<root>         "http://localhost:3000"              the dev server to watch for a project
//
// Four switches use them:
//   Edit collision check     before Edit/Write, ask if another open chat changed the file recently
//   One test run at a time   before a Playwright run, ask if one is already running on the machine
//   Other chats line         the other open chats on this project, above the prompt
//   Dev server watch         a red line above the prompt when the project's dev server is unwell


const EDIT_TOOLS = ['Edit', 'Write', 'MultiEdit', 'NotebookEdit']
const SHELL_TOOLS = ['Bash', 'PowerShell']
const presenceOn = () => ['editCollisionCheck', 'oneTestRunAtATime', 'otherChatsLine', 'devServerWatch'].some(enabled)

let me = null // { id, root }
let title = ''
let working = false
let peers = [] // other open chats on this project
let dev = null // { url, state: 'ok' | 'error' | 'down', note }

async function whoAmI($) {
  if (!me) me = { id: await sessionId($), root: norm(await $.session.root()) }
  return me
}

async function times($) {
  const c = (await config($)).parallelChats
  return {
    recent: c.recentEditMinutes * 60000,
    alive: c.aliveMinutes * 60000,
    beat: c.heartbeatSeconds * 1000,
    keep: c.keepHours * 3600000,
    shown: c.chatsShownInLine,
  }
}

async function checkIn($) {
  const self = await whoAmI($)
  await $.store.set('chat:' + self.id, { id: self.id, root: self.root, title, working, seen: await $.clock.now() })
}

async function readPeers($) {
  const self = await whoAmI($)
  const t = await times($)
  const now = await $.clock.now()
  const found = []
  for (const key of await $.store.keys()) {
    if (!key.startsWith('chat:') || key === 'chat:' + self.id) continue
    const s = await $.store.get(key)
    if (!s || now - s.seen > t.alive) {
      // Closed without saying so (a crash, a killed window): forget it after a while.
      if (s && now - s.seen > t.keep) await $.store.delete(key)
      continue
    }
    if (s.root === self.root) found.push(s)
  }
  peers = found
}

async function readDev($) {
  const self = await whoAmI($)
  const url = await $.store.get('dev:' + self.root)
  if (typeof url !== 'string' || !url) {
    dev = null
    return
  }
  const hints = (await config($)).devServer.errorHints
  try {
    const r = await $.http.fetch(url)
    if (r.ok) dev = { url, state: 'ok', note: '' }
    else {
      const hint = hints.find((h) => String(r.text || '').toLowerCase().includes(h.match.toLowerCase()))
      dev = { url, state: 'error', note: hint ? hint.note : 'answers ' + r.status }
    }
  } catch {
    dev = { url, state: 'down', note: 'not answering' }
  }
}

// A file's last writer, if it was another chat that is still open and wrote recently.
async function recentWriter($, path) {
  const self = await whoAmI($)
  const t = await times($)
  const rec = await $.store.get('file:' + norm(path))
  if (!rec || rec.session === self.id) return null
  const now = await $.clock.now()
  if (now - rec.at > t.recent) return null
  const other = await $.store.get('chat:' + rec.session)
  if (!other || now - other.seen > t.alive) return null
  return { ...rec, age: now - rec.at }
}

// Is a Playwright run going on this machine right now, from any chat or terminal?
async function testRunning($) {
  const c = (await config($)).testRun
  const probes = [
    [
      'powershell',
      '-NoProfile',
      '-Command',
      "(Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object { $_.CommandLine -like '" + c.windowsProcessMatch + "' } | Measure-Object).Count",
    ],
    ['sh', '-c', "pgrep -fc '" + c.posixProcessMatch + "' || true"],
  ]
  for (const probe of probes) {
    try {
      const r = await $.process.run(probe, { timeoutMs: 20000 })
      const n = Number(r.stdout.trim())
      if (r.exitCode === 0 && Number.isFinite(n)) return n > 0
    } catch {
      // That shell is not here; try the next.
    }
  }
  return false
}

// ── presence: on whenever any of the four is ───────────────────────────────

async function chatsSessionStart($) {
  if (!presenceOn()) return
  const self = await whoAmI($)
  const t = await times($)
  // A reload starts the module over: keep the title this chat already had.
  const before = await $.store.get('chat:' + self.id)
  if (before && before.title && !title) title = before.title
  if (!title) title = await sessionName($, self.id)
  await checkIn($)
  const look = async () => {
    if (enabled('otherChatsLine')) await readPeers($)
    if (enabled('devServerWatch')) await readDev($)
    $.ui.invalidate('ui.render')
  }
  await look()
  $.clock.every(t.beat, () => void checkIn($).then(look))
  // Sweep file records nobody needs any more.
  const now = await $.clock.now()
  for (const key of await $.store.keys()) {
    if (!key.startsWith('file:')) continue
    const rec = await $.store.get(key)
    if (!rec || now - rec.at > t.keep) await $.store.delete(key)
  }
}

async function chatsSessionEnd($) {
  if (!presenceOn()) return
  const self = await whoAmI($)
  await $.store.delete('chat:' + self.id)
}

async function chatsPromptSubmit($, e) {
  if (!presenceOn() || named) return
  const text = cleanTitle(e.text)
  if (text) title = short(text, 60)
}

// What the other chats call this one: the name the person gave it, else its latest prompt
// without paste and image placeholders.
let named = false
function cleanTitle(text) {
  const t = String(text || '')
    .replace(/\[(Pasted text|Image) #\d+[^\]]*\]/g, ' ')
    .replace(/^[\s❯>]+/, '')
    .replace(/\s+/g, ' ')
    .trim()
  return t.startsWith('/') ? '' : t
}

// The engine keeps a record per running chat in ~/.claude/sessions; a name the person set is there.
async function sessionName($, id) {
  try {
    const home = ((await $.env.get('USERPROFILE')) || (await $.env.get('HOME')) || '').replace(/\\/g, '/')
    for (const entry of await $.fs.list(home + '/.claude/sessions')) {
      if (!entry.name.endsWith('.json')) continue
      const rec = JSON.parse(await $.fs.read(home + '/.claude/sessions/' + entry.name))
      if (rec.sessionId === id && rec.name && rec.nameSource === 'user') {
        named = true
        return short(rec.name, 60)
      }
    }
  } catch {
    // No record to read: fall back to the prompts.
  }
  return ''
}

async function chatsTurnStart($) {
  if (!presenceOn()) return
  working = true
  await checkIn($)
}

async function chatsTurnComplete($, e) {
  if (!presenceOn()) return
  if (!e.agentId) {
    working = false
    await checkIn($)
  }
}

// Every chat records the files it changes, so the others can check against them.
async function chatsRecordEdit($, e, next) {
  if (!presenceOn() || !EDIT_TOOLS.includes(e.tool)) return next(e)
  const result = await next(e)
  const path = e.file_path || e.notebook_path
  if (path && result && result.deny === undefined && !result.isError) {
    const self = await whoAmI($)
    await $.store.set('file:' + norm(path), { session: self.id, title, at: await $.clock.now() })
  }
  return result
}

// ── the four switches ───────────────────────────────────────────────────────

async function collisionToolCall($, e, next) {
  if (!enabled('editCollisionCheck') || !EDIT_TOOLS.includes(e.tool)) return next(e)
  const path = e.file_path || e.notebook_path
  if (!path) return next(e)
  const other = await recentWriter($, path)
  if (!other) return next(e)
  let answer = "Don't edit"
  try {
    answer = await $.ui.ask(
      'Another open chat ("' + short(other.title || 'untitled', 50) + '") changed ' + path.split(/[\\/]/).pop() + ' ' + ago(other.age) + '. Edit it anyway?',
      ['Edit anyway', "Don't edit"],
    )
  } catch {
    // Nobody to ask (a -p run) or the question was dismissed: leave the file alone.
  }
  if (answer === 'Edit anyway') return next(e)
  return {
    deny:
      'The user chose not to edit ' + path + ' because another open chat ("' + (other.title || 'untitled') + '") changed it ' + ago(other.age) +
      '. Do not retry this edit. Coordinate with that chat (SendMessage) or ask the user how to proceed.',
  }
}

async function testRunToolCall($, e, next) {
  if (!enabled('oneTestRunAtATime') || !SHELL_TOOLS.includes(e.tool)) return next(e)
  const c = (await config($)).testRun
  if (!new RegExp(c.commandRegex, 'i').test(String(e.command || ''))) return next(e)
  if (await testRunning($)) {
    const last = await $.store.get('test:last')
    const now = await $.clock.now()
    const who = last ? ' (started by "' + short(last.title || 'another chat', 50) + '" ' + ago(now - last.at) + ')' : ''
    let answer = 'Wait'
    try {
      answer = await $.ui.ask('A Playwright run is already going on this machine' + who + '. Start another anyway?', ['Wait', 'Run anyway'])
    } catch {
      // Nobody to ask: do not start a second run.
    }
    if (answer !== 'Run anyway') {
      return {
        deny:
          'Another Playwright run is in progress on this machine' + who +
          '. Only one run at a time: two runs share test-results, the test login and the teardown. Wait for it to finish, then run again.',
      }
    }
  }
  const self = await whoAmI($)
  await $.store.set('test:last', { session: self.id, title, at: await $.clock.now() })
  return next(e)
}

async function otherChatsBand($, els) {
  if (!enabled('otherChatsLine')) return null
  if (!peers.length) return null
  const t = await times($)
  const s = config().parallelChats
  // Named chats one by one, working ones first; the rest as a count.
  const sorted = [...peers].sort((a, b) => Number(b.working) - Number(a.working) || b.seen - a.seen)
  const shown = sorted.filter((p) => p.title).slice(0, t.shown)
  const rest = peers.length - shown.length
  const parts = shown.map((p) => (p.working ? '● ' : '○ ') + short(p.title, 28))
  if (rest) parts.push(s.unnamedChats.replace('{n}', rest).replace('{s}', rest === 1 ? '' : 's'))
  return els.Button({ key: 'chats-line', label: s.lineLabel + parts.join('   '), plain: true, dimColor: true, onPress: () => void goTo($, 'chats') })
}

async function devSessionStart($) {
  if (!enabled('devServerWatch')) return
  await $.command.register({
    name: 'devserver',
    description: 'Watch a dev server for this project: /devserver http://localhost:3000, or /devserver off',
    argumentHint: '<url> | off',
  })
}

async function devCommand($, e) {
  const self = await whoAmI($)
  const arg = String(e.args || '').trim()
  if (!arg) {
    const url = await $.store.get('dev:' + self.root)
    return { text: url ? 'Watching ' + url + ' for this project. /devserver off to stop.' : 'No dev server watched for this project. /devserver <url> to start.' }
  }
  if (arg === 'off') {
    await $.store.delete('dev:' + self.root)
    dev = null
    $.ui.invalidate('ui.render')
    return { text: 'No longer watching a dev server for this project.' }
  }
  if (!/^https?:\/\/\S+$/.test(arg)) return { text: 'Give a full address, such as http://localhost:3000, or off.' }
  await $.store.set('dev:' + self.root, arg)
  await readDev($)
  $.ui.invalidate('ui.render')
  return { text: 'Watching ' + arg + ' for this project, once a minute.' }
}

async function devBand($, els) {
  if (!enabled('devServerWatch')) return null
  if (!dev || dev.state === 'ok') return null
  const c = await config($)
  return els.Text({ color: c.colors.alert, wrap: 'truncate-end', children: ['Dev server ' + dev.url + ': ' + dev.note] })
}

// /chats: everything at once, for whoever has the presence on.
async function chatsCommandSessionStart($) {
  if (!presenceOn()) return
  await $.command.register({ name: 'chats', immediate: true, description: 'The other chats on this project, files they changed recently, and whether a test run is going' })
}

async function chatsCommand($) {
  await readPeers($)
  const self = await whoAmI($)
  const t = await times($)
  const now = await $.clock.now()
  const lines = ['Other chats on this project: ' + (peers.length ? '' : 'none')]
  for (const p of peers) lines.push('  ' + (p.working ? '● working' : '○ idle   ') + '  ' + (p.title || 'untitled') + '  (seen ' + ago(now - p.seen) + ')')
  const recent = []
  for (const key of await $.store.keys()) {
    if (!key.startsWith('file:')) continue
    const rec = await $.store.get(key)
    if (rec && rec.session !== self.id && now - rec.at < t.recent) recent.push('  ' + key.slice(5).split('/').pop() + ' — "' + (rec.title || 'untitled') + '" ' + ago(now - rec.at))
  }
  lines.push('Files other chats changed recently: ' + (recent.length ? '' : 'none'), ...recent)
  lines.push('Playwright running now: ' + ((await testRunning($)) ? 'yes' : 'no'))
  return { text: lines.join('\n') }
}

// ═══ Session pulse ══════════════════════════════════════════════════════════════════════════════

// What the line above the prompt adds under the usage readings, gathered from events this module
// already sees, with no model calls: the prompt cache's warmth, how fast the context grows, when a
// limit runs out, the task Claude is on, the repository's state, and one hint when one applies.

let lastActivity = 0 // when the last model request ended (a turn ending, or a tool result going back)
const contextSteps = [] // context tokens after each main turn, newest last
let compactAt = null // the auto-compact threshold, from the local context estimate
let git = null // { branch, ahead, behind, changed, files: [{ code, path }] } or null outside a repository
let gitReadAt = 0
const taskList = new Map() // TaskCreate / TaskUpdate: id → { subject, status, active }
let todos = null // TodoWrite: [{ content, status, activeForm }]
let hintSnoozedUntilTurn = 0
let turnsSeen = 0
const events = [] // newest last: { at, kind, text, isError }
const turnStats = new Map() // durationMs → summary line under that turn's answer
let currentTurn = null // { started, tools, agents, errors, usage }

function logEvent(at, kind, text, isError) {
  events.push({ at, kind, text, isError: !!isError })
  while (events.length > config().usageMeter.eventsKept) events.shift()
}

async function readGitStatus($) {
  const now = await $.clock.now()
  if (now - gitReadAt < config().gitStatus.refreshSeconds * 1000) return git
  gitReadAt = now
  try {
    const r = await $.process.run(['git', 'status', '--porcelain=v2', '--branch'], { cwd: await $.session.root(), timeoutMs: 15000 })
    if (r.exitCode !== 0) return (git = null)
    const g = { branch: '', ahead: 0, behind: 0, changed: 0, files: [] }
    for (const line of r.stdout.split('\n')) {
      if (line.startsWith('# branch.head ')) g.branch = line.slice(14).trim()
      else if (line.startsWith('# branch.ab ')) {
        const m = line.match(/\+(\d+) -(\d+)/)
        if (m) [g.ahead, g.behind] = [Number(m[1]), Number(m[2])]
      } else if (/^[12u?] /.test(line)) {
        g.changed++
        const parts = line.split(' ')
        g.files.push({ code: line[0] === '?' ? '??' : parts[1], path: parts.slice(line[0] === '1' ? 8 : line[0] === '2' ? 9 : line[0] === 'u' ? 10 : 1).join(' ').split('\t')[0] })
      }
    }
    git = g
  } catch {
    git = null
  }
  return git
}

// Tokens added per turn lately, and how many turns until auto-compact at that rate.
function contextGrowth(now) {
  const recent = contextSteps.slice(-4)
  if (recent.length < 2) return null
  const perTurn = (recent[recent.length - 1] - recent[0]) / (recent.length - 1)
  if (perTurn <= 0) return null
  const left = compactAt != null ? Math.max(0, Math.floor((compactAt - recent[recent.length - 1]) / perTurn)) : null
  return { perTurn, left }
}

// When a plan limit runs out at its recent pace, if before it resets: { kind, inMs } or null.
async function limitForecast($, now) {
  const m = config().usageMeter
  const history = (await $.store.get('meter:history')) || {}
  let soonest = null
  for (const limit of (usage && usage.rateLimits) || []) {
    const rate = pace(history[limit.kind], now, m.paceHours[limit.kind] || 1)
    if (!rate || rate <= 0) continue
    const inMs = ((100 - limit.percentUsed) / rate) * 3600000
    const resetsIn = Date.parse(limit.resetsAt || '') - now
    if (Number.isFinite(resetsIn) && inMs < resetsIn && (!soonest || inMs < soonest.inMs)) soonest = { kind: limit.kind, inMs }
  }
  return soonest
}

function cacheState(now) {
  const ttl = config().usageMeter.cacheTtlMinutes * 60000
  if (!lastActivity) return null
  const left = ttl - (now - lastActivity)
  return { warm: left > 0, left }
}

function taskProgress() {
  const list = todos
    ? todos.map((t) => ({ status: t.status, label: t.status === 'in_progress' ? t.activeForm || t.content : t.content }))
    : [...taskList.values()].filter((t) => t.status !== 'deleted').map((t) => ({ status: t.status, label: t.status === 'in_progress' ? t.active || t.subject : t.subject }))
  if (!list.length) return null
  const done = list.filter((t) => t.status === 'completed').length
  const now = list.find((t) => t.status === 'in_progress')
  if (done === list.length) return null
  return { done, total: list.length, now: now ? now.label : '' }
}

// The one hint worth showing now, or null. Rules in order; the first that applies wins.
async function currentHint($, now) {
  const h = config().usageHints
  if (turnsSeen < hintSnoozedUntilTurn || !usage) return null
  const fill = (s, vars) => Object.entries(vars).reduce((out, [k, v]) => out.split('{' + k + '}').join(String(v)), s)
  const limits = usage.rateLimits || []
  const weekly = limits.find((l) => l.kind === 'seven_day')
  const session = limits.find((l) => l.kind === 'five_hour')
  if (session && session.percentUsed >= h.sessionAlmostOutPercent) return fill(h.sessionAlmostOut, { pct: session.percentUsed, reset: until(session.resetsAt, now) })
  if (weekly && weekly.percentUsed >= h.weeklyHighPercent && Date.parse(weekly.resetsAt) - now > h.weeklyHighDaysLeft * 86400000) {
    return fill(h.weeklyHigh, { pct: weekly.percentUsed, reset: until(weekly.resetsAt, now) })
  }
  const ctx = usage.context && usage.context.percent
  if (ctx != null && ctx >= h.contextHighPercent) return fill(h.contextHigh, { pct: ctx })
  const cache = cacheState(now)
  const ctxTokens = usage.context && usage.context.tokens
  if (cache && !cache.warm && ctxTokens >= h.coldCacheMinTokens) return fill(h.coldCache, { tokens: tokens(ctxTokens) })
  const t = totals
  const hit = t ? cacheHit(t) : null
  if (t && t.turns >= h.lowCacheAfterTurns && hit != null && hit < h.lowCachePercent) return fill(h.lowCache, { pct: hit })
  return null
}

// The second line: cache, context growth, forecast, task, git. Each piece is { text, color?, dim? }.
async function pulsePieces($, now, detail) {
  const c = config()
  const m = c.usageMeter
  const pieces = []
  const sep = () => pieces.length && pieces.push({ text: detail ? m.bandGap : '  ' })

  if (enabled('usageMeter')) {
    const cache = cacheState(now)
    if (cache) {
      sep()
      pieces.push(cache.warm ? { text: 'cache ' + until(new Date(now + cache.left).toISOString(), now), dim: true, go: 'chat' } : { text: 'cache cold', color: c.colors.warn })
    }
    const growth = contextGrowth(now)
    if (growth && detail) {
      sep()
      pieces.push({ text: '+' + tokens(growth.perTurn) + '/turn' + (growth.left != null ? ' · ' + growth.left + ' turns to compact' : ''), dim: true, go: 'context' })
    }
    const fc = await limitForecast($, now)
    if (fc) {
      sep()
      pieces.push({ text: (m.limitNames[fc.kind] || fc.kind) + ' runs out in ' + until(new Date(now + fc.inMs).toISOString(), now), color: c.colors.warn })
    }
  }
  if (enabled('taskProgress')) {
    const p = taskProgress()
    if (p) {
      sep()
      pieces.push({ text: p.done + '/' + p.total + (p.now ? ' · ' + short(p.now, detail ? 40 : 20) : ''), go: 'worklog' })
    }
  }
  if (enabled('gitStatus')) {
    const g = await readGitStatus($)
    if (g && g.branch) {
      sep()
      const bits = [g.branch]
      if (g.changed) bits.push(g.changed + ' changed')
      if (g.ahead) bits.push(g.ahead + ' to push')
      if (g.behind) bits.push(g.behind + ' to pull')
      pieces.push({ text: c.gitStatus.icon + bits.join(' · '), dim: !g.changed && !g.ahead && !g.behind, go: 'worklog' })
    }
  }
  return pieces
}

async function pulseBand($, els, columns) {
  const pieceOn = ['usageMeter', 'taskProgress', 'gitStatus'].some(enabled)
  if (!pieceOn) return null
  const now = await $.clock.now()
  let pieces = await pulsePieces($, now, true)
  if (piecesWidth(pieces) > (columns || 80)) pieces = await pulsePieces($, now, false)
  if (!pieces.length) return null
  return els.Box({
    flexDirection: 'row',
    children: bandParts($, els, pieces, 'p'),
  })
}

async function hintBand($, els) {
  if (!enabled('usageHints')) return null
  const now = await $.clock.now()
  const hint = await currentHint($, now)
  if (!hint) return null
  const c = config()
  return els.Box({
    flexDirection: 'row',
    children: [
      els.Text({ color: c.colors.warn, wrap: 'truncate-end', children: [c.usageHints.icon + hint + '  '] }),
      els.Button({
        key: 'hint-snooze',
        label: c.usageHints.snoozeLabel,
        hotkey: c.usageHints.snoozeHotkey,
        plain: true,
        dimColor: true,
        onPress: () => {
          hintSnoozedUntilTurn = turnsSeen + c.usageHints.snoozeTurns
          $.ui.invalidate('ui.render')
        },
      }),
    ],
  })
}

// Every tool call: when it ended (the cache's clock), its task-list changes, and the turn's tallies.
async function pulseToolCall($, e, next) {
  const started = await $.clock.now()
  const ran = await next(e)
  const now = await $.clock.now()
  lastActivity = now
  const failed = !!(ran && (ran.isError || ran.deny !== undefined))
  if (enabled('usageMeter')) logEvent(now, e.tool, describeCall(e), failed)
  if (!e.agentId && currentTurn) {
    currentTurn.tools += 1
    if (e.tool === 'Agent') currentTurn.agents += 1
    if (failed) currentTurn.errors += 1
  }
  const r = ran && !failed ? ran.result : null
  if (e.tool === 'TodoWrite' && r) todos = r.newTodos || e.todos || null
  if (e.tool === 'TaskCreate' && r && r.task) taskList.set(r.task.id, { subject: r.task.subject, status: 'pending', active: e.activeForm })
  if (e.tool === 'TaskUpdate' && r && r.success) {
    const t = taskList.get(e.taskId) || { subject: e.subject || e.taskId, status: 'pending' }
    if (e.status) t.status = e.status
    if (e.subject) t.subject = e.subject
    if (e.activeForm) t.active = e.activeForm
    taskList.set(e.taskId, t)
  }
  if (['Edit', 'Write', 'Bash', 'PowerShell', 'NotebookEdit'].includes(e.tool)) gitReadAt = 0
  void started
  return ran
}

function describeCall(e) {
  const said = e.command || e.file_path || e.pattern || e.description || e.query || e.url || ''
  return e.tool + (said ? ': ' + short(String(said).replace(/\s+/g, ' ').trim(), 60) : '')
}

async function pulseTurnStart($, e) {
  if (e.agentId) return
  currentTurn = { started: await $.clock.now(), tools: 0, agents: 0, errors: 0 }
}

async function pulseTurnComplete($, e) {
  const now = await $.clock.now()
  lastActivity = now
  if (e.agentId) return
  turnsSeen += 1
  if (enabled('usageMeter')) {
    try {
      const u = await $.session.usage({ breakdown: 'summary' })
      if (u.context.tokens != null) contextSteps.push(u.context.tokens)
      while (contextSteps.length > 20) contextSteps.shift()
      if (u.context.breakdown && u.context.breakdown.autoCompactThreshold) compactAt = u.context.breakdown.autoCompactThreshold
    } catch {
      // No reading: the growth line waits for the next turn.
    }
  }
  if (enabled('turnSummary') && currentTurn) {
    const u = e.usage
    const s = config().turnSummary
    const bits = []
    if (currentTurn.tools) bits.push(currentTurn.tools + ' tool' + (currentTurn.tools === 1 ? '' : 's') + (currentTurn.errors ? ' (' + currentTurn.errors + ' failed)' : ''))
    if (currentTurn.agents) bits.push(currentTurn.agents + ' subagent' + (currentTurn.agents === 1 ? '' : 's'))
    if (u) {
      const read = u.input_tokens + u.cache_read_input_tokens + u.cache_creation_input_tokens
      bits.push(tokens(read) + ' in · ' + tokens(u.output_tokens) + ' out')
      if (read) bits.push(Math.round((u.cache_read_input_tokens / read) * 100) + '% cached')
    }
    if (bits.length) turnStats.set(e.durationMs, s.separator + bits.join(' · '))
    while (turnStats.size > 300) turnStats.delete(turnStats.keys().next().value)
  }
  currentTurn = null
  logEvent(now, 'turn', 'Turn ended (' + duration(e.durationMs) + ')' + (e.reason !== 'answer' ? ' · ' + e.reason : ''), e.reason === 'error')
}

// The engine's "Baked for 1m 4s" line, with the turn's tallies after it.
async function turnSummaryRender($, e, next) {
  const theirs = await next(e)
  if (!enabled('turnSummary') || e.surface !== 'terminal') return theirs
  const line = turnStats.get(e.props.durationMs)
  if (!line) return theirs
  const { Box, Text } = $.ui.resolve(e)
  return Box({ flexDirection: 'row', children: [theirs, Text({ dimColor: true, wrap: 'truncate-end', children: [line] })] })
}

// ═══ Save before compact ═════════════════════════════════════════════════════════════════════════

// Before the conversation is compacted, keep what it was about: the summary the compaction wrote,
// how to resume the full chat, the files it changed. One markdown file per compaction.
async function compactSave($, e, next) {
  const result = await next(e)
  if (!enabled('saveBeforeCompact') || e.trigger === 'precompute' || e.agentId || !result || result.skip) return result
  try {
    const c = config().saveBeforeCompact
    const id = await sessionId($)
    const root = await $.session.root()
    const home = ((await $.env.get('USERPROFILE')) || (await $.env.get('HOME')) || '').replace(/\\/g, '/')
    const stamp = new Date(await $.clock.now()).toISOString().replace(/[:T]/g, '-').slice(0, 16)
    const summary = (result.messages || []).find((msg) => msg.role === 'user' && msg.text) || (result.messages || [])[0]
    const r = enabled('workLog') ? await record($) : null
    const files = r ? Object.entries(r.files).map(([p, f]) => '- ' + p + ' (+' + f.added + ' -' + f.removed + ')') : []
    const text = [
      '# ' + c.title.replace('{project}', root.replace(/\\/g, '/').split('/').pop()),
      '',
      '- When: ' + new Date(await $.clock.now()).toLocaleString(),
      '- Project: ' + root,
      '- Resume the full chat: `claude --resume ' + id + '`',
      '- Compaction: ' + e.trigger + (result.tokensBefore ? ', ' + tokens(result.tokensBefore) + ' → ' + tokens(result.tokensAfter || 0) + ' tokens' : ''),
      '',
      '## Files changed in this chat',
      files.length ? files.join('\n') : '(none recorded)',
      '',
      '## Summary the compaction kept',
      '',
      summary ? summary.text : '(no summary text)',
      '',
    ].join('\n')
    const path = home + '/' + c.folder + '/' + stamp + '-' + id.slice(0, 8) + '.md'
    await $.fs.write(path, text)
    $.ui.toast('Saved the chat before compacting: ' + path)
  } catch (err) {
    $.ui.toast('Could not save before compacting: ' + String((err && err.message) || err))
  }
  return result
}

// ═══ /risky test ═════════════════════════════════════════════════════════════════════════════════

async function riskySessionStart($) {
  if (!enabled('confirmRiskyCommands')) return
  await $.command.register({ name: 'risky', immediate: true, description: 'Check a command against the risky-command rules without running it: /risky <command>', argumentHint: '<command>' })
}

function riskyCommand($, e) {
  const command = String(e.args || '').trim()
  if (!command) return { text: 'Usage: /risky <command>, e.g. /risky git push --force' }
  const rule = riskyRule(config().confirmRiskyCommands, command)
  return { text: rule ? 'Would ask first: ' + rule.name : 'Would run without asking.' }
}

// ═══ Wiring ══════════════════════════════════════════════════════════════════════════════════════

// The switches, in the order the settings page lists them, grouped.
const GROUPS = [
  { title: 'See more', fields: ['usageMeter', 'gitStatus', 'taskProgress', 'usageHints', 'turnSummary', 'outputViewer', 'workLog'] },
  { title: 'Stay safe', fields: ['hideSecrets', 'stopRepeatedFailures', 'confirmRiskyCommands', 'saveBeforeCompact'] },
  { title: 'Parallel chats', fields: ['editCollisionCheck', 'oneTestRunAtATime', 'otherChatsLine', 'devServerWatch'] },
]

async function settingsPane($, e) {
  const { Box, Text, Button } = $.ui.resolve(e)
  const manifest = JSON.parse(await $.fs.read($.plugin.root + '/.claude-plugin/plugin.json'))
  const fields = manifest.userConfig
  const keys = new Map()
  for (const row of await $.config.list()) {
    const field = row.key.split('.').pop()
    if (row.key.startsWith(manifest.name) && fields[field]) keys.set(field, row.key)
  }
  const s = config().settings
  const titleWidth = Math.max(...Object.values(fields).map((f) => f.title.length)) + 2
  // One line per switch: the switch, its name, a short summary cut to the width. The full
  // explanation is the field's description in /config.
  const rows = [Text({ dimColor: true, wrap: 'truncate-end', children: [s.intro] })]
  for (const group of GROUPS) {
    rows.push(Text({ children: [' '] }), Text({ bold: true, children: [group.title] }))
    for (const field of group.fields.filter((f) => fields[f])) {
      const on = enabled(field)
      rows.push(
        Box({
          flexDirection: 'row',
          children: [
            Button({ key: 'flip-' + field, label: on ? s.onLabel : s.offLabel, variant: on ? 'primary' : 'secondary', onPress: () => void flip($, keys.get(field), !on) }),
            Text({ children: ['  '] }),
            Text({ bold: on, dimColor: !on, children: [fields[field].title.padEnd(titleWidth)] }),
            Text({ dimColor: true, wrap: 'truncate-end', children: [s.summaries[field] || ''] }),
          ],
        }),
      )
    }
  }
  return Box({ flexDirection: 'column', children: rows })
}

// The settings page's height: the intro, and per group a gap, a title and its switches.
const SETTINGS_ROWS = 1 + GROUPS.reduce((n, g) => n + 2 + g.fields.length, 0) // fields missing from the manifest are skipped when drawn

// Changing a switch writes the setting; the engine reloads this module with the new value.
async function flip($, key, value) {
  if (!key) return $.ui.toast('Use /config to change this one')
  const { deny } = await $.config.set({ key, value })
  if (deny) $.ui.toast(deny)
}

export function register(on, options) {
  setOptions(options)

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'switchboard', immediate: true, description: 'Switchboard settings: turn each feature on or off' })
    await trace($, 'session.start', { options, surfaces: await $.session.surfaces() })
    $.clock.every(2000, () => void flushTrace($))
    await secretsSessionStart($)
    await meterSessionStart($)
    await viewerSessionStart($)
    await logSessionStart($)
    await chatsSessionStart($)
    await chatsCommandSessionStart($)
    await devSessionStart($)
    await riskySessionStart($)
    return next(e)
  })

  on('session.end', async ($, e, next) => {
    await chatsSessionEnd($)
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    failuresPromptSubmit()
    await viewerPromptSubmit($, e)
    await logPromptSubmit($, e)
    await chatsPromptSubmit($, e)
    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    await pulseTurnStart($, e)
    await chatsTurnStart($)
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    await meterTurnComplete($, e)
    await pulseTurnComplete($, e)
    await logTurnComplete($, e)
    await chatsTurnComplete($, e)
    return result
  })

  // Outermost first: the features that may refuse a call, then the ones that watch it, then the
  // one that hides secrets, so every result the others keep is already scrubbed.
  on('tool.call', ($, e, next) =>
    riskyToolCall($, e, (e1) =>
      collisionToolCall($, e1, (e2) =>
        testRunToolCall($, e2, (e3) =>
          failuresToolCall($, e3, (e4) =>
            meterToolCall($, e4, (e5) =>
              pulseToolCall($, e5, (e6) =>
                viewerToolCall($, e6, (e7) =>
                  logToolCall($, e7, (e8) =>
                    chatsRecordEdit($, e8, (e9) =>
                      secretsToolCall($, e9, next))))))))))
  )

  on('session.append', { door: 'tool-result' }, ($, e, next) => secretsAppend($, e, next))
  on('session.compact', ($, e, next) => compactSave($, e, next))

  // Commands fire only for features that registered them, so only for switches that are on.
  on('command.run', { command: 'switchboard' }, async ($) => {
    await $.ui.open({ id: 'switchboard', title: 'Switchboard', focus: true, closeOnEscape: true, rows: SETTINGS_ROWS })
    return {}
  })
  on('command.run', { command: 'meter' }, ($) => meterCommand($))
  on('command.run', { command: 'viewer' }, ($, e) => viewerCommand($, e))
  on('command.run', { command: 'worklog' }, ($) => logCommand($))
  on('command.run', { command: 'chats' }, ($) => chatsCommand($))
  on('command.run', { command: 'devserver' }, ($, e) => devCommand($, e))
  on('command.run', { command: 'risky' }, ($, e) => riskyCommand($, e))

  on('ui.render', { component: 'Pane', requestId: 'switchboard' }, ($, e) => settingsPane($, e))
  on('ui.render', { component: 'Pane', requestId: 'meter' }, ($, e) => meterPane($, e))
  on('ui.render', { component: 'Pane', requestId: 'viewer' }, ($, e) => viewerPane($, e))
  on('ui.render', { component: 'Pane', requestId: 'worklog' }, ($, e) => logPane($, e))
  on('ui.close', { id: 'viewer' }, ($, e, next) => {
    viewerClosed()
    return next(e)
  })

  on('ui.render', { component: 'ToolResult' }, ($, e, next) => viewerToolResult($, e, next))
  on('ui.render', { component: 'UserMessage' }, ($, e, next) => viewerUserMessage($, e, next))
  on('ui.render', { component: 'TurnDuration' }, ($, e, next) => turnSummaryRender($, e, next))

  // The line above the prompt: each feature's row, under whatever else draws there.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const theirs = await next(e)
    if (e.props.hasSurvey) return theirs
    const els = $.ui.resolve(e)
    const rows = []
    const cols = e.props.bodyColumns
    const lines = [await meterBand($, els, cols), await pulseBand($, els, cols), await hintBand($, els), await otherChatsBand($, els), await devBand($, els)]
    for (const row of lines) if (row) rows.push(row)
    if (!rows.length) return theirs
    return els.Box({ flexDirection: 'column', children: theirs ? [theirs, ...rows] : rows })
  })
}
