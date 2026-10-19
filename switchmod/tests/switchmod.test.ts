import { expect, test } from 'claude-code/testing'


const ROOT = 'd:/work/app'
const NOW = 1_800_000_000_000
const FILE = 'd:/work/app/src/goods-form.tsx'
const SECRET = 'sb_secret_test_value_1234567890'
const ENV = 'NEXT_PUBLIC_SITE_URL=https://example.test\nSUPABASE_SECRET_KEY=' + SECRET + '\nSHORT=abc\n'

// Everything the mod reaches outside itself, answered here: who this session is, the time, the
// store every session shares (a Map), one .env.local file, the process probe, the user's answer
// to a question, and the tools themselves (each returns `output`).
function world(on: any, opts: { answer?: string; playwrightRunning?: number; output?: any; failing?: boolean } = {}) {
  const store = new Map<string, unknown>()
  const asked: string[] = []
  const toolsRun: string[] = []
  const arg = (e: any, name: string) => e[name] ?? e[0]
  on('session.id', () => ({ value: 'this-chat' }))
  on('session.root', () => ({ value: ROOT }))
  on('session.cwd', () => ({ value: ROOT }))
  on('clock.now', () => ({ value: NOW }))
  on('store.get', (_: any, e: any) => ({ value: store.get(arg(e, 'key')) }))
  on('store.set', (_: any, e: any) => {
    store.set(arg(e, 'key'), e.value ?? e[1])
    return { value: undefined }
  })
  on('store.keys', () => ({ value: [...store.keys()] }))
  on('store.delete', (_: any, e: any) => {
    store.delete(arg(e, 'key'))
    return { value: undefined }
  })
  on('fs.list', () => ({ value: [] }))
  // The engine hands paths over in the platform's spelling (backslashes on Windows).
  const isEnv = (e: any) => String(e.path).replace(/\\/g, '/').endsWith('/.env.local')
  on('fs.exists', (_: any, e: any) => ({ value: isEnv(e) }))
  on('fs.read', (_: any, e: any) => {
    if (isEnv(e)) return { value: ENV }
    throw new Error('no such file: ' + JSON.stringify(e))
  })
  on('ui.toast', () => ({ value: undefined }))
  on('process.run', () => ({ value: { exitCode: 0, stdout: String(opts.playwrightRunning ?? 0) + '\n', stderr: '' } }))
  on('tool.call', (_: any, e: any) => {
    if (e.tool === 'AskUserQuestion') {
      const q = e.questions[0].question
      asked.push(q)
      return { result: { questions: e.questions, answers: { [q]: opts.answer ?? '' } } }
    }
    toolsRun.push(e.tool)
    if (opts.failing) return { isError: true, result: 'boom', text: 'boom' }
    return { result: opts.output ?? 'ok' }
  })
  return { store, asked, toolsRun }
}

// ── Hide secrets ────────────────────────────────────────────────────────────

test('a secret from .env.local in Bash output is hidden before Claude reads it', async ($, on) => {
  world(on, { output: { stdout: 'SUPABASE_SECRET_KEY=' + SECRET + '\nSHORT=abc', stderr: '', interrupted: false } })

  const r: any = await $.tool.call({ tool: 'Bash', command: 'cat .env.local' })

  expect(r.result.stdout).toContain('[hidden: SUPABASE_SECRET_KEY]')
  expect(r.result.stdout).not.toContain(SECRET)
  expect(r.result.stdout).toContain('SHORT=abc')
})

test('with Hide secrets off, output is passed through untouched', { options: { hideSecrets: false } }, async ($, on) => {
  world(on, { output: { stdout: SECRET, stderr: '', interrupted: false } })

  const r: any = await $.tool.call({ tool: 'Bash', command: 'cat .env.local' })

  expect(r.result.stdout).toBe(SECRET)
})

// ── Stop repeated failures ──────────────────────────────────────────────────

test('the same failing call is refused on the third try', async ($, on) => {
  const w = world(on, { failing: true })
  const call = { tool: 'Bash', command: 'npm run build' }

  await $.tool.call(call)
  await $.tool.call(call)
  const third: any = await $.tool.call(call)

  expect(w.toolsRun).toEqual(['Bash', 'Bash'])
  expect(String(third.deny ?? third.text)).toContain('already failed 2 times')
})

