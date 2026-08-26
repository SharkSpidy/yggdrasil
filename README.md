# Project Yggdrasil — Family Tree Frontend (Vite + React + TypeScript)

A bottom-up, upward-fanning radial family tree. The oldest ancestor sits as
the "trunk" at the bottom center; every generation radiates outward and
upward across a semicircular fan, connected by curved branch lines.

Built with **Vite**, **React**, **TypeScript**, and **D3.js** (D3 owns the
SVG layout math and pan/zoom; React owns component state and the UI chrome
around it).

## Getting started

```bash
npm install
npm run dev       # start the dev server (Vite)
npm run build      # type-check (tsc -b) and produce a production build in dist/
npm run preview    # serve the production build locally
npm run lint        # type-check only, no build
```

## Project structure

```
index.html                  Vite entry HTML (fonts + #root mount point)
src/
  main.tsx                  React root, imports the global theme
  App.tsx                   Top-level state: search, selection, hover
  types.ts                  Person / TreeNode / TreeLink domain types
  data.ts                   Typed mock dataset (see below to replace it)
  hooks/
    useTreeLayout.ts        d3.hierarchy + d3.tree radial layout, memoized
  lib/
    renderTree.ts            Typed D3 draw functions: rings, links, nodes
  components/
    FamilyTree.tsx           Owns the <svg>, D3 zoom behavior, imperative
                              zoomIn/zoomOut/resetView/panToNode API
    Header.tsx                Brand, search box, zoom controls
    Legend.tsx                Static legend
    Tooltip.tsx               Cursor-following hover card
    MemberPanel.tsx           Slide-in detail drawer with relative drill-down
  utils/
    format.ts                lifespan / generation label helpers
  styles/
    theme.css                 Design tokens + full theme (dark ink ground,
                               bronze/gold/moss accents, Fraunces + Inter +
                               IBM Plex Mono)
```

## Plugging in the real dataset

`src/data.ts` exports a single typed constant, `familyData: Person`, matching
the shape documented in `src/types.ts`. Swap its contents for the real tree,
or fetch it at runtime instead:

```tsx
// App.tsx
const [data, setData] = useState<Person | null>(null);

useEffect(() => {
  fetch("/api/tree")
    .then((r) => r.json())
    .then(setData);
}, []);

if (!data) return <LoadingState />;
const layout = useTreeLayout(data);
```

Each person needs at minimum `id`, `name`, and (if they have descendants) a
`children` array. `born` / `died` (omit or `null` for living), `role`,
`bio`, `photo`, `gender`, and `spouse` are all optional but power the
tooltip and detail panel.

## Notes on scale

This demo ships ~30 people across 6 generations. The layout is pure SVG
driven by `d3.tree()`, which comfortably handles several thousand nodes
without changes. For a genuinely massive dataset (tens of thousands+),
consider:

- Collapsing branches by default (render only N generations, expand a
  branch on click) — `MemberPanel`'s "Children" list already provides the
  natural drill-down UX to build this on top of.
- Moving the nodes layer to `<canvas>` once node count gets large enough
  that SVG DOM size becomes the bottleneck. The layout math (`nodeX`,
  `nodeY`, `linkPath` in `src/lib/renderTree.ts` and
  `src/hooks/useTreeLayout.ts`) is renderer-agnostic and ports directly.
