# dtheo

The CLI for [dtheo/ui](https://ui.dtheo.dev): add components to any React project, and check UI code against the
system. Built for people and coding agents.

```bash
npx dtheo init                      # utils, theme scope and the stylesheet
npx dtheo add button table line-chart
npx dtheo check src                 # 22 rules, each with the fix; exits 1 on errors
```

| Command | What it does |
| --- | --- |
| `dtheo init` | Adds `lib/utils.ts`, `lib/theme.tsx` and `styles/dtheo.css`, and imports the stylesheet in your global CSS |
| `dtheo add <items…>` | Copies components and what they need into your project; prints the install commands, types included |
| `dtheo list [query]` | Lists registry items by name or category (`dtheo list chart`); exits 1 when nothing matches |
| `dtheo check [paths…]` | Checks UI code offline: raw colors, palette classes, Tailwind text sizes, `transition-all`, slow or scale-0 motion, unnamed icon buttons, off-system radii… It reads class lists, not prose that mentions a class, and every ignore needs a reason |
| `dtheo rules` | Explains every check rule |
| `dtheo mcp` | Prints the MCP server config for Claude Code, VS Code (`servers`), Cursor, Windsurf and others (`mcpServers`) |

Options: `--registry <url>`, `--cwd <dir>`, `--overwrite`, `--dry-run`, `--json`, `--help` (`-h`), `--version` (`-v`). It
never writes outside your project.

Docs: [ui.dtheo.dev/docs/cli](https://ui.dtheo.dev/docs/cli) · MIT
