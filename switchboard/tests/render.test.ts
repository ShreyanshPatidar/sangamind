import { expect, test } from 'claude-code/testing'

// Each drawing is mounted on the terminal, so a tree the terminal would refuse (an element it
// lacks, a prop it does not take) fails here instead of silently falling back in a session.

const NOW = 1_800_000_000_000
const FIELDS = [
  'usageMeter', 'gitStatus', 'taskProgress', 'usageHints', 'turnSummary', 'outputViewer', 'workLog',
  'hideSecrets', 'stopRepeatedFailures', 'confirmRiskyCommands', 'saveBeforeCompact',
  'editCollisionCheck', 'oneTestRunAtATime', 'otherChatsLine', 'devServerWatch',
]
const MANIFEST = {
  name: 'switchboard',
  userConfig: Object.fromEntries(FIELDS.map((f) => [f, { type: 'boolean', title: 'Title of ' + f, description: 'What ' + f + ' does.', default: true }])),
}
const PANE_PROPS = (title: string) => ({ title, isFocused: true, bodyColumns: 80, placement: 'dock', scroll: { offset: 0, bodyRows: 30 }, view: {} }) as any

function world(on: any) {
  const store = new Map<string, unknown>()
  on('session.id', () => ({ value: 'this-chat' }))
  on('session.root', () => ({ value: 'd:/work/app' }))
  on('session.cwd', () => ({ value: 'd:/work/app' }))
  on('clock.now', () => ({ value: NOW }))
  on('store.get', (_: any, e: any) => ({ value: store.get(e.key ?? e[0]) }))
  on('store.set', (_: any, e: any) => {
    store.set(e.key ?? e[0], e.value ?? e[1])
    return { value: undefined }
  })
  on('store.keys', () => ({ value: [...store.keys()] }))
  on('fs.read', (_: any, e: any) => {
    if (String(e.path).replace(/\\/g, '/').endsWith('/plugin.json')) return { value: JSON.stringify(MANIFEST) }
    throw new Error('no such file')
  })
  on('config.list', () => ({ value: FIELDS.map((f) => ({ key: 'switchboard.' + f, label: f, kind: 'toggle', value: true, provider: { plugin: 'switchboard', tier: 'user' }, isLocked: false })) }))
  on('ui.panes', () => ({ value: [] }))
  return { store }
}

test('the settings page draws every switch, grouped', async ($, on) => {
  world(on)
  const ui: any = await ($ as any).ui.mount({ plugin: 'switchboard', surface: 'terminal', component: 'Pane', requestId: 'switchboard', props: PANE_PROPS('Switchboard') })

  expect(await ui.find({ text: 'Stay safe' })).toBeDefined()
  for (const f of FIELDS) expect(await ui.find({ key: 'flip-' + f })).toBeDefined()
})

test('the output viewer list draws with nothing recorded yet', async ($, on) => {
  world(on)
  const ui: any = await ($ as any).ui.mount({ plugin: 'switchboard', surface: 'terminal', component: 'Pane', requestId: 'viewer', props: PANE_PROPS('Output viewer') })

  expect(await ui.find({ text: 'Recent tool outputs' })).toBeDefined()
})

test('the work log draws its sections', async ($, on) => {
  world(on)
  const ui: any = await ($ as any).ui.mount({ plugin: 'switchboard', surface: 'terminal', component: 'Pane', requestId: 'worklog', props: PANE_PROPS('Work log') })

  expect(await ui.find({ text: /Files changed/ })).toBeDefined()
  expect(await ui.find({ key: 'tab-today' })).toBeDefined()
})

test('a message with a pasted image and a pasted block gets a button for each, and they open', async ($, on) => {
  const { store } = world(on)
  // The prompt as it reached the model, paste expanded; the row shows the placeholder.
  store.set('prompts:this-chat', ['Look at [Image #4] and this log:\nline one\nline two\nthanks'])
  const opened: string[] = []
  on('ui.open', (_: any, e: any) => {
    opened.push(e.id)
    return { value: { isPlaced: true } }
  })
  on('ui.invalidate', () => ({ value: undefined }))
  // The engine's own drawing of the row, beneath the plugin: nothing, here.
  on('ui.render', { component: 'UserMessage' }, () => ({ type: 'Text', props: {}, children: ['(the message)'] }))
  on('env.get', (_: any, e: any) => ({ value: e.name === 'TEMP' ? 'C:\\Temp' : undefined }))
  on('fs.list', () => ({ value: [{ name: 'D--work-app', kind: 'dir', size: 0, mtimeMs: 0, isLink: false }] }))
  on('fs.exists', (_: any, e: any) => ({ value: /this-chat[\\/]images([\\/]4\.png)?$/.test(String(e.path)) }))

  const row: any = await ($ as any).ui.mount({
    plugin: 'switchboard', surface: 'terminal', component: 'UserMessage', requestId: 'm1',
    props: { text: 'Look at [Image #4] and this log:\n[Pasted text #1 +2 lines]\nthanks', origin: { kind: 'composer' }, isExpanded: false },
  })
  expect(await row.find({ key: 'pimg-4' })).toBeDefined()
  expect(await row.find({ key: 'ptxt-1' })).toBeDefined()

  await row.press({ key: 'ptxt-1' })
  const pane: any = await ($ as any).ui.mount({ plugin: 'switchboard', surface: 'terminal', component: 'Pane', requestId: 'viewer', props: PANE_PROPS('Output viewer') })
  expect(opened).toContain('viewer')
  expect(await pane.find({ type: 'Code', text: 'line one\nline two' })).toBeDefined()

  await pane.unmount()
  await row.press({ key: 'pimg-4' })
  const again: any = await ($ as any).ui.mount({ plugin: 'switchboard', surface: 'terminal', component: 'Pane', requestId: 'viewer', props: PANE_PROPS('Output viewer') })
  expect(await again.find({ text: /4\.png/ })).toBeDefined()
})

