let isPicking = false;
let pickedImageCallback = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startPicking') {
    startPicking();
    sendResponse({ status: 'picking started' });
  } else if (request.action === 'cancelPicking') {
    stopPicking();
    sendResponse({ status: 'picking cancelled' });
  } else if (request.action === 'fetchImageFromHtml') {
    const { html } = request;
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const img = doc.querySelector('img');

    if (!img || !img.src) {
      sendResponse({ error: "Could not find an image in the dragged content." });
      return true; // Keep channel open for async response
    }

    // Resolve relative URL against the page's URL
    const imageUrl = new URL(img.src, window.location.href).href;

    fetch(imageUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch the extracted image. Status: ${response.statusText}`);
        }
        return response.blob();
      })
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => {
          sendResponse({ dataUrl: reader.result });
        };
        reader.readAsDataURL(blob);
      })
      .catch(error => {
        console.error('Error fetching image from HTML:', error);
        sendResponse({ error: error.message });
      });
    
    return true; // Indicates that the response is sent asynchronously
  }
});

function startPicking() {
  if (isPicking) return;
  isPicking = true;
  document.body.classList.add('virtual-try-on-picking');
  document.addEventListener('mouseover', handleMouseOver);
  document.addEventListener('mouseout', handleMouseOut);
  document.addEventListener('click', handleMouseClick, true); // Use capturing phase
}

function stopPicking() {
  if (!isPicking) return;
  isPicking = false;
  document.body.classList.remove('virtual-try-on-picking');
  document.removeEventListener('mouseover', handleMouseOver);
  document.removeEventListener('mouseout', handleMouseOut);
  document.removeEventListener('click', handleMouseClick, true);
  
  // Remove any lingering overlays
  const existingOverlay = document.querySelector('.virtual-try-on-image-overlay');
  if (existingOverlay) {
    existingOverlay.remove();
  }
}

function handleMouseOver(e) {
  if (!isPicking) return;

  const target = e.target;
  if (target.tagName === 'IMG') {
    createOverlay(target);
  }
}

function handleMouseOut(e) {
  if (!isPicking) return;
  const target = e.target;
  if (target.tagName === 'IMG') {
    const overlay = document.querySelector('.virtual-try-on-image-overlay');
    if (overlay) {
        overlay.remove();
    }
  }
}

function handleMouseClick(e) {
  if (!isPicking) return;

  e.preventDefault();
  e.stopPropagation();

  const target = e.target;
  
  if (target.tagName === 'IMG') {
    const imageUrl = target.src;
    
    // We need to fetch the image and convert it to a data URL
    // because of potential CORS issues if we just send the URL.
    fetch(imageUrl)
      .then(response => response.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => {
          chrome.runtime.sendMessage({
            action: 'imagePicked',
            dataUrl: reader.result
          });
          stopPicking();
        };
        reader.readAsDataURL(blob);
      })
      .catch(error => {
        console.error('Error fetching image:', error);
        alert('Could not pick this image. It might be protected.');
        stopPicking();
      });
  }
}


function createOverlay(imageElement) {
  // Remove existing overlay first
  const existingOverlay = document.querySelector('.virtual-try-on-image-overlay');
  if (existingOverlay) {
    existingOverlay.remove();
  }

  const rect = imageElement.getBoundingClientRect();
  const overlay = document.createElement('div');
  overlay.className = 'virtual-try-on-image-overlay';
  overlay.style.top = `${rect.top + window.scrollY}px`;
  overlay.style.left = `${rect.left + window.scrollX}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;
  
  overlay.innerHTML = `
    <div class="virtual-try-on-overlay-text">Select this image ✨</div>
  `;

  document.body.appendChild(overlay);
} 