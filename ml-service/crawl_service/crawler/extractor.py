"""
crawler/extractor.py — Multi-format text extraction (HTML, PDF, and Direct Images) + MD5 hashing.

Full Content-Type Routing Decision Tree:
=============================================================================
1. URL Fetch:
   Send HTTP GET request via requests.Session.
   Inspect HTTP Status, Content-Type header, and URL path extension.

2. Routing Branches:

   BRANCH A: PDF Documents
   Condition: Content-Type is 'application/pdf' OR url path ends with '.pdf'
   Extraction Method: pdf_extract(response.content, url)
     ├── Step A1: Attempt pdfplumber extraction across all pages.
     │     └── If text length >= 50 chars:
     │           -> Text-layer PDF extracted successfully.
     │           -> Status logged to crawl_logs: 'success'
     │           -> Source type stored in pages: 'pdf'
     └── Step A2: If text is None or length < 50 chars (scanned/image-only PDF):
           -> Fall through to OCR pipeline.
           -> pdf2image.convert_from_bytes(content, dpi=200).
           -> For each page image: pytesseract.image_to_string(img).
           -> Filter pages with < 20 chars or only whitespace.
           -> Join surviving page results with newline.
           -> If final OCR text non-empty:
                -> Status logged to crawl_logs: 'success-ocr'
                -> Source type stored in pages: 'pdf-ocr'
           -> If OCR also returns empty across all pages:
                -> Status logged to crawl_logs: 'skipped-image-only'
                -> Do not persist page (returns None).

   BRANCH B: Direct Image URLs
   Condition: Content-Type is 'image/jpeg', 'image/png', 'image/webp', or 'image/gif'
              OR url path ends with ('.jpg', '.jpeg', '.png', '.webp')
   Extraction Method: image_extract(response.content, url)
     ├── PIL.Image.open(BytesIO(content)).
     ├── pytesseract.image_to_string(img).strip().
     ├── Page Title: Extracted filename from URL path via extract_image_title().
     ├── If OCR text length > 20 characters:
     │     -> Status logged to crawl_logs: 'success-ocr-image'
     │     -> Source type stored in pages: 'image-ocr'
     └── If OCR text length <= 20 characters (or empty/failed):
           -> Status logged to crawl_logs: 'skipped-image-no-text'
           -> Do not persist page (returns None).

   BRANCH C: HTML Webpages (Default / text/html)
   Condition: Content-Type contains 'text/html' or general HTML webpage
   Extraction Method: extract_text(response.html, url)
     ├── Primary: trafilatura.extract(favor_recall=True, include_tables=True)
     ├── Fallback: BeautifulSoup decomposition of boilerplate (<nav>, <footer>, etc.)
     ├── Image Descriptions: BeautifulSoup collects all <img> alt attributes and
     │   <figcaption> text where length > 10 chars, appending to page text.
     ├── Playwright Escalation: If extracted text < cfg.MIN_TEXT_LENGTH,
     │   escalate to headless Chromium to render JavaScript.
     ├── Status logged to crawl_logs: 'success' (or 'failed' if no text)
     └── Source type stored in pages: 'html'
=============================================================================
"""

import hashlib
import io
import logging
import posixpath
from typing import Optional, Tuple
from urllib.parse import urlparse

from bs4 import BeautifulSoup
from PIL import Image

from crawl_service.config import cfg

logger = logging.getLogger(__name__)

# --- Trafilatura check ----------------------------------------------------- #
HAS_TRAFILATURA = False
try:
    import trafilatura
    HAS_TRAFILATURA = True
except ImportError:
    logger.info("trafilatura not found — using BeautifulSoup html.parser for extraction")

# --- PDF extraction dependencies ------------------------------------------- #
HAS_PDFPLUMBER = False
try:
    import pdfplumber
    HAS_PDFPLUMBER = True
except ImportError:
    logger.warning("pdfplumber not found — PDF text-layer extraction disabled")

# --- OCR dependencies (pdf2image & pytesseract) ---------------------------- #
HAS_OCR = False
try:
    import pdf2image
    import pytesseract
    HAS_OCR = True
except ImportError:
    logger.warning("pdf2image or pytesseract not found — OCR pipeline disabled")


