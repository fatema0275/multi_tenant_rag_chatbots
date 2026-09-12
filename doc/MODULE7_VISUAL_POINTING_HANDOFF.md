# Module 7: Visual Pointing & Live Page Highlighting (Interview-Ready Handoff)

> **Quick Pitch**: Enabled interactive, visual DOM highlighting in the embeddable chat widget by generating resilient, text-matching selectors at ingestion time, pairing them with a 120-character database snippet fallback, enforcing cross-domain security boundaries, and executing keyframe-animated host DOM pointing with zero-pollution style cleanup.

---

## 1. Architectural Routing Flow & Decision Tree

```
                      Query Answered in Widget
                                 │
                                 ▼
                     [1. Domain Authorization]
               window.location.hostname == config.domain?
                                 │
                   ┌─────────────┴─────────────┐
                  YES                          NO
                   │                            │
                   ▼                            ▼
        [2. URL / SPA Route Check]    Disable visual pointing
      page_url path == window.path?    for entire session.
                   │                   (Silent abort)
          ┌────────┴────────┐
         YES                NO
          │                  │
          ▼                  ▼
    [Same Page]       [Different Path on Domain]
  "View source" link  "Go to source page" link (target="_self")
  Attempt Highlighting Skip live pointing; user navigates on click.
          │
          ▼
   [3. DOM Text Query]
 Parse dom_selector JSON -> snippet (first 80 chars)
 Fallback to text_snippet if dom_selector missing
 querySelectorAll('p, li, h2, h3, h4, td, div')
          │
     ┌────┴────┐
   FOUND    NOT FOUND
     │         │
     │         ▼
     │      Log 'visual-point-failed' (dev mode only);
     │      Sources UI remains available as guaranteed fallback.
     ▼
 [4. Highlight Lifecycle]
 1. Inject <style id="sitemind-highlight-style"> into document.head
 2. Add .sitemind-highlight-pulse class to host element
 3. element.scrollIntoView({ behavior: 'smooth', block: 'center' })
 4. setTimeout(3500ms) -> Remove highlight class
 5. setTimeout(4000ms) -> Remove injected <style> tag from document.head
```

---

## 2. Key Mechanics & "Why" (Interview Talking Points)

| Decision / Mechanism | Technical Details | Why We Did It This Way (Tradeoffs & Rationale) |
| :--- | :--- | :--- |
| **Text-Match Positional Selector vs CSS Classes** | Stored as JSON: `{"type": "text-match", "snippet": "..."}`. Snippet contains first 80 chars of the chunk's first sentence. | Web scrapers (`trafilatura`) strip HTML markup, classes, and IDs for cleanliness. Generating CSS class selectors (e.g. `.main-content > div:nth-child(3)`) is brittle across frontend framework updates, minified class names, and responsive layouts. Text matching survives DOM restyling. |
| **120-Character `text_snippet` Column** | Added to `document_chunks` table, populated during ingestion via `chunk_text[:120]`, with a one-time SQL backfill. | Acts as a guaranteed database-level preview and fuzzy fallback if the primary `dom_selector` JSON is absent or fails to parse. |
| **Backend Domain Isolation Gating** | In `POST /api/widget/query`, compares `page_url` domain against the registered website domain (`websites.domain`). | If a multi-tenant or multi-site crawler indexes an external link or CDN asset, `dom_selector` is stripped (`null`), preventing cross-origin selector injection or unexpected highlighting attempts. |
| **Top Retrieved Chunk Deduplication** | Only the highest-ranking chunk for each unique `page_url` receives `dom_selector`. | Prevents duplicate highlight pulses if multiple retrieved chunks originate from the same article or documentation page. |
| **SPA & Cross-Path Detection** | Widget compares normalized `page_url` with `window.location.href` (stripping queries and hashes). | Highlighting cannot execute if the user is on `/pricing` while the answer originated from `/faq`. Instead of breaking, it alters the link to "Go to source page" with `target="_self"`, ensuring natural navigation. |
| **Host DOM Traversal from Closed Shadow Root** | Chat widget UI is isolated inside Shadow DOM; queries host document using `document.querySelectorAll('p, li, h2, h3, h4, td, div')`. | Preserves host site CSS encapsulation while allowing the chatbot to point users to text in the host page. Elements inside the widget container are strictly ignored. |
| **Zero-Pollution Dynamic Style Injection** | Injects keyframed `@keyframes sitemindHighlightPulse` in host `<head>`, removes class at 3.5s, and deletes the `<style>` tag at 4.0s. | Leaves no persistent DOM artifacts or stylesheet bloat on the host customer website. Smoothly transitions from `#FFF176` (`rgba(255, 235, 59, 0.6)`) to transparent with a subtle glow. |

