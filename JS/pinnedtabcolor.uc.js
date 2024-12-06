// Enhanced Function to extract dominant color from favicon with improved color selection
function extractDominantColor(favicon) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0, img.width, img.height);

            // Get image data
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // Advanced color accumulator with color clustering
            const colorClusters = {};
            const colorThreshold = 30; // Color similarity threshold
            
            // Sample pixels (skip some for performance)
            for (let i = 0; i < data.length; i += 24) {
                // Skip transparent or very light/dark pixels
                if (data[i + 3] < 50) continue;
                
                const r = data[i], g = data[i+1], b = data[i+2];
                
                // Skip very light or very dark colors
                const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                if (brightness < 20 || brightness > 235) continue;
                
                // Find or create a cluster for this color
                let foundCluster = false;
                for (const clusterKey in colorClusters) {
                    const [cr, cg, cb] = clusterKey.split(',').map(Number);
                    if (Math.abs(r - cr) <= colorThreshold &&
                        Math.abs(g - cg) <= colorThreshold &&
                        Math.abs(b - cb) <= colorThreshold) {
                        colorClusters[clusterKey].count++;
                        foundCluster = true;
                        break;
                    }
                }
                
                if (!foundCluster) {
                    colorClusters[`${r},${g},${b}`] = { count: 1 };
                }
            }

            // Find the most frequent color cluster
            let dominantColor = null;
            let maxCount = 0;
            for (const color in colorClusters) {
                if (colorClusters[color].count > maxCount) {
                    dominantColor = color;
                    maxCount = colorClusters[color].count;
                }
            }

            if (dominantColor) {
                const [r, g, b] = dominantColor.split(',').map(Number);
                resolve({
                    rgb: `rgb(${r},${g},${b})`,
                    hex: `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
                });
            } else {
                reject(new Error('Could not extract dominant color'));
            }
        };
        img.onerror = () => reject(new Error('Failed to load favicon'));
        img.src = favicon;
    });
}

// Function to apply or reset favicon color to pinned tab
async function handleTabColorization(tab) {
    // Check if tab is pinned or unpinned
    const tabBackground = tab.querySelector('.tab-background');
    if (!tabBackground) return;

    // If unpinned, reset to default
    if (!tab.hasAttribute('pinned')) {
        tabBackground.style.backgroundColor = '';
        tabBackground.style.setProperty('--tab-color', '');
        return;
    }

    try {
        // Get favicon URL
        const favicon = tab.querySelector('.tab-icon-image');
        if (!favicon) return;

        const faviconUrl = favicon.getAttribute('src');
        if (!faviconUrl) return;

        // Extract dominant color
        const dominantColorInfo = await extractDominantColor(faviconUrl);

        // Apply color with fallback and opacity
        tabBackground.style.backgroundColor = dominantColorInfo.rgb;
        tabBackground.style.setProperty('--tab-color', dominantColorInfo.hex);
        
        // Optional: Add subtle text color adjustment for better readability
        const brightness = calculateBrightness(dominantColorInfo.rgb);
        tabBackground.style.color = brightness > 128 ? '#000' : '#fff';
    } catch (error) {
        console.error('Error applying favicon color:', error);
    }
}

// Helper function to calculate color brightness
function calculateBrightness(rgbColor) {
    const match = rgbColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!match) return 128;
    
    const [r, g, b] = match.slice(1).map(Number);
    return (r * 299 + g * 587 + b * 114) / 1000;
}

// Function to process all pinned tabs
function processAllPinnedTabs() {
    const allTabs = document.querySelectorAll('.tabbrowser-tab');
    allTabs.forEach(handleTabColorization);
}

// Run on initial load and when tabs change
window.addEventListener('load', processAllPinnedTabs);

// Event listeners for tab changes
document.addEventListener('TabAttrModified', processAllPinnedTabs);
document.addEventListener('TabPinned', processAllPinnedTabs);
document.addEventListener('TabUnpinned', processAllPinnedTabs);

// Optional: Add a mutation observer for more robust tab tracking
const tabObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'pinned' || 
             mutation.attributeName === 'class')) {
            processAllPinnedTabs();
            break;
        }
    }
});

// Start observing the tabs container
const tabsContainer = document.querySelector('#tabbrowser-tabs');
if (tabsContainer) {
    tabObserver.observe(tabsContainer, {
        attributes: true,
        attributeFilter: ['pinned', 'class'],
        subtree: true
    });
}
