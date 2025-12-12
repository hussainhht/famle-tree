// Family Tree Builder - Main Application Logic
// Data version 2 with origin/roots support

// ===== STATE MANAGEMENT =====
let state = {
  dataVersion: 2,
  ui: {
    hideOriginBadges: false,
    filterCountry: "All",
    filterCity: "All"
  },
  people: [],
  relations: []
};

// Pan/Zoom state
let viewState = {
  offsetX: 0,
  offsetY: 0,
  scale: 1,
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,
  draggedNode: null
};

let selectedPersonId = null;
let svgElement = null;
let searchQuery = "";

// ===== INITIALIZATION =====
document.addEventListener("DOMContentLoaded", () => {
  loadFromLocalStorage();
  initializeUI();
  renderTree();
  updateFilters();
});

// ===== LOCAL STORAGE =====
function loadFromLocalStorage() {
  try {
    const saved = localStorage.getItem("familyTreeData");
    if (saved) {
      const loaded = JSON.parse(saved);
      migrateData(loaded);
      state = loaded;
    } else {
      // Load sample data for demo
      loadSampleData();
    }
  } catch (e) {
    console.error("Failed to load data:", e);
    loadSampleData();
  }
}

function saveToLocalStorage() {
  try {
    localStorage.setItem("familyTreeData", JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save data:", e);
    alert("Failed to save data. Your storage might be full.");
  }
}

// Debounced save
let saveTimeout = null;
function debouncedSave() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveToLocalStorage, 300);
}

// ===== DATA MIGRATION =====
function migrateData(data) {
  if (!data.dataVersion || data.dataVersion < 2) {
    // Migrate to version 2
    data.dataVersion = 2;
    
    if (!data.ui) {
      data.ui = {
        hideOriginBadges: false,
        filterCountry: "All",
        filterCity: "All"
      };
    }
    
    if (data.people) {
      data.people.forEach(person => {
        if (!person.originCountry) person.originCountry = "";
        if (!person.originCity) person.originCity = "";
        if (!person.originArea) person.originArea = "";
        if (!person.originFamilyBranch) person.originFamilyBranch = "";
        if (!person.originNotes) person.originNotes = "";
      });
    }
  }
}

// ===== SAMPLE DATA =====
function loadSampleData() {
  state = {
    dataVersion: 2,
    ui: {
      hideOriginBadges: false,
      filterCountry: "All",
      filterCity: "All"
    },
    people: [
      {
        id: "p1",
        name: "Ahmed Al-Khalifa",
        gender: "Male",
        birthYear: "1950",
        deathYear: "",
        notes: "Grandfather",
        tag: "Al-Khalifa",
        x: 400,
        y: 50,
        originCountry: "Bahrain",
        originCity: "Manama",
        originArea: "Old Manama",
        originFamilyBranch: "Al-Khalifa",
        originNotes: "Original family from Manama"
      },
      {
        id: "p2",
        name: "Fatima Al-Hassan",
        gender: "Female",
        birthYear: "1952",
        deathYear: "",
        notes: "Grandmother",
        tag: "Al-Hassan",
        x: 550,
        y: 50,
        originCountry: "Bahrain",
        originCity: "A'ali",
        originArea: "Central A'ali",
        originFamilyBranch: "Al-Hassan",
        originNotes: "Known for pottery craft"
      },
      {
        id: "p3",
        name: "Mohammed Ahmed",
        gender: "Male",
        birthYear: "1975",
        deathYear: "",
        notes: "Father",
        tag: "Al-Khalifa",
        x: 400,
        y: 200,
        originCountry: "Bahrain",
        originCity: "Manama",
        originArea: "Juffair",
        originFamilyBranch: "Al-Khalifa",
        originNotes: ""
      },
      {
        id: "p4",
        name: "Aisha Abdullah",
        gender: "Female",
        birthYear: "1978",
        deathYear: "",
        notes: "Mother",
        tag: "Al-Abdullah",
        x: 550,
        y: 200,
        originCountry: "Saudi Arabia",
        originCity: "Dammam",
        originArea: "Al-Faisaliyah",
        originFamilyBranch: "Al-Abdullah",
        originNotes: "Moved to Bahrain in 1995"
      },
      {
        id: "p5",
        name: "Hassan Mohammed",
        gender: "Male",
        birthYear: "2000",
        deathYear: "",
        notes: "Son",
        tag: "Al-Khalifa",
        x: 300,
        y: 350,
        originCountry: "Bahrain",
        originCity: "Manama",
        originArea: "Seef",
        originFamilyBranch: "Al-Khalifa",
        originNotes: ""
      },
      {
        id: "p6",
        name: "Maryam Mohammed",
        gender: "Female",
        birthYear: "2003",
        deathYear: "",
        notes: "Daughter",
        tag: "Al-Khalifa",
        x: 500,
        y: 350,
        originCountry: "Bahrain",
        originCity: "Manama",
        originArea: "Seef",
        originFamilyBranch: "Al-Khalifa",
        originNotes: ""
      }
    ],
    relations: [
      { id: "r1", type: "PARENT_CHILD", aId: "p1", bId: "p3" },
      { id: "r2", type: "PARENT_CHILD", aId: "p2", bId: "p3" },
      { id: "r3", type: "SPOUSE", aId: "p1", bId: "p2" },
      { id: "r4", type: "PARENT_CHILD", aId: "p3", bId: "p5" },
      { id: "r5", type: "PARENT_CHILD", aId: "p3", bId: "p6" },
      { id: "r6", type: "PARENT_CHILD", aId: "p4", bId: "p5" },
      { id: "r7", type: "PARENT_CHILD", aId: "p4", bId: "p6" },
      { id: "r8", type: "SPOUSE", aId: "p3", bId: "p4" }
    ]
  };
  debouncedSave();
}

