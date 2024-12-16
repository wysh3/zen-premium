(function() {
    const CLOSE_DELAY = 12 * 60 * 60 * 1000; // 12 hours in milliseconds
    const CHECK_INTERVAL = 10 * 60 * 1000; // Check every 10 minutes for inactive tabs
    const BATCH_SIZE = 100; // Maximum number of tabs to check per cycle

    let lastRunTime = 0; // To track when the script last ran

    function closeInactiveTabs() {
        const now = Date.now();
        const tabs = gBrowser.tabs;
        const closedTabs = [];
        let batchCount = 0;

        // Exit if the last run was too recent (avoid running too frequently)
        if (now - lastRunTime < CHECK_INTERVAL) return;
        lastRunTime = now;

        // Process tabs in batches of BATCH_SIZE
        for (let i = 0; i < tabs.length && batchCount < BATCH_SIZE; i++) {
            const tab = tabs[i];

            // Skip active or pinned tabs
            if (tab.selected || tab.pinned) continue;

            const lastAccessed = tab.linkedBrowser.lastAccessed || tab.lastAccessed;
            if (lastAccessed && now - lastAccessed > CLOSE_DELAY) {
                try {
                    gBrowser.removeTab(tab); // Close the tab
                    closedTabs.push(tab); // Keep track of closed tabs
                } catch (e) {
                    console.error("Error closing tab:", e);
                }
            }

            batchCount++;
        }

        // Log how many tabs were closed, for monitoring
        if (closedTabs.length > 0) {
            console.log(`Closed ${closedTabs.length} inactive tabs.`);
        }

        // If there are still tabs to check, set a small delay to resume the check
        if (batchCount < tabs.length) {
            setTimeout(closeInactiveTabs, 100); // Process remaining tabs after a short delay
        }
    }

    // Run the cleanup function periodically
    setInterval(closeInactiveTabs, CHECK_INTERVAL);
})();
