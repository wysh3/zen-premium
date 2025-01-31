function apply_clear_button() {
    let styles = `
    #clear-button {
    border: none;
    background: none;
    transition-duration: 0.1s;
    opacity: 1;
    position: absolute;
    color: light-dark(rgba(1, 1, 1, 0.7), rgba(255, 255, 255, 0.7));
    cursor: pointer;
    padding: 4px 6px;
    font-size: 14px;
    z-index: 1000;
    right: 0px;
    }

    #browser:not(:has(#navigator-toolbox[zen-expanded="true"])) #clear-button {
    font-size: 12px !important;
    }

    #vertical-pinned-tabs-container-separator {
    background: none !important;  /* Remove default line */
    margin: 8px auto;
    border: none;
    height: 20px;
    width: 98%;
    display: flex !important;
    align-items: center !important;
    justify-content: flex-end !important;
    position: relative;
    transition: margin 0.2s ease-in-out, width 0.2s ease-in-out;
    opacity: 1 !important;
    overflow: visible;
    z-index: 1000;
    padding-right: 0px;
    }

    #vertical-pinned-tabs-container-separator::before {
    content: '';
    position: absolute;
    left: 0;
    margin-left: 5px;
    width: calc(100% - 60px);
    height: 1px;
    background: light-dark(rgba(1, 1, 1, 0.075), rgba(255, 255, 255, 0.2));
    transition: width 0.2s ease-in-out;
    }

    #browser:has(toolbox[zen-right-side="true"]) {
    #vertical-pinned-tabs-container-separator {
    margin-right: 0px !important;
    }
    #clear-button {
    left: 0px;
    right: unset;
    }
    #vertical-pinned-tabs-container-separator::before {
    left: 50px;  /* Adjust line position for right-side layout */
    right: 0;
    }
    }

    #browser:not(:has(toolbox[zen-right-side="true"])) {
    #vertical-pinned-tabs-container-separator {
    margin-left: 0px !important;
    }
    }

    #browser:not(:has(#navigator-toolbox[zen-expanded="true"])) #vertical-pinned-tabs-container-separator {
    margin-bottom: 15px;
    margin-top: 15px;
    }

    #clear-button:hover {
    color: light-dark(rgb(1, 1, 1), rgb(255, 255, 255)) !important;
    background: light-dark(rgba(1, 1, 1, 0.1), rgba(255, 255, 255, 0.1));
    border-radius: 4px;
    }

    .tab-closing {
        animation: fadeUp 0.5s forwards;
    }

    @keyframes fadeUp {
        0% {
            opacity: 1;
            transform: translateY(0);
        }
        100% {
            opacity: 0;
            transform: translateY(-20px);
        }
    }
    `;

    let styleSheet = document.createElement("style");
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);

    const button = document.createElement("button");
    button.innerHTML = "↓ Clear";
    button.setAttribute("id", "clear-button");

    const separator = document.getElementById("vertical-pinned-tabs-container-separator");
    separator.appendChild(button);

    button.addEventListener("click", async () => {
        const pinnedTabs = await window.ZenPinnedTabsStorage.getPins();

        const tabRemovals = Array.from(gBrowser.tabs).map(tab => {
            return new Promise(resolve => {
                const isSameWorkSpace = tab.getAttribute('zen-workspace-id') === window.ZenWorkspaces.activeWorkspace;
                const isSelected = tab.selected;
                const isPinned = pinnedTabs.some(e => e.uuid === tab.getAttribute('zen-pin-id'));
                const isInGroup = !!tab.closest('tab-group');

                if (isSameWorkSpace && !isSelected && !isPinned && !isInGroup) {
                    tab.classList.add('tab-closing');
                    setTimeout(() => {
                        gBrowser.removeTab(tab, {
                            animate: false,
                            skipSessionStore: false,
                            closeWindowWithLastTab: false,
                        });
                        resolve();
                    }, 500);
                } else {
                    resolve();
                }
            });
        });

        await Promise.all(tabRemovals);
    });
}

apply_clear_button();