# --------------------------------------------------------------------------- #
# HTML Text & Image Description Extraction                                    #
# --------------------------------------------------------------------------- #

def extract_text(html: str, url: str = "") -> tuple[str, Optional[str]]:
    """
    Extract clean main-content text and the page title from raw HTML.
    Also captures img alt attributes and figcaption text (> 10 characters)
    and appends them to the extracted text.

    Returns (text, title).
    """
    if not html:
        return "", None

    title: Optional[str] = None
    soup: Optional[BeautifulSoup] = None

    # --- Title extraction (BeautifulSoup — html.parser) ---------------------- #
    try:
        soup = BeautifulSoup(html, "html.parser")
        title_tag = soup.find("title")
        if title_tag and title_tag.string:
            title = title_tag.string.strip()[:512]
    except Exception as exc:
        logger.debug("Title extraction failed for %s: %s", url, exc)

    # --- Content extraction (Trafilatura primary) ---------------------------- #
    text = ""
    if HAS_TRAFILATURA:
        try:
            extracted = trafilatura.extract(
                html,
                include_comments=False,
                include_tables=True,
                no_fallback=False,
                favor_recall=True,
            )
            if extracted:
                text = extracted.strip()
        except Exception as exc:
            logger.warning("trafilatura extraction failed for %s: %s", url, exc)

    # Fallback to BeautifulSoup clean text extraction if trafilatura absent or returned empty
    if not text:
        try:
            if soup is None:
                soup = BeautifulSoup(html, "html.parser")
            # Decompose boilerplate elements
            for el in soup(["script", "style", "nav", "footer", "header", "aside", "noscript", "svg"]):
                el.decompose()
            text = soup.get_text(separator=" ", strip=True)
        except Exception as exc:
            logger.warning("BS4 extraction failed for %s: %s", url, exc)

    # --- Capture meaningful image descriptions without full image OCR -------- #
    # Collect all img alt attributes and figcaption text from raw HTML (> 10 chars)
    try:
        img_soup = BeautifulSoup(html, "html.parser")
        image_descriptions: list[str] = []
        seen_descriptions: set[str] = set()

        for img in img_soup.find_all("img", alt=True):
            alt_text = img["alt"].strip()
            if len(alt_text) > 10 and alt_text not in seen_descriptions:
                seen_descriptions.add(alt_text)
                image_descriptions.append(alt_text)

        for figcaption in img_soup.find_all("figcaption"):
            caption_text = figcaption.get_text(separator=" ", strip=True)
            if len(caption_text) > 10 and caption_text not in seen_descriptions:
                seen_descriptions.add(caption_text)
                image_descriptions.append(caption_text)

        if image_descriptions:
            desc_block = "\n".join(image_descriptions)
            if text:
                text = f"{text}\n\n{desc_block}"
            else:
                text = desc_block
    except Exception as exc:
        logger.debug("Image alt/figcaption collection failed for %s: %s", url, exc)

    return text, title


# --------------------------------------------------------------------------- #
# PDF Extraction (pdfplumber + pdf2image/pytesseract OCR fallback)            #
# --------------------------------------------------------------------------- #

