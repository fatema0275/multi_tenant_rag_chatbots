---
name: project1-report
description: >-
  Use this skill whenever producing, updating, or regenerating the Project I (4IT31) spiral-bound
  project report for the multi-tenant RAG chatbot (SiteMind) in this repository. It encodes the
  department's fixed cover page, certificate, chapter sequence and typography, drafts the full
  chapter content grounded in this repo's modules, and compiles everything into a formatted .docx
  (Times New Roman, header/footer, Roman+Arabic page numbering, auto TOC / List of Figures / List of
  Tables) in one go.
---

# Project I (4IT31) Report Generator

Generates the complete Project I report for **Isolated Multi-Tenant RAG Chatbot with Entailment
based Hallucination Filtering** as a single, submission-ready `.docx` that matches the department's
mandated format, using content grounded in this repository.

## The two inputs

1. **Format authority** — [`resources/format_spec.md`](./resources/format_spec.md). Exact
   transcription of `report-content/Content format-projectI.docx`,
   `Cover Page format-projectI.docx` and `Certificate format_projectI.docx`. **Read it first.**
   If a template changes, update the spec *and* `scripts/generate_report.py`.
2. **Content source** — `report/content.md`. Structured Markdown with YAML front matter. If it
   does not exist, copy [`resources/content_template.md`](./resources/content_template.md) to
   `report/content.md` and fill it in (see the marker reference at the top of the template).

## Workflow

1. **Read the format authority** (`resources/format_spec.md`) so chapter order and typography are
   never guessed.
2. **Build/refresh `report/content.md`**, grounding each chapter in the repository (see the
   *Grounding map* below). Never invent facts about the system; cite the actual files.