---

## 3. Code Delta: Added vs. Subtracted / Replaced

### What Was ADDED
1. **Database Schema & View Migration**:
   - `backend/migrations/20260101000022-add-text-snippet-to-document-chunks.js`:
     - Added column `text_snippet` (`TEXT`, nullable) to `document_chunks`.
     - Replaced `chunks` database view to include `dom_selector` and `text_snippet`.
     - One-time SQL backfill: `UPDATE document_chunks SET text_snippet = LEFT(chunk_text, 120) WHERE text_snippet IS NULL`.
2. **Ingestion & Chunking Pipeline**:
   - `backend/services/chunker.js`:
     - Natural paragraph splitting (`pageText.split(/\n\s*\n/)`).
     - Paragraph index matching for chunk start text.
     - First sentence extraction (`chunkString.trim().match(/^[^.!?\n]+[.!?]?/)`).
     - Automatic generation of `domSelector` JSON object (`type: 'text-match'`, `snippet: 80 chars`).
     - Generation of `textSnippet` (`chunkString.slice(0, 120)`).
   - `backend/services/knowledgeBase.js`:
     - Updated batch insertion statement and parameter bindings to populate `text_snippet` and `dom_selector`.
3. **Public Widget API Response**:
   - `ml-service/crawl_service/routes/widget.py`:
     - `public_widget_query()` retrieves `w.domain` from `chatbot_configs` + `websites`.
     - Queries `document_chunks` for retrieved `chunk_id`s to pull `page_url`, `page_title`, `dom_selector`, and `text_snippet`.
     - Filters `dom_selector` based on domain matching and deduplicates top chunk per unique `page_url`.
4. **Widget Highlighting Engine**:
   - `ml-service/crawl_service/static/widget-v1.js`:
     - `attemptVisualPointing(source, isManual)`: wrapped in `try-catch` for silent fallback.
     - `isDomainAllowed()`: host domain check with session-wide disable flag on mismatch.
     - `isSamePage()`: URL path normalization stripping query params and hashes.
     - Dynamic `<style id="sitemind-highlight-style">` injection with 3s keyframe pulse.
     - Automatic element cleanup at 3500ms and `<style>` tag removal at 4000ms.
     - Interactive sources container rendering with "View source" / "Go to source page" links.
     - Crosshair target button labeled `"Show on page"` with `cursor: pointer` for manual re-triggering.

### What Was SUBTRACTED / REPLACED
- **Replaced**: Static widget bot answer rendering was upgraded from plain text bubble to answer text + interactive sources section.
- **Replaced**: Backend widget endpoint returned plain `{ response, verified, sources: [] }` without metadata; now returns enriched sources with `dom_selector` and `text_snippet`.
- **Replaced**: Outdated `chunks` SQL view without selector columns was dropped and recreated with `dom_selector` and `text_snippet`.

---

## 4. Deep Technical Mechanics & Function Call Trace

### A. Selector Generation Trace (`backend/services/chunker.js`)
```javascript
// 1. Natural paragraph segmentation
const paragraphs = pageText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);

// 2. Chunker boundary generation
const chunkStrings = await splitter.splitText(pageText);

// 3. For each chunk:
const chunkStart = chunkString.trim().slice(0, 40).toLowerCase();
let paragraphIndex = paragraphs.findIndex(p => p.toLowerCase().includes(chunkStart));

const sentenceMatch = chunkString.trim().match(/^[^.!?\n]+[.!?]?/);
const firstSentence = sentenceMatch ? sentenceMatch[0].trim() : chunkString.trim();
const snippet = firstSentence.slice(0, 80).trim();

const domSelector = JSON.stringify({ type: 'text-match', snippet: snippet });
const textSnippet = chunkString.slice(0, 120);
```

### B. API Response Shape (`POST /api/widget/query`)
```json
{
  "status": "ok",
  "verified": true,
  "response": "SiteMind AI provides automated customer support chatbots.",
  "sources": [
    {
      "chunk_id": 239,
      "similarity": 0.89,
      "page_url": "https://example.com/about",
      "page_title": "About Us",
      "dom_selector": "{\"type\":\"text-match\",\"snippet\":\"SiteMind AI provides automated customer support chatbots.\"}",
      "text_snippet": "SiteMind AI provides automated customer support chatbots. The platform indexes websites and integrates with web widgets."
    }
  ]
}
```

