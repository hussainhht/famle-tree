/* ============================================
   Family Tree Builder - Redesigned App
   Plain HTML/CSS/JS - Offline
   With File System Access API Support
   ============================================ */

// ===== STATE MANAGEMENT =====
let state = {
  dataVersion: 2,
  ui: {
    hideOriginBadges: false,
    filterCountry: "All",
    filterCity: "All",
    lockManualPositions: false,
  },
  people: [],
  relations: [],
  meta: {
    projectName: "Untitled",
    createdAt: null,
    updatedAt: null,
  },
};

let viewState = {
  offsetX: 0,
  offsetY: 0,
  scale: 1,
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,
  draggedNode: null,
  nodeDragStartX: 0,
  nodeDragStartY: 0,
  nodeMoved: false,
};

let selectedPersonId = null;
let svgElement = null;
let searchQuery = "";
let currentRelationshipType = null;

// ===== FILE SYSTEM STATE =====
let fileHandle = null; // File System Access API handle
let hasUnsavedChanges = false;
let autoSaveTimeout = null;
const AUTOSAVE_DELAY = 1000; // 1 second debounce

// Check if File System Access API is available
const hasFileSystemAccess =
  "showSaveFilePicker" in window && "showOpenFilePicker" in window;

// ===== INITIALIZATION =====
document.addEventListener("DOMContentLoaded", () => {
  loadData();
  initializeUI();
  initializeFileSystem();
  renderTree();
  updateProjectUI();
});

// Warn before closing if unsaved changes
window.addEventListener("beforeunload", (e) => {
  if (hasUnsavedChanges) {
    e.preventDefault();
    e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
    return e.returnValue;
  }
});

// ===== FILE SYSTEM INITIALIZATION =====
function initializeFileSystem() {
  // Project buttons
  document
    .getElementById("newProjectBtn")
    .addEventListener("click", newProject);
  document
    .getElementById("openProjectBtn")
    .addEventListener("click", openProject);
  document
    .getElementById("saveProjectBtn")
    .addEventListener("click", saveProject);
  document
    .getElementById("saveAsProjectBtn")
    .addEventListener("click", saveProjectAs);

  // Fallback file input for browsers without File System Access API
  document
    .getElementById("openProjectFile")
    .addEventListener("change", handleOpenFileFallback);

  // Keyboard shortcuts
  document.addEventListener("keydown", handleKeyboardShortcuts);
}

function handleKeyboardShortcuts(e) {
  // Ctrl+N: New Project
  if (e.ctrlKey && e.key === "n") {
    e.preventDefault();
    newProject();
  }
  // Ctrl+O: Open Project
  if (e.ctrlKey && e.key === "o") {
    e.preventDefault();
    openProject();
  }
  // Ctrl+S: Save
  if (e.ctrlKey && !e.shiftKey && e.key === "s") {
    e.preventDefault();
    saveProject();
  }
  // Ctrl+Shift+S: Save As
  if (e.ctrlKey && e.shiftKey && e.key === "S") {
    e.preventDefault();
    saveProjectAs();
  }
}

// ===== DATA PERSISTENCE =====
function loadData() {
  try {
    const saved = localStorage.getItem("familyTreeData");
    if (saved) {
      const loaded = JSON.parse(saved);
      migrateData(loaded);
      state = loaded;
      // Ensure meta exists
      if (!state.meta) {
        state.meta = {
          projectName: "Untitled",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
    } else {
      loadDemoData();
    }
  } catch (e) {
    console.error("Failed to load data:", e);
    loadDemoData();
  }
}

function saveData() {
  try {
    state.meta = state.meta || {};
    state.meta.updatedAt = new Date().toISOString();
    localStorage.setItem("familyTreeData", JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save data:", e);
    showToast("Failed to save data", "error");
  }
}

function debouncedSave() {
  clearTimeout(window.saveTimeout);
  window.saveTimeout = setTimeout(saveData, 300);

  // Mark as unsaved and trigger auto-save if we have a file handle
  markUnsaved();
  triggerAutoSave();
}

function markUnsaved() {
  hasUnsavedChanges = true;
  updateProjectStatus("unsaved");
}

function markSaved() {
  hasUnsavedChanges = false;
  updateProjectStatus("saved");
}

function triggerAutoSave() {
  // Only auto-save if we have a file handle (File System Access API)
  if (!fileHandle) return;

  clearTimeout(autoSaveTimeout);
  autoSaveTimeout = setTimeout(async () => {
    await saveToFileHandle();
  }, AUTOSAVE_DELAY);
}

// ===== PROJECT OPERATIONS =====
async function newProject() {
  if (hasUnsavedChanges) {
    showConfirm(
      "Unsaved Changes",
      "You have unsaved changes. Create new project anyway?",
      () => {
        createNewProject();
      }
    );
  } else {
    createNewProject();
  }
}

function createNewProject() {
  fileHandle = null;
  state = {
    dataVersion: 2,
    ui: {
      hideOriginBadges: false,
      filterCountry: "All",
      filterCity: "All",
    },
    people: [],
    relations: [],
    meta: {
      projectName: "Untitled",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
  saveData();
  renderTree();
  updateCountryFilter();
  updateCityFilter();
  closeDrawer();
  markSaved();
  updateProjectUI();
  showToast("New project created", "success");
}

async function openProject() {
  if (hasUnsavedChanges) {
    showConfirm(
      "Unsaved Changes",
      "You have unsaved changes. Open another project anyway?",
      () => performOpenProject()
    );
  } else {
    performOpenProject();
  }
}

async function performOpenProject() {
  if (hasFileSystemAccess) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [
          {
            description: "Family Tree Files",
            accept: {
              "application/json": [".json", ".familytree.json"],
            },
          },
        ],
        multiple: false,
      });

      const file = await handle.getFile();
      const content = await file.text();
      const data = JSON.parse(content);

      // Validate and load
      const validationResult = validateProjectData(data);
      if (!validationResult.valid) {
        showToast(
          "Invalid file: " + validationResult.errors.join(", "),
          "error"
        );
        return;
      }

      // Store handle for future saves
      fileHandle = handle;

      // Apply warnings
      validationResult.warnings.forEach((w) => showToast(w, "warning"));

      // Load validated data
      migrateData(data);
      state = data;

      // Ensure meta
      if (!state.meta) {
        state.meta = {
          projectName: file.name.replace(/\.(familytree\.)?json$/i, ""),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      } else {
        state.meta.projectName =
          state.meta.projectName ||
          file.name.replace(/\.(familytree\.)?json$/i, "");
      }

      saveData();
      renderTree();
      updateCountryFilter();
      updateCityFilter();
      closeDrawer();
      markSaved();
      updateProjectUI();
      addToRecentProjects(file.name);
      showToast("Project opened", "success");
    } catch (e) {
      if (e.name !== "AbortError") {
        console.error("Failed to open project:", e);
        showToast("Failed to open project: " + e.message, "error");
      }
    }
  } else {
    // Fallback: use file input
    document.getElementById("openProjectFile").click();
  }
}

function handleOpenFileFallback(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);

      // Validate
      const validationResult = validateProjectData(data);
      if (!validationResult.valid) {
        showToast(
          "Invalid file: " + validationResult.errors.join(", "),
          "error"
        );
        return;
      }

      // Apply warnings
      validationResult.warnings.forEach((w) => showToast(w, "warning"));

      // Load
      migrateData(data);
      state = data;

      // Ensure meta
      if (!state.meta) {
        state.meta = {
          projectName: file.name.replace(/\.(familytree\.)?json$/i, ""),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      fileHandle = null; // No file handle in fallback mode
      saveData();
      renderTree();
      updateCountryFilter();
      updateCityFilter();
      closeDrawer();
      markSaved();
      updateProjectUI();
      showToast("Project opened", "success");
    } catch (error) {
      showToast("Failed to open: " + error.message, "error");
    }
  };
  reader.readAsText(file);
  e.target.value = ""; // Reset input
}

async function saveProject() {
  if (fileHandle && hasFileSystemAccess) {
    await saveToFileHandle();
  } else if (hasFileSystemAccess) {
    // No handle yet, do Save As
    await saveProjectAs();
  } else {
    // Fallback: download file
    downloadProjectFile();
  }
}

async function saveProjectAs() {
  if (hasFileSystemAccess) {
    try {
      const suggestedName =
        (state.meta?.projectName || "family-tree") + ".familytree.json";
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [
          {
            description: "Family Tree File",
            accept: { "application/json": [".familytree.json", ".json"] },
          },
        ],
      });

      fileHandle = handle;

      // Update project name from file
      const file = await handle.getFile();
      state.meta = state.meta || {};
      state.meta.projectName = file.name.replace(/\.(familytree\.)?json$/i, "");

      await saveToFileHandle();
      updateProjectUI();
      addToRecentProjects(file.name);
    } catch (e) {
      if (e.name !== "AbortError") {
        console.error("Failed to save:", e);
        showToast("Failed to save: " + e.message, "error");
      }
    }
  } else {
    // Fallback: download
    downloadProjectFile();
  }
}

