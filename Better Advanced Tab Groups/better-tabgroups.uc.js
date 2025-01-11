(function () {
  // Prevent multiple initializations
  if (document.body.getAttribute("data-tab-group-toggler-initialized")) return;

  let activeTabGroup = null; // Store the active tab group reference
  const saveStateFolder = `${
    Services.dirsvc.get("ProfD", Ci.nsIFile).path
  }\\chrome\\savestate`;
  const saveStateFile = `${saveStateFolder}\\tab-group-states.json`;

  // Utility to log debug messages
  function debugLog(message) {
    console.log(`[TabGroupDebug] ${message}`);
  }

  // Function to create the savestate folder and file if they don't exist
  function ensureSaveStateFile() {
    try {
      const file = Components.classes[
        "@mozilla.org/file/local;1"
      ].createInstance(Components.interfaces.nsIFile);
      file.initWithPath(saveStateFolder);
      if (!file.exists()) {
        debugLog("Savestate folder not found, creating...");
        file.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0o755);
        debugLog(`Savestate folder created at: ${saveStateFolder}`);
      }

      const stateFile = Components.classes[
        "@mozilla.org/file/local;1"
      ].createInstance(Components.interfaces.nsIFile);
      stateFile.initWithPath(saveStateFile);
      if (!stateFile.exists()) {
        debugLog("State file not found, creating...");
        stateFile.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0o644);
        saveTabGroupStates({}); // Initialize with an empty object
        debugLog(`State file created and initialized at: ${saveStateFile}`);
      }
    } catch (error) {
      console.error("Error ensuring save state file:", error);
    }
  }

  // Function to load tab group states from JSON file
  function loadTabGroupStates() {
    try {
      const file = Components.classes[
        "@mozilla.org/file/local;1"
      ].createInstance(Components.interfaces.nsIFile);
      file.initWithPath(saveStateFile);
      if (file.exists()) {
        debugLog("State file found, loading...");
        const inputStream = Components.classes[
          "@mozilla.org/network/file-input-stream;1"
        ].createInstance(Components.interfaces.nsIFileInputStream);
        inputStream.init(file, 0x01, 0o444, 0);
        const data = NetUtil.readInputStreamToString(
          inputStream,
          inputStream.available()
        );
        inputStream.close();
        const states = JSON.parse(data);
        debugLog(`Loaded states: ${JSON.stringify(states)}`);
        return states;
      } else {
        debugLog("State file does not exist. Returning empty state.");
        return {};
      }
    } catch (error) {
      console.error("Error loading tab group states:", error);
      return {};
    }
  }

  // Function to save tab group states to JSON file
  function saveTabGroupStates(tabGroupStates) {
    try {
      debugLog(`Saving states: ${JSON.stringify(tabGroupStates)}`);
      const file = Components.classes[
        "@mozilla.org/file/local;1"
      ].createInstance(Components.interfaces.nsIFile);
      file.initWithPath(saveStateFile);
      const outputStream = Components.classes[
        "@mozilla.org/network/file-output-stream;1"
      ].createInstance(Components.interfaces.nsIFileOutputStream);
      outputStream.init(file, 0x02 | 0x08 | 0x20, 0o644, 0);
      const data = JSON.stringify(tabGroupStates, null, 2);
      outputStream.write(data, data.length);
      outputStream.close();
      debugLog("Tab group states saved successfully.");
    } catch (error) {
      console.error("Error saving tab group states:", error);
    }
  }

  // Function to apply saved tab group states
  function applySavedTabGroupStates() {
    const tabGroupStates = loadTabGroupStates();
    debugLog("Applying saved tab group states...");

    document.querySelectorAll("tab-group").forEach((tabGroup) => {
      const groupId = tabGroup.id;
      if (tabGroupStates[groupId] !== undefined) {
        const state = tabGroupStates[groupId] === 2 ? "2" : "1";
        tabGroup.setAttribute("groups", state);
      }
    });
  }

  function injectToggleButton() {
    const ungroupTabsButton = document.getElementById("tabGroupEditor_ungroupTabs");
  
    if (ungroupTabsButton && !document.getElementById("tab-group-toggle-button")) {
      const toggleButton = document.createElement("button");
      toggleButton.id = "tab-group-toggle-button";
      toggleButton.textContent = "Switch to a Group"; // Default button text
  
      toggleButton.style.cssText = `
        order: 2;
        display: block;
        font-size: 12px;
        font-weight: 400;
        color: #fff;
        background: none;
        border: none;
        padding: 3px 0 3px 40px;
        text-align: left;
        width: 100%;
        height: 36px;
        cursor: pointer;
        line-height: 20px;
      `;
      
      toggleButton.addEventListener("mouseenter", () => {
        toggleButton.style.backgroundColor = "var(--panel-item-hover-bgcolor)";
      });
      toggleButton.addEventListener("mouseleave", () => {
        toggleButton.style.backgroundColor = "transparent";
      });
  
      toggleButton.addEventListener("click", () => {
        if (activeTabGroup) {
          const currentGroups =
            activeTabGroup.getAttribute("groups") === "2";
          const newGroupsState = currentGroups ? "1" : "2";
          activeTabGroup.setAttribute("groups", newGroupsState);
  
          toggleButton.textContent =
            newGroupsState === "2"
              ? "Switch to a Folder"
              : "Switch to a Group";
  
          const tabGroupStates = loadTabGroupStates();
          tabGroupStates[activeTabGroup.id] = parseInt(newGroupsState);
          saveTabGroupStates(tabGroupStates);
  
          debugLog(
            `Tab group toggled: ID="${activeTabGroup.id}", groups="${newGroupsState}"`
          );
        } else {
          console.warn("No active <tab-group> found to toggle.");
        }
      });
  
      // Insert the toggle button after the "ungroupTabs" button
      ungroupTabsButton.parentNode.insertBefore(toggleButton, ungroupTabsButton.nextSibling);
      debugLog("Toggle button injected below the 'ungroupTabs' button.");
    }
  }
  

  function addGroupsAttributeOnRightClick() {
    document.addEventListener("contextmenu", (event) => {
      activeTabGroup = event.target.closest("tab-group");
      if (activeTabGroup) {
        if (!activeTabGroup.hasAttribute("groups")) {
          activeTabGroup.setAttribute("groups", "2");
          debugLog(
            `Added 'groups="2"' to tab group ID="${activeTabGroup.id}".`
          );
        } else {
          debugLog(
            `Tab group ID="${activeTabGroup.id}" already has the "groups" attribute.`
          );
        }

        const tabGroupStates = loadTabGroupStates();
        if (!tabGroupStates.hasOwnProperty(activeTabGroup.id)) {
          tabGroupStates[activeTabGroup.id] = 2;
          saveTabGroupStates(tabGroupStates);
          debugLog(
            `Initialized state for tab group ID="${activeTabGroup.id}".`
          );
        }
      }
    });
  }

  function observePanelChanges() {
    const observer = new MutationObserver(() => {
      injectToggleButton();
    });

    const targetPanel = document.querySelector(".tab-group-editor-panel");
    if (targetPanel) {
      observer.observe(targetPanel, { childList: true, subtree: true });
      debugLog("Started observing panel changes.");
    } else {
      debugLog("Target panel not found for observing changes.");
    }
  }

  function init() {
    ensureSaveStateFile();
    applySavedTabGroupStates();
    injectToggleButton();
    observePanelChanges();
    addGroupsAttributeOnRightClick();
    document.body.setAttribute("data-tab-group-toggler-initialized", "true");
    debugLog("Tab group toggle script initialized.");
  }

  if (document.readyState === "complete") {
    init();
  } else {
    window.addEventListener("DOMContentLoaded", init);
  }
})();