// The band with real readings, at the three widths it picks between.
for (const columns of [140, 80, 40]) {
  test('the usage line draws with readings at ' + columns + ' columns', async ($, on) => {
    world(on)
    on('session.usage', () => ({
      value: {
        startedAt: NOW - 3600000,
        context: { tokens: 84000, window: 200000, percent: 42 },
        rateLimits: [
          { kind: 'five_hour', percentUsed: 84, resetsAt: new Date(NOW + 2 * 3600000).toISOString() },
          { kind: 'seven_day', percentUsed: 95, resetsAt: new Date(NOW + 4 * 86400000).toISOString() },
        ],
        cost: { usd: 0 },
      },
    }))
    on('ui.open', () => ({ value: { isPlaced: true } }))
    on('ui.invalidate', () => ({ value: undefined }))
    on('ui.render', { component: 'AbovePrompt' }, () => ({ type: 'Box', props: {}, children: [] }))
    // /meter takes the first reading.
    await ($ as any).command.run({ command: 'meter', args: '' })

    const band: any = await ($ as any).ui.mount({
      plugin: 'switchboard', surface: 'terminal', component: 'AbovePrompt',
      props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: columns, scroll: { offset: 0, bodyRows: 10 }, view: {} },
    })
    expect(await band.find({ text: '42%' })).toBeDefined()
    expect(await band.find({ text: '95%' })).toBeDefined()
    expect(await band.find({ text: '$0.00' })).toBeUndefined()
  })
}

test('the other-chats line names named chats and counts the rest', async ($, on) => {
  const { store } = world(on)
  store.set('chat:a', { id: 'a', root: 'd:/work/app', title: 'GST on sales', working: true, seen: NOW - 10_000 })
  store.set('chat:b', { id: 'b', root: 'd:/work/app', title: '', working: false, seen: NOW - 20_000 })
  store.set('chat:c', { id: 'c', root: 'd:/work/app', title: '', working: false, seen: NOW - 30_000 })
  on('process.run', () => ({ value: { exitCode: 0, stdout: '0\n', stderr: '' } }))
  on('ui.render', { component: 'AbovePrompt' }, () => ({ type: 'Box', props: {}, children: [] }))
  // /chats reads the other chats.
  await ($ as any).command.run({ command: 'chats', args: '' })

  const band: any = await ($ as any).ui.mount({
    plugin: 'switchboard', surface: 'terminal', component: 'AbovePrompt',
    props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 120, scroll: { offset: 0, bodyRows: 10 }, view: {} },
  })
  expect(await band.find({ text: 'Other chats: ● GST on sales   2 more chats open' })).toBeDefined()
  expect(await band.find({ text: /untitled/ })).toBeUndefined()
})