async function saveToFileHandle() {
  if (!fileHandle) return;

  updateProjectStatus("saving");

  try {
    state.meta = state.meta || {};
    state.meta.updatedAt = new Date().toISOString();

    const writable = await fileHandle.createWritable();
    const json = JSON.stringify(state, null, 2);
    await writable.write(json);
    await writable.close();

    // Also save to localStorage as backup
    saveData();

    markSaved();
    showToast("Saved", "success");
  } catch (e) {
    console.error("Failed to save to file:", e);
    updateProjectStatus("error");
    showToast("Failed to save: " + e.message, "error");
  }
}

function downloadProjectFile() {
  state.meta = state.meta || {};
  state.meta.updatedAt = new Date().toISOString();

  const json = JSON.stringify(state, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const filename =
    (state.meta?.projectName || "family-tree") + ".familytree.json";
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);

  // Save to localStorage too
  saveData();
  markSaved();
  showToast("Downloaded: " + filename, "success");
}

// ===== DATA VALIDATION =====
function validateProjectData(data) {
  const errors = [];
  const warnings = [];

  // Check basic structure
  if (!data || typeof data !== "object") {
    errors.push("Invalid JSON structure");
    return { valid: false, errors, warnings };
  }

  // Check people array
  if (!Array.isArray(data.people)) {
    data.people = [];
    warnings.push("No people found, starting empty");
  }

  // Check relations array
  if (!Array.isArray(data.relations)) {
    data.relations = [];
  }

  // Validate people
  const validPeopleIds = new Set();
  const seenIds = new Set();

  data.people = data.people.filter((p, idx) => {
    // Must have id
    if (!p.id) {
      p.id = "p_" + Date.now() + "_" + idx;
      warnings.push(`Person at index ${idx} had no ID, generated one`);
    }

    // Check for duplicate IDs
    if (seenIds.has(p.id)) {
      warnings.push(`Duplicate ID ${p.id} found, skipping`);
      return false;
    }
    seenIds.add(p.id);

    // Must have name
    if (!p.name || typeof p.name !== "string" || !p.name.trim()) {
      warnings.push(`Person ${p.id} has invalid name, using "Unknown"`);
      p.name = "Unknown";
    }

    validPeopleIds.add(p.id);
    return true;
  });

  // Validate relations - filter out invalid ones
  const originalRelCount = data.relations.length;
  data.relations = data.relations.filter((r) => {
    if (!r.aId || !r.bId) return false;
    if (!validPeopleIds.has(r.aId) || !validPeopleIds.has(r.bId)) {
      return false;
    }
    if (!["PARENT_CHILD", "SPOUSE"].includes(r.type)) {
      return false;
    }
    return true;
  });

  const removedRels = originalRelCount - data.relations.length;
  if (removedRels > 0) {
    warnings.push(`Removed ${removedRels} invalid relationship(s)`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ===== PROJECT UI =====
function updateProjectUI() {
  const nameEl = document.getElementById("projectName");
  const projectName = state.meta?.projectName || "Untitled";
  nameEl.textContent = projectName;
  nameEl.title = projectName;

  // Update document title
  document.title = projectName + " - Family Tree Builder";
}

function updateProjectStatus(status) {
  const statusEl = document.getElementById("projectStatus");
  statusEl.dataset.status = status;

  const textEl = statusEl.querySelector(".status-text");
  const statusTexts = {
    saved: "Saved",
    saving: "Saving…",
    unsaved: "Unsaved",
    error: "Error",
  };
  textEl.textContent = statusTexts[status] || status;
}

// ===== RECENT PROJECTS =====
function addToRecentProjects(filename) {
  try {
    let recents = JSON.parse(localStorage.getItem("familyTreeRecents") || "[]");
    recents = recents.filter((r) => r !== filename);
    recents.unshift(filename);
    recents = recents.slice(0, 5); // Keep last 5
    localStorage.setItem("familyTreeRecents", JSON.stringify(recents));
  } catch (e) {
    console.warn("Could not save recent projects:", e);
  }
}

function getRecentProjects() {
  try {
    return JSON.parse(localStorage.getItem("familyTreeRecents") || "[]");
  } catch (e) {
    return [];
  }
}

function migrateData(data) {
  if (!data.dataVersion || data.dataVersion < 2) {
    data.dataVersion = 2;
    if (!data.ui) {
      data.ui = {
        hideOriginBadges: false,
        filterCountry: "All",
        filterCity: "All",
      };
    }
    if (data.people) {
      data.people.forEach((p) => {
        if (!p.originCountry) p.originCountry = "";
        if (!p.originCity) p.originCity = "";
        if (!p.originArea) p.originArea = "";
        if (!p.originFamilyBranch) p.originFamilyBranch = "";
        if (!p.originNotes) p.originNotes = "";
      });
    }
  }
}

function loadDemoData() {
  state = {
    dataVersion: 2,
    ui: {
      hideOriginBadges: false,
      filterCountry: "All",
      filterCity: "All",
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
        originNotes: "Original family",
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
        originArea: "Central",
        originFamilyBranch: "Al-Hassan",
        originNotes: "",
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
        originNotes: "",
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
        originNotes: "",
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
        originNotes: "",
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
        originNotes: "",
      },
    ],
    relations: [
      { id: "r1", type: "PARENT_CHILD", aId: "p1", bId: "p3" },
      { id: "r2", type: "PARENT_CHILD", aId: "p2", bId: "p3" },
      { id: "r3", type: "SPOUSE", aId: "p1", bId: "p2" },
      { id: "r4", type: "PARENT_CHILD", aId: "p3", bId: "p5" },
      { id: "r5", type: "PARENT_CHILD", aId: "p3", bId: "p6" },
      { id: "r6", type: "PARENT_CHILD", aId: "p4", bId: "p5" },
      { id: "r7", type: "PARENT_CHILD", aId: "p4", bId: "p6" },
      { id: "r8", type: "SPOUSE", aId: "p3", bId: "p4" },
    ],
    meta: {
      projectName: "Demo Family",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
  fileHandle = null;
  markSaved();
  updateProjectUI();
  debouncedSave();
}

// ===== UI INITIALIZATION =====
function initializeUI() {
  // Navbar buttons
  document
    .getElementById("addPersonBtn")
    .addEventListener("click", openAddPersonModal);
  document
    .getElementById("filterBtn")
    .addEventListener("click", toggleFilterPanel);
  document
    .getElementById("moreMenuBtn")
    .addEventListener("click", toggleMoreMenu);

  // More menu items
  document
    .getElementById("fitScreenBtn")
    .addEventListener("click", fitTreeToScreen);
  document
    .getElementById("autoArrangeBtn")
    .addEventListener("click", autoArrangeTree);
  document
    .getElementById("autoArrangeBtnToolbar")
    .addEventListener("click", autoArrangeTree);
  document.getElementById("exportBtn").addEventListener("click", exportData);
  document
    .getElementById("importBtn")
    .addEventListener("click", () =>
      document.getElementById("importFile").click()
    );
  document.getElementById("importFile").addEventListener("change", importData);
  document.getElementById("printBtn").addEventListener("click", printTree);
  document
    .getElementById("settingsBtn")
    .addEventListener("click", openSettingsModal);
  document.getElementById("resetBtn").addEventListener("click", () => {
    showConfirm("Reset all data?", "This cannot be undone.", () => {
      state.people = [];
      state.relations = [];
      saveData();
      closeAllModals();
      renderTree();
      closeDrawer();
    });
  });

  // Search
  document.getElementById("searchInput").addEventListener("input", (e) => {
    searchQuery = e.target.value.toLowerCase();
    updateClearSearchButton();
    renderTree();
  });
  document.getElementById("clearSearchBtn").addEventListener("click", () => {
    document.getElementById("searchInput").value = "";
    searchQuery = "";
    updateClearSearchButton();
    renderTree();
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
  document.getElementById("clearFiltersBtn").addEventListener("click", () => {
    state.ui.filterCountry = "All";
    state.ui.filterCity = "All";
    document.getElementById("countryFilter").value = "All";
    document.getElementById("cityFilter").value = "All";
    updateCityFilter();
    renderTree();
    updateClearFiltersButton();
    debouncedSave();
  });

  // Modals
  document
    .getElementById("personForm")
    .addEventListener("submit", handlePersonFormSubmit);
  document
    .getElementById("closePersonModalBtn")
    .addEventListener("click", closeAllModals);
  document
    .getElementById("cancelPersonBtn")
    .addEventListener("click", closeAllModals);

  document
    .getElementById("closeRelationshipModalBtn")
    .addEventListener("click", closeAllModals);
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const tabName = e.target.dataset.tab;
      document
        .querySelectorAll(".tab-content")
        .forEach((t) => t.classList.remove("active"));
      document.getElementById(tabName).classList.add("active");
      document
        .querySelectorAll(".tab-btn")
        .forEach((b) => b.classList.remove("active"));
      e.target.classList.add("active");
    });
  });

  document
    .getElementById("relationshipCreateForm")
    .addEventListener("submit", handleRelationshipCreate);
  document
    .getElementById("relationshipLinkForm")
    .addEventListener("submit", handleRelationshipLink);
  document
    .getElementById("relLinkSearch")
    .addEventListener("input", filterLinkPersonList);
  document
    .getElementById("relLinkSearch")
    .addEventListener("keydown", handleLinkListKeydown);
  document
    .getElementById("relLinkListbox")
    .addEventListener("keydown", handleLinkListKeydown);

  document
    .getElementById("closeSettingsModalBtn")
    .addEventListener("click", closeAllModals);
  document
    .getElementById("hideOriginBadgesToggle")
    .addEventListener("change", (e) => {
      state.ui.hideOriginBadges = e.target.checked;
      renderTree();
      debouncedSave();
    });
  document
    .getElementById("showCanvasGridToggle")
    .addEventListener("change", (e) => {
      document
        .getElementById("canvasGrid")
        .classList.toggle("visible", e.target.checked);
    });
  document
    .getElementById("reduceMotionToggle")
    .addEventListener("change", (e) => {
      document.documentElement.style.setProperty(
        "--transition-fast",
        e.target.checked ? "0.01ms" : "150ms ease-in-out"
      );
    });
  document
    .getElementById("lockManualPositionsToggle")
    .addEventListener("change", (e) => {
      state.ui.lockManualPositions = e.target.checked;
      debouncedSave();
    });
  document.getElementById("loadDemoBtn").addEventListener("click", () => {
    showConfirm(
      "Load demo family?",
      "This will replace your current data.",
      () => {
        loadDemoData();
        renderTree();
        closeAllModals();
        showToast("Demo data loaded", "success");
      }
    );
  });

  // Confirm modal
  document
    .getElementById("confirmCancelBtn")
    .addEventListener("click", closeAllModals);
  document
    .getElementById("confirmOkBtn")
    .addEventListener("click", handleConfirmOk);

  // Drawer
  document
    .getElementById("closeDrawerBtn")
    .addEventListener("click", closeDrawer);

  // SVG
  svgElement = document.getElementById("treeSvg");
  setupSVGInteractions();

  // Update filters
  updateCountryFilter();
  updateCityFilter();
}

// ===== MODALS =====
function openAddPersonModal(relationContext = null) {
  const modal = document.getElementById("personModal");
  const form = document.getElementById("personForm");
  document.getElementById("personModalTitle").textContent = "Add Person";
  form.reset();
  document.getElementById("personId").value = "";
  document.getElementById("personRelationContext").value =
    relationContext || "";
  closeAllModals();
  modal.classList.remove("hidden");
}

function openSettingsModal() {
  const modal = document.getElementById("settingsModal");
  document.getElementById("hideOriginBadgesToggle").checked =
    state.ui.hideOriginBadges;
  document.getElementById("lockManualPositionsToggle").checked =
    state.ui.lockManualPositions || false;
  document.getElementById("showCanvasGridToggle").checked = document
    .getElementById("canvasGrid")
    .classList.contains("visible");
  closeAllModals();
  modal.classList.remove("hidden");
}

function openRelationshipModal(type, personId) {
  currentRelationshipType = type;
  const modal = document.getElementById("relationshipModal");
  const titleMap = {
    parent: "Add Parent",
    child: "Add Child",
    spouse: "Add Spouse",
  };
  document.getElementById("relationshipModalTitle").textContent =
    titleMap[type] || "Add Relationship";

  // Reset forms
  document.getElementById("relationshipCreateForm").reset();
  document.getElementById("relationshipLinkForm").reset();
  document.getElementById("relLinkSearch").value = "";
  document.getElementById("relationshipError").classList.add("hidden");

  // Reset link form state
  document.getElementById("relLinkSelectedId").value = "";
  document.getElementById("relLinkPreview").classList.add("hidden");
  document.getElementById("relLinkSubmitBtn").disabled = true;

  // Populate link listbox
  populateLinkPersonList(type, personId);

  closeAllModals();
  modal.classList.remove("hidden");

  // Focus search input after modal opens
  setTimeout(() => {
    document.getElementById("relLinkSearch").focus();
  }, 100);
}

function toggleFilterPanel() {
  document.getElementById("filterPanel").classList.toggle("hidden");
  document.getElementById("moreMenu").classList.add("hidden");
}

function toggleMoreMenu() {
  document.getElementById("moreMenu").classList.toggle("hidden");
  document.getElementById("filterPanel").classList.add("hidden");
}

function closeAllModals() {
  document.querySelectorAll(".modal").forEach((m) => m.classList.add("hidden"));
  document.getElementById("filterPanel").classList.add("hidden");
  document.getElementById("moreMenu").classList.add("hidden");
}

// ===== HANDLERS =====
function handlePersonFormSubmit(e) {
  e.preventDefault();

  const id = document.getElementById("personId").value || "p_" + Date.now();
  const relationContext = document.getElementById(
    "personRelationContext"
  ).value;

  const person = {
    id,
    name: document.getElementById("personName").value.trim(),
    gender: document.getElementById("personGender").value,
    birthYear: document.getElementById("personBirthYear").value,
    deathYear: document.getElementById("personDeathYear").value,
    tag: document.getElementById("personTag").value,
    notes: document.getElementById("personNotes").value,
    originCountry: document.getElementById("personOriginCountry").value,
    originCity: document.getElementById("personOriginCity").value,
    originArea: document.getElementById("personOriginArea").value,
    originFamilyBranch: document.getElementById("personOriginFamilyBranch")
      .value,
    originNotes: document.getElementById("personOriginNotes").value,
    x: (Math.random() - 0.5) * 800 + 400,
    y: (Math.random() - 0.5) * 800 + 400,
  };

  const existingIndex = state.people.findIndex((p) => p.id === id);
  if (existingIndex >= 0) {
    state.people[existingIndex] = person;
  } else {
    state.people.push(person);
  }

  // Handle relationship context
  if (relationContext) {
    const [relType, selectedId] = relationContext.split(":");
    addRelation(relType, selectedId, id);
  }

  saveData();
  closeAllModals();
  renderTree();
  showToast("Saved", "success");
}

function handleRelationshipCreate(e) {
  e.preventDefault();
  const selectedId = selectedPersonId;
  const name = document.getElementById("relNewName").value.trim();
  const gender = document.getElementById("relNewGender").value;

  const newPerson = {
    id: "p_" + Date.now(),
    name,
    gender,
    birthYear: "",
    deathYear: "",
    notes: "",
    tag: "",
    x: (Math.random() - 0.5) * 400 + 400,
    y: (Math.random() - 0.5) * 400 + 400,
    originCountry: "",
    originCity: "",
    originArea: "",
    originFamilyBranch: "",
    originNotes: "",
  };

  state.people.push(newPerson);
  addRelation(currentRelationshipType, selectedId, newPerson.id);

  saveData();
  closeAllModals();
  renderTree();
  showToast("Relationship created", "success");
}

function handleRelationshipLink(e) {
  e.preventDefault();
  const linkedId = document.getElementById("relLinkSelectedId").value;
  const selectedId = selectedPersonId;

  if (!linkedId) {
    showError("Please select a person");
    return;
  }

  if (linkedId === selectedId) {
    showError("Cannot link a person to themselves");
    return;
  }

  addRelation(currentRelationshipType, selectedId, linkedId);
  saveData();
  closeAllModals();
  renderTree();
  showToast("Relationship linked", "success");
}

function addRelation(type, aId, bId) {
  // Prevent duplicate relationships
  if (
    state.relations.some(
      (r) =>
        (r.aId === aId && r.bId === bId) ||
        (r.aId === bId && r.bId === aId && r.type === type)
    )
  ) {
    return;
  }

  let relationType, relAId, relBId;

  if (type === "parent") {
    relationType = "PARENT_CHILD";
    relAId = bId;
    relBId = aId;
  } else if (type === "child") {
    relationType = "PARENT_CHILD";
    relAId = aId;
    relBId = bId;
  } else if (type === "spouse") {
    relationType = "SPOUSE";
    relAId = aId;
    relBId = bId;
  }

  state.relations.push({
    id: "r_" + Date.now(),
    type: relationType,
    aId: relAId,
    bId: relBId,
  });
}

function deleteSelectedPerson() {
  showConfirm(
    "Delete person?",
    `${
      state.people.find((p) => p.id === selectedPersonId)?.name || "Person"
    } and all their relationships will be deleted.`,
    () => {
      state.people = state.people.filter((p) => p.id !== selectedPersonId);
      state.relations = state.relations.filter(
        (r) => r.aId !== selectedPersonId && r.bId !== selectedPersonId
      );
      saveData();
      closeDrawer();
      renderTree();
      showToast("Person deleted", "success");
    }
  );
}

function showError(message) {
  document.getElementById("relationshipError").textContent = message;
  document.getElementById("relationshipError").classList.remove("hidden");
}

window.handleConfirmOk = function () {
  if (window.confirmCallback) {
    window.confirmCallback();
  }
  closeAllModals();
};

function showConfirm(title, message, callback) {
  document.getElementById("confirmTitle").textContent = title;
  document.getElementById("confirmMessage").textContent = message;
  window.confirmCallback = callback;
  closeAllModals();
  document.getElementById("confirmModal").classList.remove("hidden");
}

// ===== AUTO ARRANGE LAYOUT ALGORITHM =====
// Layout constants
const LAYOUT = {
  NODE_WIDTH: 140,
  NODE_HEIGHT: 70,
  H_GAP: 50, // Horizontal gap between sibling groups
  V_GAP: 120, // Vertical gap between generations
  SPOUSE_GAP: 20, // Gap between spouses
  PADDING: 100, // Canvas padding
};

/**
 * Main function to auto-arrange the tree - Top to Bottom layout
 */
function autoArrangeTree() {
  if (state.people.length === 0) {
    showToast("No people to arrange", "info");
    return;
  }

  closeAllModals();

  // Build the family graph structure
  const graph = buildFamilyGraph();

  // Find the true roots - people who have no parents AND whose spouse also has no parents
  // OR people who have no parents and no spouse
  const rootPeople = findTrueRoots(graph);

  // Position all nodes using BFS from roots
  const positioned = new Set();
  let currentX = LAYOUT.PADDING;

  rootPeople.forEach((rootId) => {
    if (positioned.has(rootId)) return;

    const width = positionSubtree(
      graph,
      rootId,
      currentX,
      LAYOUT.PADDING,
      positioned
    );
    currentX += width + LAYOUT.H_GAP * 2;
  });

  // Handle any unpositioned people (disconnected nodes)
  state.people.forEach((p) => {
    if (!positioned.has(p.id)) {
      p.x = currentX + LAYOUT.NODE_WIDTH / 2;
      p.y = LAYOUT.PADDING;
      p.hasManualPos = false;
      positioned.add(p.id);
      currentX += LAYOUT.NODE_WIDTH + LAYOUT.H_GAP;
    }
  });

  // Render and fit
  renderTree();
  setTimeout(() => {
    fitTreeToScreen();
  }, 50);

  debouncedSave();
  showToast("Tree arranged", "success");
}

/**
 * Find true root people - those at the top of the family tree
 */
function findTrueRoots(graph) {
  const roots = [];
  const visited = new Set();

  // A true root is someone who:
  // 1. Has no parents
  // 2. Is not a spouse of someone who HAS parents (they would be placed with their spouse)

  graph.nodes.forEach((node, id) => {
    if (visited.has(id)) return;

    const parents = graph.childOf.get(id) || [];

    if (parents.length === 0) {
      // Check if this person's spouse has parents
      const spouses = graph.spouseOf.get(id) || [];
      let spouseHasParents = false;

      for (const spouseId of spouses) {
        const spouseParents = graph.childOf.get(spouseId) || [];
        if (spouseParents.length > 0) {
          spouseHasParents = true;
          break;
        }
      }

      if (!spouseHasParents) {
        // This is a true root
        roots.push(id);
        visited.add(id);
        // Mark spouses as visited too (they'll be positioned together)
        spouses.forEach((s) => visited.add(s));
      }
    }
  });

  return roots;
}

/**
 * Position a person and all their descendants
 * Returns the width used
 */
function positionSubtree(graph, personId, startX, y, positioned) {
  if (positioned.has(personId)) return 0;

  // Get all family members at this level (person + spouse(s))
  const familyMembers = [personId];
  const spouses = graph.spouseOf.get(personId) || [];
  spouses.forEach((s) => {
    if (!familyMembers.includes(s)) {
      familyMembers.push(s);
    }
  });

  // Get all children of this family
  const allChildren = [];
  familyMembers.forEach((memberId) => {
    const children = graph.parentOf.get(memberId) || [];
    children.forEach((childId) => {
      if (!allChildren.includes(childId) && !positioned.has(childId)) {
        allChildren.push(childId);
      }
    });
  });

  // Calculate widths for all child subtrees first
  const childWidths = [];
  let totalChildrenWidth = 0;

  allChildren.forEach((childId, idx) => {
    const childWidth = calculateSubtreeWidth(
      graph,
      childId,
      new Set(positioned)
    );
    childWidths.push({ childId, width: childWidth });
    totalChildrenWidth += childWidth;
    if (idx < allChildren.length - 1) {
      totalChildrenWidth += LAYOUT.H_GAP;
    }
  });

  // Calculate parent family width
  const parentWidth =
    familyMembers.length * LAYOUT.NODE_WIDTH +
    (familyMembers.length - 1) * LAYOUT.SPOUSE_GAP;

  // The family unit needs at least as much space as its children
  const familyWidth = Math.max(parentWidth, totalChildrenWidth);

  // Position the parent(s) centered above their children
  const parentCenterX = startX + familyWidth / 2;
  const parentStartX = parentCenterX - parentWidth / 2;

  familyMembers.forEach((memberId, idx) => {
    const person = state.people.find((p) => p.id === memberId);
    if (person) {
      person.x =
        parentStartX +
        idx * (LAYOUT.NODE_WIDTH + LAYOUT.SPOUSE_GAP) +
        LAYOUT.NODE_WIDTH / 2;
      person.y = y;
      person.hasManualPos = false;
      positioned.add(memberId);
    }
  });

  // Now position children
  if (allChildren.length > 0) {
    const childY = y + LAYOUT.V_GAP;
    let childStartX = parentCenterX - totalChildrenWidth / 2;

    childWidths.forEach(({ childId, width }) => {
      positionSubtree(graph, childId, childStartX, childY, positioned);
      childStartX += width + LAYOUT.H_GAP;
    });
  }

  return familyWidth;
}

/**
 * Calculate the width needed for a person's subtree
 */
function calculateSubtreeWidth(graph, personId, positioned) {
  if (positioned.has(personId)) return 0;

  // Get family members
  const familyMembers = [personId];
  const spouses = graph.spouseOf.get(personId) || [];
  spouses.forEach((s) => {
    if (!familyMembers.includes(s) && !positioned.has(s)) {
      familyMembers.push(s);
    }
  });

  // Get all children
  const allChildren = [];
  familyMembers.forEach((memberId) => {
    const children = graph.parentOf.get(memberId) || [];
    children.forEach((childId) => {
      if (!allChildren.includes(childId) && !positioned.has(childId)) {
        allChildren.push(childId);
      }
    });
  });

  // Calculate children total width
  let childrenWidth = 0;
  const tempPositioned = new Set(positioned);
  familyMembers.forEach((m) => tempPositioned.add(m));

  if (allChildren.length > 0) {
    allChildren.forEach((childId, idx) => {
      childrenWidth += calculateSubtreeWidth(graph, childId, tempPositioned);
      tempPositioned.add(childId);
      if (idx < allChildren.length - 1) {
        childrenWidth += LAYOUT.H_GAP;
      }
    });
  }

  // Parent width
  const parentWidth =
    familyMembers.length * LAYOUT.NODE_WIDTH +
    (familyMembers.length - 1) * LAYOUT.SPOUSE_GAP;

  return Math.max(parentWidth, childrenWidth);
}

/**
 * Find root families (couples/individuals with no parents)
 * @deprecated Use findTrueRoots instead
 */
function findRootFamilies(graph) {
  const families = [];
  const processed = new Set();

  // Find all people with no parents
  graph.nodes.forEach((node, id) => {
    if (processed.has(id)) return;

    const parents = graph.childOf.get(id) || [];
    if (parents.length === 0) {
      // This is a root person
      const coupleId = graph.coupleOf.get(id);
      if (coupleId) {
        // Add the whole couple as a family unit
        const couple = graph.couples.find((c) => c.id === coupleId);
        if (couple) {
          families.push({ type: "couple", members: [...couple.members] });
          couple.members.forEach((m) => processed.add(m));
        }
      } else {
        families.push({ type: "single", members: [id] });
        processed.add(id);
      }
    }
  });

  return families;
}

/**
 * Layout a family unit and its descendants recursively
 * @deprecated Use positionSubtree instead
 */
function layoutFamily(graph, family, startX, y, level) {
  const members = family.members;

  // Get all children of this family
  const allChildren = [];
  members.forEach((memberId) => {
    const children = graph.parentOf.get(memberId) || [];
    children.forEach((childId) => {
      if (!allChildren.includes(childId)) {
        allChildren.push(childId);
      }
    });
  });

  // Group children into family units (with their spouses)
  const childFamilies = [];
  const processedChildren = new Set();

  allChildren.forEach((childId) => {
    if (processedChildren.has(childId)) return;

    const coupleId = graph.coupleOf.get(childId);
    if (coupleId) {
      const couple = graph.couples.find((c) => c.id === coupleId);
      if (couple) {
        // Only include children that are actually children of this family
        const familyMembers = couple.members.filter(
          (m) =>
            allChildren.includes(m) ||
            graph.spouseOf.get(m)?.some((s) => allChildren.includes(s))
        );
        if (familyMembers.length > 0) {
          childFamilies.push({ type: "couple", members: couple.members });
          couple.members.forEach((m) => processedChildren.add(m));
        }
      }
    } else {
      childFamilies.push({ type: "single", members: [childId] });
      processedChildren.add(childId);
    }
  });

  // First, recursively layout all child families to get their widths
  let totalChildrenWidth = 0;
  const childWidths = [];

  if (childFamilies.length > 0) {
    childFamilies.forEach((childFamily, idx) => {
      const childWidth = getSubtreeWidth(graph, childFamily);
      childWidths.push(childWidth);
      totalChildrenWidth += childWidth;
      if (idx < childFamilies.length - 1) {
        totalChildrenWidth += LAYOUT.H_GAP;
      }
    });
  }

  // Calculate parent family width
  const parentWidth =
    members.length * LAYOUT.NODE_WIDTH +
    (members.length - 1) * LAYOUT.SPOUSE_GAP;

  // The family unit needs at least as much space as its children
  const familyWidth = Math.max(parentWidth, totalChildrenWidth);

  // Position the parent(s) centered above their children
  const parentCenterX = startX + familyWidth / 2;
  const parentStartX = parentCenterX - parentWidth / 2;

  members.forEach((memberId, idx) => {
    const node = graph.nodes.get(memberId);
    if (node && (!node.locked || !state.ui.lockManualPositions)) {
      node.x =
        parentStartX +
        idx * (LAYOUT.NODE_WIDTH + LAYOUT.SPOUSE_GAP) +
        LAYOUT.NODE_WIDTH / 2;
      node.y = y;
      node.person.x = node.x;
      node.person.y = node.y;
      node.person.hasManualPos = false;
      node.level = level;
    }
  });

  // Now position child families
  if (childFamilies.length > 0) {
    const childY = y + LAYOUT.V_GAP;
    let childStartX = parentCenterX - totalChildrenWidth / 2;

    childFamilies.forEach((childFamily, idx) => {
      layoutFamily(graph, childFamily, childStartX, childY, level + 1);
      childStartX += childWidths[idx] + LAYOUT.H_GAP;
    });
  }

  return familyWidth;
}

/**
 * Calculate the width needed for a family subtree
 */
function getSubtreeWidth(graph, family) {
  const members = family.members;

  // Get all children
  const allChildren = [];
  members.forEach((memberId) => {
    const children = graph.parentOf.get(memberId) || [];
    children.forEach((childId) => {
      if (!allChildren.includes(childId)) {
        allChildren.push(childId);
      }
    });
  });

  // Group children into families
  const childFamilies = [];
  const processedChildren = new Set();

  allChildren.forEach((childId) => {
    if (processedChildren.has(childId)) return;

    const coupleId = graph.coupleOf.get(childId);
    if (coupleId) {
      const couple = graph.couples.find((c) => c.id === coupleId);
      if (couple) {
        childFamilies.push({ type: "couple", members: couple.members });
        couple.members.forEach((m) => processedChildren.add(m));
      }
    } else {
      childFamilies.push({ type: "single", members: [childId] });
      processedChildren.add(childId);
    }
  });

  // Calculate children total width
  let childrenWidth = 0;
  if (childFamilies.length > 0) {
    childFamilies.forEach((childFamily, idx) => {
      childrenWidth += getSubtreeWidth(graph, childFamily);
      if (idx < childFamilies.length - 1) {
        childrenWidth += LAYOUT.H_GAP;
      }
    });
  }

  // Parent width
  const parentWidth =
    members.length * LAYOUT.NODE_WIDTH +
    (members.length - 1) * LAYOUT.SPOUSE_GAP;

  return Math.max(parentWidth, childrenWidth);
}

/**
 * Center the entire tree in the canvas
 */
function centerTree() {
  if (state.people.length === 0) return;

  // Find bounds
  let minX = Infinity,
    maxX = -Infinity;
  state.people.forEach((p) => {
    if (p.x !== undefined) {
      minX = Math.min(minX, p.x - LAYOUT.NODE_WIDTH / 2);
      maxX = Math.max(maxX, p.x + LAYOUT.NODE_WIDTH / 2);
    }
  });

  // Shift everything to start from PADDING
  const shift = LAYOUT.PADDING - minX;
  state.people.forEach((p) => {
    if (p.x !== undefined) {
      p.x += shift;
    }
  });
}

/**
 * Build graph structure from relations
 */
function buildFamilyGraph() {
  const graph = {
    nodes: new Map(), // personId -> node info
    parentOf: new Map(), // personId -> [childIds]
    childOf: new Map(), // personId -> [parentIds]
    spouseOf: new Map(), // personId -> [spouseIds]
    couples: [], // [{id, members: [id, id]}]
    coupleOf: new Map(), // personId -> coupleId
  };

  // Initialize nodes
  state.people.forEach((p) => {
    graph.nodes.set(p.id, {
      id: p.id,
      person: p,
      level: -1,
      x: 0,
      y: 0,
      width: LAYOUT.NODE_WIDTH,
      subtreeWidth: LAYOUT.NODE_WIDTH,
      locked: p.hasManualPos && state.ui.lockManualPositions,
    });
    graph.parentOf.set(p.id, []);
    graph.childOf.set(p.id, []);
    graph.spouseOf.set(p.id, []);
  });

  // Process relations
  state.relations.forEach((rel) => {
    if (rel.type === "PARENT_CHILD") {
      // aId is parent, bId is child
      if (graph.nodes.has(rel.aId) && graph.nodes.has(rel.bId)) {
        graph.parentOf.get(rel.aId).push(rel.bId);
        graph.childOf.get(rel.bId).push(rel.aId);
      }
    } else if (rel.type === "SPOUSE") {
      if (graph.nodes.has(rel.aId) && graph.nodes.has(rel.bId)) {
        graph.spouseOf.get(rel.aId).push(rel.bId);
        graph.spouseOf.get(rel.bId).push(rel.aId);
      }
    }
  });

  // Build couple groups
  const processedSpouses = new Set();
  state.people.forEach((p) => {
    if (processedSpouses.has(p.id)) return;

    const spouses = graph.spouseOf.get(p.id);
    if (spouses && spouses.length > 0) {
      // Create a couple group
      const coupleId = `couple_${p.id}`;
      const members = [p.id, ...spouses];
      graph.couples.push({ id: coupleId, members });
      members.forEach((m) => {
        graph.coupleOf.set(m, coupleId);
        processedSpouses.add(m);
      });
    }
  });

  return graph;
}

// ===== RENDERING =====
function renderTree() {
  const filteredPeople = getFilteredPeople();

  if (filteredPeople.length === 0) {
    document.getElementById("emptyState").classList.remove("hidden");
    svgElement.innerHTML = "";
    return;
  }

  document.getElementById("emptyState").classList.add("hidden");

  svgElement.innerHTML = `
    <defs>
      <filter id="nodeShadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.1"/>
      </filter>
      <filter id="nodeSelectedShadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#2c5f2d" flood-opacity="0.3"/>
      </filter>
    </defs>
  `;

  const edgesGroup = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "g"
  );
  const nodesGroup = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "g"
  );

  renderEdges(edgesGroup, filteredPeople);
  renderNodes(nodesGroup, filteredPeople);

  svgElement.appendChild(edgesGroup);
  svgElement.appendChild(nodesGroup);

  applyViewTransform();
}

