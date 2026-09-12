# Module 2 Extension: Scanned PDF & Image OCR (Interview-Ready Handoff)

> **Quick Pitch**: Extended the web crawler to extract un-indexable scanned PDFs and standalone image URLs using an in-memory, local OCR pipeline (`pdf2image` + `pytesseract`). No paid cloud APIs, 100% data privacy, with automatic fallback routing and granular database auditability.

---

## 1. Architectural Decision Tree (The 3-Branch Router)

```
                       HTTP GET Request
                              │
       ┌──────────────────────┼──────────────────────┐
       ▼                      ▼                      ▼
  [1. PDF Router]       [2. Direct Image]       [3. HTML Page]
 (.pdf, application/pdf) (.png, .jpg, image/*)  (text/html, default)
       │                      │                      │
       ▼                      ▼                      ▼
  pdfplumber             BytesIO + PIL          trafilatura
  text layer?            + pytesseract          + BS4 alt/captions
       │                      │                 (len > 10 chars)
  ┌────┴────┐                 │                      │
 >=50    <50 chars        > 20 chars?           Insufficient?
 chars   (scanned)           ┌───┴───┐               │
  │         │               YES      NO              ▼
  │   pdf2image (200 DPI)    │       │         Playwright
  │   + pytesseract OCR      │   skipped-image- escalation
  │         │                │     no-text           │
  ▼         ▼                ▼                       ▼
success  success-ocr     success-ocr-image        success
(pdf)    (pdf-ocr)       (image-ocr)              (html)
```

---

## 2. Key Mechanics & "Why" (Interview Talking Points)

| Decision / Mechanism | Technical Details | Why We Did It This Way |
| :--- | :--- | :--- |
| **Two-Stage PDF Fallback** | `pdfplumber` first; if text is `None` or `< 50 chars`, fall through to OCR. | Scanned PDFs have no text layer. `pdfplumber` is 100x faster for digital PDFs; OCR only runs when strictly necessary. |
| **PDF Rendering at 200 DPI** | `pdf2image.convert_from_bytes(pdf_bytes, dpi=200)` | 200 DPI is the sweet spot: sharp enough for Tesseract character recognition, without the massive RAM/CPU overhead of 300+ DPI. |
| **Zero Disk I/O (In-Memory)** | `io.BytesIO(pdf_bytes)` & `Image.open(BytesIO)` | Avoids creating temporary files on disk, eliminating I/O bottlenecks and disk-cleanup race conditions in concurrent Celery workers. |
| **Page-Level Filtering** | OCR output `< 20 chars` or whitespace is discarded. | Eliminates blank margins, scanner artifacts, and noisy decorative pages. |
| **HTML Image Strategy** | Trafilatura + BeautifulSoup collects `img[alt]` and `<figcaption>` (`> 10 chars`). | Running OCR on every thumbnail or icon on a webpage destroys crawl throughput. Capturing alt text & captions grabs semantic intent for zero extra compute. |
| **Local vs Cloud OCR** | Tesseract engine (`sudo apt install tesseract-ocr poppler-utils`) | Zero API cost, zero quota limits, no sensitive customer data sent to third-party cloud endpoints. |

---

## 3. What Was Added vs. Subtracted

- **Added**:
  - `pdf_extract()`: Dual-stage extractor (native text -> OCR fallback).
  - `image_extract()`: Direct image OCR (> 20 chars threshold).
  - `FetchResult.content`: Preserves raw binary bytes alongside text.
  - Granular DB Audit: 4 new `crawl_logs.status` values (`success-ocr`, `skipped-image-only`, `success-ocr-image`, `skipped-image-no-text`) and `pages.source_type` (`pdf`, `pdf-ocr`, `image-ocr`, `html`).
- **Subtracted / Replaced**:
  - Removed naive string decoding in `fetcher.py` that attempted `resp.text` on binary files.
  - Replaced HTML-only assumption in `_process_page()` with multi-format content-type routing.

---

## 4. All Imports Reference: What & Why

| Import | Package | Role in This Feature |
| :--- | :--- | :--- |
| `pdfplumber` | `pdfplumber` | Reads digital PDF structural objects and extracts native font text layers. |
| `convert_from_bytes` | `pdf2image` | Uses Poppler (`pdftoppm`) to render PDF byte streams into PIL images in RAM. |
| `pytesseract` | `pytesseract` | Python wrapper executing local Tesseract OCR on PIL images. |
| `Image` | `PIL` (Pillow) | Decodes raw image bytes into image objects for OCR input. |
| `BytesIO` | `io` (stdlib) | In-memory binary streams; allows libraries expecting file paths to read raw bytes. |
| `BeautifulSoup` | `bs4` | Fast DOM traversal to pull `alt` attributes and `<figcaption>` text. |
| `posixpath` | `posixpath` (stdlib) | Extracts clean filenames from URL paths (e.g. `chart.png`) for page titles. |

---

## 5. System Prerequisites & Database Schema

```bash
# Ubuntu/Debian server requirements
sudo apt update && sudo apt install -y tesseract-ocr poppler-utils
```

```sql
-- Schema migration additions (Migration 21)
ALTER TYPE "enum_crawl_logs_status" ADD VALUE IF NOT EXISTS 'success-ocr';
ALTER TYPE "enum_crawl_logs_status" ADD VALUE IF NOT EXISTS 'skipped-image-only';
ALTER TYPE "enum_crawl_logs_status" ADD VALUE IF NOT EXISTS 'success-ocr-image';
ALTER TYPE "enum_crawl_logs_status" ADD VALUE IF NOT EXISTS 'skipped-image-no-text';

ALTER TABLE pages ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'html';
```

---

## 6. Documented System Limitation
Websites or documents consisting **entirely of images with no text** (no alt text, no captions, no text layer, and failed OCR) cannot be indexed. These are safely logged as `skipped-image-only` in `crawl_logs` and excluded from vector embedding.
