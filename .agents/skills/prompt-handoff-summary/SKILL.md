---
name: prompt-handoff-summary
description: >-
  Use this skill whenever generating a technical handoff summary of completed prompts,
  tasks, or module extensions for team collaborators. Generates an exhaustive technical
  breakdown including added/subtracted code, granular function mechanics, an import-by-import
  reference guide, and verification steps.
---

# Prompt & Module Technical Handoff Summary

This skill generates a concise, high-density, **interview-ready** technical handoff summary after completing any prompt, feature, or module. Its goal is to maximize technical signal and recall while eliminating fluff, so team partners or interviewers immediately grasp the core mechanics, design decisions, and tradeoffs.

---

## Required Structure of a Handoff Summary

Keep it punchy, structured, and easy to recall:

### 1. Executive Pitch & 3-Branch Decision Tree
- **One-Sentence Pitch**: Problem solved, tools used, key win.
- **ASCII Flowchart / Decision Tree**: Visual routing flow showing conditions, thresholds, and outputs.

### 2. Key Mechanics & "Why" (Interview Talking Points Table)
- Table mapping: Decision / Mechanism | Technical Details | Why We Did It This Way (tradeoffs, performance, cost).


### 2. Code Delta: Added vs. Subtracted / Replaced
Clearly delineate additions from deletions/replacements:
- **What was ADDED**:
  - New functions, classes, data structures, and database entities.
  - New configuration flags or environment variables.
  - New routes, handlers, or routing branches.
- **What was SUBTRACTED / REPLACED**:
  - Legacy functions or deprecated checks replaced.
  - Deleted code blocks or removed dependencies.
  - Changes in return signatures or fallback logic.

### 3. Deep Technical Mechanics & Function Call Trace
Explain the granular mechanics of critical calls with exact function signatures and technical parameters:
- **Explicit Function Calls**: Do not just say "processed images"; explain the exact call (e.g., `pdf2image.convert_from_bytes(pdf_bytes, dpi=200)` converting binary PDF streams to in-memory PIL image objects).
- **Thresholds & Filtering**: State all constants, thresholds, and conditions (e.g., fallback triggers when text length < 50 chars; page OCR filtered when length < 20 chars).
- **Error Handling & Fallbacks**: Explain fallback order (e.g., Native text extraction -> OCR fallback -> skip status).

### 4. Comprehensive Imports Reference Table
Provide an exhaustive table of every module/package imported or modified in the task:

| Import / Symbol | Source Library | Purpose / Role | Where Used (File & Function) | New or Existing |
| :--- | :--- | :--- | :--- | :--- |
| `pdfplumber` | `pdfplumber` | Native text-layer extraction | `extractor.py` (`pdf_extract`) | New |
| `convert_from_bytes` | `pdf2image` | Render PDF bytes to PIL Images at 200 DPI | `extractor.py` (`pdf_extract`) | New |
| `pytesseract` | `pytesseract` | Python wrapper for Tesseract OCR engine | `extractor.py` (`pdf_extract`, `image_extract`) | New |
| `Image` | `PIL` (Pillow) | Image loading, buffer manipulation, resizing | `extractor.py` (`image_extract`) | Existing |
| `BytesIO` | `io` (stdlib) | In-memory byte streaming for non-disk files | `extractor.py` (`pdf_extract`, `image_extract`) | Existing |

### 5. Dependency & Environment Requirements
- **System-Level Binaries**: Note any apt/brew/winget packages required (e.g., `tesseract-ocr`, `poppler-utils`).
- **Python / Node Dependencies**: Exact package names and versions added to `requirements.txt` or `package.json`.
- **Database Schema Updates**: New enum values, columns, tables, or indexes created.

### 6. Team Partner Verification & Quickstart
- Exact shell commands to run tests or verify the module locally.
- Sample inputs and expected return outputs.
- Known limitations or boundaries documented in the codebase.

---

## Reference Resources

- Template: Refer to [summary_template.md](./resources/summary_template.md) for the copy-paste markdown skeleton.
- Example: Refer to [ocr_extension_example.md](./examples/ocr_extension_example.md) for a complete reference summary of the Module 2 PDF & Image OCR extension.
