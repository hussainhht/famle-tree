# Family Tree Builder

A modern, interactive family tree visualization tool with support for tracking family origins and roots.

## Features

- **Interactive Tree Visualization**: Pan, zoom, and rearrange nodes
- **Person Management**: Add, edit, and delete family members
- **Relationship Tracking**: Define parent-child and spouse relationships
- **Origin/Roots Tracking**: Record country, city, area, and family branch information
- **Search & Filter**: Search by name, tag, or origin; filter by country and city
- **Data Management**: Export/import data as JSON, print tree
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Local Storage**: Automatically saves data to browser

## Getting Started

1. Open `index.html` in a modern web browser (Chrome, Firefox, Safari, Edge)
2. Start by clicking "Add First Person" or "Load Sample Data"
3. Click on nodes to view/edit details
4. Drag nodes to rearrange the tree
5. Use scroll wheel to zoom in/out
6. Pan the canvas by dragging empty space

## Keyboard Shortcuts

- `Ctrl+F` - Focus search box
- `H` - Fit tree to screen
- `+/-` - Zoom in/out
- `Delete` - Delete selected person
- `Esc` - Close modals/drawer

## Data Structure

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

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Data Privacy

All data is stored locally in your browser's localStorage. No data is sent to any server.

## Tips

1. **Use Tags**: Assign family tags (e.g., "Al-Khalifa") to group family members
2. **Track Origins**: Record origin information to preserve family history
3. **Regular Backups**: Use the Export function to save your data periodically
4. **Organize Visually**: Drag nodes to create a clear, organized tree structure
5. **Search Efficiently**: Use the search bar to quickly find people by name, tag, or origin

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