def pdf_extract(pdf_bytes: bytes, url: str = "") -> Tuple[Optional[str], bool]:
    """
    Extract text from PDF bytes.

    Pipeline:
      1. Primary: Use pdfplumber to extract native text layer across all pages.
      2. If returned text is None or total extracted text length < 50 characters
         (indicating a scanned or image-only document), fall through to OCR.
      3. OCR Pipeline:
         - Convert PDF bytes into list of PIL images using pdf2image (DPI=200).
         - For each page image, run pytesseract.image_to_string().
         - Filter out pages where OCR returns only whitespace or fewer than 20 chars.
         - Join all page results with newline.
      4. If final OCR text is non-empty, return (text, True) [flag indicating OCR].
      5. If OCR also returns empty on all pages, return (None, False).

    SYSTEM LIMITATION:
    Websites and documents consisting entirely of images with no text content in any form
    (no alt text, no captions, no text-layer PDFs, and failed OCR) cannot be indexed
    by this system. Log these as skipped-image-only.

    Returns:
        tuple (extracted_text, is_ocr_extracted)
        If unextractable, returns (None, False).
    """
    if not pdf_bytes:
        return None, False

    plumber_text: Optional[str] = None

    # Step 1: Attempt native text extraction with pdfplumber
    if HAS_PDFPLUMBER:
        try:
            pages_text: list[str] = []
            with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
                for page in pdf.pages:
                    pt = page.extract_text()
                    if pt and pt.strip():
                        pages_text.append(pt.strip())
            if pages_text:
                joined = "\n".join(pages_text).strip()
                if joined:
                    plumber_text = joined
        except Exception as exc:
            logger.warning("pdfplumber extraction failed for %s: %s", url, exc)
    else:
        logger.warning("pdfplumber not installed; skipping native text layer extraction for %s", url)

    # Check text-layer sufficiency: if >= 50 characters, return native text
    if plumber_text is not None and len(plumber_text) >= 50:
        return plumber_text, False

    # Step 2: Fall through to OCR pipeline
    logger.info(
        "PDF text layer insufficient (%d chars) for %s — falling through to OCR pipeline",
        len(plumber_text) if plumber_text else 0,
        url,
    )

    if not HAS_OCR:
        logger.error("OCR dependencies (pdf2image, pytesseract) not installed — cannot OCR %s", url)
        return None, False

    try:
        # Convert PDF bytes to PIL images, one per page at 200 DPI
        images = pdf2image.convert_from_bytes(pdf_bytes, dpi=200)
        ocr_pages: list[str] = []

        for idx, img in enumerate(images):
            try:
                page_raw = pytesseract.image_to_string(img)
                cleaned = page_raw.strip()
                # Filter out pages where OCR returns only whitespace or < 20 characters
                if cleaned and len(cleaned) >= 20:
                    ocr_pages.append(cleaned)
            except Exception as page_err:
                logger.warning("pytesseract OCR failed on page %d of %s: %s", idx + 1, url, page_err)

        final_ocr_text = "\n".join(ocr_pages).strip()
        if final_ocr_text:
            return final_ocr_text, True

    except Exception as conv_err:
        logger.warning("pdf2image conversion / OCR pipeline failed for %s: %s", url, conv_err)

    # If OCR also returns empty on all pages
    return None, False


# --------------------------------------------------------------------------- #
# Direct Image Extraction (pytesseract OCR handler)                           #
# --------------------------------------------------------------------------- #

def image_extract(image_bytes: bytes, url: str = "") -> Optional[str]:
    """
    Extract text from direct image URLs using pytesseract OCR.
    Opens the bytes as a PIL Image using BytesIO, runs pytesseract.image_to_string(),
    strips whitespace, and returns the result if it is longer than 20 characters,
    else returns None.
    """
    if not image_bytes:
        return None

    if not HAS_OCR:
        logger.error("pytesseract / PIL not available — skipping image OCR for %s", url)
        return None

    try:
        img = Image.open(io.BytesIO(image_bytes))
        ocr_text = pytesseract.image_to_string(img).strip()
        if len(ocr_text) > 20:
            return ocr_text
        return None
    except Exception as exc:
        logger.warning("image_extract OCR failed for %s: %s", url, exc)
        return None


def extract_image_title(url: str) -> str:
    """
    Extract the image filename from the URL path to use as the page title.
    """
    try:
        path = urlparse(url).path
        filename = posixpath.basename(path.rstrip("/"))
        if filename:
            return filename
    except Exception:
        pass
    return "image"


# --------------------------------------------------------------------------- #
# Utilities                                                                    #
# --------------------------------------------------------------------------- #

def is_content_sufficient(text: str) -> bool:
    """Return True if text length >= MIN_TEXT_LENGTH."""
    return len(text) >= cfg.MIN_TEXT_LENGTH


def compute_hash(text: str) -> str:
    """Compute MD5 hex digest of clean text."""
    return hashlib.md5(text.encode("utf-8"), usedforsecurity=False).hexdigest()


def content_changed(new_text: str, stored_hash: Optional[str]) -> bool:
    """Return True if text hash differs from stored hash."""
    if stored_hash is None:
        return True
    return compute_hash(new_text) != stored_hash
