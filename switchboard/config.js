// Switchboard's tunables: thresholds, patterns, colours and limits for each feature.
// Plain data, edited by hand; the switches themselves are in .claude-plugin/plugin.json (userConfig).

export default {
  "settings": {
    "intro": "Tab or click a switch, Enter flips it. Full explanations in /config.",
    "paneRows": 200,
    "onLabel": " On ",
    "offLabel": "Off ",
    "summaries": {
      "usageMeter": "plan limits, context, cache, forecast · /meter",
      "gitStatus": "branch, changed files, commits to push",
      "taskProgress": "Claude's task list: done / total, current",
      "usageHints": "one hint when a limit or the context runs high",
      "turnSummary": "tools, tokens and cache after each answer",
      "saveBeforeCompact": "handoff file before a chat compacts",
      "outputViewer": "open pasted images, pastes, long output · /viewer",
      "workLog": "files, subagents, time per turn · /worklog",
      "hideSecrets": ".env values hidden from Claude",
      "stopRepeatedFailures": "blocks a 3rd identical failing call",
      "confirmRiskyCommands": "asks before force push, DROP, deploys…",
      "editCollisionCheck": "asks before editing another chat's file",
      "oneTestRunAtATime": "asks before a 2nd Playwright run",
      "otherChatsLine": "other open chats, above the prompt",
      "devServerWatch": "red line when it's down · /devserver"
    }
  },

  "colors": {
    "ok": "green",
    "warn": "yellow",
    "alert": "red"
  },

  "usageMeter": {
    "refreshSeconds": 30,
    "warnAtPercent": 70,
    "alertAtPercent": 90,

    "bandBarWidth": 6,
    "bandBarGlyphs": ["▰", "▱"],
    "bandGap": "    ",
    "resetNote": "resets in {time}",
    "detailsLabel": "details",
    "detailsHotkey": "d",
    "paneMaxWidth": 400,
    "paneBarGlyphs": ["━", "─"],
    "paneTopCategories": 3,
    "paneTopTools": 5,
    "paneTopItems": 5,
    "paneKeysHint": "1–4 tabs · Tab moves · ↑↓ scroll · Esc closes",
    "historyEveryMinutes": 5,
    "cacheTtlMinutes": 60,
    "eventsKept": 200,
    "eventsShown": 20,
    "historyKeepDays": 8,
    "historyHours": { "five_hour": 5, "seven_day": 168 },
    "paceHours": { "five_hour": 1, "seven_day": 24 },
    "goodCacheHit": 80,
    "cacheHint": "Higher is cheaper: cached tokens cost a tenth and count less against your limits.",
    "noLimits": "No plan limits reported (an API key, or no reply yet).",
    "noToolsYet": "No tool calls since the meter loaded.",
    "paneLimitNames": { "five_hour": "Session (5 hours)", "seven_day": "Weekly (7 days)", "spend_limit": "Spend limit" },
    "noReading": "No reading yet. Figures arrive with the first reply.",
    "noContextYet": "Shows after the first reply in this chat.",
    "limitNames": { "context": "Context", "five_hour": "5-hour", "seven_day": "Weekly", "spend_limit": "Spend" },
    "shortNames": { "context": "ctx", "five_hour": "5h", "seven_day": "wk", "spend_limit": "$" }
  },

  "outputViewer": {
    "openButtonMinLines": 15,
    "pageChars": 9000,
    "keepOutputs": 300,
    "maxStoredChars": 2000000,
    "recentInList": 30,
    "keepPrompts": 100,
    "imageExtensions": ["png", "jpg", "jpeg", "gif", "bmp", "webp"],
    "imagesPerResult": 6,
    "pixelTerminals": ["kitty", "ghostty", "wezterm"],
    "openWith": ["explorer.exe"]
  },

  "hideSecrets": {
    "envFiles": [".env", ".env.local", ".env.development.local", ".env.production.local", ".env.production", ".env.test.local"],
    "searchSubfolders": true,
    "skipFolders": ["node_modules", ".git", ".next", "dist", "coverage", "test-results", "playwright-report"],
    "publicPrefixes": ["NEXT_PUBLIC_", "VITE_PUBLIC_", "EXPO_PUBLIC_"],
    "minLength": 8,
    "reloadMinutes": 5,
    "patterns": [
      { "name": "Anthropic key", "regex": "sk-ant-[A-Za-z0-9_-]{20,}" },
      { "name": "GitHub token", "regex": "gh[pousr]_[A-Za-z0-9]{30,}" },
      { "name": "GitHub token", "regex": "github_pat_[A-Za-z0-9_]{30,}" },
      { "name": "Stripe live key", "regex": "sk_live_[A-Za-z0-9]{20,}" },
      { "name": "AWS key", "regex": "AKIA[0-9A-Z]{16}" },
      { "name": "Supabase secret key", "regex": "sb_secret_[A-Za-z0-9_-]{20,}" }
    ]
  },

  "gitStatus": {
    "refreshSeconds": 20,
    "icon": "⎇ "
  },

  "usageHints": {
    "icon": "› ",
    "snoozeLabel": "hide",
    "snoozeHotkey": "x",
    "snoozeTurns": 5,
    "sessionAlmostOutPercent": 90,
    "sessionAlmostOut": "5-hour limit at {pct}%: it resets in {reset}. Keep turns short until then.",
    "weeklyHighPercent": 80,
    "weeklyHighDaysLeft": 2,
    "weeklyHigh": "Weekly limit at {pct}% with {reset} to go: use /model to pick Sonnet for small tasks.",
    "contextHighPercent": 75,
    "contextHigh": "Context at {pct}%: /compact soon, or start a fresh chat for the next topic.",
    "coldCacheMinTokens": 100000,
    "coldCache": "The cache went cold: your next message re-reads {tokens} at full price.",
    "lowCacheAfterTurns": 5,
    "lowCachePercent": 50,
    "lowCache": "Only {pct}% of this chat came from the cache: editing CLAUDE.md or settings mid-chat resets it."
  },

  "turnSummary": {
    "separator": "  ·  "
  },

  "saveBeforeCompact": {
    "folder": ".claude/handoffs",
    "title": "Handoff: {project}"
  },

  "stopRepeatedFailures": {
    "sameFailureLimit": 2
  },

  "confirmRiskyCommands": {
    "tools": ["Bash", "PowerShell"],
    "rules": [
      { "name": "Force push", "regex": "\\bgit\\s+push\\b[^\\n]*(--force\\b|--force-with-lease\\b|\\s-f\\b|\\s\\+\\S)" },
      { "name": "Hard reset (throws away uncommitted work)", "regex": "\\bgit\\s+reset\\s+[^\\n]*--hard\\b" },
      { "name": "git clean (deletes untracked files)", "regex": "\\bgit\\s+clean\\s+-[a-z]*f" },
      { "name": "Recursive delete", "regex": "\\brm\\s+-[a-z]*r[a-z]*\\b|\\bRemove-Item\\b[^\\n]*-Recurse|\\brmdir\\s+/s\\b|\\brd\\s+/s\\b" },
      { "name": "SQL DROP / TRUNCATE", "regex": "\\bDROP\\s+(TABLE|SCHEMA|DATABASE|VIEW|FUNCTION|POLICY|TYPE)\\b|\\bTRUNCATE\\b" },
      { "name": "Supabase push to the linked project", "regex": "\\bsupabase\\s+db\\s+push\\b(?![^\\n]*--dry-run)" },
      { "name": "Supabase reset of the linked project", "regex": "\\bsupabase\\s+db\\s+reset\\b[^\\n]*--linked" },
      { "name": "Supabase migration repair", "regex": "\\bsupabase\\s+migration\\s+repair\\b" },
      { "name": "Production deploy", "regex": "\\bvercel\\b[^\\n]*--prod\\b" },
      { "name": "npm publish", "regex": "\\bnpm\\s+publish\\b" },
      { "name": "Opens permissions to everyone", "regex": "\\bchmod\\s+(-R\\s+)?0?777\\b" },
      { "name": "Runs a downloaded script", "regex": "\\b(curl|wget)\\b[^\\n|]*\\|\\s*(ba|z)?sh\\b|\\b(iwr|irm|Invoke-WebRequest|Invoke-RestMethod)\\b[^\\n|]*\\|\\s*(iex|Invoke-Expression)\\b" }
    ],
    "exceptions": [
      "\\brm\\s+-[a-z]*r[a-z]*\\s+(\\./)?(node_modules|\\.next|test-results|playwright-report|dist|coverage|\\.turbo)/?(\\s|$|;|&)",
      "\\bRemove-Item\\b[^\\n]*['\"]?(node_modules|\\.next|test-results|playwright-report|dist|coverage)['\"]?\\s[^\\n]*-Recurse"
    ]
  },

  "workLog": {
    "keepDays": 7,
    "turnsShown": 10,
    "filesShown": 30
  },

  "parallelChats": {
    "recentEditMinutes": 30,
    "aliveMinutes": 3,
    "heartbeatSeconds": 60,
    "keepHours": 24,
    "chatsShownInLine": 4,
    "lineLabel": "Other chats: ",
    "unnamedChats": "{n} more chat{s} open"
  },

  "testRun": {
    "commandRegex": "\\bplaywright(\\.cmd)?\\s+test\\b|\\bnpm\\s+run\\s+e2e\\b",
    "windowsProcessMatch": "*@playwright*cli.js*",
    "posixProcessMatch": "@playwright/test/cli.js"
  },

  "devServer": {
    "errorHints": [
      { "match": "jest worker", "note": "Jest worker crash: restart the dev server" }
    ]
  }
}