function getFilteredPeople() {
  let filtered = state.people;

  if (searchQuery) {
    filtered = filtered.filter((p) => {
      const fields = [
        p.name,
        p.tag,
        p.originCountry,
        p.originCity,
        p.originArea,
        p.originFamilyBranch,
      ].map((f) => (f || "").toLowerCase());
      return fields.some((f) => f.includes(searchQuery));
    });
  }

  if (state.ui.filterCountry !== "All") {
    filtered = filtered.filter(
      (p) => p.originCountry === state.ui.filterCountry
    );
  }

  if (state.ui.filterCity !== "All") {
    filtered = filtered.filter((p) => p.originCity === state.ui.filterCity);
  }

  return filtered;
}

function renderEdges(g, filteredPeople) {
  const filteredIds = new Set(filteredPeople.map((p) => p.id));

  state.relations.forEach((rel) => {
    if (!filteredIds.has(rel.aId) || !filteredIds.has(rel.bId)) return;

    const pA = state.people.find((p) => p.id === rel.aId);
    const pB = state.people.find((p) => p.id === rel.bId);
    if (!pA || !pB) return;

    // Create curved path for better visualization
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

    const x1 = pA.x;
    const y1 = pA.y;
    const x2 = pB.x;
    const y2 = pB.y;

    // Calculate control points for bezier curve
    const midY = (y1 + y2) / 2;
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);

    let d;
    if (rel.type === "SPOUSE") {
      // Horizontal curve for spouse relationships
      const curveOffset = Math.min(30, dy / 2);
      d = `M ${x1} ${y1} Q ${(x1 + x2) / 2} ${
        Math.min(y1, y2) - curveOffset
      } ${x2} ${y2}`;
    } else {
      // Vertical curve for parent-child relationships
      const controlY1 = y1 + (y2 - y1) * 0.4;
      const controlY2 = y1 + (y2 - y1) * 0.6;
      d = `M ${x1} ${y1} C ${x1} ${controlY1} ${x2} ${controlY2} ${x2} ${y2}`;
    }

    path.setAttribute("d", d);
    path.classList.add(
      "edge",
      rel.type === "SPOUSE" ? "spouse-edge" : "parent-child-edge"
    );
    path.dataset.relationId = rel.id;

    g.appendChild(path);
  });
}

