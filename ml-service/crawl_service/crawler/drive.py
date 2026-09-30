"""
crawler/drive.py — Google Drive folder crawler and PDF extractor for SiteMind RAG.

Capabilities:
1. Parses Google Drive folder URLs (standard, shortened, or direct IDs).
2. Recursively traverses all nested folders and subfolders via Google Drive v3 REST API.
3. Downloads PDF files in each folder.
4. Uses our existing PDF/OCR extraction pipeline (pdfplumber + pytesseract).
5. Dispatches extracted content to Node.js backend for chunking and vector embedding.
"""

import os
import re
import logging
from typing import List, Dict, Any, Optional
import requests

from crawl_service.config import cfg
from crawl_service.crawler.extractor import pdf_extract

logger = logging.getLogger(__name__)

# Regex patterns to extract Google Drive Folder ID
_DRIVE_FOLDER_PATTERNS = [
    re.compile(r"drive\.google\.com/drive/(?:u/\d+/)?folders/([a-zA-Z0-9_-]+)"),
    re.compile(r"drive\.google\.com/open\?id=([a-zA-Z0-9_-]+)"),
    re.compile(r"drive\.google\.com/folderview\?id=([a-zA-Z0-9_-]+)"),
]

_DRIVE_FILE_PATTERNS = [
    re.compile(r"drive\.google\.com/file/d/([a-zA-Z0-9_-]+)"),
    re.compile(r"drive\.google\.com/open\?id=([a-zA-Z0-9_-]+)"),
]

DRIVE_API_BASE = "https://www.googleapis.com/drive/v3"


def extract_drive_id(url: str) -> Optional[Dict[str, str]]:
    """
    Extracts folder or file ID from a Google Drive URL.
    Returns dict: {'type': 'folder' | 'file', 'id': str} or None.
    """
    url = url.strip()
    # Check if raw ID was provided directly (alphanumeric, at least 15 chars)
    if re.match(r"^[a-zA-Z0-9_-]{15,60}$", url):
        return {"type": "folder", "id": url}

    for pattern in _DRIVE_FOLDER_PATTERNS:
        m = pattern.search(url)
        if m:
            return {"type": "folder", "id": m.group(1)}

    for pattern in _DRIVE_FILE_PATTERNS:
        m = pattern.search(url)
        if m:
            return {"type": "file", "id": m.group(1)}

    return None


def get_drive_api_key() -> Optional[str]:
    """Retrieve Google Drive API key from environment."""
    return os.getenv("GOOGLE_DRIVE_API_KEY") or getattr(cfg, "GOOGLE_DRIVE_API_KEY", None)