// ===== UI INITIALIZATION =====
function initializeUI() {
  // Top bar buttons
  document.getElementById("addPersonBtn").addEventListener("click", openAddPersonModal);
  document.getElementById("exportBtn").addEventListener("click", exportData);
  document.getElementById("importBtn").addEventListener("click", () => document.getElementById("importFile").click());
  document.getElementById("importFile").addEventListener("change", importData);
  document.getElementById("printBtn").addEventListener("click", printTree);
  document.getElementById("resetBtn").addEventListener("click", resetData);
  document.getElementById("settingsBtn").addEventListener("click", openSettings);
  document.getElementById("homeBtn").addEventListener("click", fitTreeToScreen);
  
  // Empty state buttons
  document.getElementById("addPersonEmptyBtn")?.addEventListener("click", openAddPersonModal);
  document.getElementById("loadSampleBtn")?.addEventListener("click", () => {
    loadSampleData();
    renderTree();
    updateFilters();
  });
  
  // Search
  const searchInput = document.getElementById("searchInput");
  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value.toLowerCase();
    renderTree();
    updateClearSearchButton();
  });
  
  document.getElementById("clearSearchBtn")?.addEventListener("click", () => {
    document.getElementById("searchInput").value = "";
    searchQuery = "";
    renderTree();
    updateClearSearchButton();
  });
  
  // Filters
  document.getElementById("countryFilter").addEventListener("change", (e) => {
    state.ui.filterCountry = e.target.value;
    updateCityFilter();
    renderTree();
    updateClearFiltersButton();
    debouncedSave();
  });
  
  document.getElementById("cityFilter").addEventListener("change", (e) => {
    state.ui.filterCity = e.target.value;
    renderTree();
    updateClearFiltersButton();
    debouncedSave();
  });
  
  document.getElementById("clearFiltersBtn")?.addEventListener("click", () => {
    state.ui.filterCountry = "All";
    state.ui.filterCity = "All";
    document.getElementById("countryFilter").value = "All";
    document.getElementById("cityFilter").value = "All";
    updateCityFilter();
    renderTree();
    updateClearFiltersButton();
    debouncedSave();
  });
  
  // Zoom controls
  document.getElementById("zoomInBtn")?.addEventListener("click", () => zoomBy(1.2));
  document.getElementById("zoomOutBtn")?.addEventListener("click", () => zoomBy(0.8));
  document.getElementById("fitScreenBtn")?.addEventListener("click", fitTreeToScreen);
  
  // Modal close buttons
  document.getElementById("closeModalBtn")?.addEventListener("click", closeAllModals);
  document.getElementById("cancelFormBtn")?.addEventListener("click", closeAllModals);
  document.getElementById("closeLinkModalBtn")?.addEventListener("click", closeAllModals);
  document.getElementById("cancelLinkBtn")?.addEventListener("click", closeAllModals);
  document.getElementById("confirmLinkBtn")?.addEventListener("click", confirmLinkPerson);
  document.getElementById("closeSettingsBtn")?.addEventListener("click", closeAllModals);
  document.getElementById("closeSettingsOkBtn")?.addEventListener("click", closeAllModals);
  document.getElementById("confirmOkBtn")?.addEventListener("click", handleConfirmOk);
  document.getElementById("confirmCancelBtn")?.addEventListener("click", closeAllModals);
  document.getElementById("loadSampleSettingsBtn")?.addEventListener("click", () => {
    loadSampleData();
    renderTree();
    updateFilters();
    closeAllModals();
  });
  
  // Settings toggles
  document.getElementById("hideOriginBadgesToggle")?.addEventListener("change", (e) => {
    state.ui.hideOriginBadges = e.target.checked;
    renderTree();
    debouncedSave();
  });
  
  document.getElementById("showCanvasGridToggle")?.addEventListener("change", (e) => {
    const grid = document.getElementById("canvasGrid");
    if (grid) {
      grid.style.display = e.target.checked ? "block" : "none";
    }
  });
  
  document.getElementById("reduceMotionToggle")?.addEventListener("change", (e) => {
    if (e.target.checked) {
      document.body.classList.add("reduce-motion");
    } else {
      document.body.classList.remove("reduce-motion");
    }
  });
  
  // Link modal search
  document.getElementById("linkSearchInput")?.addEventListener("input", (e) => {
    filterLinkPersonList(e.target.value);
  });
  
  // Click outside modal to close
  window.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-backdrop")) {
      closeAllModals();
    }
  });
  
  // Keyboard shortcuts
  document.addEventListener("keydown", handleKeyboardShortcuts);
  
  // Person form submit
  document.getElementById("personForm").addEventListener("submit", handlePersonFormSubmit);
  
  // Mobile menu
  document.getElementById("mobileMenuBtn")?.addEventListener("click", toggleMobileMenu);
  
  // SVG setup
  svgElement = document.getElementById("treeSvg");
  setupSVGInteractions();
}

// ===== SVG INTERACTIONS =====
function setupSVGInteractions() {
  if (!svgElement) return;
  
  // Pan
  svgElement.addEventListener("mousedown", handleSVGMouseDown);
  svgElement.addEventListener("mousemove", handleSVGMouseMove);
  svgElement.addEventListener("mouseup", handleSVGMouseUp);
  svgElement.addEventListener("mouseleave", handleSVGMouseUp);
  
  // Zoom
  svgElement.addEventListener("wheel", handleSVGWheel, { passive: false });
  
  // Touch support
  svgElement.addEventListener("touchstart", handleTouchStart, { passive: false });
  svgElement.addEventListener("touchmove", handleTouchMove, { passive: false });
  svgElement.addEventListener("touchend", handleTouchEnd);
  
  // Click on canvas to deselect
  svgElement.addEventListener("click", (e) => {
    if (e.target === svgElement || e.target.closest("#treeGroup") === e.target) {
      if (selectedPersonId) {
        selectedPersonId = null;
        closeDrawer();
        renderTree();
      }
    }
  });
}

