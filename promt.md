You are a senior frontend engineer and UX designer.

Context
I have a plain HTML/CSS/JS offline “Family Tree Builder” app (runs locally, no frameworks).
Current UI has:
- top toolbar (search, country/city filters, add person, export/import/print/settings/reset)
- SVG tree canvas with nodes + edges
- zoom controls
- localStorage persistence + JSON import/export
- person drawer/modal for editing and relationships

Goal
Make the app LOOK BETTER and FEEL MUCH SIMPLER to use, while keeping it offline and easy to extend later.

Hard constraints
- Plain HTML/CSS/JS only (no npm, no frameworks).
- Must run by opening app.html (or index.html) directly.
- Keep localStorage + export/import JSON.
- Keep backward compatible data schema (dataVersion 2).
- No feature removals—only simplify the UX and reorganize.

Top UX/DESIGN priorities (must implement)
1) Simplify the top bar
- Reduce visual noise by grouping actions into 2–3 groups:
  A) Search + Filters
  B) Primary action: “+ Add Person”
  C) Secondary actions behind a “More” menu (Export/Import/Print/Settings/Reset)
- Keep the bar compact with consistent spacing and icon-only buttons with tooltips where suitable.
- Make it responsive: on smaller screens collapse filters into one “Filters” button that opens a small panel.

2) Make the “Add Person” flow ultra simple
- Clicking “Add Person” opens a clean modal with only:
  Name (required), Gender, BirthYear, DeathYear, Origin (Country/City), Notes
- Advanced fields should be hidden under a “More details” accordion (tag, originArea, originFamilyBranch, originNotes).

3) Make relationships simpler
- In the person drawer, show 3 big buttons:
  - Add Parent
  - Add Child
  - Add Spouse
Each button opens a small modal with two tabs:
  - Create New Person
  - Link Existing Person (searchable list)
- Prevent duplicates and invalid links; show friendly inline error messages.

4) Improve tree canvas clarity
- Add a subtle dotted/grid background (toggleable).
- Edges should be visually clearer:
  - Parent-child = solid line
  - Spouse = dashed line
- Show edge routing that avoids ugly overlaps when possible (simple orthogonal/curved lines is fine).
- Add “Fit to screen” + “Center selected” controls.
- Add an empty-state overlay when there are fewer than 2 people:
  “Click + Add Person to start”, “Drag nodes”, “Scroll to zoom”.

5) Node cards redesign (clean & consistent)
- Use a single minimal card style:
  - Name (strong)
  - Small line: birth–death (if present)
  - Small badge: city or country (if enabled)
- Selected node: clear highlight ring + subtle shadow.
- Hover state: subtle highlight.
- Make nodes slightly larger and use readable typography.

6) Better feedback (no alert spam)
- Replace alert() with toast notifications for:
  - Saved
  - Imported successfully
  - Exported
  - Error messages
- Confirm dialogs should be modal style (Reset / Delete).

7) Settings as a tiny modal
- Keep it SIMPLE with toggles:
  - Hide origin badges
  - Show grid
  - Reduce motion
- Add “Load demo data” button (with confirmation).

8) Code quality improvements (keep it simple)
- Refactor app.js into small sections:
  - state management + persistence
  - rendering (tree)
  - UI events (modals, drawer, toolbar)
  - helpers (id generation, validation, import/export)
- Use event delegation where possible.
- Use requestAnimationFrame for smooth pan/zoom updates.
- Keep everything in one JS file (app.js), but structured cleanly.

Deliverables
- Provide updated full code for:
  - app.html (or index.html—keep file name consistent; update README accordingly)
  - styles.css
  - app.js
  - README.md
- Include a short “Design system” section in README:
  spacing, font sizes, colors, button styles.

Final output format
1) File tree
2) Full code for each file
3) Final checklist for testing:
   - add/edit/delete person
   - add parent/child/spouse (create + link existing)
   - search + filters
   - export/import
   - print
   - settings toggles
   - pan/zoom + fit to screen