class GoogleDriveCrawler:
    """
    Traverses Google Drive folders recursively and indexes supported documents into RAG.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or get_drive_api_key()

    def _get_headers(self) -> Dict[str, str]:
        headers = {"User-Agent": "SiteMind-DriveCrawler/1.0"}
        return headers

    def list_folder_contents(self, folder_id: str) -> List[Dict[str, Any]]:
        """
        Lists all direct files and child folders inside a Google Drive folder.
        Handles pagination automatically.
        """
        items: List[Dict[str, Any]] = []
        page_token: Optional[str] = None

        if not self.api_key:
            logger.warning("No GOOGLE_DRIVE_API_KEY configured for GoogleDriveCrawler")

        while True:
            params: Dict[str, Any] = {
                "q": f"'{folder_id}' in parents and trashed = false",
                "fields": "nextPageToken, files(id, name, mimeType, size, webViewLink, webContentLink)",
                "pageSize": 100,
            }
            if self.api_key:
                params["key"] = self.api_key
            if page_token:
                params["pageToken"] = page_token

            try:
                resp = requests.get(
                    f"{DRIVE_API_BASE}/files",
                    params=params,
                    headers=self._get_headers(),
                    timeout=20,
                )
                if resp.status_code != 200:
                    err_details = resp.text[:300]
                    logger.error(
                        "Google Drive API error listing folder %s (HTTP %d): %s",
                        folder_id, resp.status_code, err_details
                    )
                    break

                data = resp.json()
                files = data.get("files", [])
                items.extend(files)

                page_token = data.get("nextPageToken")
                if not page_token:
                    break
            except Exception as e:
                logger.error("Exception requesting Drive folder contents for %s: %s", folder_id, e)
                break

        return items

    def traverse_recursively(
        self, folder_id: str, max_depth: int = 5, current_depth: int = 1
    ) -> List[Dict[str, Any]]:
        """
        Recursively traverses folders and subfolders up to max_depth.
        Returns a flat list of all discovered non-folder files.
        """
        if current_depth > max_depth:
            logger.warning("Max folder depth %d reached for folder %s", max_depth, folder_id)
            return []

        all_files: List[Dict[str, Any]] = []
        entries = self.list_folder_contents(folder_id)

        for item in entries:
            mime = item.get("mimeType", "")
            if mime == "application/vnd.google-apps.folder":
                # Recurse into subfolder
                subfolder_id = item["id"]
                logger.info(
                    "Traversing subfolder '%s' (ID: %s, Depth: %d)",
                    item.get("name"), subfolder_id, current_depth + 1
                )
                sub_files = self.traverse_recursively(
                    subfolder_id, max_depth=max_depth, current_depth=current_depth + 1
                )
                all_files.extend(sub_files)
            else:
                all_files.append(item)

        return all_files

    def download_file_bytes(self, file_id: str) -> Optional[bytes]:
        """
        Downloads binary content of a file via Google Drive API.
        Falls back to public direct download URL if needed.
        """
        params: Dict[str, Any] = {"alt": "media"}
        if self.api_key:
            params["key"] = self.api_key

        try:
            resp = requests.get(
                f"{DRIVE_API_BASE}/files/{file_id}",
                params=params,
                headers=self._get_headers(),
                timeout=45,
            )
            if resp.status_code == 200:
                return resp.content
            logger.warning("Drive API download returned HTTP %d for file %s. Trying direct download fallback...", resp.status_code, file_id)
        except Exception as e:
            logger.warning("Exception downloading Drive file %s: %s. Trying fallback...", file_id, e)

        # Fallback for publicly shared Google Drive files
        try:
            fallback_url = f"https://drive.google.com/uc?export=download&id={file_id}"
            fb_resp = requests.get(fallback_url, headers=self._get_headers(), timeout=45)
            if fb_resp.status_code == 200 and len(fb_resp.content) > 100:
                return fb_resp.content
        except Exception as fb_err:
            logger.error("Fallback download failed for file %s: %s", file_id, fb_err)

        return None

    def export_gdoc_text(self, file_id: str) -> Optional[str]:
        """Export Google Doc native document as plain text."""
        params: Dict[str, Any] = {"mimeType": "text/plain"}
        if self.api_key:
            params["key"] = self.api_key
        try:
            resp = requests.get(
                f"{DRIVE_API_BASE}/files/{file_id}/export",
                params=params,
                headers=self._get_headers(),
                timeout=30,
            )
            if resp.status_code == 200:
                return resp.text.strip()
        except Exception as e:
            logger.error("Exception exporting Google Doc %s: %s", file_id, e)
        return None

    def crawl_and_index_folder(
        self,
        folder_url_or_id: str,
        website_id: int,
        site_id: str,
        notify_node_fn=None,
    ) -> Dict[str, Any]:
        """
        Crawls a Drive folder (including all subfolders), extracts text from PDFs & Docs,
        and indexes chunks via the Node backend.
        """
        extracted = extract_drive_id(folder_url_or_id)
        if not extracted or extracted["type"] != "folder":
            return {"error": "Invalid Google Drive folder link or folder ID"}

        folder_id = extracted["id"]
        logger.info(
            "Starting Google Drive recursive crawl for folder %s (website_id=%d)",
            folder_id, website_id
        )

        files = self.traverse_recursively(folder_id)
        logger.info("Found %d total files in folder %s hierarchy", len(files), folder_id)

        indexed_files = []
        skipped_files = []

        for f in files:
            name = f.get("name", "Untitled")
            mime = f.get("mimeType", "")
            file_id = f.get("id")
            web_link = f.get("webViewLink") or f"https://drive.google.com/file/d/{file_id}/view"

            is_gdoc = mime == "application/vnd.google-apps.document"
            is_pdf = mime == "application/pdf" or name.lower().endswith(".pdf")
            is_text = mime in ("text/plain", "text/markdown", "text/csv")

            if not (is_pdf or is_text or is_gdoc):
                skipped_files.append({"name": name, "reason": f"Unsupported format: {mime}"})
                continue

            extracted_text = ""
            if is_gdoc:
                gdoc_text = self.export_gdoc_text(file_id)
                if gdoc_text:
                    extracted_text = gdoc_text.strip()
            elif is_pdf or is_text:
                content_bytes = self.download_file_bytes(file_id)
                if not content_bytes:
                    skipped_files.append({"name": name, "reason": "Download failed"})
                    continue

                if is_pdf:
                    # pdf_extract returns a tuple (text, is_ocr)
                    extract_res = pdf_extract(content_bytes, web_link)
                    if isinstance(extract_res, tuple):
                        extracted_text = (extract_res[0] or "").strip()
                    elif isinstance(extract_res, dict):
                        extracted_text = (extract_res.get("text") or "").strip()
                    elif isinstance(extract_res, str):
                        extracted_text = extract_res.strip()
                elif is_text:
                    try:
                        extracted_text = content_bytes.decode("utf-8", errors="ignore").strip()
                    except Exception:
                        extracted_text = ""

            if not extracted_text or len(extracted_text) < 30:
                skipped_files.append({"name": name, "reason": "No readable text extracted (or empty document)"})
                continue

            # Dispatch to Node.js backend for chunking & vector embedding
            if notify_node_fn:
                try:
                    notify_node_fn(
                        website_id=website_id,
                        site_id=site_id,
                        url=web_link,
                        title=f"[Drive] {name}",
                        text=f"Document: {name}\nSource: Google Drive\n\n{extracted_text}",
                    )
                    indexed_files.append({"id": file_id, "name": name, "url": web_link, "length": len(extracted_text)})
                    logger.info("Successfully indexed Google Drive document '%s' (%d chars)", name, len(extracted_text))
                except Exception as notify_err:
                    logger.error("Failed to notify backend for Drive file %s: %s", name, notify_err)
                    skipped_files.append({"name": name, "reason": f"Indexing error: {notify_err}"})

        return {
            "folderId": folder_id,
            "totalDiscovered": len(files),
            "indexedCount": len(indexed_files),
            "skippedCount": len(skipped_files),
            "indexedFiles": indexed_files,
            "skippedFiles": skipped_files,
        }
