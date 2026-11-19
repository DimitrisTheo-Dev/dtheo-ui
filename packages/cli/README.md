# dtheo

The CLI for [dtheo/ui](https://ui.dtheo.dev): add components to any React project, and check UI code against the
system. Built for people and coding agents.

```bash
npx dtheo init                      # utils, theme scope and the stylesheet
npx dtheo add button table line-chart
npx dtheo check src                 # 17 rules, each with the fix; exits 1 on errors
```

| Command | What it does |
| --- | --- |
| `dtheo init` | Adds `lib/utils.ts`, `lib/theme.tsx` and `styles/dtheo.css` |
| `dtheo add <items…>` | Copies components and what they need into your project; prints the npm dependencies |
| `dtheo list [query]` | Lists registry items |
| `dtheo check [paths…]` | Checks UI code offline: raw colors, palette classes, `transition-all`, unnamed icon buttons, off-system radii… |
| `dtheo rules` | Explains every check rule |
| `dtheo mcp` | Prints the MCP server config for Claude Code, Cursor, VS Code and others |

Options: `--registry <url>`, `--cwd <dir>`, `--overwrite`, `--dry-run`, `--json`. It never writes outside your
project.

Docs: [ui.dtheo.dev/docs/cli](https://ui.dtheo.dev/docs/cli) · MIT
