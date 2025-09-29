# Virtual Try-On Chrome Extension

## ✨ Overview
The Virtual Try-On Chrome Extension empowers you to virtually try on clothing from any website with ease. Utilizing the power of Fal.ai's advanced AI models, this extension allows you to overlay garments onto a human model, providing a realistic preview directly in your browser.

## 🚀 Features
- **Seamless Garment Selection:** Easily pick clothing items from any webpage.
- **Human Model Integration:** Upload your own image or use a default model for trying on clothes.
- **AI-Powered Try-On:** Leverage Fal.ai's cutting-edge AI for realistic clothing overlays.
- **Local API Key Storage:** Your Fal.ai API key is stored securely and locally in your browser.

## 🛠️ Local Setup

### 1. Clone the Repository
First, clone this repository to your local machine:
```bash
git clone git@github.com:rishiskhare/virtual-try-on.git
cd virtual-try-on
```

### 2. Load the Extension in Chrome
1. Open Chrome and navigate to `chrome://extensions`.
2. Enable "Developer mode" by toggling the switch in the top right corner.
3. Click on "Load unpacked" and select the cloned `virtual-try-on` directory.

The extension should now appear in your Chrome extensions list and its icon will be visible in your browser toolbar.

## 🔑 Getting Your Fal.ai API Key
This extension uses the Fal.ai API for its virtual try-on functionality. You will need an API key to use the extension.

1. Visit the [Fal.ai website](https://fal.ai/).
2. Sign up or log in to your account.
3. Navigate to your API key section (usually found in your dashboard or settings).
4. Generate a new API key.
5. When you first use the extension, a prompt will appear asking for your Fal.ai API key. Enter the key there. It will be stored locally in your browser's storage for future use.

## 👕 Usage
1. **Open the Side Panel:** Click on the Virtual Try-On extension icon in your Chrome toolbar to open the side panel.
2. **Select a Human Image:**
    - Click the "Upload Image" button to upload an image of a person (e.g., yourself or a model).
    - Alternatively, you can drag and drop an image directly into the designated area.
3. **Select a Garment Image:**
    - Navigate to any e-commerce website with clothing.
    - Drag and drop a clothing image from the webpage into the garment selection area in the side panel.
4. **Generate Try-On:** Once both images are selected, click the "Generate Try-On" button. The extension will send the images to Fal.ai, and after a short processing time, the virtual try-on result will be displayed.
