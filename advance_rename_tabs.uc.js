// Comprehensive Tab Renaming UserChrome Script
(function () {
    const CONFIG = {
        maxTitleLength: 50,
        minInputWidth: 320,
        hoverDelay: 300,
        ollamaApiEndpoint: 'http://localhost:11434/api/generate',
        styles: `
            @keyframes loading-pulse-animation {
                0% {
                    transform: translateY(-50%) scale(0.9);
                    opacity: 0.7;
                }
                50% {
                    transform: translateY(-50%) scale(1.05);
                    opacity: 1;
                }
                100% {
                    transform: translateY(-50%) scale(0.9);
                    opacity: 0.7;
                }
            }

            .tab-rename-icon {
                position: absolute;
                left: 2px;
                top: 8px;
                transform: translateY(-50%);
                width: 16px;
                height: 16px;
                background: linear-gradient(135deg, rgba(51,153,255,0.9) 0%, rgba(51,153,255,0.7) 100%);
                border-radius: 50%;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                opacity: 0;
                transition: all 0.3s ease;
                cursor: pointer;
                z-index: 10;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 10px;
            }

            .tab-rename-inline {
                position: absolute;
                top: 50%;
                left: 0;
                transform: translateY(-50%);
                background: transparent;
                border: 1px solid rgba(128, 128, 128, 0.5);
                border-radius: 4px;
                padding: 2px 5px;
                font-size: inherit;
                color: inherit;
                left: 30px;
                outline: none;
                box-shadow: none;
                transition: all 0.2s ease-in-out;
                z-index: 10;
                min-width: 50px;
                max-width: calc(100% - 74px);
                width: auto;
                white-space: nowrap;
            }

            .tabbrowser-tab:hover .tab-rename-icon {
                opacity: 1;
            }
            .tab-rename-icon:hover {
                transform: translateY(-50%) scale(1.2);
                box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            }
            .tab-rename-loading {
                opacity: 0.5;
                cursor: wait;
                animation: loading-pulse-animation 1s infinite;
            }
            .tab-rename-inline:focus {
                border-color: rgba(51, 153, 255, 0.8);
                box-shadow: 0 0 4px rgba(51, 153, 255, 0.5);
            }
        `
    };

    // Inject CSS for the renaming input and icon
    function injectStyles() {
        if (document.getElementById('tab-rename-styles')) return;
        const styleElement = document.createElement('style');
        styleElement.id = 'tab-rename-styles';
        styleElement.textContent = CONFIG.styles;
        document.head.appendChild(styleElement);
    }

    // AI-powered rename function using Ollama (optional)
    async function renameWithAI(originalTitle) {
        if (!originalTitle || originalTitle.trim().length === 0) {
            return originalTitle;
        }

        try {
            const response = await fetch(CONFIG.ollamaApiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: "llama3.2:1b",
                     prompt: `Just provide a shortened version of this phrase in under 4 words: ${originalTitle}`,
                     temperature: 0.1,
                    stream: false
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            const renamedTitle = result.response.trim()
                .split(/\s+/)
                .slice(0, 4)
                .join(' ')
                .substring(0, CONFIG.maxTitleLength);

            return renamedTitle || originalTitle;
        } catch (error) {
            console.warn('AI Rename Error:', error);
            return originalTitle;
        }
    }

    // Create AI rename icon
    function createRenameAIIcon(tab, labelElement) {
        // Prevent multiple icons
        if (tab.querySelector('.tab-rename-icon')) return;

        // Create rename icon
        const icon = document.createElement('div');
        icon.className = 'tab-rename-icon';
        icon.innerHTML = '✨';

        // Add click event to trigger AI rename
        icon.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Disable icon during AI processing
            icon.classList.add('tab-rename-loading');
            
            try {
                const originalTitle = labelElement.textContent.trim();
                const aiRename = await renameWithAI(originalTitle);
                
                // Only update if the rename is different
                if (aiRename !== originalTitle) {
                    labelElement.textContent = aiRename;
                }
            } catch (error) {
                console.warn('Rename attempt failed:', error);
            } finally {
                // Re-enable icon
                icon.classList.remove('tab-rename-loading');
            }
        });

        // Position the icon
        tab.style.position = 'relative';
        tab.appendChild(icon);
    }

    // Create manual rename input
    function createRenameInput(tab, labelElement) {
        const originalText = labelElement.textContent.trim();

        // Create and configure the input
        const input = document.createElement('input');
        input.type = 'text';
        input.value = originalText;
        input.className = 'tab-rename-inline';
        input.maxLength = CONFIG.maxTitleLength;

        // Position input dynamically over the label without disrupting layout
        const labelRect = labelElement.getBoundingClientRect();
        input.style.width = `${Math.max(CONFIG.minInputWidth, labelRect.width)}px`;
        input.style.height = `${labelRect.height}px`;

        // Add input to the tab, overlaying the label
        tab.style.position = 'relative';
        tab.appendChild(input);
        labelElement.style.visibility = 'hidden';

        // Automatically focus and select text
        input.focus();
        input.select();

        // Dynamically adjust input width
        function adjustWidth() {
            const tempSpan = document.createElement('span');
            tempSpan.style.visibility = 'hidden';
            tempSpan.style.position = 'absolute';
            tempSpan.style.whiteSpace = 'nowrap';
            tempSpan.style.font = getComputedStyle(input).font;
            tempSpan.textContent = input.value || ' ';
            document.body.appendChild(tempSpan);

            const newWidth = Math.max(CONFIG.minInputWidth, tempSpan.offsetWidth + 10);
            input.style.width = `${newWidth}px`;
            tempSpan.remove();
        }

        input.addEventListener('input', adjustWidth);
        adjustWidth();

        // Save changes and restore the label
        function saveRename() {
            const newTitle = input.value.trim();
            labelElement.textContent = newTitle || originalText;
            labelElement.style.visibility = '';
            input.remove();
        }

        // Handle cancel action
        function cancelRename() {
            labelElement.style.visibility = '';
            input.remove();
        }

        // Input event listeners
        input.addEventListener('blur', saveRename);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                saveRename();
            } else if (e.key === 'Escape') {
                cancelRename();
            }
        });
    }

    // Function to attach renaming functionality to tabs
    function addRenameListeners() {
        const tabs = document.querySelectorAll('.tabbrowser-tab:not([data-has-rename]), tab:not([data-has-rename]), [role="tab"]:not([data-has-rename])');
        
        tabs.forEach((tab) => {
            const label = tab.querySelector('.tab-label, label, .tab-text');
            const favicon = tab.querySelector('.tab-icon, .tab-icon-image');
            
            // Skip tabs without a label or already processed tabs
            if (!label) return;

            tab.setAttribute('data-has-rename', 'true');
            
            let hoverTimer;
            let lastClickTime = 0;
            
            // Add hover listener to show/create AI rename icon with delay
            const handleMouseEnter = () => {
                hoverTimer = setTimeout(() => {
                    createRenameAIIcon(tab, label);
                }, CONFIG.hoverDelay);
            };

            // Clear timer if mouse leaves before delay
            const handleMouseLeave = () => {
                clearTimeout(hoverTimer);
            };

            tab.addEventListener('mouseenter', handleMouseEnter);
            tab.addEventListener('mouseleave', handleMouseLeave);

            // Manual rename on double-click
            tab.addEventListener('click', (event) => {
                // Prevent renaming on favicon clicks
                if (event.target === favicon) return;

                const currentTime = Date.now();
                if (currentTime - lastClickTime < 300) {
                    // Double-click detected
                    event.preventDefault();
                    event.stopPropagation();
                    createRenameInput(tab, label);
                }
                lastClickTime = currentTime;
            });
        });
    }

    // Initialize the script
    function init() {
        // Prevent multiple initializations
        if (document.body.getAttribute('data-tab-renamer-initialized')) return;
        
        injectStyles();

        addRenameListeners();

        // Observe for new tabs
        const tabContainer = document.getElementById('tabbrowser-tabs') ||
            document.querySelector('.tabs-container') ||
            document.querySelector('[role="tablist"]');

        if (tabContainer) {
            const observer = new MutationObserver((mutations) => {
                // Only process if there are actual tab changes
                if (mutations.some(m => m.addedNodes.length > 0 || m.removedNodes.length > 0)) {
                    addRenameListeners();
                }
            });

            observer.observe(tabContainer, { 
                childList: true, 
                subtree: true 
            });
        }

        document.body.setAttribute('data-tab-renamer-initialized', 'true');
    }

    // Run when DOM is ready
    if (document.readyState === 'complete') {
        init();
    } else {
        window.addEventListener('DOMContentLoaded', init);
    }
})();