function handleSVGMouseDown(e) {
  if (e.target.closest(".node-group")) {
    // Start dragging node
    const nodeGroup = e.target.closest(".node-group");
    const personId = nodeGroup.dataset.personId;
    viewState.draggedNode = personId;
    viewState.dragStartX = e.clientX;
    viewState.dragStartY = e.clientY;
  } else {
    // Start panning
    viewState.isDragging = true;
    viewState.dragStartX = e.clientX;
    viewState.dragStartY = e.clientY;
  }
}

function handleSVGMouseMove(e) {
  if (viewState.draggedNode) {
    // Drag node
    const dx = (e.clientX - viewState.dragStartX) / viewState.scale;
    const dy = (e.clientY - viewState.dragStartY) / viewState.scale;
    
    const person = state.people.find(p => p.id === viewState.draggedNode);
    if (person) {
      person.x += dx;
      person.y += dy;
      renderTree();
      debouncedSave();
    }
    
    viewState.dragStartX = e.clientX;
    viewState.dragStartY = e.clientY;
  } else if (viewState.isDragging) {
    // Pan view
    const dx = e.clientX - viewState.dragStartX;
    const dy = e.clientY - viewState.dragStartY;
    
    viewState.offsetX += dx;
    viewState.offsetY += dy;
    viewState.dragStartX = e.clientX;
    viewState.dragStartY = e.clientY;
    
    applyViewTransform();
  }
}

function handleSVGMouseUp() {
  viewState.isDragging = false;
  viewState.draggedNode = null;
}

function handleSVGWheel(e) {
  e.preventDefault();
  
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  const newScale = Math.max(0.1, Math.min(5, viewState.scale * delta));
  
  // Zoom towards mouse position
  const svg = document.getElementById("treeSvg");
  if (!svg) return;
  
  const rect = svg.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  
  viewState.offsetX = mouseX - (mouseX - viewState.offsetX) * (newScale / viewState.scale);
  viewState.offsetY = mouseY - (mouseY - viewState.offsetY) * (newScale / viewState.scale);
  viewState.scale = newScale;
  
  applyViewTransform();
}

let touchStartDistance = 0;
let touchStartScale = 1;

function handleTouchStart(e) {
  if (e.touches.length === 2) {
    e.preventDefault();
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    touchStartDistance = Math.sqrt(dx * dx + dy * dy);
    touchStartScale = viewState.scale;
  } else if (e.touches.length === 1) {
    viewState.dragStartX = e.touches[0].clientX;
    viewState.dragStartY = e.touches[0].clientY;
    viewState.isDragging = true;
  }
}

