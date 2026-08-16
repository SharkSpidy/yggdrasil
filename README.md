# HeritageArchive

A fully interactive family-tree web app built with **Vite + React + TypeScript + Tailwind CSS**, converted from three static HTML mockups (Profile Drawer, Tree Viewer, Onboarding Form).

## 1. Setup

```bash
# scaffolded already in this folder — from scratch it would be:
# npm create vite@latest heritage-archive -- --template react-ts
cd heritage-archive
npm install
npm run dev       # http://localhost:5173
npm run build     # type-checks + production bundle to dist/
```

### `package.json` dependencies

| Package | Why |
|---|---|
| `react`, `react-dom` | UI runtime |
| `@vitejs/plugin-react` | Fast Refresh / JSX transform for Vite |
| `typescript` | Static types for the data model |
| `tailwindcss`, `postcss`, `autoprefixer` | Styling, ported 1:1 from the mockups' utility classes |

No extra runtime libraries (no state-management library, no graph/tree package) — the tree layout is ~120 lines of plain TypeScript (`src/utils/buildTree.ts`), which is both smaller and easier to tune than pulling in a generic graph-visualization dependency.

## 2. Project structure

```
src/
  types/family.ts          // FamilyMember, Marriage, TreeNode data model
  utils/buildTree.ts       // flat[] -> hierarchical tree, + layout algorithm
  data/generateSampleData.ts // deterministic 100+ member, 5-generation seed dataset
  hooks/usePanZoom.ts      // drag-to-pan + wheel/button zoom
  components/
    Sidebar.tsx
    FamilyNodeCard.tsx
    TreeCanvas.tsx
    ProfileDrawer.tsx
    OnboardingForm.tsx
  App.tsx
  main.tsx
```

## 3. Data schema

`FamilyMember` (see `src/types/family.ts`) is stored **flat**, keyed by `id`, with:

- `parentIds: MemberId[]` — 0, 1, or 2 direct parents.
- `marriages: Marriage[]` — a member can have several marriages over time (remarriage, widowhood); each marriage carries its own `childIds[]`, which is what makes blended/step families representable.
- `generation: number` — precomputed depth, used for sorting/labeling without re-walking the tree.

A flat, id-referenced array is the right storage shape because relationships in a real family are graph-shaped (a child can point to two parents who each have other marriages), not tree-shaped — a nested tree can't be edited or diffed cleanly, but a flat array can be patched with one new record per person.

## 4. Flat → hierarchical: the recursive build + layout

`buildFamilyTree(dataset)`:
1. Indexes every member by `id`, indexes spouse links (from `marriages[]`) and parent→children links (from `parentIds[]` and each marriage's `childIds[]`) — all O(n).
2. Finds **roots**: members with no recorded parent in the dataset.
3. Recursively walks each root: at each member, it attaches that member's spouses **beside** them (not as children — this keeps generational depth accurate for blended families) and recurses into the union of children across all of that member's marriages.
4. A `visited` set prevents infinite recursion if the source data has a cycle.

`layoutTree(roots)` then assigns `(x, y)` pixel coordinates with a bottom-up "subtree width" algorithm — the same family of algorithm most tree-diagram libraries use:

- Each leaf node reserves a fixed width (`NODE_WIDTH`, plus room for any spouses drawn beside it).
- Each parent's subtree width = the sum of its children's subtree widths (with a sibling gap), or its own width if larger.
- A parent is horizontally centered over the midpoint of its first and last child.
- `y` is simply `depth * LEVEL_HEIGHT`.

This is a single O(n) pass with no iterative force-simulation, so it stays fast and produces stable (non-jittery) positions as the dataset grows.

## 5. Interactivity

- **Pan/zoom** (`usePanZoom.ts`): implemented with Pointer Events (not HTML5 drag-and-drop) and a single CSS `transform: translate(...) scale(...)` on one wrapper `<div>` around the whole tree. Panning/zooming 100+ nodes is therefore one compositor-layer transform, not 100+ individual re-layouts.
- **Click → Profile Drawer**: `TreeCanvas` calls `onSelectMember(id)`, which `App.tsx` stores as `selectedId`; `ProfileDrawer` looks the member up and slides in via a CSS `translate-x` transition. Escape key and a scrim both close it.
- **Onboarding**: `OnboardingForm` is a controlled form (local `useState`) that assembles a new `FamilyMember` object — including reading the dropped/selected photo file into a data URL with `FileReader` — and calls `onCreate`, which `App.tsx` appends to the flat `members` array. Because the tree is *derived* (via `useMemo`) from that array, the new node appears in the tree automatically on the next render, positioned under whatever parent was selected in the form.

## 6. Performance for 100+ nodes

- `buildFamilyTree` and `layoutTree` are pure functions run inside `useMemo`, keyed on the `members` array — they only re-run when the dataset actually changes (e.g. after onboarding), not on every pan/zoom re-render.
- `FamilyNodeCard` is wrapped in `React.memo`. Since panning/zooming only changes the transform on the shared wrapper `<div>` (not any individual node's props), none of the 100+ card components re-render during a drag — only the wrapper's `style.transform` string changes.
- Connector lines are drawn as a handful of `<path>` elements in one shared `<svg>` rather than one DOM node per line segment.
- The sample dataset generator (`generateSampleData.ts`) produces 150+ members across 5 generations by default, so this budget is exercised in dev, not just claimed.

## 7. Where to go next

- Swap `generateSampleData()` in `App.tsx` for a real fetch (e.g. `GET /api/family-members`) — everything downstream already treats the dataset as an opaque flat array.
- Add viewport-based virtualization to `TreeCanvas` (skip rendering cards fully outside the visible/transformed viewport) if a dataset grows well past a few hundred members.
- Persist edits from `OnboardingForm`/the profile edit button back to an API instead of local state.
