# Family Tree Builder

A modern, interactive family tree visualization tool with support for tracking family origins and roots.

## Features

- **Interactive Tree Visualization**: Pan, zoom, and rearrange nodes
- **Person Management**: Add, edit, and delete family members
- **Relationship Tracking**: Define parent-child and spouse relationships
- **Origin/Roots Tracking**: Record country, city, area, and family branch information
- **Search & Filter**: Search by name, tag, or origin; filter by country and city
- **File-Based Saving**: Save projects to your computer with File System Access API
- **Auto-Save**: Automatic saving when a file handle exists
- **Data Management**: Export/import data as JSON, print tree
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Local Storage**: Automatically saves data to browser as backup

## Getting Started

1. Open `index.html` in a modern web browser (Chrome, Firefox, Safari, Edge)
2. Start by clicking "Add Person" or go to Settings → "Load Demo Family"
3. Click on nodes to view/edit details
4. Drag nodes to rearrange the tree
5. Use scroll wheel to zoom in/out
6. Pan the canvas by dragging empty space

## Saving Your Work

### File System Access API (Chrome/Edge)

Modern browsers support saving directly to files on your computer:

- **New Project** (`Ctrl+N`): Create a new empty family tree
- **Open Project** (`Ctrl+O`): Open a `.familytree.json` or `.json` file
- **Save** (`Ctrl+S`): Save to the current file (or Save As if no file yet)
- **Save As** (`Ctrl+Shift+S`): Save to a new file location

When you have a file open, changes are **auto-saved** after 1 second of inactivity.

### Status Indicator

The project badge in the top bar shows:

- **Green dot** / "Saved": All changes saved
- **Orange dot** / "Saving…": Currently saving
- **Red dot** / "Unsaved": Changes pending

### Fallback (Firefox/Safari)

If the File System Access API is not available:

- **Save** triggers a file download
- **Open** uses a file picker to upload/import
- Data is always saved to localStorage as backup

### Legacy Export/Import

The Export/Import buttons in the More menu (⋮) still work for:

- Creating backup copies
- Sharing family trees with others
- Moving data between browsers

## Keyboard Shortcuts

- `Ctrl+N` - New Project
- `Ctrl+O` - Open Project
- `Ctrl+S` - Save Project
- `Ctrl+Shift+S` - Save As
- `Esc` - Close modals/drawer

## Data Structure

### Project File Format (`.familytree.json`)

```json
{
  "dataVersion": 2,
  "ui": {
    "hideOriginBadges": false,
    "filterCountry": "All",
    "filterCity": "All"
  },
  "people": [...],
  "relations": [...],
  "meta": {
    "projectName": "My Family Tree",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Person Object

```javascript
{
  id: "unique_id",
  name: "Full Name",
  gender: "Male" | "Female" | "",
  birthYear: "YYYY",
  deathYear: "YYYY",
  tag: "Family name/tag",
  notes: "Additional notes",
  originCountry: "Country of origin",
  originCity: "City of origin",
  originArea: "Area/neighborhood",
  originFamilyBranch: "Family branch/tribe",
  originNotes: "Origin details",
  x: 400,  // Canvas position
  y: 200   // Canvas position
}
```

### Relation Object

```javascript
{
  id: "unique_id",
  type: "PARENT_CHILD" | "SPOUSE",
  aId: "person_id",
  bId: "person_id"
}
```

## Browser Compatibility

| Feature                | Chrome | Edge   | Firefox       | Safari        |
| ---------------------- | ------ | ------ | ------------- | ------------- |
| Core Functionality     | ✅ 90+ | ✅ 90+ | ✅ 88+        | ✅ 14+        |
| File System Access API | ✅     | ✅     | ❌ (fallback) | ❌ (fallback) |
| Auto-Save to File      | ✅     | ✅     | ❌            | ❌            |
| localStorage Backup    | ✅     | ✅     | ✅            | ✅            |

## Data Privacy

All data is stored locally:

- **File System**: Saved to files you choose on your computer
- **localStorage**: Browser storage as backup (never leaves your device)
- **No Server**: No data is sent to any server - fully offline

## Tips

1. **Save Early**: Use `Ctrl+S` after creating your project to pick a save location
2. **Use Tags**: Assign family tags (e.g., "Al-Khalifa") to group family members
3. **Track Origins**: Record origin information to preserve family history
4. **Regular Backups**: Use Export for extra backup copies
5. **Organize Visually**: Drag nodes to create a clear, organized tree structure
6. **Search Efficiently**: Use the search bar to quickly find people by name, tag, or origin

## Troubleshooting

### Tree not displaying

- Check if there are any people in the database
- Try clicking "Fit to Screen" (H key or home button)

### Data lost

- Import a previously exported JSON file
- Check browser's localStorage settings

### Performance issues

- Large trees (100+ people) may be slower to render
- Try hiding origin badges in settings
- Filter to show fewer people at once

## License

This is a personal project. Feel free to use and modify for your own family tree needs.