### C. Host Highlighting & Timing Trace (`ml-service/crawl_service/static/widget-v1.js`)
1. **Target Identification**: Parses `source.dom_selector` JSON for `snippet`.
2. **Host Scan**: Iterates `document.querySelectorAll('p, li, h2, h3, h4, td, div')` checking `el.innerText.toLowerCase().includes(snippet.toLowerCase())`.
3. **Smooth Scroll**:
   ```javascript
   matchedEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
   ```
4. **Keyframe Animation**:
   ```css
   @keyframes sitemindHighlightPulse {
     0% {
       background-color: #FFF176 !important;
       background-color: rgba(255, 235, 59, 0.6) !important;
       box-shadow: 0 0 10px rgba(255, 235, 59, 0.7) !important;
     }
     100% {
       background-color: transparent !important;
       background-color: rgba(255, 235, 59, 0) !important;
       box-shadow: none !important;
     }
   }
   ```
5. **Garbage Collection**:
   - `setTimeout(() => matchedEl.classList.remove('sitemind-highlight-pulse'), 3500);`
   - `setTimeout(() => styleEl.parentNode.removeChild(styleEl), 4000);`

---

## 5. Comprehensive Imports Reference Table

| Import / Symbol | Source Library | Purpose / Role | Where Used (File & Function) | New or Existing |
| :--- | :--- | :--- | :--- | :--- |
| `RecursiveCharacterTextSplitter` | `@langchain/textsplitters` | Segments extracted text into 256-token windows with 32 overlap | `backend/services/chunker.js` (`chunkText`) | Existing |
| `sequelize` | `../models` | Manages PostgreSQL connection and executes raw SQL batch insertions | `backend/services/knowledgeBase.js` (`storePageChunks`) | Existing |
| `urlparse` | `urllib.parse` (stdlib) | Extracts netloc for cross-domain filtering and URL path comparison | `ml-service/crawl_service/routes/widget.py` (`public_widget_query`) | New |
| `get_db` | `crawl_service.db.connection` | Retrieves connection to query `document_chunks` and `websites` | `ml-service/crawl_service/routes/widget.py` (`public_widget_query`) | Existing |
| `requests` | `requests` | Dispatches query requests to internal backend RAG chat endpoint | `ml-service/crawl_service/routes/widget.py` (`public_widget_query`) | Existing |

---

## 6. Dependency & Environment Requirements

- **System Binaries**: None.
- **Node / Python Packages**: Zero new dependencies. Built 100% using existing packages (`@langchain/textsplitters`, `sequelize`, `urllib.parse`, `requests`).
- **Database Schema Migrations**:
  - Migration 22: `ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS text_snippet TEXT;`
  - Migration 22: Recreated view `chunks` including `dom_selector` and `text_snippet`.
  - Migration 22: Executed backfill updating 2,528 existing chunks.

---

## 7. Team Partner Verification & Quickstart

### 1. Verify Database Schema & Backfill
```bash
cd backend
node -e "const { sequelize } = require('./models'); (async () => {
  const [rows] = await sequelize.query('SELECT id, LEFT(chunk_text, 40) as chunk, text_snippet, dom_selector FROM document_chunks WHERE text_snippet IS NOT NULL LIMIT 3');
  console.log('Sample backfilled chunks:', rows);
  await sequelize.close();
})();"
```

### 2. Verify Chunker DOM Selector & Snippet Generation
```bash
cd backend
node -e "const { chunkText } = require('./services/chunker'); (async () => {
  const chunks = await chunkText('SiteMind AI provides smart widgets.\n\nHighlighting happens automatically on page load.', { pageUrl: 'https://example.com' });
  console.log('domSelector:', chunks[0].metadata.domSelector);
  console.log('textSnippet:', chunks[0].textSnippet);
})();"
```

### 3. Verify Widget Query Enrichment & Domain Mismatch Filtering
```bash
cd ml-service
python -c "from unittest.mock import patch, MagicMock; from crawl_service.app import create_app;
app = create_app(); client = app.test_client()
with patch('requests.post') as mock_post:
    mock_res = MagicMock()
    mock_res.status_code = 200
    mock_res.json.return_value = {'answer': 'Answer', 'verified': True, 'sources': [{'chunk_id': 239, 'similarity': 0.9}]}
    mock_post.return_value = mock_res
    res = client.post('/api/widget/query', json={'token': '6910f66a-2115-41f7-9517-00101482cd33', 'message': 'quotes'})
    print('Widget Response Sources:', res.get_json()['sources'])
"
```

### 4. Verify Widget Script Syntax
```bash
node --check ml-service/crawl_service/static/widget-v1.js
```
