# Deployment Guide & System Prerequisites

## System-Level OCR & PDF Extraction Prerequisites

SiteMind uses local OCR (`pytesseract` and `pdf2image`) to process scanned PDFs and direct image documents without relying on paid or external cloud OCR APIs.

### Debian / Ubuntu (Linux Deployment Environments)

In Linux deployment environments (Docker, EC2, VPS, Ubuntu), install the following system packages:

```bash
sudo apt update
sudo apt install -y tesseract-ocr poppler-utils
```

#### Package Roles:
- **`tesseract-ocr`**: The open-source Tesseract OCR engine required by `pytesseract` for image-to-text extraction.
- **`poppler-utils`**: Provides `pdftoppm`, which is required by `pdf2image` to convert PDF pages into PIL image objects for OCR processing.

### Optional Language Packs
If documents contain languages other than English, install additional language packs (e.g., German, Spanish, French):
```bash
sudo apt install -y tesseract-ocr-deu tesseract-ocr-spa tesseract-ocr-fra
```

### Verification
Verify that both utilities are available on your system `PATH`:
```bash
tesseract --version
pdftoppm -v
```

---

## Python Dependencies

Install the crawling service Python dependencies:
```bash
cd ml-service
pip install -r requirements-crawl.txt
```
Key packages for Module 2 PDF & OCR support:
- `pdfplumber`: Extracts native text layers from digital PDFs.
- `pdf2image`: Renders scanned PDF pages as PIL images at 200 DPI.
- `pytesseract`: Runs Tesseract OCR on rendered page images and direct image files.
