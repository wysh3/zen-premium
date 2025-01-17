// Function to handle swatch right-click and color change
function addColorPickerToSwatches() {
  const swatchContainer = document.querySelector('.tab-group-editor-swatches');
  if (!swatchContainer) return;

  // Create a single reusable color picker
  const colorPicker = document.createElement('input');
  colorPicker.type = 'color';
  colorPicker.style.display = 'none';
  swatchContainer.appendChild(colorPicker);

  // Track the currently selected radio button
  let currentRadio = null;

  // Add right-click handlers to all swatch labels
  const swatchLabels = swatchContainer.querySelectorAll('.tab-group-editor-swatch');
  swatchLabels.forEach(label => {
    label.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Get the associated radio input
      const radioId = label.getAttribute('for');
      const radio = document.getElementById(radioId);

      // Store the current radio button
      currentRadio = radio;

      // Get current color and set it as picker's value
      const currentColor = getComputedStyle(label)
      .getPropertyValue('--tabgroup-swatch-color').trim();
      colorPicker.value = currentColor;

      // Open color picker
      colorPicker.click();
    });
  });

  // Handle color picker change
  colorPicker.addEventListener('change', (e) => {
    if (!currentRadio) return;

    const newColor = e.target.value;
    const colorValue = currentRadio.value;

    // Update CSS variables
    document.documentElement.style.setProperty(
      `--tab-group-color-${colorValue}`,
      newColor
    );
    document.documentElement.style.setProperty(
      `--tab-group-color-${colorValue}-invert`,
      newColor
    );
    document.documentElement.style.setProperty(
      `--tab-group-color-${colorValue}-pale`,
      newColor
    );

    // Update the swatch appearance
    const swatch = document.querySelector(
      `label[for="tab-group-editor-swatch-${colorValue}"]`
    );
    if (swatch) {
      swatch.style.setProperty('--tabgroup-swatch-color', newColor);
      swatch.style.setProperty('--tabgroup-swatch-color-invert', newColor);
    }

    // Simulate a click on the radio button to ensure proper selection
    currentRadio.checked = true;
    currentRadio.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

// Observer to watch for the swatches panel being added
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.classList &&
        node.classList.contains('tab-group-editor-swatches')) {
        addColorPickerToSwatches();
      return;
        }
    }
  }
});

// Initialize observer
function init() {
  // Disconnect any existing observer
  observer.disconnect();

  const popupSet = document.getElementById('mainPopupSet');
  if (popupSet) {
    observer.observe(popupSet, {
      childList: true,
      subtree: true,
      attributes: false
    });
  }

  // Check if swatches already exist
  const existingSwatches = document.querySelector('.tab-group-editor-swatches');
  if (existingSwatches) {
    addColorPickerToSwatches();
  }
}

// Start when document is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