// ── Confirm risky commands ──────────────────────────────────────────────────

test('a force push is held, and refused when the user says no', async ($, on) => {
  const w = world(on, { answer: "Don't run" })

  const r: any = await $.tool.call({ tool: 'Bash', command: 'git push --force origin main' })

  expect(w.toolsRun).toEqual([])
  expect(w.asked[0]).toContain('Force push')
  expect(String(r.deny ?? r.text)).toContain('chose not to run')
})

test('deleting node_modules is not treated as risky', async ($, on) => {
  const w = world(on, { answer: "Don't run" })

  await $.tool.call({ tool: 'Bash', command: 'rm -rf node_modules' })

  expect(w.asked).toEqual([])
  expect(w.toolsRun).toEqual(['Bash'])
})

// ── Parallel chats ──────────────────────────────────────────────────────────

// Another chat on the same project, open now, that changed FILE four minutes ago.
function anotherChatChanged(store: Map<string, unknown>) {
  store.set('chat:other-chat', { id: 'other-chat', root: ROOT, title: 'GST on sales', working: true, seen: NOW - 30_000 })
  store.set('file:' + FILE, { session: 'other-chat', title: 'GST on sales', at: NOW - 4 * 60 * 1000 })
}

test('an edit to a file another open chat just changed is held, and refused when the user says so', async ($, on) => {
  const w = world(on, { answer: "Don't edit" })
  anotherChatChanged(w.store)

  const r: any = await $.tool.call({ tool: 'Edit', file_path: FILE, old_string: 'a', new_string: 'b' })

  expect(w.toolsRun).toEqual([])
  expect(String(r.deny ?? r.text)).toContain('another open chat ("GST on sales") changed it 4 min ago')
  expect(w.asked[0]).toContain('goods-form.tsx')
})

test('"Edit anyway" lets the edit through, and the file is then recorded as this chat\'s', async ($, on) => {
  const w = world(on, { answer: 'Edit anyway' })
  anotherChatChanged(w.store)

  const r: any = await $.tool.call({ tool: 'Edit', file_path: FILE, old_string: 'a', new_string: 'b' })

  expect(r.deny).toBeUndefined()
  expect(w.toolsRun).toEqual(['Edit'])
  expect((w.store.get('file:' + FILE) as any).session).toBe('this-chat')
})

test('a file changed by a chat that has since closed is edited without a question', async ($, on) => {
  const w = world(on, { answer: "Don't edit" })
  anotherChatChanged(w.store)
  w.store.set('chat:other-chat', { id: 'other-chat', root: ROOT, title: 'GST on sales', working: false, seen: NOW - 10 * 60 * 1000 })

  const r: any = await $.tool.call({ tool: 'Write', file_path: FILE, content: 'x' })

  expect(w.asked).toEqual([])
  expect(r.deny).toBeUndefined()
})

test('a second Playwright run waits when one is already going', async ($, on) => {
  const w = world(on, { answer: 'Wait', playwrightRunning: 1 })

  const r: any = await $.tool.call({ tool: 'Bash', command: 'npx playwright test tests/e2e/a.spec.ts' })

  expect(w.toolsRun).toEqual([])
  expect(String(r.deny ?? r.text)).toContain('Another Playwright run is in progress')
})

test('with no run going, a Playwright run starts without a question', async ($, on) => {
  const w = world(on, { answer: 'Wait', playwrightRunning: 0 })

  const r: any = await $.tool.call({ tool: 'Bash', command: 'npx playwright test tests/e2e/a.spec.ts' })

  expect(w.asked).toEqual([])
  expect(r.deny).toBeUndefined()
  expect(w.toolsRun).toEqual(['Bash'])
})

test('with Edit collision check off, the edit goes through without a question', { options: { editCollisionCheck: false } }, async ($, on) => {
  const w = world(on, { answer: "Don't edit" })
  anotherChatChanged(w.store)

  await $.tool.call({ tool: 'Edit', file_path: FILE, old_string: 'a', new_string: 'b' })

  expect(w.asked).toEqual([])
  expect(w.toolsRun).toEqual(['Edit'])
})
