# Nguyen Cong Dat — Personal Homepage

A zero-build research homepage: semantic HTML, modern CSS, and one small vanilla
JavaScript file. No dependencies, no build step, deploys straight to GitHub Pages.

## Local preview

Open `index.html` directly, or serve the directory with any static server:

```bash
python -m http.server 8000
```

## Design system

The visual language is adapted from [elevenlabs.io](https://elevenlabs.io): a warm
cream canvas, hairline borders in place of heavy shadows, pill-shaped controls,
monospace metadata, and a soft halo ring on hover.

All tokens live in `:root` at the top of `style.css`, with a dark override under
`:root[data-theme="dark"]` and a matching `prefers-color-scheme` block.

| Token group | Notes |
| --- | --- |
| `--page`, `--surface*` | warm cream surfaces (`#f6f4f2` family) |
| `--ink`, `--muted`, `--faint` | warm greys, not blue-greys |
| `--line`, `--line-strong` | hairline borders carry most of the structure |
| `--sand`, `--accent` | venue pills and links |
| `--shadow-card`, `--shadow-hover` | micro-shadow, then a 4px halo ring on hover |
| `--display`, `--sans`, `--mono` | Inter Tight / Inter / JetBrains Mono |

Theme choice is stored in `localStorage` under `theme` and applied by an inline
script in `<head>` so the page never flashes the wrong theme.

## Structure

```
index.html   markup + inline SVG research diagrams
style.css    design tokens, layout, components, responsive rules
script.js    theme toggle, ambient canvas, scroll reveal, active-nav state
assets/      CV PDF (served from the hero "CV" button)
images/      portrait and publication pipeline figures
```

The three research-direction diagrams are inline SVG rather than raster images:
they stay crisp, weigh nothing, and pick up the theme through CSS custom
properties (`.fig-*` classes in `style.css`).

## Updating content

- **CV** — replace `assets/Nguyen-Cong-Dat-CV.pdf`.
- **Publications** — each is one `<li class="pub">`; the venue pill, year, links,
  tags, and optional pipeline figure are all plain markup.
- **Preprints** — `<li>` entries in `.preprint-list`, each with a status pill.
- **News** — `<li>` entries in `.timeline`; the first item gets the accent dot.

Everything animated is gated behind `prefers-reduced-motion`, and the scroll
reveal only hides content when JavaScript is running (`.js [data-reveal]`), so
the page degrades cleanly.
