const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const MODELS = {
  en: {
    url: 'https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip',
    name: 'vosk-model-small-en-us'
  },
  tl: {
    url: 'https://alphacephei.com/vosk/models/vosk-model-small-tl-0.4.zip',
    name: 'vosk-model-small-tl'
  }
};

const MODELS_DIR = path.join(__dirname, 'models');

// Create models directory if it doesn't exist
if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true });
}

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function downloadAndExtractModel(lang) {
  const model = MODELS[lang];
  const zipPath = path.join(MODELS_DIR, `${model.name}.zip`);
  const modelPath = path.join(MODELS_DIR, model.name);

  console.log(`Downloading ${lang} model...`);
  await downloadFile(model.url, zipPath);

  console.log(`Extracting ${lang} model...`);
  try {
    // Use PowerShell to extract the zip file
    execSync(`powershell -command "Expand-Archive -Path '${zipPath}' -DestinationPath '${MODELS_DIR}' -Force"`);
    console.log(`${lang} model extracted successfully`);
  } catch (error) {
    console.error(`Error extracting ${lang} model:`, error);
  }

  // Clean up zip file
  fs.unlinkSync(zipPath);
}

async function main() {
  try {
    for (const lang of Object.keys(MODELS)) {
      await downloadAndExtractModel(lang);
    }
    console.log('All models downloaded and extracted successfully!');
  } catch (error) {
    console.error('Error downloading models:', error);
  }
}

main(); 