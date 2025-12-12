You are a senior frontend engineer and UX designer.

Goal
Build a SIMPLE, offline-first “Family Tree Builder” web app that I can run by double-clicking index.html (no backend, no login, no database, no build tools). It must be easy for a non-expert to use to DRAW and maintain my family tree.

Deliverables
Create a small project with these files:
- index.html
- styles.css
- app.js
- README.md

Hard constraints
- No frameworks required (plain HTML/CSS/JS).
- No npm, no Next.js, no server needed.
- Data must persist locally using localStorage.
- Provide Export / Import as a JSON file so I can back up and move to another device.
- Must work on modern Chrome/Edge.
- Keep UI clean, minimal, and mobile-friendly.

Core features (must implement)
1) People (nodes)
- Add person with: Full Name (required), Gender (optional), Birth year (optional), Death year (optional), Notes (optional).
- Edit person.
- Delete person (with confirmation).
- Optional: a small “branch/tag” field (e.g., “Al-____”).
- Each person has a unique id generated in JS.

2) Relationships (edges)
- Parent → Child link.
- Spouse link.
- UI must let me:
  - Select a person, click “Add Parent”, “Add Child”, “Add Spouse”
  - Or “Link Existing Person” (choose from list) to avoid duplicates
- Prevent impossible links (e.g., parent=child, duplicate edges).

3) Tree drawing
- Render the tree visually using SVG (preferred) or Canvas.
- Provide pan + zoom (mouse wheel; touch-friendly if possible).
- Provide a simple auto-layout:
  - Generations stacked vertically (ancestors above, descendants below)
  - Siblings aligned horizontally
  - Spouses side-by-side
- Nodes should be draggable to manually adjust positions (store positions).
- Clicking a node opens a right-side drawer with details + actions.

4) Search & navigation
- Search box that filters and highlights matching names.
- Search must match:
  - name
  - tag
  - originCountry/originCity/originArea/originFamilyBranch
- “Focus” button: centers the view on a selected person.
- “Home” button: fits the full tree to screen.

5) Safety / backup / printing
- Export JSON (download file).
- Import JSON (upload file).
- “Reset data” button with strong confirmation.
- “Print / Save as PDF” view: a clean layout for printing (basic is fine).

UX requirements
- Top bar with: Add Person, Search, Country Filter, City Filter, Export, Import, Print, Reset, Settings
- Right panel (drawer) with: person info + quick relationship buttons + origin/roots section
- Helpful empty state (“No people yet—click Add Person”)
- Clear error messages and validation
- Mobile-friendly layout

Origin / Roots feature (must implement)
1) Data model updates (backward compatible)
Extend each person with:
- originCountry (string, optional)  // e.g., Bahrain, Saudi Arabia
- originCity (string, optional)     // e.g., Manama, A’ali, Sitra
- originArea (string, optional)     // e.g., village/neighborhood: ‘Aker, Jableh, etc.
- originFamilyBranch (string, optional) // e.g., branch/tribe/family label
- originNotes (string, optional)

Older saved data without these fields must NOT break the app; missing fields should default to "".

2) UI updates (simple + fast)
- In the Person Drawer, add an “Origin / Roots” section with inputs:
  - Country (text + datalist suggestions derived from existing people + common countries)
  - City (text + datalist suggestions derived from existing people)
  - Area/Neighborhood (text)
  - Family Branch/Label (text)
  - Notes (textarea)
- On each node card, show a small badge under the name:
  - Prefer: originCity OR originCountry (whichever exists)
  - If neither exists, show nothing
- Add a settings toggle: “Hide origin badges” stored in localStorage and applied immediately.

3) Filters
- Add filter dropdowns:
  - Filter by Country: All + unique countries derived from people data
  - Filter by City: All + unique cities derived from people data (optionally dependent on selected country)
- Filters must affect:
  - Nodes visibility (and related edges visibility)
  - Directory/list results if you have a people directory view
- The tree view should still function with filters on (focus, pan/zoom).

4) Copy origin helper (nice-to-have but implement)
- Provide a “Copy origin from…” button/dropdown in the drawer:
  - Choose an existing person and copy all origin fields to the currently selected person.

Implementation details
- Use a single data model in app.js like:
  - state = {
      dataVersion: 2,
      ui: { hideOriginBadges: false, filterCountry: "All", filterCity: "All" },
      people: [{ id, name, gender, birthYear, deathYear, notes, tag, x, y,
                originCountry, originCity, originArea, originFamilyBranch, originNotes }],
      relations: [{ id, type: "PARENT_CHILD"|"SPOUSE", aId, bId }]
    }
- Store to localStorage on every change (debounced).
- Provide migration logic:
  - If saved dataVersion missing or < 2, add missing fields and set dataVersion = 2.
- Provide a small sample dataset function (3 generations) for demo, with mixed origins/cities.

Export/Import requirements
- Export JSON must include all fields (including origin + ui settings + dataVersion).
- Import JSON must validate minimally and safely:
  - If origin fields missing, set to "".
  - If ui settings missing, set defaults.
  - Never crash on unknown extra fields (ignore unknown keys).
  - Validate that people ids are unique and relations refer to existing people; if not, skip invalid relations with a warning.

README must include
- How to run (double-click index.html)
- How to export/import
- Tips for building the tree
- Origin/Roots fields + filtering instructions
- Known limitations
- “Next step” section: how we can later upgrade to Next.js + database + accounts

Now output:
1) File tree
2) Full code for each file (index.html, styles.css, app.js, README.md)
3) Final checklist to verify it works