3. **Compile** with the generator:

   ```powershell
   python .agents/skills/project1-report/scripts/generate_report.py `
       report/content.md -o report/Project_I_Report.docx `
       --cover-template "report-content/Cover Page format-projectI.docx" `
       --certificate-template "report-content/Certificate format_projectI.docx"
   ```

   The two `--*-template` options default to those exact paths, so they can be omitted.
   Requires `python-docx`, `docxcompose` and `PyYAML`
   (`pip install python-docx docxcompose pyyaml`).

   **The cover page and certificate are _not_ rebuilt.** The original template `.docx`
   files are copied into the output verbatim with `docxcompose`, so their exact fonts,
   spacing, logo and layout are preserved byte-for-byte. The generator only adds the
   front-matter body, chapters, header/footer and page numbering.

4. **Verify** (see *Verification*). Regeneration is idempotent: edit `content.md`, rerun the
   command, and the whole document is rebuilt.

## Fixed structure the generator produces

Front matter (Roman numerals starting at `i` on the Acknowledgement; the cover and certificate
pages carry no header/footer and no visible page number):
Cover → Certificate → Acknowledgement → Abstract → List of Figures → List of Tables →
List of Abbreviations → Table of Contents.

Body (Arabic numerals restarting at 1):
Ch 1 Introduction (1.1–1.5) → Ch 2 Literature Review → Ch 3 System Analysis & Design
(3.1–3.6, incl. 3.5.1–3.5.6) → Ch 4 Implementation & Testing (4.1–4.2) → Ch 5 Conclusion &
Future Work → Ch 6 References → Paper Publication.

- The **industry certificate page is omitted** unless `is_idp: true` (this project is not an IDP).
- The **TOC lists Chapter 1 onwards** only (front-matter titles use direct formatting, not Heading
  styles, so they stay out of the TOC).
- List of Figures / List of Tables are generated from hidden Word `TC` fields + `TOC \f` fields,
  so they carry real page numbers after Word updates the fields (the generator sets
  `updateFields=true`, so Word refreshes on open — press `Ctrl+A` then `F9` if needed).

## Diagram policy (figures)

Diagrams are **not** drawn by this skill yet. A `[[FIG x.y | Caption]]` marker emits:

- a grey placeholder line `(Insert Figure x.y here)` (replace it with the image later),
- the bold centred caption `Figure x.y: Caption`,
- the italic description/legend that follows as a `> blockquote`.

To add diagrams later, drop the PNG/SVG into `report/figures/` and replace the placeholder
paragraph in `report/content.md` (or in Word) with the image. Figure/table numbering is manual
(`3.1`, `4.2`, …) and must stay consistent with the captions.

## Grounding map — where content comes from

| Report section | Source of truth in this repo |
| --- | --- |
| 1.1–1.3, Abstract | `README.md`, `docs/ADMIN_ANALYTICS_HANDOFF_SUMMARY.md` |
| 1.4 Project Modules | `docs/IMPLEMENTATION_CHECKLIST.md`, `doc/MODULE*.txt`, handoffs in `doc/` |
| 1.5 Hardware/Software Requirements | `README.md`, `DEPLOYMENT.md`, `*/package.json`, `*/requirements*.txt` |
| 2 Literature Review | verified external literature (IEEE format); verify every citation with web search — **never fabricate** |
| 3.1 Existing-application comparison | generic SaaS chatbot competitors vs. this repo's isolation/entailment design |
| 3.4 / 3.5 Module & SRS detail | `backend/routes/*`, `backend/services/*`, `ml-service/crawl_service/**`, `services/embedding-service/main.py` |
| 3.5.x diagrams | describe actors/flows from the code; render captions + descriptions now, images later |
| 3.6 Data Dictionary | `backend/migrations/*.js` (final schema) + `backend/models/*` |
| 4.1 UI snapshots | `frontend/src/pages/*`, `frontend/src/components/**`, `ml-service/crawl_service/static/widget-v1.js` |
| 4.2 Testing | `backend/test-api.js`, `backend/scripts/test_module5.js`, `ml-service/test_flask_admin_analytics.py`, `scripts/test*.js` |
| 5 Conclusion & Future Work | `docs/`, `doc/` roadmap notes + known gaps |
| 6 References | IEEE format; full URL for web links |

## Marker reference (used inside `content.md`)

| Marker | Effect |
| --- | --- |
| `# Chapter N: Title` | H1 (18 pt bold) → appears in TOC |
| `## x.y Title` | H2 (14 pt bold) |
| `### x.y.z Title` | H3 (12 pt bold) |
| `[[FIG x.y \| Caption]]` + `> description` | figure placeholder + caption + legend |
| `[[TABLE x.y \| Caption]]` above a pipe table | table caption + List-of-Tables entry |
| `[[PAGEBREAK]]` | force a page break |
| `[[FM:ACKNOWLEDGEMENT]]` / `[[FM:ABSTRACT]]` / `[[FM:ABBREVIATIONS]]` | front-matter blocks (abbreviations is a `\| Abbr \| Full Form \|` table) |
| `[[BODY]]` | marks the start of the chapter body |
| `**bold**`, `*italic*`, `` `code` `` | inline formatting |
| `- item` | bullet list |
| `[1] …` | hanging-indent reference entry |

## Typography (enforced by the generator)

Times New Roman throughout; H1 18 pt bold, H2 14 pt bold, H3 12 pt bold, body 12 pt; justified;
1.5 line spacing; no page borders. Header: left = student IDs, right = project title (a borderless
two-column table so the two sit far apart). Footer: right = page number. A4, 1 in top/right/bottom,
1.25 in left. **The cover page and certificate are pulled straight from the provided template
files** and are not regenerated. The generator forces `Times New Roman` in the merged document's
theme, styles and defaults (`force_times_new_roman`) so no Calibri/Cambria leaks in from Word theme
fonts.

## Verification

After generating, confirm:

```powershell
python -c "from docx import Document; d=Document('report/Project_I_Report.docx'); print(len(d.sections),'sections'); print(round(d.sections[0].page_width/914400,2),'in wide'); import zipfile; z=zipfile.ZipFile('report/Project_I_Report.docx'); print([n for n in z.namelist() if 'media' in n])"
```

Then open the `.docx` in Word:

1. Allow fields to update (or `Ctrl+A` then `F9`) so TOC / List of Figures / List of Tables fill in.
2. Check the cover and certificate render exactly like the provided templates (logo, spacing).
3. Check front matter shows `i, ii, …` and Chapter 1 restarts at `1`.
4. Spot-check fonts (Times New Roman), sizes (18/14/12), justified body, 1.5 spacing, header/footer.

**Visual QA (optional, Word installed).** To actually see the result, export it to PDF with Word
automation and rasterise the pages, then view the images:

```python
import win32com.client as win32
app = win32.DispatchEx("Word.Application"); app.Visible = False
doc = app.Documents.Open(r"<abs .docx>", ReadOnly=True, AddToRecentFiles=False)
doc.Fields.Update()
for i in range(1, doc.TablesOfContents.Count + 1): doc.TablesOfContents(i).Update()
doc.ExportAsFixedFormat(r"<abs .pdf>", 17)  # 17 = wdExportFormatPDF
doc.Close(False); app.Quit()
# then rasterise with PyMuPDF: fitz.open(pdf).load_page(i).get_pixmap(dpi=110).save(...)
```

## Recorded interpretations (adjust if the department says otherwise)

- **No borders** = no page/section/paragraph borders; data tables keep standard gridlines.
- The **Table of Contents** is numbered as continuous front matter (Roman). Set `toc_roman: false`
  in the front matter if it must restart, and adjust the generator section split accordingly.
- **H3 (x.y.z)** has no size in the source spec; 12 pt bold is used by convention.
- Front-matter titles are centred rather than left-aligned (source spec is silent).
