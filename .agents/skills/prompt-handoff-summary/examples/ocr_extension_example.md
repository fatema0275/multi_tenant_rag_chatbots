# Module 2 Extension: Scanned PDF & Direct Image OCR — Technical Handoff Summary

**Date / Timestamp**: 2026-09-10  
**Target Module**: Module 2 — Crawler & Content Processing (`ml-service/crawl_service`)  
**Status**: Tested & Verified in PostgreSQL / Local Environment  

---

## 1. Executive Summary & Objective

- **Prompt Goal**: Extend Module 2's PDF and image extraction pipeline with local OCR support using `pdf2image` and `pytesseract` without using any cloud OCR APIs. Handle scanned/image-based PDFs, direct image URLs discovered in link traversal, and HTML image alt text/captions.
- **Key Outcome**: PDFs with no text layer or < 50 characters are automatically converted into 200 DPI page images and transcribed via Tesseract OCR. Direct image URLs (.jpg, .png, .webp, .gif) are transcribed via OCR. All operations are logged with dedicated status codes (`success-ocr`, `skipped-image-only`, `success-ocr-image`, `skipped-image-no-text`) and saved with `source_type` tags in PostgreSQL.
- **Touched Modules**:
  - `ml-service/crawl_service`: Extractor, Fetcher, Discovery, Task Runner, DB Helpers.
  - `backend/migrations`: Migration 21 for schema and enum updates.
  - `DEPLOYMENT.md` & `README.md`: System dependencies documentation.
  - Untouched: Chunking (Module 3), Embeddings, Vector Search, Auth, and Frontend.

---

## 2. Code Delta: Added vs. Subtracted / Replaced

### What was ADDED:
- `ml-service/crawl_service/crawler/extractor.py`:
  - `pdf_extract(pdf_bytes, url)`: Dual-stage extraction (pdfplumber text layer -> pdf2image/pytesseract OCR fallback).
  - `image_extract(image_bytes, url)`: Direct image OCR handler via PIL and pytesseract.
  - `extract_image_title(url)`: Extracts image filename from URL path for the page title.
  - BeautifulSoup image description collection: Gathers `img[alt]` and `<figcaption>` (> 10 chars) from HTML and appends to body text.
  - Full Content-Type Routing Decision Tree documentation comment.
- `ml-service/crawl_service/crawler/fetcher.py`:
  - Added `content: bytes` and `content_type: str` fields to `FetchResult` dataclass to retain raw binary payloads for PDF and image OCR.
- `ml-service/crawl_service/crawler/discovery.py`:
  - Extended BFS link traversal to discover candidate URLs with PDF and direct image content-types from `<a href>` tags without trying to parse them as HTML.
- `ml-service/crawl_service/tasks/crawl_task.py`:
  - Implemented Branch A (PDF), Branch B (Direct Image), and Branch C (HTML) routing in `_process_page()`.
  - Added `_notify_node_backend()` helper function.
- `ml-service/crawl_service/db/crawl_logs.py`:
  - Added `success-ocr`, `skipped-image-only`, `success-ocr-image`, and `skipped-image-no-text` to `VALID_STATUSES`.
- `ml-service/crawl_service/db/pages.py`:
  - Added `source_type` parameter and column handling to `upsert_page()` and `get_existing_pages()`.
- `backend/migrations/20260101000021-add-ocr-support-to-crawl-logs-and-pages.js`:
  - Database migration adding enum values to `enum_crawl_logs_status` and `source_type` column to `pages`.
- `DEPLOYMENT.md`:
  - System installation instructions for `tesseract-ocr` and `poppler-utils`.

### What was SUBTRACTED / REPLACED:
- `ml-service/crawl_service/crawler/fetcher.py`:
  - Replaced immediate `resp.text` decoding for all content types with binary-safe handling: binary formats (PDF, images) do not decode into `resp.text`, preventing unicode corruption.
- `ml-service/crawl_service/tasks/crawl_task.py`:
  - Replaced monolithic HTML-only `extract_text()` path with a 3-way content-type routing switch.
  - Replaced strict `("success", "skipped_unchanged", "duplicate")` live URL condition to also include `("success-ocr", "success-ocr-image")`.

---

## 3. Deep Technical Mechanics & Function Call Trace

### PDF Extraction Pipeline (`pdf_extract`):
1. **Stage 1 (Native Text Layer)**:
   - Wraps `pdf_bytes` in an in-memory `io.BytesIO(pdf_bytes)` stream.
   - Calls `pdfplumber.open(stream)` and iterates through `pdf.pages`, invoking `page.extract_text()`.
   - Joins non-empty page text. If total character count >= 50, immediately returns `(text, False)` without invoking OCR.