function renderNodes(g, filteredPeople) {
  filteredPeople.forEach((person) => {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.classList.add("node-group", "node");
    group.dataset.personId = person.id;

    if (person.id === selectedPersonId) {
      group.classList.add("selected");
    }

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", person.x - 60);
    rect.setAttribute("y", person.y - 35);
    rect.setAttribute("width", "120");
    rect.setAttribute("height", "70");
    rect.setAttribute("rx", "8");
    rect.classList.add(
      "node-rect",
      person.gender === "Male"
        ? "node-male"
        : person.gender === "Female"
        ? "node-female"
        : ""
    );

    const name = document.createElementNS("http://www.w3.org/2000/svg", "text");
    name.setAttribute("x", person.x);
    name.setAttribute("y", person.y - 5);
    name.setAttribute("text-anchor", "middle");
    name.classList.add("node-name");
    name.textContent = (person.name || "").substring(0, 15);

    const years = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text"
    );
    years.setAttribute("x", person.x);
    years.setAttribute("y", person.y + 10);
    years.setAttribute("text-anchor", "middle");
    years.classList.add("node-years");
    years.textContent = person.birthYear
      ? `${person.birthYear}${person.deathYear ? `-${person.deathYear}` : ""}`
      : "";

    group.appendChild(rect);
    group.appendChild(name);
    group.appendChild(years);

    if (
      !state.ui.hideOriginBadges &&
      (person.originCity || person.originCountry)
    ) {
      const origin = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text"
      );
      origin.setAttribute("x", person.x);
      origin.setAttribute("y", person.y + 25);
      origin.setAttribute("text-anchor", "middle");
      origin.classList.add("node-origin");
      origin.textContent = (
        person.originCity ||
        person.originCountry ||
        ""
      ).substring(0, 12);
      group.appendChild(origin);
    }

    // Node mousedown for dragging
    group.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      viewState.draggedNode = person.id;
      viewState.nodeDragStartX = e.clientX;
      viewState.nodeDragStartY = e.clientY;
      viewState.nodeMoved = false;
      group.classList.add("dragging");
    });

    group.addEventListener("click", (e) => {
      e.stopPropagation();
      // Only select if not moved during drag
      if (!viewState.nodeMoved) {
        selectPerson(person.id);
      }
      viewState.nodeMoved = false;
    });

    g.appendChild(group);
  });
}

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
  const person = state.people.find((p) => p.id === selectedPersonId);
  if (!person) return;

  document.getElementById("drawerTitle").textContent = person.name;

  let html = `
    <div class="person-card">
      <div class="person-name">${escapeHtml(person.name)}</div>
      <div class="person-meta">
        ${person.gender ? `<span class="badge">${person.gender}</span>` : ""}
        ${
          person.tag
            ? `<span class="badge">${escapeHtml(person.tag)}</span>`
            : ""
        }
      </div>
    </div>

    <div class="info-section">
      <h3>Details</h3>
      <div class="info-item">
        <span class="info-label">Birth:</span>
        <span class="info-value">${person.birthYear || "—"}</span>
      </div>
      ${
        person.deathYear
          ? `
      <div class="info-item">
        <span class="info-label">Death:</span>
        <span class="info-value">${person.deathYear}</span>
      </div>
      `
          : ""
      }
      ${
        person.notes
          ? `
      <div class="info-item">
        <span class="info-label">Notes:</span>
        <span class="info-value">${escapeHtml(person.notes)}</span>
      </div>
      `
          : ""
      }
    </div>
  `;

  if (person.originCountry || person.originCity) {
    html += `
      <div class="info-section">
        <h3>Origin</h3>
        ${
          person.originCountry
            ? `<div class="info-item"><span class="info-label">Country:</span><span class="info-value">${escapeHtml(
                person.originCountry
              )}</span></div>`
            : ""
        }
        ${
          person.originCity
            ? `<div class="info-item"><span class="info-label">City:</span><span class="info-value">${escapeHtml(
                person.originCity
              )}</span></div>`
            : ""
        }
        ${
          person.originArea
            ? `<div class="info-item"><span class="info-label">Area:</span><span class="info-value">${escapeHtml(
                person.originArea
              )}</span></div>`
            : ""
        }
        ${
          person.originFamilyBranch
            ? `<div class="info-item"><span class="info-label">Branch:</span><span class="info-value">${escapeHtml(
                person.originFamilyBranch
              )}</span></div>`
            : ""
        }
      </div>
    `;
  }

  // Relationships
  const parentRels = state.relations
    .filter((r) => r.type === "PARENT_CHILD" && r.bId === person.id)
    .map((r) => state.people.find((p) => p.id === r.aId))
    .filter(Boolean);
  const spouseRels = state.relations
    .filter(
      (r) => r.type === "SPOUSE" && (r.aId === person.id || r.bId === person.id)
    )
    .map((r) => {
      const id = r.aId === person.id ? r.bId : r.aId;
      return state.people.find((p) => p.id === id);
    })
    .filter(Boolean);
  const childRels = state.relations
    .filter((r) => r.type === "PARENT_CHILD" && r.aId === person.id)
    .map((r) => state.people.find((p) => p.id === r.bId))
    .filter(Boolean);

  if (parentRels.length > 0 || spouseRels.length > 0 || childRels.length > 0) {
    html += `<div class="info-section"><h3>Relationships</h3>`;
    if (parentRels.length > 0) {
      html += `<div class="info-item"><span class="info-label">Parents:</span><span class="info-value">${parentRels
        .map((p) => escapeHtml(p.name))
        .join(", ")}</span></div>`;
    }
    if (spouseRels.length > 0) {
      html += `<div class="info-item"><span class="info-label">Spouses:</span><span class="info-value">${spouseRels
        .map((p) => escapeHtml(p.name))
        .join(", ")}</span></div>`;
    }
    if (childRels.length > 0) {
      html += `<div class="info-item"><span class="info-label">Children:</span><span class="info-value">${childRels
        .map((p) => escapeHtml(p.name))
        .join(", ")}</span></div>`;
    }
    html += `</div>`;
  }

  html += `
    <div class="action-buttons">
      <button class="btn-action" onclick="openRelationshipModal('parent', '${person.id}')">
        <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
        Add Parent
      </button>
      <button class="btn-action" onclick="openRelationshipModal('child', '${person.id}')">
        <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
        Add Child
      </button>
      <button class="btn-action" onclick="openRelationshipModal('spouse', '${person.id}')">
        <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
        Add Spouse
      </button>
      <button class="btn-action btn-action-secondary" onclick="{ document.getElementById('personId').value = '${person.id}'; openEditPersonModal(); }">Edit</button>
      <button class="btn-action btn-action-danger" onclick="deleteSelectedPerson()">Delete</button>
    </div>
  `;

  document.getElementById("drawerContent").innerHTML = html;
}

