document.addEventListener('DOMContentLoaded', function () {
  // Constants for storage and file validation
  const STORAGE_KEY_PHOTOS = "virtualTryOn_previous_photos";
  const STORAGE_KEY_HISTORY = "virtualTryOn_generation_history";
  const MAX_STORED_PHOTOS = 5;
  const MAX_FILE_SIZE_MB = 2;
  const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/bmp"];

  const DEFAULT_PHOTOS = [
    'images/001.png',
    'images/002.png',
    'images/003.jpg',
    'images/004.jpg',
    'images/005.png',
  ];

  // State variables
  let previousPhotos = [];
  let generationHistory = [];
  let isGenerating = false;
  let isPicking = false;

  // --------------------------------------------------------------------------
  // Fal.ai integration helpers (store API key locally & prompt the user if missing)
  // --------------------------------------------------------------------------
  const STORAGE_KEY_FAL_API = "virtualTryOn_fal_api_key";

  /**
   * Retrieve the Fal.ai API key from chrome.storage.local.
   * If it is not yet stored, ask the user once and persist it locally.
   * Returns a Promise that resolves to the key string (or null if the user cancels).
   */
  function getFalApiKey() {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY_FAL_API], (res) => {
        if (res[STORAGE_KEY_FAL_API]) {
          resolve(res[STORAGE_KEY_FAL_API]);
        } else {
          showApiKeyModal()
            .then((key) => {
              if (!key) return resolve(null);
              chrome.storage.local.set({ [STORAGE_KEY_FAL_API]: key }, () => resolve(key));
            })
            .catch(() => resolve(null));
        }
      });
    });
  }

  function showApiKeyModal() {
    return new Promise((resolve) => {
      const modal = document.getElementById('api-key-modal');
      const input = document.getElementById('api-key-input');
      const toggle = document.getElementById('api-key-toggle');
      const confirmBtn = document.getElementById('api-key-confirm');
      const cancelBtn = document.getElementById('api-key-cancel');
      const errorEl = document.getElementById('api-key-error');

      let prevActive = document.activeElement;

      function open() {
        modal.classList.add('show');
        modal.style.display = 'flex';
        input.value = '';
        errorEl.style.display = 'none';
        setTimeout(() => input.focus(), 0);
        document.addEventListener('keydown', onKeyDown);
      }

      function close() {
        modal.classList.remove('show');
        modal.style.display = 'none';
        document.removeEventListener('keydown', onKeyDown);
        if (prevActive && prevActive.focus) prevActive.focus();
      }

      function onKeyDown(e) {
        if (e.key === 'Escape') {
          close();
          resolve(null);
        }
        if ((e.key === 'Enter' || e.keyCode === 13) && document.activeElement === input) {
          onConfirm();
        }
      }

      function isValid(key) {
        return typeof key === 'string' && key.trim().length > 0;
      }

      function onConfirm() {
        const key = input.value.trim();
        if (!isValid(key)) {
          errorEl.style.display = 'block';
          return;
        }
        close();
        resolve(key);
      }

      toggle.onclick = function () {
        input.type = input.type === 'password' ? 'text' : 'password';
      };
      confirmBtn.onclick = onConfirm;
      cancelBtn.onclick = function () {
        close();
        resolve(null);
      };

      // Also close if backdrop clicked
      modal.querySelector('.modal-backdrop').onclick = function () {
        close();
        resolve(null);
      };

      open();
    });
  }

  // Load data from chrome.storage.local
  function loadData() {
    chrome.storage.local.get([STORAGE_KEY_PHOTOS, STORAGE_KEY_HISTORY], function (result) {
      if (result[STORAGE_KEY_PHOTOS] && result[STORAGE_KEY_PHOTOS].length > 0) {
        previousPhotos = result[STORAGE_KEY_PHOTOS];
      } else {
        previousPhotos = DEFAULT_PHOTOS;
      }
      renderPreviousPhotos();

      if (result[STORAGE_KEY_HISTORY]) {
        generationHistory = result[STORAGE_KEY_HISTORY];
        renderHistory();
      }
    });
  }

  // Save photos to chrome.storage.local
  function savePreviousPhotos() {
    chrome.storage.local.set({ [STORAGE_KEY_PHOTOS]: previousPhotos });
  }

  // Save history to chrome.storage.local
  function saveHistory() {
    chrome.storage.local.set({ [STORAGE_KEY_HISTORY]: generationHistory });
  }

  // Update previous photos array with a new photo
  function updatePreviousPhotos(newPhoto) {
    previousPhotos.unshift(newPhoto);
    if (previousPhotos.length > MAX_STORED_PHOTOS) {
      previousPhotos = previousPhotos.slice(0, MAX_STORED_PHOTOS);
    }
    savePreviousPhotos();
    renderPreviousPhotos();
  }

  // Add item to generation history
  function addHistoryItem(item) {
    generationHistory.unshift(item);
    saveHistory();
    renderHistory();
  }

  // Render previous photos in the UI
  function renderPreviousPhotos() {
    const container = document.getElementById('previous-photos-container');
    container.innerHTML = '';
    if (previousPhotos.length === 0) return;

    previousPhotos.forEach((photo, index) => {
      const button = document.createElement('button');
      button.className = 'previous-photo';
      button.dataset.index = index;
      const img = document.createElement('img');
      img.src = photo;
      img.alt = `Previous photo ${index + 1}`;
      button.appendChild(img);
      container.appendChild(button);
      button.addEventListener('click', () => selectPreviousPhoto(photo));
    });
  }

  // Render generation history
  function renderHistory() {
    const historyResults = document.querySelector('.history-results');
    const historyEmpty = document.querySelector('.history-empty');
    historyResults.innerHTML = ''; // Clear existing results

    if (generationHistory.length === 0) {
      historyEmpty.style.display = 'block';
      historyResults.style.display = 'none';
    } else {
      historyEmpty.style.display = 'none';
      historyResults.style.display = 'flex';

      generationHistory.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';

        // For now, using a placeholder. Replace with actual image when available.
        historyItem.innerHTML = `
              <img src="${item.resultImage}" alt="Generated try-on image">
              <button class="download-button" data-url="${item.resultImage}">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
              </button>
            `;
        historyResults.appendChild(historyItem);
      });

      // Add download functionality
      document.querySelectorAll('.download-button').forEach(button => {
        button.addEventListener('click', function () {
          const url = this.getAttribute('data-url');
          const link = document.createElement('a');
          link.href = url;
          link.download = `try-on-result-${Date.now()}.png`;
          link.click();
        });
      });
    }
  }

  // Select a previous photo
  function selectPreviousPhoto(photoUrl) {
    userImageContainer.style.display = 'block';
    userUploadPlaceholder.style.display = 'none';
    userLoading.style.display = 'none';
    userImagePreview.src = photoUrl;
    updateGenerateButtonState();

    document.querySelectorAll('.previous-photo').forEach(thumb => {
      thumb.classList.toggle('active', thumb.querySelector('img').src === photoUrl);
    });
  }

  // Tab switching
  const tabTriggers = document.querySelectorAll('.tab-trigger');
  const tabContents = document.querySelectorAll('.tab-content');
  function switchToTab(tabId) {
    tabTriggers.forEach(t => t.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    document.querySelector(`.tab-trigger[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById(`${tabId}-content`).classList.add('active');
  }
  tabTriggers.forEach(trigger => trigger.addEventListener('click', () => switchToTab(trigger.dataset.tab)));
  document.getElementById('try-generating').addEventListener('click', () => switchToTab('try-on'));

  // Image Upload Handler
  async function handleImageUpload(file, setImageCallback, showLoadingCallback, hideLoadingCallback, isUserPhoto = false, restoreUIonFailure) {
    if (file.type && !ALLOWED_FILE_TYPES.includes(file.type)) {
      alert(`Unsupported file type ${file.type}. Please upload one of: ${ALLOWED_FILE_TYPES.join(', ')}`);
      hideLoadingCallback();
      if (restoreUIonFailure) restoreUIonFailure();
      return;
    }

    try {
      showLoadingCallback();
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      });

      const reader = new FileReader();
      reader.onload = e => {
        setImageCallback(e.target.result);
        hideLoadingCallback();
        if (isUserPhoto) {
          updatePreviousPhotos(e.target.result);
        }
      };
      reader.onerror = () => {
        alert("Failed to read the image.");
        hideLoadingCallback();
        if (restoreUIonFailure) restoreUIonFailure();
      };
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      console.error("Image processing error:", error);
      alert("Failed to process image.");
      hideLoadingCallback();
      if (restoreUIonFailure) restoreUIonFailure();
    }
  }

  // User photo elements and events
  const userUploadArea = document.getElementById('user-upload-area');
  const userPhotoInput = document.getElementById('user-photo-input');
  const userUploadPlaceholder = document.getElementById('user-upload-placeholder');
  const userImageContainer = document.getElementById('user-image-container');
  const userImagePreview = document.getElementById('user-image-preview');
  const removeUserImageButton = document.getElementById('remove-user-image');
  const userLoading = document.getElementById('user-loading');

  userUploadArea.addEventListener('click', (e) => {
    if (userUploadPlaceholder.style.display !== 'none' || e.target === userUploadArea) {
      userPhotoInput.click();
    }
  });
  userPhotoInput.addEventListener('change', function () {
    if (this.files[0]) {
      handleImageUpload(
        this.files[0],
        (dataUrl) => {
          userImageContainer.style.display = 'block';
          userImagePreview.src = dataUrl;
          updateGenerateButtonState();
          selectPreviousPhoto(dataUrl); // Highlight as active
        },
        () => {
          userUploadPlaceholder.style.display = 'none';
          userImageContainer.style.display = 'none';
          userLoading.style.display = 'flex';
        },
        () => userLoading.style.display = 'none',
        true,
        () => {
          userUploadPlaceholder.style.display = 'flex';
          userImageContainer.style.display = 'none';
        }
      );
    }
  });
  removeUserImageButton.addEventListener('click', (e) => {
    e.stopPropagation();
    userImageContainer.style.display = 'none';
    userUploadPlaceholder.style.display = 'flex';
    userPhotoInput.value = '';
    updateGenerateButtonState();
    document.querySelectorAll('.previous-photo').forEach(thumb => thumb.classList.remove('active'));
  });

  // Drag and Drop for User Photo
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    userUploadArea.addEventListener(eventName, preventDefaults, false);
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    userUploadArea.addEventListener(eventName, () => userUploadArea.classList.add('drag-over'), false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    userUploadArea.addEventListener(eventName, () => userUploadArea.classList.remove('drag-over'), false);
  });

  function dataURLtoFile(dataurl, filename) {
    var arr = dataurl.split(','),
        mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]),
        n = bstr.length,
        u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  }

  function handleDropEvent(e, { setImageCallback, showLoadingCallback, hideLoadingCallback, restoreUIonFailure }, isUserPhoto) {
    preventDefaults(e);

    const files = e.dataTransfer.files;
    const html = e.dataTransfer.getData('text/html');

    if (files.length > 0) {
        handleImageUpload(files[0], setImageCallback, showLoadingCallback, hideLoadingCallback, isUserPhoto, restoreUIonFailure);
        return;
    }
    
    if (html) {
        showLoadingCallback();
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs[0] || !tabs[0].id) {
                alert("Could not find an active page to fetch the image from.");
                hideLoadingCallback();
                restoreUIonFailure();
                return;
            }
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'fetchImageFromHtml',
                html: html
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error(chrome.runtime.lastError);
                    alert("Could not communicate with the page. Please try reloading the page.");
                    hideLoadingCallback();
                    restoreUIonFailure();
                } else if (response && response.dataUrl) {
                    const file = dataURLtoFile(response.dataUrl, "dragged-image.png");
                    handleImageUpload(file, setImageCallback, () => {}, hideLoadingCallback, isUserPhoto, restoreUIonFailure);
                } else {
                    console.error('Error from content script:', response ? response.error : 'No response');
                    alert(response ? response.error : "Failed to extract image from the dragged content.");
                    hideLoadingCallback();
                    restoreUIonFailure();
                }
            });
        });
        return;
    }
    
    // If we get here, nothing useful was dropped
    // We don't call the callbacks because nothing happened
  }

  userUploadArea.addEventListener('drop', (e) => {
    handleDropEvent(e, {
        setImageCallback: (dataUrl) => {
            userImageContainer.style.display = 'block';
            userImagePreview.src = dataUrl;
            updateGenerateButtonState();
            selectPreviousPhoto(dataUrl);
        },
        showLoadingCallback: () => {
            userUploadPlaceholder.style.display = 'none';
            userImageContainer.style.display = 'none';
            userLoading.style.display = 'flex';
        },
        hideLoadingCallback: () => userLoading.style.display = 'none',
        restoreUIonFailure: () => {
          userUploadPlaceholder.style.display = 'flex';
          userImageContainer.style.display = 'none';
        }
    }, true);
  }, false);

  // Clothing photo elements and events
  const clothingUploadArea = document.getElementById('clothing-upload-area');
  const clothingPhotoInput = document.getElementById('clothing-photo-input');
  const clothingSplitView = document.getElementById('clothing-split-view');
  const clothingImageContainer = document.getElementById('clothing-image-container');
  const clothingImagePreview = document.getElementById('clothing-image-preview');
  const removeClothingImageButton = document.getElementById('remove-clothing-image');
  const clothingLoading = document.getElementById('clothing-loading');
  const fileUploadButton = document.getElementById('file-upload-button');
  const websitePickButton = document.getElementById('website-pick-button');
  const websitePickIcon = document.getElementById('website-pick-icon');
  const websitePickText = document.getElementById('website-pick-text');

  // Update UI for picking state
  function setPickingUI(isPickingActive) {
    isPicking = isPickingActive;
    websitePickButton.classList.toggle('picking', isPickingActive);
    websitePickIcon.innerHTML = isPickingActive ?
      `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>` :
      `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"></path></svg>`;
    websitePickText.textContent = isPickingActive ? 'Cancel picking' : 'Pick an image from the current website';
  }

  // Website pick button logic
  websitePickButton.addEventListener('click', (e) => {
    e.stopPropagation();
    const action = isPicking ? 'cancelPicking' : 'startPicking';
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: action }, (response) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          alert("Could not communicate with the page. Please refresh and try again.");
          return;
        }
        if (response) {
          setPickingUI(!isPicking);
        }
      });
    });
  });

  // Listen for picked image from content script
  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'imagePicked') {
      setPickingUI(false);
      clothingSplitView.style.display = 'none';
      clothingImageContainer.style.display = 'block';
      clothingImagePreview.src = request.dataUrl;
      updateGenerateButtonState();
    }
  });

  fileUploadButton.addEventListener('click', (e) => {
    e.stopPropagation();
    clothingPhotoInput.click();
  });

  clothingPhotoInput.addEventListener('change', function () {
    if (this.files[0]) {
      handleImageUpload(
        this.files[0],
        (dataUrl) => {
          clothingSplitView.style.display = 'none';
          clothingImageContainer.style.display = 'block';
          clothingImagePreview.src = dataUrl;
          updateGenerateButtonState();
        },
        () => {
          clothingSplitView.style.display = 'none';
          clothingLoading.style.display = 'flex';
        },
        () => clothingLoading.style.display = 'none',
        false,
        () => {
          clothingSplitView.style.display = 'flex';
          clothingImageContainer.style.display = 'none';
        }
      );
    }
  });

  removeClothingImageButton.addEventListener('click', (e) => {
    e.stopPropagation();
    clothingImageContainer.style.display = 'none';
    clothingSplitView.style.display = 'flex';
    clothingPhotoInput.value = '';
    updateGenerateButtonState();
  });

  // Drag and Drop for Clothing Photo
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    clothingUploadArea.addEventListener(eventName, preventDefaults, false);
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    clothingUploadArea.addEventListener(eventName, () => clothingUploadArea.classList.add('drag-over'), false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    clothingUploadArea.addEventListener(eventName, () => clothingUploadArea.classList.remove('drag-over'), false);
  });

  clothingUploadArea.addEventListener('drop', (e) => {
      handleDropEvent(e, {
          setImageCallback: (dataUrl) => {
              clothingSplitView.style.display = 'none';
              clothingImageContainer.style.display = 'block';
              clothingImagePreview.src = dataUrl;
              updateGenerateButtonState();
          },
          showLoadingCallback: () => {
              clothingSplitView.style.display = 'none';
              clothingImageContainer.style.display = 'none';
              clothingLoading.style.display = 'flex';
          },
          hideLoadingCallback: () => clothingLoading.style.display = 'none',
          restoreUIonFailure: () => {
            clothingSplitView.style.display = 'flex';
            clothingImageContainer.style.display = 'none';
          }
      }, false);
  }, false);

  // Generate button state
  const generateButton = document.getElementById('generate-button');
  function updateGenerateButtonState() {
    const hasUserImage = userImageContainer.style.display === 'block';
    const hasClothingImage = clothingImageContainer.style.display === 'block';
    generateButton.disabled = !hasUserImage || !hasClothingImage || isGenerating;
  }

  // Generation logic
  function addGenerationLoading() {
    const historyResults = document.querySelector('.history-results');
    const historyEmpty = document.querySelector('.history-empty');
    historyEmpty.style.display = 'none';
    historyResults.style.display = 'flex';

    const loadingBox = document.createElement('div');
    loadingBox.className = 'generation-loading';
    loadingBox.id = 'generation-loading-box';
    loadingBox.innerHTML = `
          <div class="generation-spinner"></div>
          <div class="generation-loading-text">
            <div class="main-text">Generating your look...</div>
            <div class="sub-text">This can take a few minutes</div>
          </div>
        `;
    historyResults.insertBefore(loadingBox, historyResults.firstChild);
  }

  function replaceLoadingWithResult(newHistoryItem) {
    const loadingBox = document.getElementById('generation-loading-box');
    if (loadingBox) {
      loadingBox.remove();
    }
    addHistoryItem(newHistoryItem); // This will re-render the whole history list with the new item
  }

  generateButton.addEventListener('click', async () => {
    if (generateButton.disabled) return;

    isGenerating = true;
    updateGenerateButtonState();
    switchToTab('history');
    addGenerationLoading();

    performVirtualTryOn(userImagePreview.src, clothingImagePreview.src);
  });

  // --------------------------------------------------------------------------
  // Generation via Fal.ai (kling/kolors-virtual-try-on)
  // --------------------------------------------------------------------------

  /**
   * Ensure we have a base-64 data URL. Fal.ai accepts either data URIs or
   * publicly-reachable URLs, but resources bundled with the extension (e.g.
   * chrome-extension:// images) are invisible from Fal's infra. This helper
   * fetches any non-data URL and converts it to a base-64 data URI so it can
   * be sent safely.
   */
  function ensureDataUrl(src) {
    if (src.startsWith('data:')) return Promise.resolve(src);

    return fetch(src)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch image (${res.status})`);
        return res.blob();
      })
      .then(
        (blob) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          }),
      );
  }

  // Extract a human-readable message from Fal.ai error responses
  async function extractFalError(res) {
    let raw = '';
    try {
      raw = await res.text();
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.detail) && parsed.detail.length) {
        return parsed.detail[0].msg || res.statusText;
      }
      return parsed.msg || res.statusText;
    } catch (err) {
      console.error('Failed to parse Fal error payload:', raw);
      return res.statusText || 'Unknown error';
    }
  }

  function performVirtualTryOn(userSrc, clothingSrc) {
    // 1. Convert both image sources to safe data URLs first.
    Promise.all([ensureDataUrl(userSrc), ensureDataUrl(clothingSrc)]).then(([userImgDataUrl, clothingImgDataUrl]) => {
      // 2. Get (or ask for) the Fal.ai API key.
      return getFalApiKey().then((apiKey) => {
        if (!apiKey) {
          replaceLoadingWithError('Fal.ai API key is required.');
          isGenerating = false;
          updateGenerateButtonState();
          return;
        }

        const queueEndpoint =
          'https://queue.fal.run/fal-ai/kling/v1-5/kolors-virtual-try-on';

        fetch(queueEndpoint, {
          method: 'POST',
          headers: {
            Authorization: `Key ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            human_image_url: userImgDataUrl,
            garment_image_url: clothingImgDataUrl,
          }),
        })
          .then(async (res) => {
            if (!res.ok) {
              const msg = await extractFalError(res);
              throw new Error(msg);
            }
            return res.json();
          })
          .then(({ request_id, status_url, response_url }) => {
            pollFalStatus({
              apiKey,
              statusUrl: status_url || `https://queue.fal.run/fal-ai/kling/v1-5/kolors-virtual-try-on/requests/${request_id}/status`,
              responseUrl: response_url,
              requestId: request_id,
              userImg: userImgDataUrl,
              clothingImg: clothingImgDataUrl,
              pollDelay: 3000,
            });
          })
          .catch((err) => {
            console.error('Fal.ai queue error:', err);
            replaceLoadingWithError(err.message || 'Generation failed.');
            isGenerating = false;
            updateGenerateButtonState();
          });
      });
    });
  }

  // Poll the Fal.ai queue until the job is finished, then fetch and display the image.
  function pollFalStatus({ apiKey, statusUrl, responseUrl, requestId, userImg, clothingImg, pollDelay }) {
    fetch(statusUrl, { headers: { Authorization: `Key ${apiKey}` } })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Status fetch failed – ${res.status}`);
        }
        return res.text();
      })
      .then((raw) => {
        let status;
        try {
          status = JSON.parse(raw);
        } catch (e) {
          console.error('Unable to parse Fal status JSON:', raw);
          throw e;
        }

        if (status.status === 'COMPLETED') {
          // Try to pull image url directly from the status payload first
          const directUrl =
            // 1. Top-level image / images array
            status?.image?.url ||
            (Array.isArray(status?.images) ? status.images[0]?.url : null) ||
            // 2. Inside `data` wrapper (current Fal schema)
            status?.data?.image?.url ||
            (Array.isArray(status?.data?.images) ? status.data.images[0]?.url : null) ||
            // 3. Inside `result` wrapper (older)
            status?.result?.image?.url ||
            (Array.isArray(status?.result?.images) ? status.result.images[0]?.url : null);

          if (directUrl) {
            handleFalSuccess({ image: { url: directUrl } });
            return;
          }

          const finalUrl =
            responseUrl ||
            `https://queue.fal.run/fal-ai/kling/v1-5/kolors-virtual-try-on/requests/${requestId}/result`;

          const MAX_RESULT_RETRIES = 10; // allow up to ~3 minutes of waiting

          // Helper to decide if payload already contains the generated image
          const extractResultUrl = (payload) =>
            payload?.image?.url ||
            (Array.isArray(payload?.images) ? payload.images[0]?.url : null) ||
            payload?.data?.image?.url ||
            (Array.isArray(payload?.data?.images) ? payload.data.images[0]?.url : null) ||
            payload?.result?.image?.url ||
            (Array.isArray(payload?.result?.images) ? payload.result.images[0]?.url : null);

          // Extra safeguard: if result endpoint keeps failing, re-check status
          let fallbackStatusChecks = 0;

          const fetchResult = (attempt = 1) => {
            fetch(finalUrl, {
              method: 'GET',
              headers: {
                Authorization: `Key ${apiKey}`,
                Accept: 'application/json',
              },
            })
              .then(async (r) => {
                if (!r.ok) {
                  const msg = await extractFalError(r);
                  const retryHeader = r.headers.get('X-Fal-Retryable');
                  const shouldRetry =
                    (retryHeader && retryHeader === 'true') ||
                    msg.toLowerCase().includes('downstream service');

                  if (shouldRetry && attempt < MAX_RESULT_RETRIES) {
                    const backoff = Math.min(2000 * Math.pow(2, attempt - 1), 30000); // cap 30s
                    console.warn(`Result fetch failed (attempt ${attempt}). Retrying in ${backoff}ms …`);
                    return setTimeout(() => fetchResult(attempt + 1), backoff);
                  }
                  throw new Error(msg);
                }
                return r.json();
              })
              .then((payloadWrapped) => {
                const payload = payloadWrapped.response || payloadWrapped;
                const resultUrl = extractResultUrl(payload);

                if (resultUrl) {
                  handleFalSuccess(payloadWrapped);
                } else if (fallbackStatusChecks < 5) {
                  // Give queue a little more time then re-poll status endpoint for embedded url
                  fallbackStatusChecks += 1;
                  console.warn('Result missing image, rechecking status in 5s …');
                  setTimeout(() => pollFalStatus({ apiKey, statusUrl, responseUrl, requestId, userImg, clothingImg, pollDelay: 5000 }), 5000);
                } else {
                  replaceLoadingWithError('Generation returned no image.');
                  isGenerating = false;
                  updateGenerateButtonState();
                }
              })
              .catch((err) => {
                console.error('Fal result fetch error:', err);
                replaceLoadingWithError(err.message || 'Failed to fetch generated image.');
                isGenerating = false;
                updateGenerateButtonState();
              });
          };

          const handleFalSuccess = (payloadWrapped) => {
            const payload = payloadWrapped.response || payloadWrapped;
            const resultUrl = extractResultUrl(payload);

            if (!resultUrl) {
              replaceLoadingWithError('Generation returned no image.');
            } else {
              const newHistoryItem = {
                userImage: userImg,
                clothingImage: clothingImg,
                resultImage: resultUrl,
                timestamp: Date.now(),
              };
              replaceLoadingWithResult(newHistoryItem);
            }

            isGenerating = false;
            updateGenerateButtonState();
          };

          fetchResult();
        } else if (status.status === 'IN_QUEUE' || status.status === 'IN_PROGRESS') {
          // exponential back-off, max 10s
          const nextDelay = Math.min(pollDelay * 1.3, 10000);
          setTimeout(() =>
            pollFalStatus({ apiKey, statusUrl, responseUrl, requestId, userImg, clothingImg, pollDelay: nextDelay }),
            pollDelay,
          );
        } else {
          console.error('Fal.ai job ended with status:', status.status);
          replaceLoadingWithError('Generation failed, please try again.');
          isGenerating = false;
          updateGenerateButtonState();
        }
      })
      .catch((err) => {
        console.error(err);
        replaceLoadingWithError('Network error while polling for results.');
        isGenerating = false;
        updateGenerateButtonState();
      });
  }

  function replaceLoadingWithError(message) {
    const loadingBox = document.getElementById('generation-loading-box');
    if (loadingBox) {
      loadingBox.innerHTML = `<div class="generation-loading-text"><div class="main-text">Oops!</div><div class="sub-text">${message}</div></div>`;
    }
  }

  // Helper: upload one data URL image to the Space's /upload route -> returns server path.
  function uploadToSpace(baseUrl, src, filename) {
    const getBlob = src.startsWith('data:')
      ? Promise.resolve(dataURLtoBlob(src))
      : fetch(src).then(r => r.blob());

    return getBlob.then(blob => {
      const formData = new FormData();
      formData.append('files', blob, filename);

      return fetch(`${baseUrl}/upload`, {
        method: 'POST',
        body: formData
      });
    })
      .then(res => {
        if (!res.ok) throw new Error('Upload failed');
        return res.json();
      })
      .then(arr => {
        const fileObj = Array.isArray(arr) ? arr[0] : arr;
        return fileObj;
      });
  }

  // Converts dataURL -> Blob
  function dataURLtoBlob(dataUrl) {
    const arr = dataUrl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new Blob([u8arr], { type: mime });
  }

  // Initial load
  loadData();
}); 