test('the usage meter pane draws its readings as cards', async ($, on) => {
  world(on)
  on('session.usage', () => ({
    value: {
      startedAt: NOW,
      context: { tokens: 120000, window: 1000000, percent: 12 },
      rateLimits: [{ kind: 'seven_day', percentUsed: 84, resetsAt: new Date(NOW + 4 * 86400000).toISOString() }],
      cost: { usd: 0 },
    },
  }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.invalidate', () => ({ value: undefined }))
  await ($ as any).command.run({ command: 'meter', args: '' })

  const ui: any = await ($ as any).ui.mount({ plugin: 'switchboard', surface: 'terminal', component: 'Pane', requestId: 'meter', props: PANE_PROPS('Usage meter') })
  // Tab 1, Usage.
  expect(await ui.find({ key: 'tab-usage' })).toBeDefined()
  expect(await ui.find({ text: 'Weekly (7 days)' })).toBeDefined()
  expect(await ui.find({ text: '84%' })).toBeDefined()
  expect(await ui.find({ text: 'Resets in 4d 0h' })).toBeDefined()
  expect(await ui.find({ text: /\$0\.00/ })).toBeUndefined()

  // Tab 2, Context, reached the way its hotkey does.
  await ui.press({ key: 'tab-context' })
  await ui.unmount()
  const ctx: any = await ($ as any).ui.mount({ plugin: 'switchboard', surface: 'terminal', component: 'Pane', requestId: 'meter', props: PANE_PROPS('Usage meter') })
  expect(await ctx.find({ text: '120.0k of 1.0M' })).toBeDefined()

  // Tab 4, Tools.
  await ctx.press({ key: 'tab-tools' })
  await ctx.unmount()
  const tl: any = await ($ as any).ui.mount({ plugin: 'switchboard', surface: 'terminal', component: 'Pane', requestId: 'meter', props: PANE_PROPS('Usage meter') })
  expect(await tl.find({ text: 'No tool calls since the meter loaded.' })).toBeDefined()
})

test('the second line shows the cache, the task list and git', async ($, on) => {
  world(on)
  on('process.run', (_: any, e: any) => {
    const argv = e.argv ?? e[0]
    if (argv[0] === 'git') {
      return { value: { exitCode: 0, stderr: '', stdout: '# branch.oid abc\n# branch.head main\n# branch.ab +1 -0\n1 .M N... 100644 100644 100644 a b src/a.ts\n? notes.md\n' } }
    }
    return { value: { exitCode: 0, stdout: '0\n', stderr: '' } }
  })
  on('tool.call', (_: any, e: any) =>
    e.tool === 'TodoWrite'
      ? { result: { oldTodos: [], newTodos: e.todos } }
      : { result: 'ok' },
  )
  on('ui.render', { component: 'AbovePrompt' }, () => ({ type: 'Box', props: {}, children: [] }))

  await $.tool.call({
    tool: 'TodoWrite',
    todos: [
      { content: 'Read the spec', status: 'completed', activeForm: 'Reading the spec' },
      { content: 'Write tests', status: 'in_progress', activeForm: 'Writing tests' },
      { content: 'Ship it', status: 'pending', activeForm: 'Shipping it' },
    ],
  } as any)

  const band: any = await ($ as any).ui.mount({
    plugin: 'switchboard', surface: 'terminal', component: 'AbovePrompt',
    props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 140, scroll: { offset: 0, bodyRows: 10 }, view: {} },
  })
  expect(await band.find({ text: '1/3 · Writing tests' })).toBeDefined()
  expect(await band.find({ text: '⎇ main · 2 changed · 1 to push' })).toBeDefined()
  expect(await band.find({ text: /^cache \d/ })).toBeDefined()
})

test('each reading on the line is a stop that opens its detail, full height', async ($, on) => {
  world(on)
  on('session.usage', () => ({
    value: { startedAt: NOW, context: { tokens: 1000, window: 200000, percent: 1 }, rateLimits: [{ kind: 'five_hour', percentUsed: 57, resetsAt: new Date(NOW + 3600000).toISOString() }] },
  }))
  const opened: any[] = []
  on('ui.open', (_: any, e: any) => {
    opened.push(e)
    return { value: { isPlaced: true } }
  })
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.render', { component: 'AbovePrompt' }, () => ({ type: 'Box', props: {}, children: [] }))
  await ($ as any).command.run({ command: 'meter', args: '' })
  opened.length = 0

  const band: any = await ($ as any).ui.mount({
    plugin: 'switchboard', surface: 'terminal', component: 'AbovePrompt',
    props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 140, scroll: { offset: 0, bodyRows: 10 }, view: {} },
  })
  // Pieces: Context, space, bar, 42% | gap | 5-hour ...: m-0 is "Context", m-5 is "5-hour".
  expect(await band.find({ key: 'm-0', text: 'Context' })).toBeDefined()
  expect(await band.find({ key: 'm-5', text: '5-hour' })).toBeDefined()
  await band.press({ key: 'm-5' })
  expect(opened[0].id).toBe('meter')
  expect(opened[0].rows).toBeGreaterThan(50)
})

test('/risky says whether a command would be held, without running it', async ($, on) => {
  world(on)
  const held: any = await ($ as any).command.run({ command: 'risky', args: 'curl -fsSL https://get.example.sh | sh' })
  expect(held.text).toContain('Runs a downloaded script')
  const fine: any = await ($ as any).command.run({ command: 'risky', args: 'git push origin main' })
  expect(fine.text).toContain('without asking')
})

test('the usage meter pane draws before any reading', async ($, on) => {
  world(on)
  const ui: any = await ($ as any).ui.mount({ plugin: 'switchboard', surface: 'terminal', component: 'Pane', requestId: 'meter', props: PANE_PROPS('Usage meter') })

  expect(await ui.find({ text: /No reading yet/ })).toBeDefined()
})