function openEditPersonModal() {
  const person = state.people.find((p) => p.id === selectedPersonId);
  if (!person) return;

  document.getElementById("personModalTitle").textContent = "Edit Person";
  document.getElementById("personName").value = person.name;
  document.getElementById("personGender").value = person.gender || "";
  document.getElementById("personBirthYear").value = person.birthYear || "";
  document.getElementById("personDeathYear").value = person.deathYear || "";
  document.getElementById("personTag").value = person.tag || "";
  document.getElementById("personNotes").value = person.notes || "";
  document.getElementById("personOriginCountry").value =
    person.originCountry || "";
  document.getElementById("personOriginCity").value = person.originCity || "";
  document.getElementById("personOriginArea").value = person.originArea || "";
  document.getElementById("personOriginFamilyBranch").value =
    person.originFamilyBranch || "";
  document.getElementById("personOriginNotes").value = person.originNotes || "";

  closeAllModals();
  document.getElementById("personModal").classList.remove("hidden");
}

// ===== FILTERS =====
function updateCountryFilter() {
  const countries = [
    ...new Set(state.people.map((p) => p.originCountry).filter(Boolean)),
  ].sort();
  const select = document.getElementById("countryFilter");
  const currentValue = select.value;
  select.innerHTML =
    '<option value="All">All</option>' +
    countries.map((c) => `<option value="${c}">${c}</option>`).join("");
  select.value = currentValue;
}