function handleTouchMove(e) {
  if (e.touches.length === 2) {
    e.preventDefault();
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const newScale = Math.max(0.1, Math.min(5, touchStartScale * (distance / touchStartDistance)));
    viewState.scale = newScale;
    applyViewTransform();
  } else if (e.touches.length === 1 && viewState.isDragging) {
    e.preventDefault();
    const dx = e.touches[0].clientX - viewState.dragStartX;
    const dy = e.touches[0].clientY - viewState.dragStartY;
    
    viewState.offsetX += dx;
    viewState.offsetY += dy;
    viewState.dragStartX = e.touches[0].clientX;
    viewState.dragStartY = e.touches[0].clientY;
    
    applyViewTransform();
function renderTree() {
  const filteredPeople = getFilteredPeople();
  
  if (filteredPeople.length === 0) {
    showEmptyState();
    return;
  }
  
  hideEmptyState();
  
  // Get or create SVG
  let svg = document.getElementById("treeSvg");
  if (!svg) {
    const container = document.getElementById("treeContainer");
    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("id", "treeSvg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    container.appendChild(svg);
  }
  
  // Clear and rebuild groups
  svg.innerHTML = `
    <defs>
      <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
        <polygon points="0 0, 10 3, 0 6" fill="#94a3b8" />
      </marker>
      <filter id="nodeShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.1"/>
      </filter>
      <filter id="nodeSelectedShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#2c5f2d" flood-opacity="0.25"/>
      </filter>
    </defs>
  `;
  
  // Create main tree group
  const treeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  treeGroup.setAttribute("id", "treeGroup");
  
  // Create sub-groups
  const edgesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  edgesGroup.setAttribute("id", "edgesGroup");
  const nodesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  nodesGroup.setAttribute("id", "nodesGroup");
  
  // Render edges first (so they're behind nodes)
  renderEdges(edgesGroup, filteredPeople);
  
  // Render nodes
  renderNodes(nodesGroup, filteredPeople);
  
  treeGroup.appendChild(edgesGroup);
  treeGroup.appendChild(nodesGroup);
  svg.appendChild(treeGroup);
  
  // Apply current transform
  applyViewTransform();
} container.innerHTML = "";
  
  // Create SVG group
  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.setAttribute("id", "treeGroup");
  
  // Render edges first (so they're behind nodes)
  renderEdges(g, filteredPeople);
  
  // Render nodes
  renderNodes(g, filteredPeople);
  
  container.appendChild(g);
}

function getFilteredPeople() {
  let filtered = state.people;
  
  // Apply search filter
  if (searchQuery) {
    filtered = filtered.filter(p => {
      const searchFields = [
        p.name,
        p.tag,
        p.originCountry,
        p.originCity,
        p.originArea,
        p.originFamilyBranch
      ].map(f => (f || "").toLowerCase());
      
      return searchFields.some(field => field.includes(searchQuery));
    });
  }
  
  // Apply country filter
  if (state.ui.filterCountry !== "All") {
    filtered = filtered.filter(p => p.originCountry === state.ui.filterCountry);
  }
  
  // Apply city filter
  if (state.ui.filterCity !== "All") {
    filtered = filtered.filter(p => p.originCity === state.ui.filterCity);
  }
  
  return filtered;
}

function renderEdges(g, filteredPeople) {
  const filteredIds = new Set(filteredPeople.map(p => p.id));
  
  state.relations.forEach(rel => {
    // Only render edge if both people are visible
    if (!filteredIds.has(rel.aId) || !filteredIds.has(rel.bId)) return;
    
    const personA = state.people.find(p => p.id === rel.aId);
    const personB = state.people.find(p => p.id === rel.bId);
    
    if (!personA || !personB) return;
    
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", personA.x);
    line.setAttribute("y1", personA.y);
    line.setAttribute("x2", personB.x);
    line.setAttribute("y2", personB.y);
    line.classList.add("edge");
    
    if (rel.type === "SPOUSE") {
      line.classList.add("spouse-edge");
    } else {
      line.classList.add("parent-child-edge");
    }
    
    g.appendChild(line);
  });
}

function renderNodes(g, filteredPeople) {
  filteredPeople.forEach(person => {
    const nodeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    nodeGroup.classList.add("node-group");
    nodeGroup.dataset.personId = person.id;
    
    // Highlight if selected or matches search
    const isSelected = person.id === selectedPersonId;
    const matchesSearch = searchQuery && (
      person.name.toLowerCase().includes(searchQuery) ||
      (person.tag || "").toLowerCase().includes(searchQuery) ||
      (person.originCountry || "").toLowerCase().includes(searchQuery) ||
      (person.originCity || "").toLowerCase().includes(searchQuery) ||
      (person.originArea || "").toLowerCase().includes(searchQuery) ||
      (person.originFamilyBranch || "").toLowerCase().includes(searchQuery)
    );
    
    if (isSelected) {
      nodeGroup.classList.add("selected");
    }
    if (matchesSearch) {
      nodeGroup.classList.add("search-match");
    }
    
    // Node rectangle
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", person.x - 60);
    rect.setAttribute("y", person.y - 35);
    rect.setAttribute("width", "120");
    rect.setAttribute("height", "70");
    rect.setAttribute("rx", "8");
    rect.classList.add("node");
    
    // Gender styling
    if (person.gender === "Male") {
      rect.classList.add("node-male");
    } else if (person.gender === "Female") {
      rect.classList.add("node-female");
    }
    
    nodeGroup.appendChild(rect);
    
    // Name text
    const nameText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    nameText.setAttribute("x", person.x);
    nameText.setAttribute("y", person.y - 5);
    nameText.setAttribute("text-anchor", "middle");
    nameText.classList.add("node-name");
    nameText.textContent = truncateText(person.name, 15);
    nodeGroup.appendChild(nameText);
    
    // Years text
    const yearsText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    yearsText.setAttribute("x", person.x);
    yearsText.setAttribute("y", person.y + 10);
    yearsText.setAttribute("text-anchor", "middle");
    yearsText.classList.add("node-years");
    const years = person.birthYear ? `${person.birthYear}${person.deathYear ? `-${person.deathYear}` : ""}` : "";
    yearsText.textContent = years;
    nodeGroup.appendChild(yearsText);
    
    // Origin badge (if not hidden)
    if (!state.ui.hideOriginBadges) {
      const originText = person.originCity || person.originCountry;
      if (originText) {
        const badge = document.createElementNS("http://www.w3.org/2000/svg", "text");
        badge.setAttribute("x", person.x);
        badge.setAttribute("y", person.y + 25);
        badge.setAttribute("text-anchor", "middle");
        badge.classList.add("node-origin");
        badge.textContent = truncateText(originText, 12);
        nodeGroup.appendChild(badge);
      }
    }
    
    // Click handler
    nodeGroup.addEventListener("click", (e) => {
      e.stopPropagation();
      selectPerson(person.id);
    });
    
    g.appendChild(nodeGroup);
  });
}

function truncateText(text, maxLength) {
  if (!text) return "";
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
}

function showEmptyState() {
  document.getElementById("emptyState").style.display = "flex";
}

function hideEmptyState() {
  document.getElementById("emptyState").style.display = "none";
}

// ===== PERSON SELECTION =====
function selectPerson(personId) {
  selectedPersonId = personId;
  renderTree();
  updateDrawer();
  openDrawer();
}

function openDrawer() {
  document.getElementById("drawer").classList.add("open");
}

function closeDrawer() {
  document.getElementById("drawer").classList.remove("open");
  selectedPersonId = null;
  renderTree();
}

function updateDrawer() {
  const person = state.people.find(p => p.id === selectedPersonId);
  if (!person) return;
  
  const drawerContent = document.getElementById("drawerContent");
  if (!drawerContent) return;
  
  // Build drawer HTML
  drawerContent.innerHTML = `
    <div class="person-info">
      <div class="person-header">
        <h3 id="drawerName">${escapeHtml(person.name)}</h3>
        <div class="person-meta">
          ${person.gender ? `<span class="meta-badge">${escapeHtml(person.gender)}</span>` : ''}
          ${person.tag ? `<span class="meta-badge meta-tag">${escapeHtml(person.tag)}</span>` : ''}
        </div>
      </div>
      
      <div class="info-section">
        <h4>Basic Information</h4>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Birth Year:</span>
            <span id="drawerBirth">${escapeHtml(person.birthYear) || 'Not specified'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Death Year:</span>
            <span id="drawerDeath">${escapeHtml(person.deathYear) || 'Not specified'}</span>
          </div>
        </div>
        ${person.notes ? `<div class="info-item"><span class="info-label">Notes:</span><p id="drawerNotes">${escapeHtml(person.notes)}</p></div>` : ''}
      </div>
      
      ${person.originCountry || person.originCity ? `
      <div class="info-section">
        <h4>Origin / Roots</h4>
        <div class="info-grid">
          ${person.originCountry ? `<div class="info-item"><span class="info-label">Country:</span><span id="drawerOriginCountry">${escapeHtml(person.originCountry)}</span></div>` : ''}
          ${person.originCity ? `<div class="info-item"><span class="info-label">City:</span><span id="drawerOriginCity">${escapeHtml(person.originCity)}</span></div>` : ''}
          ${person.originArea ? `<div class="info-item"><span class="info-label">Area:</span><span id="drawerOriginArea">${escapeHtml(person.originArea)}</span></div>` : ''}
          ${person.originFamilyBranch ? `<div class="info-item"><span class="info-label">Family Branch:</span><span id="drawerOriginBranch">${escapeHtml(person.originFamilyBranch)}</span></div>` : ''}
        </div>
        ${person.originNotes ? `<div class="info-item"><span class="info-label">Origin Notes:</span><p id="drawerOriginNotes">${escapeHtml(person.originNotes)}</p></div>` : ''}
      </div>
      ` : ''}
      
      <div class="info-section">
        <h4>Relationships</h4>
        <div id="relationshipsList"></div>
      </div>
    </div>
    
    <div class="drawer-actions">
      <button id="editPersonBtn" class="btn btn-primary btn-full">
        <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
        Edit Person
      </button>
      <button id="deletePersonBtn" class="btn btn-danger btn-full">
        <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
        Delete Person
      </button>
      <div class="action-divider"></div>
      <button id="addParentBtn" class="btn btn-ghost btn-full">
        <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
        Add Parent
      </button>
      <button id="addChildBtn" class="btn btn-ghost btn-full">
        <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
        Add Child
      </button>
      <button id="addSpouseBtn" class="btn btn-ghost btn-full">
        <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
        Add Spouse
      </button>
      <button id="linkExistingBtn" class="btn btn-ghost btn-full">
        <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>
        Link to Existing
      </button>
      <button id="focusPersonBtn" class="btn btn-ghost btn-full">
        <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg>
        Focus on Person
      </button>
    </div>
  `;
  
  // Re-attach event listeners for drawer buttons
  document.getElementById("editPersonBtn")?.addEventListener("click", editSelectedPerson);
  document.getElementById("deletePersonBtn")?.addEventListener("click", deleteSelectedPerson);
  document.getElementById("addParentBtn")?.addEventListener("click", () => addRelatedPerson("parent"));
  document.getElementById("addChildBtn")?.addEventListener("click", () => addRelatedPerson("child"));
  document.getElementById("addSpouseBtn")?.addEventListener("click", () => addRelatedPerson("spouse"));
  document.getElementById("linkExistingBtn")?.addEventListener("click", openLinkExistingModal);
  document.getElementById("focusPersonBtn")?.addEventListener("click", focusOnPerson);
  
  // Relationships
  updateRelationshipsList(person);
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function updateRelationshipsList(person) {
  const container = document.getElementById("relationshipsList");
  container.innerHTML = "";
  
  // Find parents
  const parentRels = state.relations.filter(r => r.type === "PARENT_CHILD" && r.bId === person.id);
  const parents = parentRels.map(r => state.people.find(p => p.id === r.aId)).filter(Boolean);
  
  if (parents.length > 0) {
    const parentsDiv = document.createElement("div");
    parentsDiv.innerHTML = `<strong>Parents:</strong> ${parents.map(p => p.name).join(", ")}`;
    container.appendChild(parentsDiv);
  }
  
  // Find spouses
  const spouseRels = state.relations.filter(r => 
    r.type === "SPOUSE" && (r.aId === person.id || r.bId === person.id)
  );
  const spouses = spouseRels.map(r => {
    const spouseId = r.aId === person.id ? r.bId : r.aId;
    return state.people.find(p => p.id === spouseId);
  }).filter(Boolean);
  
  if (spouses.length > 0) {
    const spousesDiv = document.createElement("div");
    spousesDiv.innerHTML = `<strong>Spouse(s):</strong> ${spouses.map(p => p.name).join(", ")}`;
    container.appendChild(spousesDiv);
  }
  
  // Find children
  const childRels = state.relations.filter(r => r.type === "PARENT_CHILD" && r.aId === person.id);
  const children = childRels.map(r => state.people.find(p => p.id === r.bId)).filter(Boolean);
  
  if (children.length > 0) {
    const childrenDiv = document.createElement("div");
    childrenDiv.innerHTML = `<strong>Children:</strong> ${children.map(p => p.name).join(", ")}`;
    container.appendChild(childrenDiv);
  }
  
  if (parents.length === 0 && spouses.length === 0 && children.length === 0) {
    container.innerHTML = "<em>No relationships</em>";
  }
}

// ===== PERSON CRUD =====
function openAddPersonModal(relationContext = null) {
  document.getElementById("modalTitle").textContent = "Add Person";
  document.getElementById("personForm").reset();
  document.getElementById("personId").value = "";
  document.getElementById("personRelationContext").value = relationContext || "";
  
  // Populate origin datalists
  updateOriginDataLists();
  
  document.getElementById("personModal").style.display = "flex";
}

function editSelectedPerson() {
  const person = state.people.find(p => p.id === selectedPersonId);
  if (!person) return;
  
  document.getElementById("modalTitle").textContent = "Edit Person";
  document.getElementById("personId").value = person.id;
  document.getElementById("personName").value = person.name;
  document.getElementById("personGender").value = person.gender || "";
  document.getElementById("personBirthYear").value = person.birthYear || "";
  document.getElementById("personDeathYear").value = person.deathYear || "";
  document.getElementById("personTag").value = person.tag || "";
  document.getElementById("personNotes").value = person.notes || "";
  document.getElementById("personOriginCountry").value = person.originCountry || "";
  document.getElementById("personOriginCity").value = person.originCity || "";
  document.getElementById("personOriginArea").value = person.originArea || "";
  document.getElementById("personOriginFamilyBranch").value = person.originFamilyBranch || "";
  document.getElementById("personOriginNotes").value = person.originNotes || "";
  document.getElementById("personRelationContext").value = "";
  
  updateOriginDataLists();
  
  document.getElementById("personModal").style.display = "flex";
}

function handlePersonFormSubmit(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const personId = formData.get("personId");
  const relationContext = formData.get("relationContext");
  
  const personData = {
    name: formData.get("name").trim(),
    gender: formData.get("gender"),
    birthYear: formData.get("birthYear").trim(),
    deathYear: formData.get("deathYear").trim(),
    tag: formData.get("tag").trim(),
    notes: formData.get("notes").trim(),
    originCountry: formData.get("originCountry").trim(),
    originCity: formData.get("originCity").trim(),
    originArea: formData.get("originArea").trim(),
    originFamilyBranch: formData.get("originFamilyBranch").trim(),
    originNotes: formData.get("originNotes").trim()
  };
  
  if (!personData.name) {
    alert("Name is required");
    return;
  }
  
  if (personId) {
    // Edit existing person
    const person = state.people.find(p => p.id === personId);
    if (person) {
      Object.assign(person, personData);
    }
  } else {
    // Add new person
    const newPerson = {
      id: generateId(),
      ...personData,
      x: 400 + Math.random() * 200,
      y: 200 + Math.random() * 200
    };
    
    state.people.push(newPerson);
    
    // Handle relation context
    if (relationContext && selectedPersonId) {
      handleRelationContext(relationContext, selectedPersonId, newPerson.id);
    }
    
    selectPerson(newPerson.id);
  }
  
  debouncedSave();
  closeAllModals();
  renderTree();
  updateDrawer();
  updateFilters();
}

function handleRelationContext(context, existingPersonId, newPersonId) {
  const contextParts = context.split(":");
  const relationType = contextParts[0];
  
  if (relationType === "parent") {
    // New person is parent of existing person
    addRelation("PARENT_CHILD", newPersonId, existingPersonId);
  } else if (relationType === "child") {
    // New person is child of existing person
    addRelation("PARENT_CHILD", existingPersonId, newPersonId);
  } else if (relationType === "spouse") {
    // New person is spouse of existing person
    addRelation("SPOUSE", existingPersonId, newPersonId);
  }
}

function deleteSelectedPerson() {
  if (!selectedPersonId) return;
  
  const person = state.people.find(p => p.id === selectedPersonId);
  if (!person) return;
  
  if (!confirm(`Are you sure you want to delete ${person.name}? This will also remove all their relationships.`)) {
    return;
  }
  
  // Remove person
  state.people = state.people.filter(p => p.id !== selectedPersonId);
  
  // Remove all relations involving this person
  state.relations = state.relations.filter(r => r.aId !== selectedPersonId && r.bId !== selectedPersonId);
  
  debouncedSave();
  closeDrawer();
  renderTree();
  updateFilters();
}

function addRelatedPerson(relationType) {
  openAddPersonModal(`${relationType}:${selectedPersonId}`);
}

// ===== LINK EXISTING PERSON =====
function openLinkExistingModal() {
  if (!selectedPersonId) return;
  
  const person = state.people.find(p => p.id === selectedPersonId);
  if (!person) return;
  
  // Set description
  const desc = document.getElementById("linkModalDescription");
  if (desc) {
    desc.textContent = `Link ${person.name} to another person in the tree`;
  }
  
  // Populate person list
  const select = document.getElementById("linkPersonSelect");
  if (select) {
    select.innerHTML = '';
    
    state.people.forEach(p => {
      if (p.id !== selectedPersonId) {
        const option = document.createElement("option");
        option.value = p.id;
        option.textContent = p.name;
        select.appendChild(option);
      }
    });
  }
  
  // Clear search input
  const searchInput = document.getElementById("linkSearchInput");
  if (searchInput) {
    searchInput.value = "";
  }
  
  document.getElementById("linkModal").style.display = "flex";
}

function addRelation(type, aId, bId) {
  // Prevent duplicate relations
  const exists = state.relations.some(r => 
    r.type === type && 
    ((r.aId === aId && r.bId === bId) || (type === "SPOUSE" && r.aId === bId && r.bId === aId))
  );
  
  if (exists) {
    alert("This relationship already exists");
    return;
  }
  
  // Prevent impossible relations
  if (aId === bId) {
    alert("A person cannot have a relationship with themselves");
    return;
  }
  
  state.relations.push({
    id: generateId(),
    type,
    aId,
    bId
  });
}

// ===== COPY ORIGIN =====
function openCopyOriginModal() {
  if (!selectedPersonId) return;
  
  const select = document.getElementById("copyOriginFromPerson");
  select.innerHTML = '<option value="">-- Select Person --</option>';
  
  state.people.forEach(p => {
    if (p.id !== selectedPersonId && (p.originCountry || p.originCity)) {
      const option = document.createElement("option");
      option.value = p.id;
      option.textContent = `${p.name} (${p.originCity || p.originCountry})`;
      select.appendChild(option);
    }
  });
  
  document.getElementById("copyOriginModal").style.display = "flex";
}

function handleCopyOriginSubmit(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const sourcePersonId = formData.get("sourcePersonId");
  
  if (!sourcePersonId) {
    alert("Please select a person");
    return;
  }
  
  const sourcePerson = state.people.find(p => p.id === sourcePersonId);
  const targetPerson = state.people.find(p => p.id === selectedPersonId);
  
  if (!sourcePerson || !targetPerson) return;
  
  targetPerson.originCountry = sourcePerson.originCountry;
  targetPerson.originCity = sourcePerson.originCity;
  targetPerson.originArea = sourcePerson.originArea;
  targetPerson.originFamilyBranch = sourcePerson.originFamilyBranch;
  targetPerson.originNotes = sourcePerson.originNotes;
  
  debouncedSave();
  closeAllModals();
  renderTree();
  updateDrawer();
}

// ===== FILTERS =====
function updateFilters() {
  updateCountryFilter();
  updateCityFilter();
}

function updateCountryFilter() {
  const countries = new Set();
  state.people.forEach(p => {
    if (p.originCountry) countries.add(p.originCountry);
  });
  
  const select = document.getElementById("countryFilter");
  const currentValue = select.value;
  
  select.innerHTML = '<option value="All">All Countries</option>';
  Array.from(countries).sort().forEach(country => {
    const option = document.createElement("option");
    option.value = country;
    option.textContent = country;
    select.appendChild(option);
  });
  
  // Restore selection if still valid
  if (currentValue !== "All" && countries.has(currentValue)) {
    select.value = currentValue;
  } else {
    select.value = "All";
    state.ui.filterCountry = "All";
  }
}

function updateCityFilter() {
  const cities = new Set();
  
  state.people.forEach(p => {
    if (p.originCity) {
      // Filter by country if selected
      if (state.ui.filterCountry === "All" || p.originCountry === state.ui.filterCountry) {
        cities.add(p.originCity);
      }
    }
  });
  
  const select = document.getElementById("cityFilter");
  const currentValue = select.value;
  
  select.innerHTML = '<option value="All">All Cities</option>';
  Array.from(cities).sort().forEach(city => {
    const option = document.createElement("option");
    option.value = city;
    option.textContent = city;
    select.appendChild(option);
  });
  
  // Restore selection if still valid
  if (currentValue !== "All" && cities.has(currentValue)) {
    select.value = currentValue;
  } else {
    select.value = "All";
    state.ui.filterCity = "All";
  }
}

function updateOriginDataLists() {
  // Countries
  const countries = new Set(["Bahrain", "Saudi Arabia", "Kuwait", "UAE", "Qatar", "Oman"]);
  state.people.forEach(p => {
    if (p.originCountry) countries.add(p.originCountry);
  });
  
  const countryList = document.getElementById("countrySuggestions");
  if (countryList) {
    countryList.innerHTML = "";
    Array.from(countries).sort().forEach(country => {
      const option = document.createElement("option");
      option.value = country;
      countryList.appendChild(option);
    });
  }
  
  // Cities
  const cities = new Set();
  state.people.forEach(p => {
    if (p.originCity) cities.add(p.originCity);
  });
  
  const cityList = document.getElementById("citySuggestions");
  if (cityList) {
    cityList.innerHTML = "";
    Array.from(cities).sort().forEach(city => {
      const option = document.createElement("option");
      option.value = city;
      cityList.appendChild(option);
    });
  }
}

// ===== SETTINGS =====
function openSettings() {
  const toggle = document.getElementById("hideOriginBadgesToggle");
  if (toggle) {
    toggle.checked = state.ui.hideOriginBadges;
  }
  document.getElementById("settingsModal").style.display = "flex";
}

// ===== NAVIGATION =====
function focusOnPerson() {
  if (!selectedPersonId) return;
  
  const person = state.people.find(p => p.id === selectedPersonId);
  if (!person) return;
  
  const svg = document.getElementById("treeSvg");
  if (!svg) return;
  
  const rect = svg.getBoundingClientRect();
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  
  viewState.offsetX = centerX - person.x * viewState.scale;
  viewState.offsetY = centerY - person.y * viewState.scale;
  
  applyViewTransform();
}

function fitTreeToScreen() {
  if (state.people.length === 0) return;
  
  const svg = document.getElementById("treeSvg");
  if (!svg) return;
  
  // Find bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  state.people.forEach(p => {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  });
  
  const padding = 100;
  const treeWidth = maxX - minX + padding * 2;
  const treeHeight = maxY - minY + padding * 2;
  
  const rect = svg.getBoundingClientRect();
  const scaleX = rect.width / treeWidth;
  const scaleY = rect.height / treeHeight;
  
  viewState.scale = Math.min(scaleX, scaleY, 1);
  
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  
  viewState.offsetX = rect.width / 2 - centerX * viewState.scale;
  viewState.offsetY = rect.height / 2 - centerY * viewState.scale;
  
  applyViewTransform();
}

// ===== EXPORT / IMPORT =====
function exportData() {
  const dataStr = JSON.stringify(state, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement("a");
  a.href = url;
  a.download = `family-tree-${new Date().toISOString().split("T")[0]}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const imported = JSON.parse(event.target.result);
      
      // Validate basic structure
      if (!imported.people || !Array.isArray(imported.people)) {
        alert("Invalid file format: missing people array");
        return;
      }
      
      if (!imported.relations || !Array.isArray(imported.relations)) {
        alert("Invalid file format: missing relations array");
        return;
      }
      
      // Validate unique IDs
      const ids = new Set();
      for (const person of imported.people) {
        if (ids.has(person.id)) {
          alert(`Duplicate person ID found: ${person.id}`);
          return;
        }
        ids.add(person.id);
      }
      
      // Validate relations
      const validRelations = imported.relations.filter(rel => {
        if (!ids.has(rel.aId) || !ids.has(rel.bId)) {
          console.warn(`Skipping invalid relation: ${rel.id}`);
          return false;
        }
        return true;
      });
      
      imported.relations = validRelations;
      
      // Migrate data
      migrateData(imported);
      
      // Load imported data
      state = imported;
      
      // Reset view
      viewState = {
        offsetX: 0,
        offsetY: 0,
        scale: 1,
        isDragging: false,
        dragStartX: 0,
        dragStartY: 0,
        draggedNode: null
      };
      
      selectedPersonId = null;
      
      debouncedSave();
      renderTree();
      updateFilters();
      closeDrawer();
      
      alert("Data imported successfully!");
    } catch (err) {
      console.error("Import error:", err);
      alert("Failed to import file. Please check the file format.");
    }
  };
  
  reader.readAsText(file);
  
  // Reset file input
  e.target.value = "";
}

// ===== PRINT =====
function printTree() {
  window.print();
}

// ===== RESET =====
function resetData() {
  if (!confirm("Are you sure you want to reset ALL data? This cannot be undone!")) {
    return;
  }
  
  if (!confirm("FINAL WARNING: All your family tree data will be permanently deleted. Continue?")) {
    return;
  }
  
  localStorage.removeItem("familyTreeData");
  loadSampleData();
  
  viewState = {
    offsetX: 0,
    offsetY: 0,
    scale: 1,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    draggedNode: null
  };
  
  selectedPersonId = null;
  searchQuery = "";
  
  document.getElementById("searchInput").value = "";
  
  renderTree();
  updateFilters();
  closeDrawer();
  
  alert("Data has been reset to sample data.");
}

// ===== UTILITIES =====
function generateId() {
  return "id_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
}

function closeAllModals() {
  document.querySelectorAll(".modal").forEach(modal => {
    modal.style.display = "none";
  });
}

function updateClearSearchButton() {
  const btn = document.getElementById("clearSearchBtn");
  if (btn) {
    btn.classList.toggle("hidden", !searchQuery);
  }
}

function updateClearFiltersButton() {
  const btn = document.getElementById("clearFiltersBtn");
  if (btn) {
    const hasFilters = state.ui.filterCountry !== "All" || state.ui.filterCity !== "All";
    btn.classList.toggle("hidden", !hasFilters);
  }
}

function zoomBy(factor) {
  const svg = document.getElementById("treeSvg");
  if (!svg) return;
  
  const newScale = Math.max(0.1, Math.min(5, viewState.scale * factor));
  
  const rect = svg.getBoundingClientRect();
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  
  viewState.offsetX = centerX - (centerX - viewState.offsetX) * (newScale / viewState.scale);
  viewState.offsetY = centerY - (centerY - viewState.offsetY) * (newScale / viewState.scale);
  viewState.scale = newScale;
  
  applyViewTransform();
  updateZoomDisplay();
}

function updateZoomDisplay() {
  const display = document.getElementById("zoomLevel");
  if (display) {
    display.textContent = `${Math.round(viewState.scale * 100)}%`;
  }
}

function applyViewTransform() {
  const container = document.getElementById("treeContainer");
  if (!container) return;
  
  const svg = container.querySelector("svg");
  const treeGroup = svg ? svg.querySelector("#treeGroup") : null;
  
  if (treeGroup) {
    const transform = `translate(${viewState.offsetX}, ${viewState.offsetY}) scale(${viewState.scale})`;
    treeGroup.setAttribute("transform", transform);
  }
  
  updateZoomDisplay();
}

function filterLinkPersonList(query) {
  const select = document.getElementById("linkPersonSelect");
  if (!select) return;
  
  const lowerQuery = query.toLowerCase();
  Array.from(select.options).forEach(option => {
    const matches = option.textContent.toLowerCase().includes(lowerQuery);
    option.style.display = matches ? "" : "none";
  });
}

let confirmCallback = null;

function showConfirm(message, callback) {
  document.getElementById("confirmMessage").textContent = message;
  document.getElementById("confirmModal").style.display = "flex";
  confirmCallback = callback;
}

function handleConfirmOk() {
  if (confirmCallback) {
    confirmCallback();
    confirmCallback = null;
  }
  closeAllModals();
}

function confirmLinkPerson() {
  const select = document.getElementById("linkPersonSelect");
  const relationType = document.querySelector('input[name="linkRelationType"]:checked');
  
  if (!select || !select.value) {
    alert("Please select a person");
    return;
  }
  
  if (!relationType) {
    alert("Please select a relationship type");
    return;
  }
  
  const targetPersonId = select.value;
  const type = relationType.value;
  
  if (type === "parent") {
    addRelation("PARENT_CHILD", targetPersonId, selectedPersonId);
  } else if (type === "child") {
    addRelation("PARENT_CHILD", selectedPersonId, targetPersonId);
  } else if (type === "spouse") {
    addRelation("SPOUSE", selectedPersonId, targetPersonId);
  }
  
  debouncedSave();
  closeAllModals();
  renderTree();
  updateDrawer();
}

function toggleMobileMenu() {
  const btn = document.getElementById("mobileMenuBtn");
  const topBarCenter = document.querySelector(".top-bar-center");
  const topBarRight = document.querySelector(".top-bar-right");
  
  const isExpanded = btn?.getAttribute("aria-expanded") === "true";
  btn?.setAttribute("aria-expanded", !isExpanded);
  
  if (topBarCenter) topBarCenter.classList.toggle("show");
  if (topBarRight) topBarRight.classList.toggle("show");
}

function handleKeyboardShortcuts(e) {
  // Ctrl/Cmd + F: Focus search
  if ((e.ctrlKey || e.metaKey) && e.key === "f") {
    e.preventDefault();
    document.getElementById("searchInput")?.focus();
  }
  
  // H: Fit to screen
  if (e.key === "h" || e.key === "H") {
    if (e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA") {
      e.preventDefault();
      fitTreeToScreen();
    }
  }
  
  // Esc: Close modals/drawer
  if (e.key === "Escape") {
    const hasOpenModal = Array.from(document.querySelectorAll(".modal")).some(
      m => m.style.display === "block"
    );
    if (hasOpenModal) {
      closeAllModals();
    } else if (document.getElementById("drawer")?.classList.contains("open")) {
      closeDrawer();
    }
  }
  
  // Delete: Delete selected person
  if (e.key === "Delete" && selectedPersonId) {
    if (e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA") {
      e.preventDefault();
      deleteSelectedPerson();
    }
  }
  
  // +/-: Zoom
  if (e.key === "+" || e.key === "=") {
    if (e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA") {
      e.preventDefault();
      zoomBy(1.2);
    }
  }
  if (e.key === "-" || e.key === "_") {
    if (e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA") {
      e.preventDefault();
      zoomBy(0.8);
    }
  }
}
}
