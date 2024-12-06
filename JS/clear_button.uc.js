function apply_clear_button() {
	let styles = `
	#clear-button {
		border: none;
		background: none;
		transition-duration: 0.1s;
		opacity: 0;
		position: absolute;
		color: rgba(255,255,255, 0.3);
	}

	#browser:not(:has(#navigator-toolbox[zen-expanded="true"])) {
		#clear-button {
			font-size: 12px !important;
		}
	}

	#browser:has(toolbox[zen-right-side="true"]) {
		#vertical-pinned-tabs-container-separator {
			margin-right: 0px !important;
		}

		#clear-button {
			left: 0px;
		}
	}

	#browser:not(:has(toolbox[zen-right-side="true"])) {
		#vertical-pinned-tabs-container-separator {
			margin-left: 0px !important;
		}

		#clear-button {
			right: 0px;
		}
	}

	#vertical-pinned-tabs-container-separator {
		display: grid !important;
		place-items: center !important;
		transition-duration: 0.1s;
	}
	
	#browser:has(#navigator-toolbox[zen-expanded="true"]) {
		#tabbrowser-tabs:hover > #vertical-pinned-tabs-container-separator {
			width: calc(100% - 50px) !important;
		}
	}

	#browser:not(:has(#navigator-toolbox[zen-expanded="true"])) {
		#tabbrowser-tabs:hover > #vertical-pinned-tabs-container-separator {
			width: calc(100% - 43px) !important;
		}
	}

	#browser:not(:has(#navigator-toolbox[zen-expanded="true"])) {
		#vertical-pinned-tabs-container-separator {
			margin-bottom: 15px;
			margin-top: 15px;
		}
	}

	#tabbrowser-tabs:hover > #vertical-pinned-tabs-container-separator > #clear-button {
		border: none;
		opacity: 1 !important;
	}

	#clear-button:hover {
		color: rgb(255,255,255) !important;
	}
    `   

    let styleSheet = document.createElement("style")
    styleSheet.textContent = styles
    document.head.appendChild(styleSheet)

	var button = document.createElement("button");
	button. innerHTML = "↓ Clear";
	button.setAttribute("id", "clear-button");
	var body = document.getElementById("vertical-pinned-tabs-container-separator");
	body.appendChild(button);

	button.addEventListener("click", async () => {
		let pinnedTabs = await window.ZenPinnedTabsStorage.getPins();
		for (let tab of gBrowser.tabs) {
			let isSameWorkSpace = tab.getAttribute('zen-workspace-id') === window.ZenWorkspaces.activeWorkspace;
			let isSelected = tab.getAttribute('selected') === 'true';
			let isPinned = pinnedTabs.some(e => e.uuid === tab.getAttribute('zen-pin-id'))
			
			if (isSameWorkSpace && !isSelected && !isPinned) {
				gBrowser.removeTab(tab, {
					animate: false,
					skipSessionStore: false,
					closeWindowWithLastTab: false,
				});
			}
		}
	});
}
apply_clear_button();