function updateCityFilter() {
  const cities = [
    ...new Set(
      state.people
        .filter(
          (p) =>
            state.ui.filterCountry === "All" ||
            p.originCountry === state.ui.filterCountry
        )
        .map((p) => p.originCity)
        .filter(Boolean)
    ),
  ].sort();
  const select = document.getElementById("cityFilter");
  const currentValue = select.value;
  select.innerHTML =
    '<option value="All">All</option>' +
    cities.map((c) => `<option value="${c}">${c}</option>`).join("");
  select.value = currentValue;
}

// ===== LINK PERSON LISTBOX =====
let linkListHighlightIndex = -1;
let linkListFilteredPeople = [];

function populateLinkPersonList(type, personId) {
  const listbox = document.getElementById("relLinkListbox");
  const selectedPerson = state.people.find((p) => p.id === personId);
  const selectedBirthYear = selectedPerson?.birthYear;

  // Filter people based on type and smart rules
  let candidates = state.people.filter((p) => {
    // Cannot link to self
    if (p.id === personId) return false;

    // Smart filtering for parent: must be at least 12 years older
    if (type === "parent" && selectedBirthYear && p.birthYear) {
      if (p.birthYear > selectedBirthYear - 12) return false;
    }

    // Smart filtering for child: must be at least 12 years younger
    if (type === "child" && selectedBirthYear && p.birthYear) {
      if (p.birthYear < selectedBirthYear + 12) return false;
    }

    return true;
  });

  linkListFilteredPeople = candidates;
  linkListHighlightIndex = -1;
  renderLinkPersonList();
}