2. **Stage 2 (OCR Fallback)**:
   - Triggered when text is `None` or length < 50 characters (identifying scanned documents).
   - Calls `pdf2image.convert_from_bytes(pdf_bytes, dpi=200)` to render each PDF page into a PIL Image object at 200 DPI (balances OCR recognition rate against CPU compute time).
   - For each rendered page image, executes `pytesseract.image_to_string(img)`.
   - Filters out pages where text is whitespace or fewer than 20 characters.
   - Joins surviving page strings with `\n`. If non-empty, returns `(text, True)` (flagging OCR extraction). If empty across all pages, returns `(None, False)`.

### Direct Image Extraction Pipeline (`image_extract`):
1. Opens raw bytes in-memory using `PIL.Image.open(io.BytesIO(image_bytes))`.
2. Invokes `pytesseract.image_to_string(img).strip()`.
3. Checks character threshold: if `len(text) > 20`, returns the extracted text; otherwise returns `None`.
4. Page title is derived using `posixpath.basename(urlparse(url).path.rstrip("/"))`.

---

## 4. Comprehensive Imports Reference Table

| Import / Symbol | Source Library | Purpose / Role | Where Used (File & Function) | New or Existing |
| :--- | :--- | :--- | :--- | :--- |
| `pdfplumber` | `pdfplumber` | Parses PDF structure and extracts native text layers | `extractor.py` (`pdf_extract`) | New |
| `pdf2image` | `pdf2image` | Converts PDF byte streams into lists of PIL images per page (`convert_from_bytes`) | `extractor.py` (`pdf_extract`) | New |
| `pytesseract` | `pytesseract` | Python wrapper interfacing with the system-level Tesseract OCR engine | `extractor.py` (`pdf_extract`, `image_extract`) | New |
| `Image` | `PIL` (Pillow) | Image loading, buffer decoding, and manipulation | `extractor.py` (`image_extract`) | Existing |
| `BytesIO` | `io` (stdlib) | In-memory byte streaming (avoids temporary disk writes) | `extractor.py` (`pdf_extract`, `image_extract`) | Existing |
| `BeautifulSoup` | `bs4` | HTML parsing, DOM traversal for title, `img[alt]`, and `<figcaption>` | `extractor.py` (`extract_text`), `discovery.py` | Existing |
| `posixpath` | `posixpath` (stdlib) | URL-safe path splitting to extract clean file basenames | `extractor.py` (`extract_image_title`), `crawl_task.py` | New |
| `urlparse` | `urllib.parse` (stdlib) | Parses URL structure to inspect paths and query strings | `extractor.py`, `crawl_task.py`, `discovery.py` | Existing |

---

## 5. System, Database & Environment Dependencies

- **System-Level Binaries (Ubuntu / Debian)**:
  ```bash
  sudo apt update && sudo apt install -y tesseract-ocr poppler-utils
  ```
  - `tesseract-ocr`: Required by `pytesseract`.
  - `poppler-utils` (`pdftoppm`): Required by `pdf2image`.
- **Python Dependencies (`requirements-crawl.txt` & `requirements.txt`)**:
  - `pdfplumber==0.11.10`
  - `pdf2image==1.17.0`
  - `pytesseract==0.3.13`
- **PostgreSQL Database Schema Changes**:
  - `ALTER TYPE enum_crawl_logs_status ADD VALUE 'success-ocr'`
  - `ALTER TYPE enum_crawl_logs_status ADD VALUE 'skipped-image-only'`
  - `ALTER TYPE enum_crawl_logs_status ADD VALUE 'success-ocr-image'`
  - `ALTER TYPE enum_crawl_logs_status ADD VALUE 'skipped-image-no-text'`
  - `ALTER TABLE pages ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'html'`

---

## 6. Team Partner Verification & Quickstart

To verify the OCR extension:

1. **Verify Python packages**:
   ```bash
   python -c "import pdfplumber, pdf2image, pytesseract, PIL; print('All OCR packages installed successfully')"
   ```
2. **Run the integration test**:
   ```bash
   python C:/Users/HP/.gemini/antigravity-ide/brain/566bb177-75bf-4686-a016-b249eb56fa79/scratch/test_ocr_extension.py
   ```
3. **Documented System Limitation**:
   Websites consisting entirely of images with no text content in any form (no alt text, no captions, no text-layer PDFs, and failed OCR) cannot be indexed by this system. These URLs are logged with status `'skipped-image-only'` and are excluded from the pages table.
