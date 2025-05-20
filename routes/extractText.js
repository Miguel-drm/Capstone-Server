const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
const mammoth = require('mammoth');

// POST /api/extract-text
// Body: { fileUrl: string, fileType: string }
router.post('/', async (req, res) => {
  const { fileUrl, fileType } = req.body;
  if (!fileUrl || !fileType) {
    return res.status(400).json({ message: 'fileUrl and fileType are required' });
  }
  try {
    // fileUrl is expected to be relative to uploads, e.g. 'myfile.pdf' or 'subdir/myfile.pdf'
    const uploadsDir = path.join(__dirname, '../uploads');
    // Remove any leading slashes from fileUrl
    const safeFileUrl = fileUrl.replace(/^\/+/, '');
    const filePath = path.join(uploadsDir, safeFileUrl);
    console.log('[extractText] fileUrl:', fileUrl, '| filePath:', filePath, '| fileType:', fileType);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found', filePath });
    }
    if (fileType === 'application/pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      // Use pdfjs-dist to extract text from PDF
      const loadingTask = pdfjsLib.getDocument({ data: dataBuffer });
      const pdfDocument = await loadingTask.promise;
      let fullText = '';
      for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
        const page = await pdfDocument.getPage(pageNum);
        const content = await page.getTextContent();
        const pageText = content.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
      }
      return res.json({ text: fullText });
    } else if (
      fileType === 'application/msword' ||
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const data = await mammoth.extractRawText({ path: filePath });
      return res.json({ text: data.value });
    } else {
      // Assume plain text
      const text = fs.readFileSync(filePath, 'utf8');
      return res.json({ text });
    }
  } catch (error) {
    console.error('Error extracting text:', error, '| fileUrl:', req.body.fileUrl, '| filePath:', filePath);
    res.status(500).json({ message: 'Failed to extract text', error: error.message, fileUrl, filePath });
  }
});

module.exports = router;