function renderLinkPersonList(searchQuery = "") {
  const listbox = document.getElementById("relLinkListbox");
  const query = searchQuery.toLowerCase().trim();

  // Filter by search query
  let filtered = linkListFilteredPeople;
  if (query) {
    filtered = linkListFilteredPeople.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        (p.birthYear && p.birthYear.toString().includes(query))
    );
  }

  if (filtered.length === 0) {
    listbox.innerHTML =
      '<div class="link-listbox-empty">No matching people</div>';
    return;
  }

  const selectedId = document.getElementById("relLinkSelectedId").value;

  listbox.innerHTML = filtered
    .map((p, idx) => {
      const isSelected = p.id === selectedId;
      const isHighlighted = idx === linkListHighlightIndex;
      const genderClass = p.gender ? p.gender.toLowerCase() : "";
      const genderLabel = p.gender || "Unknown";

      return `
      <div class="link-person-item ${isSelected ? "selected" : ""} ${
        isHighlighted ? "highlighted" : ""
      }"
           data-id="${p.id}"
           data-index="${idx}"
           role="option"
           aria-selected="${isSelected}">
        <div class="link-person-info">
          <span class="link-person-name">${escapeHtml(p.name)}</span>
          <span class="link-person-year">${p.birthYear || "?"}</span>
        </div>
        <span class="link-person-badge ${genderClass}">${genderLabel}</span>
      </div>
    `;
    })
    .join("");

  // Store filtered list for keyboard navigation
  listbox._filteredList = filtered;

  // Add click handlers
  listbox.querySelectorAll(".link-person-item").forEach((item) => {
    item.addEventListener("click", () => selectLinkPerson(item.dataset.id));
  });
}

function selectLinkPerson(personId) {
  const person = state.people.find((p) => p.id === personId);
  if (!person) return;

  // Update hidden input
  document.getElementById("relLinkSelectedId").value = personId;

  // Update preview
  const preview = document.getElementById("relLinkPreview");
  const previewText = document.getElementById("relLinkPreviewText");
  const typeLabel =
    currentRelationshipType === "parent"
      ? "as Parent"
      : currentRelationshipType === "child"
      ? "as Child"
      : currentRelationshipType === "spouse"
      ? "as Spouse"
      : "";
  previewText.textContent = `${person.name} (${
    person.birthYear || "?"
  }) ${typeLabel}`;
  preview.classList.remove("hidden");

  // Enable submit button
  document.getElementById("relLinkSubmitBtn").disabled = false;

  // Re-render to show selection
  const searchQuery = document.getElementById("relLinkSearch").value;
  renderLinkPersonList(searchQuery);
}

function filterLinkPersonList(e) {
  const query = e.target.value;
  linkListHighlightIndex = -1;
  renderLinkPersonList(query);
}

