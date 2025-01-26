(() => {
    const CONFIG = {
        maxTitleLength: 50,
        minInputWidth: 320,
        hoverDelay: 300,
        apiConfig: {
            ollama: {
                endpoint: 'http://localhost:11434/api/generate',
                enabled: true, //set it to false if you want to prioritize custom api or do not want to use ollama
                model: 'llama3.2:1b-instruct-q4_K_M' // edit if you want to use other models
            },
            customApi: {
                endpoint: 'API_URL',
                apiKey: 'API_KEY',
                model: 'API_MODEL_NAME',
                enabled: false //set it to true if you want to use custom api
            }
        },
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
            }`
    };

    // Style injection with singleton pattern
    const injectStyles = () => {
        if (document.getElementById('tab-rename-styles')) return;
        const style = Object.assign(document.createElement('style'), {
            id: 'tab-rename-styles',
            textContent: CONFIG.styles
        });
        document.head.appendChild(style);
    };

    // Enhanced title processing with markdown sanitization
    const processTitle = (text) => {
        return text.split(/\s+/)
        .slice(0, 4)
        .join(' ')
        .substring(0, CONFIG.maxTitleLength)
        .replace(/^["'\s*]+|["'\s*]+$/g, '')
        .replace(/\s{2,}/g, ' ')
        .replace(/(?:^|\s)\W+/g, '')
        .replace(/\*/g, '')
        .replace(/\b(a|an|the|and|of|in|on|at)\b/gi, (m) => m.toLowerCase());
    };

    // Professional API handler with sanitized prompts
    const renameWithAI = async (originalTitle) => {
        if (!originalTitle?.trim()) return originalTitle;

        const { ollama, customApi } = CONFIG.apiConfig;
        const useOllama = ollama.enabled && !customApi.enabled ? true :
        customApi.enabled ? false : ollama.enabled;

        try {
            const response = await fetch(
                useOllama ? ollama.endpoint : customApi.endpoint,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(!useOllama && { 'Authorization': `Bearer ${customApi.apiKey}` })
                    },
                    body: JSON.stringify(useOllama ? {
                        model: ollama.model,
                        prompt: `Transform the following text: "${originalTitle}"into 2-4 word tab title \n- Remove platform names/dates\n- Use title case\n- No markdown/asterisks\n- Respond ONLY with plain text title`,
                        temperature: 0.2,
                        stream: false
                    } : {
                        model: customApi.model,
                        messages: [{
                            role: "system",
                            content: "You are a professional tab title optimizer. Respond ONLY with the optimized title in title case without any formatting."
                        },{
                            role: "user",
                            content: `Transform the following text: "${originalTitle}"into 2-4 word tab title\n- Remove platform names\n- Prioritize keywords\n- Max ${CONFIG.maxTitleLength} chars\n- No explanations`
                        }],
                        temperature: 0.2,
                        max_tokens: 25
                    })
                }
            );

            if (!response.ok) throw new Error(`API Error: ${response.status}`);

            const data = await response.json();
            const aiText = useOllama ?
            data.response?.trim() :
            data.choices?.[0]?.message?.content?.trim();

            return aiText ? processTitle(aiText) : originalTitle;

        } catch (error) {
            console.warn('AI Rename Error:', error);
            return originalTitle;
        }
    };

    // Icon management with event delegation
    const handleIconInteraction = (tab, label) => {
        const icon = Object.assign(document.createElement('div'), {
            className: 'tab-rename-icon',
            innerHTML: '✨',
            onclick: async (e) => {
                e.stopPropagation();
                if (icon.classList.contains('tab-rename-loading')) return;

                icon.classList.add('tab-rename-loading');
                const newTitle = await renameWithAI(label.textContent.trim());
                if (newTitle !== label.textContent) label.textContent = newTitle;
                icon.classList.remove('tab-rename-loading');
            }
        });

        tab.style.position = 'relative';
        tab.appendChild(icon);
    };

    // Dynamic input field creator
    const createRenameField = (tab, label) => {
        const input = Object.assign(document.createElement('input'), {
            type: 'text',
            className: 'tab-rename-inline',
            value: label.textContent.trim(),
                                    maxLength: CONFIG.maxTitleLength,
                                    oninput: function() {
                                        const width = Math.max(CONFIG.minInputWidth, this.value.length * 8);
                                        this.style.width = `${width}px`;
                                    },
                                    onblur: function() {
                                        label.textContent = this.value.trim() || label.textContent;
                                        label.style.visibility = '';
                                        this.remove();
                                    },
                                    onkeydown: function(e) {
                                        if (e.key === 'Enter') this.blur();
                                        if (e.key === 'Escape') {
                                            label.style.visibility = '';
                                            this.remove();
                                        }
                                    }
        });

        label.style.visibility = 'hidden';
        tab.appendChild(input);
        input.focus();
        input.select();
    };

    // Tab observer with efficient mutation handling
    const initTabObserver = () => {
        const processTab = (tab) => {
            if (tab.dataset.renameHandler) return;
            const label = tab.querySelector('.tab-label, .tab-text');
            if (!label) return;

            tab.dataset.renameHandler = true;
            let hoverTimer;

            tab.addEventListener('mouseenter', () => {
                hoverTimer = setTimeout(() => handleIconInteraction(tab, label), CONFIG.hoverDelay);
            });

            tab.addEventListener('mouseleave', () => clearTimeout(hoverTimer));

            tab.addEventListener('click', (e) => {
                if (e.target.closest('.tab-icon-image')) return;
                if (Date.now() - (tab.lastClick || 0) < 300) {
                    e.stopPropagation();
                    createRenameField(tab, label);
                }
                tab.lastClick = Date.now();
            });
        };

        const observer = new MutationObserver((mutations) => {
            mutations.forEach(({ addedNodes }) => {
                addedNodes.forEach(node => {
                    if (node.matches?.('.tabbrowser-tab, [role="tab"]')) processTab(node);
                });
            });
        });

        const tabContainer = document.querySelector('#tabbrowser-tabs, [role="tablist"]');
        if (tabContainer) {
            observer.observe(tabContainer, { childList: true, subtree: true });
            [...tabContainer.querySelectorAll('.tabbrowser-tab, [role="tab"]')].forEach(processTab);
        }
    };

    // Initialization flow
    const init = () => {
        if (document.body.dataset.tabRenamer) return;
        injectStyles();
        initTabObserver();
        document.body.dataset.tabRenamer = 'active';
    };

    document.readyState === 'complete' ? init() : window.addEventListener('DOMContentLoaded', init);
})();
