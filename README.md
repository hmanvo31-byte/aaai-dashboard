# AAAI — Active Ageing Index dashboard (prototype)

A static, no-build website that visualizes the AAAI cross-country demographic
data and the 65-indicator policy & statistics dataset for Vietnam, Indonesia,
Thailand, Singapore, Malaysia and Japan.

## Files

| File | Purpose | Who edits it |
|---|---|---|
| `index.html` | Page structure, the six views (Overview, Country profiles, Policy domains, Compare, Recommendations, About) | Rarely — only when adding a new view |
| `styles.css` | All visual design (colors, type, layout, tokens at the top) | Rarely — design changes only |
| `app.js` | Rendering logic, the status-normalization heuristic, the auto-gap engine, and the `CURATED_RECOMMENDATIONS` array | Occasionally — when adding curated recommendations |
| `data.js` | **All figures.** Generated from the two source workbooks. | **Every data refresh** |

## Running it

No build step. Open `index.html` in a browser, or serve the folder with any
static file server, e.g.:

```
python3 -m http.server 8000
```

then visit `http://localhost:8000/`.

## Updating the data

`data.js` is a plain JavaScript object (`AAAI_DATA`) generated from:

- `AAAI_Basic_Info_Sheet.xlsx` → `AAAI_DATA.demographics`
- `Synthesized_AAAI_as_of_*.xlsx`, sheet **"Synthesized Input"** → `AAAI_DATA.domains`

To refresh after the source workbooks change, re-run an export script that:

1. Reads the **Summary** tab of the basic-info workbook (`Indicator`, then one
   column per country) into `demographics[code] = {section, label, values}`.
2. Reads the **Synthesized Input** tab: a new domain starts whenever column A
   is non-empty; a new indicator starts whenever column B (the code, e.g.
   `1.1`) is non-empty; each indicator's country values come from the row
   labeled `Value (Final)` in column E, and each source from `Source (Final)`.
3. Writes the result as `const AAAI_DATA = {...};` to `data.js`.

This is exactly what produced the current file — ask for the extraction
script again if the workbook layout changes.

**Nothing else needs to change for a routine data refresh** — `index.html`,
`styles.css` and `app.js` all read from `AAAI_DATA` at load time.

## Adding a policy recommendation

Open `app.js` and add an entry to `CURATED_RECOMMENDATIONS` near the top:

```js
{
  country: 'Thailand',
  priority: 'high',        // 'high' | 'medium' | 'low'
  domain: '1. Policy & Statistics',
  code: '1.4',              // the indicator code this recommendation responds to
  text: 'One or two sentences of concrete, actionable guidance.'
}
```

It will appear on the **Recommendations** view immediately below the
auto-generated "gap" worklist, which regenerates itself from `data.js` and
needs no manual editing.

## Known data quality issues (fix before public launch)

See the **About the data** view in the running dashboard — it lists the
specific cells that need correction (a few Japan entries carry a source URL
instead of Yes/No, several "Not sure / TBC" placeholders, and the `#REF!`
errors inherited from the original workbook).

## Syncing design tokens from Figma (colors, type, spacing)

This repo includes a working pipeline so a designer can change a color or
spacing value in Figma and have it appear on the live site without anyone
touching code:

```
Figma Variables → Tokens Studio plugin → /tokens/global.json (this repo)
                                              │
                              GitHub Action runs Style Dictionary
                                              ▼
                                        tokens.css (generated)
                                              │
                          index.html loads it after styles.css
                                              ▼
                                    GitHub Pages redeploys
```

**One-time setup:**

1. In Figma, create Variables with the exact same names as the tokens in
   `/tokens/global.json` (`ink`, `paper`, `gold`, `jade`, `c-vn` … one per
   line in that file).
2. Install the free **Tokens Studio for Figma** plugin (Community tab in
   Figma → search → Install).
3. In the plugin's Settings → Sync providers, add **GitHub**: point it at
   this repo, a personal access token, and the `tokens` folder.
4. Push once from the plugin to confirm the connection — it should match
   `/tokens/global.json` already in this repo.

**After that, the loop is:** change a variable in Figma → click Push in the
Tokens Studio plugin → the "Build design tokens" GitHub Action
(`.github/workflows/build-tokens.yml`) runs automatically, regenerates
`tokens.css`, commits it, and GitHub Pages redeploys. No manual copy-paste.

**What this does *not* cover:** moving cards around, adding a new chart, or
any structural layout change. Tokens only carry color/type/spacing/radius —
structure still lives in `index.html`/`app.js` and needs a person to edit it.

## Turning this into a production site

This prototype is deliberately dependency-free so it is easy to inspect and
hand off. For a real public launch, the natural next step is:

- Put `data.js`'s content into Google Sheets (or keep the existing country
  tabs) and publish it via the Sheets API or a small serverless function, so
  non-technical country focal points can update figures directly and the
  site rebuilds automatically (e.g., nightly).
- Deploy the static files on Netlify, Vercel, GitHub Pages or Cloudflare
  Pages — all support instant redeploy on a new `data.js` commit and need no
  server.
- Add authentication only around a lightweight "review" step before new
  country data goes live, since Yes/No self-reporting benefits from a second
  set of eyes.
