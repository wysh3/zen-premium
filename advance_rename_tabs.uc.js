(() => {
    const CONFIG = {
        maxTitleLength: 50,
        apiConfig: {
            ollama: {
                endpoint: 'http://localhost:11434/api/generate',
                enabled: false, //set it to true if you want to use ollama
                model: 'llama3.2:1b-instruct-q4_K_M' // edit if you want to use other models
            },
            customApi: {
                endpoint: 'BASE_URL/api/v1/chat/completions', //add base url
                apiKey: 'API_KEY', //add api key
                model: 'Meta-Llama-3-3-70B-Instruct', //change if you want to use other models (don't use the reasoning ones)
                enabled: true //set it to false if you don't want to use custom api
            }
        },
        styles: `
            /* High-performance animations using transform and opacity */
            @keyframes loading-pulse-animation {
                0%, 100% {
                    opacity: 0.7;
                    filter: brightness(0.95);
                }
                50% {
                    opacity: 1;
                    filter: brightness(1.05);
                }
            }
            
            .tab-rename-loading .tab-icon-image {
                animation: loading-pulse-animation 1.2s cubic-bezier(0.33, 0, 0.67, 1) infinite;
                will-change: opacity, filter;
            }
            
            /* Ultra-smooth tab name change animation - Apple-inspired */
            @keyframes tab-name-fade-out {
                0% {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                    filter: blur(0px);
                }
                100% {
                    opacity: 0;
                    transform: translateY(3px) scale(0.98);
                    filter: blur(0.5px);
                }
            }
            
            @keyframes tab-name-fade-in {
                0% {
                    opacity: 0;
                    transform: translateY(-3px) scale(0.98);
                    filter: blur(0.5px);
                }
                100% {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                    filter: blur(0px);
                }
            }
            
            .tab-name-changing-out .tab-label,
            .tab-name-changing-out .tab-text {
                animation: tab-name-fade-out 0.18s cubic-bezier(0.33, 0, 0.67, 1) forwards;
                will-change: transform, opacity, filter;
            }
            
            .tab-name-changing-in .tab-label,
            .tab-name-changing-in .tab-text {
                animation: tab-name-fade-in 0.24s cubic-bezier(0.33, 0, 0.67, 1) forwards;
                will-change: transform, opacity, filter;
            }
        `
    };

    // Style injection
    const injectStyles = () => {
        if (document.getElementById('tab-rename-styles')) return;
        const style = Object.assign(document.createElement('style'), {
            id: 'tab-rename-styles',
            textContent: CONFIG.styles
        });
        document.head.appendChild(style);
    };

    // Process title to ensure it's clean and appropriate length
    const processTitle = (text) => {
        return text.split(/\s+/)
            .slice(0, 4)
            .join(' ')
            .substring(0, CONFIG.maxTitleLength)
            .replace(/^["'\s]+|["'\s]+$/g, '')
            .replace(/\s{2,}/g, ' ')
            .replace(/(?:^|\s)\W+/g, '')
            .replace(/\*/g, '')
            .replace(/\b(a|an|the|and|of|in|on|at)\b/gi, (m) => m.toLowerCase());
    };

    // Get page title from tab or URL
    const getPageTitle = (tab) => {
        // Try to get the page title
        const originalTitle = tab.getAttribute('label') || 
                             tab.querySelector('.tab-label, .tab-text')?.textContent || 
                             'New Tab';
        
        // If it's a generic title, try to use URL
        if (originalTitle === 'New Tab' || originalTitle === 'about:blank') {
            try {
                // Attempt to get the browser object to access the URL
                const browser = tab.linkedBrowser || 
                               tab._linkedBrowser || 
                               gBrowser?.getBrowserForTab?.(tab);
                
                if (browser?.currentURI?.spec) {
                    const url = browser.currentURI.spec;
                    if (url && !url.startsWith('about:')) {
                        try {
                            const hostname = new URL(url).hostname;
                            return hostname || originalTitle;
                        } catch (e) {
                            return originalTitle;
                        }
                    }
                }
            } catch (e) {
                console.warn('Error getting URL:', e);
            }
        }
        
        return originalTitle;
    };

    // Smooth tab title update with two-phase animation
    const smoothlyUpdateTabTitle = (tab, label, newTitle) => {
        // Phase 1: Fade out the current title
        tab.classList.add('tab-name-changing-out');
        
        // Wait for fade-out to complete, then update text and fade in
        setTimeout(() => {
            // Update the text while it's invisible
            label.textContent = newTitle;
            
            // Remove fade-out class and add fade-in class
            tab.classList.remove('tab-name-changing-out');
            tab.classList.add('tab-name-changing-in');
            
            // Remove the fade-in class once animation completes
            setTimeout(() => {
                tab.classList.remove('tab-name-changing-in');
            }, 240); // Match fade-in animation duration
        }, 180); // Match fade-out animation duration
    };

    // AI rename function with better error handling
    const renameWithAI = async (tab) => {
        if (!tab) return;
        
        const originalTitle = getPageTitle(tab);
        if (!originalTitle?.trim()) return;

        console.log(`Renaming tab with title: "${originalTitle}"`);

        // Mark tab as loading
        tab.classList.add('tab-rename-loading');
        
        const { ollama, customApi } = CONFIG.apiConfig;
        const useOllama = ollama.enabled && !customApi.enabled ? true :
            customApi.enabled ? false : ollama.enabled;

        try {
            const apiUrl = useOllama ? ollama.endpoint : customApi.endpoint;
            console.log(`Using API: ${apiUrl}`);
            
            const requestBody = useOllama ? 
                {
                    model: ollama.model,
                    prompt: `Transform the following text: "${originalTitle}" into 2-4 word tab title \n- Remove platform names/dates\n- Use title case\n- No markdown/asterisks\n- Respond ONLY with plain text title`,
                    temperature: 0.2,
                    stream: false
                } : 
                {
                    model: customApi.model,
                    messages: [{
                        role: "system",
                        content: "You are a professional tab title optimizer. Respond ONLY with the optimized title in title case without any formatting."
                    },{
                        role: "user",
                        content: `Transform the following text: "${originalTitle}" into 2-4 word tab title\n- Remove platform names\n- Prioritize keywords\n- Max ${CONFIG.maxTitleLength} chars\n- No explanations`
                    }],
                    temperature: 0.2,
                    max_tokens: 25
                };
            
            console.log('Request payload:', JSON.stringify(requestBody));
            
            const headers = {
                'Content-Type': 'application/json'
            };
            
            // Only add Authorization header if using custom API and API key exists
            if (!useOllama && customApi.apiKey) {
                headers['Authorization'] = `Bearer ${customApi.apiKey}`;
            }
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'No error details');
                throw new Error(`API Error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            console.log('API response:', data);
            
            const aiText = useOllama ?
                data.response?.trim() :
                data.choices?.[0]?.message?.content?.trim();

            if (!aiText) {
                throw new Error('No valid response from API');
            }

            const newTitle = processTitle(aiText);
            console.log(`New title: "${newTitle}"`);
            
            // Update tab label with smooth animation
            const label = tab.querySelector('.tab-label, .tab-text');
            if (label && newTitle !== label.textContent) {
                smoothlyUpdateTabTitle(tab, label, newTitle);
            }

        } catch (error) {
            console.error('AI Rename Error:', error);
        } finally {
            // Remove loading state after a slight delay to ensure animations complete
            setTimeout(() => {
                tab.classList.remove('tab-rename-loading');
            }, 200);
        }
    };

    // Watch for tab pinning with enhanced detection
    const watchTabPinning = () => {
        // For standard Firefox tab pin changes
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.type === 'attributes' && 
                    (mutation.attributeName === 'pinned' || 
                     mutation.attributeName === 'zen-pin-id' ||
                     mutation.attributeName === 'zen-pinned-changed' ||
                     mutation.attributeName === 'aria-pinned')) {
                    
                    const tab = mutation.target;
                    const isPinned = tab.hasAttribute('pinned') || 
                                    tab.hasAttribute('zen-pin-id') ||
                                    tab.getAttribute('aria-pinned') === 'true' ||
                                    tab.hasAttribute('zen-pinned-changed');
                    
                    // Only rename when a tab is newly pinned
                    if (isPinned && !tab.dataset.wasPinned) {
                        console.log('Tab pinned:', tab.getAttribute('label'));
                        tab.dataset.wasPinned = 'true';
                        // Small delay to ensure the tab is fully pinned
                        setTimeout(() => renameWithAI(tab), 100);
                    } else if (!isPinned) {
                        // Reset the tracking when unpinned
                        tab.dataset.wasPinned = '';
                    }
                }
            });
        });

        // Observe all tabs for pin attribute changes
        const tabContainer = document.querySelector('#tabbrowser-tabs, [role="tablist"]');
        if (tabContainer) {
            observer.observe(tabContainer, { 
                childList: true, 
                subtree: true, 
                attributes: true,
                attributeFilter: ['pinned', 'zen-pin-id', 'zen-pinned-changed', 'aria-pinned'] 
            });
            
            // Process any already pinned tabs
            tabContainer.querySelectorAll('.tabbrowser-tab[pinned], [zen-pin-id], [aria-pinned="true"]').forEach(tab => {
                if (!tab.dataset.wasPinned) {
                    tab.dataset.wasPinned = 'true';
                    renameWithAI(tab);
                }
            });
        }

        // For Zen Browser special pin events
        window.addEventListener('zen-tab-pinned', event => {
            const tab = event.target;
            if (tab && !tab.dataset.wasPinned) {
                console.log('Zen tab pinned event:', tab.getAttribute('label'));
                tab.dataset.wasPinned = 'true';
                setTimeout(() => renameWithAI(tab), 100);
            }
        });
    };

    // Initialization
    const init = () => {
        if (document.body.dataset.autoTabRenamer) return;
        injectStyles();
        watchTabPinning();
        document.body.dataset.autoTabRenamer = 'active';
        console.log("Auto Tab Rename on Pin initialized");
    };

    // Wait for the browser UI to be fully loaded
    if (document.readyState === 'complete') {
        setTimeout(init, 1000); // Delay to ensure browser UI is fully loaded
    } else {
        window.addEventListener('load', () => setTimeout(init, 1000));
    }
})();
