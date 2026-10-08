# oh-my-claudecode

Written up from a screenshot of the project's home page (saved 8 Oct 2026):
[images/oh-my-claudecode.jpg](images/oh-my-claudecode.jpg). Not installed here;
kept as a reference to compare against Switchboard and these skills.

> **oh-my-claudecode** — "A weapon, not a tool"
>
> Multi-AI orchestration plugin for Claude Code. Coordinate Claude, Gemini, and Codex with
> 19 specialized agents, 28 skills, and MCP-powered tools.

| | |
|---|---|
| GitHub | https://github.com/Yeachan-Heo/oh-my-claudecode |
| Stars | 14.5k |
| Downloads | 26.5k a month |
| Version | 4.9.1 |
| npm package | `oh-my-claude-sisyphus@4.9.1` |
| Site sections | Features, Multi-AI, Installation, Agents |

## Install

As a Claude Code plugin (in Claude Code):

```
/plugin marketplace add https://github.com/Yeachan-Heo/oh-my-claudecode
/plugin install oh-my-claudecode
```

Or the npm package directly:

```
npm install -g oh-my-claude-sisyphus@4.9.1
```

## Before installing

- Read what it does first (house rule): its hooks and agents run in every session once installed.
- It overlaps with Switchboard (guards, multi-chat awareness) and may clash with its hooks;
  try it in one chat, not globally.
- Figures above are as shown on the page that day; check the repo for the current version.
