// zen-pinned-tabs-override.uc.js
(() => {
    // JavaScript override to remove zen-essential check
    class ZenPinnedTabManagerOverride {
      onTabIconChanged(tab, url = null) {
        const iconUrl = url ?? tab.iconImage.src;
        tab.querySelector('.tab-background').style.setProperty('--zen-tab-icon', `url(${iconUrl})`);
      }
    }
  
    // CSS injection for all selected tabs
    const css = `
      .tabbrowser-tab[selected] .tab-background {
        position: relative;
        overflow: hidden;
        background: transparent !important;
      }
      
      .tabbrowser-tab[selected] .tab-background::after {
        content: "";
        position: absolute;
        inset: -50%;
        background-image: var(--zen-tab-icon);
        background-size: 100% 100%;
        background-clip: padding-box;
        filter: blur(15px);
        z-index: -1;
      }
      
      .tabbrowser-tab[selected] .tab-background::before {
        content: "";
        position: absolute;
        inset: 0;
        margin: 2px;
        border-radius: calc(var(--border-radius-medium) - 2px);
        background: light-dark(rgba(255, 255, 255, 0.85), rgba(68, 64, 64, 0.85));
        z-index: 0;
        transition: background 0.2s ease-in-out;
      }
      
      .tabbrowser-tab[selected]:hover .tab-background::before {
        background: light-dark(rgba(255, 255, 255, 0.80), rgba(68, 64, 64, 0.80));
      }
    `;
  
    // Inject styles
    const style = document.createElement('style');
    style.type = 'text/css';
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
  
    // Apply method override
    if (window.gZenPinnedTabManager) {
      window.gZenPinnedTabManager.onTabIconChanged = ZenPinnedTabManagerOverride.prototype.onTabIconChanged;
    } else {
      window.addEventListener('zen-pinned-tabs-ready', () => {
        window.gZenPinnedTabManager.onTabIconChanged = ZenPinnedTabManagerOverride.prototype.onTabIconChanged;
      });
    }
  })();
