# Kosino Movie Studio

Osobní nástroj pro storyboard a preprodukci (Character Lock + Location Lock + Shot List + Animace).

## Spuštění

```bash
npm install
cp .env.example .env.local
# vlož svůj XAI_API_KEY z https://console.x.ai/
npm run dev
```

Otevři http://localhost:3000

Bez `XAI_API_KEY` funguje UI, upload referencí, lokální parse shot listu, ukládání projektů a ffmpeg animace. Generování panelů (a LLM parse) vyžaduje klíč.

## Skripty

```bash
npm run dev       # vývojový server
npm run build     # produkční build (nevyžaduje API klíč)
npm run typecheck # tsc --noEmit
npm start         # po buildu
```

## Funkce

- Character Lock (nahrávání referencí → `public/uploads`)
- Location Lock
- Shot List → panely (`/api/parse-shotlist`; LLM pokud je klíč, jinak lokální split)
- Camera type + duration per panel
- Generování / regenerace (`/api/generate-panel` přes xAI; Image Editing = reference edit s fallbackem)
- Ukládání projektů (`data/projects/*.json`)
- Animace panelů (`/api/animate` + ffmpeg → `public/animations`)

## Data

| Cesta | Obsah |
|-------|--------|
| `data/projects/` | uložené projekty (JSON) |
| `public/uploads/` | Character / Location reference |
| `public/generated/` | vygenerované panely |
| `public/animations/` | MP4 výstupy |

Tyto složky jsou v `.gitignore` (kromě `.gitkeep`).

## Windows 11

Aplikace běží lokálně. Pro instalovatelnou verzi můžeš později zabalit přes Electron nebo Tauri.
