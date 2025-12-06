# KISS Translator

Translate Obsidian UI and notes with a floating FAB, local dictionaries, and OpenAI‑compatible APIs. Supports bilingual view, editable translations, and optional cloud dictionaries.

## Features
- UI & note translation: hide original, show on hover, edit translations.
- Floating FAB: double‑tap to toggle inject (red=off, yellow=no hit, green=active); long‑press/right‑click for menu.
- Local dictionaries: persisted entries, edit/reset, auto‑apply without extra API calls.
- Cloud dictionaries: configurable registry and language selection (defaults to built‑in registry).
- Mobile friendly: long‑press instead of right‑click; remembers FAB position.

## Quick Start
1) Settings → API:
   - API URL: e.g. `https://api.openai.com/v1/chat/completions`
   - API Key: e.g. `sk-...`
   - Model: e.g. `gpt-4o-mini`
   - Optional: source `auto`, target `zh`; “extract only” toggle; max text length (default 500)
2) Cloud registry (default built‑in): `https://raw.githubusercontent.com/dangehub/kiss-translator-obsidian/refs/heads/main/translations/registry.json`. You can override, refresh, pick a language, then download dictionaries.
3) Use the FAB on the page you want to translate:
   - Double‑tap: toggle inject; color shows state (red/yellow/green)
   - Right‑click/long‑press: menu → translate current page / extract current page (extract mode) / select or add UI dictionary / edit mode / hide original / show original on hover

## FAB & Dictionary Management
| Action | Description |
| --- | --- |
| Double‑tap FAB | Toggle translation inject (red=off, yellow=no hit, green=active) |
| Translate current page | Call API and write to current UI dictionary |
| Extract current page | Extract text only, write with `source=translated` for manual translation |
| Dictionary selection | Recent (up to 3), full list, add/rename/delete |
| Edit mode | Show edit buttons after translations; save or reset |
| Hide original / show on hover | Show translations only; hover to see original |

## Settings Cheat Sheet
- **Translate / Extract**: “Extract only” switches FAB menu to “Extract current page”, no API calls.
- **Max text length**: Skip blocks longer than this (default 500 chars).
- **API**: URL / Key / Model / source (keep `auto`) / target (e.g. `zh`,`en`,`ja`).
- **Skip selector presets**: Reusable selectors per UI; enable/disable, add/edit/delete.

## Dictionaries & Cloud
- Local dictionaries live under the plugin `translation/` folder by scope.
- Cloud registry is configurable (GitHub/Gitea/raw); registry lists scope, language, download URL, entry count.
- Language selection favors the user’s Obsidian language; falls back to English.

## Privacy
- Network is only used for your configured LLM endpoint and optional cloud downloads; both can be disabled or self‑hosted.
- Local dictionary access stays within the plugin folder; no vault file uploads.

## Install
Not yet on the official store. Install via BRAT or manual:
Copy `main.js`, `manifest.json`, `styles.css` to `<Vault>/.obsidian/plugins/aqu-kiss-translator/`.

## Develop / Build
- Install deps: `npm install`
- Dev watch: `npm run dev`
- Build: `npm run build`

## Known Limits / Roadmap
- Translating link blocks can break clickability; these nodes are skipped by default.
- Planned: official store submission; visual import/export; onboarding guide.

## Thanks
- Inspired by [fishjar/kiss-translator](https://github.com/fishjar/kiss-translator).
- Built as a non‑intrusive alternative to prior i18n approaches.

## Vibe Coding Warning
Largely built with AI assistance.

## Changelog
<details>
<summary>Show updates</summary>

### 0.8.1
- Settings improvements
- Added i18n: auto match Obsidian language; cloud registry prefers user language (fallback to English)

### 0.8.0
- Cloud dictionaries: custom git registry; Crowdin integration

### 0.7.8
- Default: do not translate notes; adjust via “skip selector presets”

### 0.7.7
- Viewport-aware inject to avoid lag on long pages

### 0.7.6
- Minor tweaks

### 0.7.5
- Allow `+` in dictionary names; load all dictionaries on restart

### 0.7.2~0.7.4
- Code cleanup per Obsidian guidelines

### 0.7.1
- Fix stray “edit” label; use pencil icon

### 0.7.0
- Styling, interaction compatibility, modal targeting, breathing dots indicator

### 0.6.0
- Auto-apply translations, FAB translate menu, dictionary search across scopes

### 0.5.0
- FAB toggles, display tweaks, smarter show-original

### 0.4.0
- Hide original/edit mode toggles; dictionary rename/delete sync; skip defaults

### 0.3.0
- Skip presets, UI dictionary management, editable/resettable translations

### 0.2.0
- Dictionary format upgrade; UI scope switching; menu management

### 0.1.0
- Inline translate/clear commands; global FAB; skip selectors; compact styling

</details>