function handleLinkListKeydown(e) {
  const listbox = document.getElementById("relLinkListbox");
  const items = listbox.querySelectorAll(".link-person-item");
  const filteredList = listbox._filteredList || [];

  if (filteredList.length === 0) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    linkListHighlightIndex = Math.min(
      linkListHighlightIndex + 1,
      filteredList.length - 1
    );
    updateHighlight(items);
    scrollHighlightIntoView(listbox, items);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    linkListHighlightIndex = Math.max(linkListHighlightIndex - 1, 0);
    updateHighlight(items);
    scrollHighlightIntoView(listbox, items);
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (
      linkListHighlightIndex >= 0 &&
      linkListHighlightIndex < filteredList.length
    ) {
      selectLinkPerson(filteredList[linkListHighlightIndex].id);
    }
  }
}

function updateHighlight(items) {
  items.forEach((item, idx) => {
    item.classList.toggle("highlighted", idx === linkListHighlightIndex);
  });
}

function scrollHighlightIntoView(listbox, items) {
  if (linkListHighlightIndex >= 0 && items[linkListHighlightIndex]) {
    const item = items[linkListHighlightIndex];
    const itemRect = item.getBoundingClientRect();
    const listRect = listbox.getBoundingClientRect();

    if (itemRect.bottom > listRect.bottom) {
      item.scrollIntoView({ block: "end", behavior: "smooth" });
    } else if (itemRect.top < listRect.top) {
      item.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function updateClearSearchButton() {
  document
    .getElementById("clearSearchBtn")
    .classList.toggle("hidden", !searchQuery);
}

function updateClearFiltersButton() {
  const isActive =
    state.ui.filterCountry !== "All" || state.ui.filterCity !== "All";
  document
    .getElementById("clearFiltersBtn")
    .classList.toggle("hidden", !isActive);
}

// ===== SVG INTERACTIONS =====
function setupSVGInteractions() {
  svgElement.addEventListener("mousedown", handleSVGMouseDown);
  svgElement.addEventListener("mousemove", handleSVGMouseMove);
  svgElement.addEventListener("mouseup", handleSVGMouseUp);
  svgElement.addEventListener("wheel", handleSVGWheel, { passive: false });
  svgElement.addEventListener("touchstart", handleTouchStart);
  svgElement.addEventListener("touchmove", handleTouchMove);
  svgElement.addEventListener("touchend", handleTouchEnd);
}

function handleSVGMouseDown(e) {
  if (e.button !== 0 || e.target.closest(".node")) return;
  viewState.isDragging = true;
  viewState.dragStartX = e.clientX;
  viewState.dragStartY = e.clientY;
  svgElement.classList.add("panning");
}

function handleSVGMouseMove(e) {
  // Handle node dragging
  if (viewState.draggedNode) {
    const person = state.people.find((p) => p.id === viewState.draggedNode);
    if (person) {
      const dx = (e.clientX - viewState.nodeDragStartX) / viewState.scale;
      const dy = (e.clientY - viewState.nodeDragStartY) / viewState.scale;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        viewState.nodeMoved = true;
      }
      person.x += dx;
      person.y += dy;
      viewState.nodeDragStartX = e.clientX;
      viewState.nodeDragStartY = e.clientY;
      renderTree();
    }
    return;
  }

  // Handle canvas panning
  if (!viewState.isDragging) return;
  const dx = e.clientX - viewState.dragStartX;
  const dy = e.clientY - viewState.dragStartY;
  viewState.offsetX += dx;
  viewState.offsetY += dy;
  viewState.dragStartX = e.clientX;
  viewState.dragStartY = e.clientY;
  applyViewTransform();
}

function handleSVGMouseUp() {
  // End node dragging
  if (viewState.draggedNode) {
    // Mark node as manually positioned if it was actually moved
    if (viewState.nodeMoved) {
      const person = state.people.find((p) => p.id === viewState.draggedNode);
      if (person) {
        person.hasManualPos = true;
      }
    }
    viewState.draggedNode = null;
    debouncedSave();
  }

  viewState.isDragging = false;
  svgElement.classList.remove("panning");
}

function handleSVGWheel(e) {
  e.preventDefault();
  const rect = svgElement.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const factor = e.deltaY > 0 ? 0.9 : 1.1;
  zoomBy(factor, x, y);
}

function handleTouchStart(e) {
  if (e.touches.length === 1) {
    viewState.isDragging = true;
    viewState.dragStartX = e.touches[0].clientX;
    viewState.dragStartY = e.touches[0].clientY;
  }
}

function handleTouchMove(e) {
  if (e.touches.length === 1 && viewState.isDragging) {
    const dx = e.touches[0].clientX - viewState.dragStartX;
    const dy = e.touches[0].clientY - viewState.dragStartY;
    viewState.offsetX += dx;
    viewState.offsetY += dy;
    viewState.dragStartX = e.touches[0].clientX;
    viewState.dragStartY = e.touches[0].clientY;
    applyViewTransform();
  }
}

function handleTouchEnd() {
  viewState.isDragging = false;
}

function zoomBy(
  factor,
  x = svgElement.clientWidth / 2,
  y = svgElement.clientHeight / 2
) {
  const newScale = Math.max(0.1, Math.min(5, viewState.scale * factor));
  viewState.offsetX =
    x - (x - viewState.offsetX) * (newScale / viewState.scale);
  viewState.offsetY =
    y - (y - viewState.offsetY) * (newScale / viewState.scale);
  viewState.scale = newScale;
  applyViewTransform();
  updateZoomLevel();
}

function applyViewTransform() {
  svgElement.style.transform = `translate(${viewState.offsetX}px, ${viewState.offsetY}px) scale(${viewState.scale})`;
}

function updateZoomLevel() {
  document.getElementById("zoomLevel").textContent =
    Math.round(viewState.scale * 100) + "%";
}

function fitTreeToScreen() {
  if (state.people.length === 0) return;
  const xs = state.people.map((p) => p.x);
  const ys = state.people.map((p) => p.y);
  const minX = Math.min(...xs) - 80;
  const maxX = Math.max(...xs) + 80;
  const minY = Math.min(...ys) - 50;
  const maxY = Math.max(...ys) + 50;
  const w = svgElement.clientWidth;
  const h = svgElement.clientHeight;
  const scaleX = w / (maxX - minX);
  const scaleY = h / (maxY - minY);
  viewState.scale = Math.min(scaleX, scaleY, 2);
  viewState.offsetX =
    -minX * viewState.scale + (w - (maxX - minX) * viewState.scale) / 2;
  viewState.offsetY =
    -minY * viewState.scale + (h - (maxY - minY) * viewState.scale) / 2;
  applyViewTransform();
  updateZoomLevel();
  closeAllModals();
}

document
  .getElementById("zoomInBtn")
  .addEventListener("click", () => zoomBy(1.2));
document
  .getElementById("zoomOutBtn")
  .addEventListener("click", () => zoomBy(0.8));

// ===== IMPORT/EXPORT (Legacy Support) =====
function exportData() {
  // Ensure meta is updated
  state.meta = state.meta || {};
  state.meta.updatedAt = new Date().toISOString();

  const json = JSON.stringify(state, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const filename =
    (state.meta?.projectName || "family-tree") +
    "-export-" +
    new Date().toISOString().slice(0, 10) +
    ".json";
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Exported: " + filename, "success");
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const imported = JSON.parse(ev.target.result);

      // Validate the imported data
      const validationResult = validateProjectData(imported);
      if (!validationResult.valid) {
        showToast(
          "Invalid file: " + validationResult.errors.join(", "),
          "error"
        );
        return;
      }

      // Show warnings
      validationResult.warnings.forEach((w) => showToast(w, "warning"));

      migrateData(imported);

      // Ensure meta exists
      if (!imported.meta) {
        imported.meta = {
          projectName: file.name.replace(/\.(familytree\.)?json$/i, ""),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      state = imported;
      fileHandle = null; // Import doesn't set file handle
      saveData();
      renderTree();
      updateCountryFilter();
      updateCityFilter();
      markSaved();
      updateProjectUI();
      showToast("Imported successfully", "success");
    } catch (error) {
      showToast("Import failed: " + error.message, "error");
    }
  };
  reader.readAsText(file);
  e.target.value = ""; // Reset input
}

function printTree() {
  window.print();
}

// ===== UTILITIES =====
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = "slideOut 300ms ease-in forwards";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Close menu on outside click
document.addEventListener("click", (e) => {
  if (
    !e.target.closest(".menu-container") &&
    !e.target.closest(".filter-panel")
  ) {
    document.getElementById("moreMenu").classList.add("hidden");
    document.getElementById("filterPanel").classList.add("hidden");
  }
});
