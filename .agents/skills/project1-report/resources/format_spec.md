# Project I (4IT31) — Report Format Specification

Source: `report-content/Content format-projectI.docx`, `Cover Page format-projectI.docx`,
`Certificate format_projectI.docx`. This file is the authoritative transcription of those
documents. When the templates change, update this file **and** `scripts/generate_report.py`.

---

## 1. Physical submission

- Report must be **Spiral Bound**.
- The **first page is the Cover Page**.
- The report must **not contain Borders** (interpreted as page/section/paragraph borders —
  standard table gridlines are retained so data tables remain readable).

## 2. Front matter — exact order

Page numbers from **Certificate page through List of Abbreviations** use **Roman numerals
(I, II, …)**. Body page numbers start at **Chapter 1** with **Arabic numerals (1, 2, …)**.

1. Cover Page (as per given format)
2. Certificate (as per given format)
3. Certificate of completion from Industry with authorised signature — **only if IDP**
4. Acknowledgement
5. Abstract
6. List of Figures
7. List of Tables
8. List of Abbreviations
9. Table of Contents — **must list Chapter 1 onwards** with page numbers

> Interpretation recorded by this skill: the Table of Contents is treated as continuous
> front matter and numbered in Roman numerals. Toggle with `toc_roman: true|false` in the
> content front matter if the department mandates otherwise.

## 3. Chapter sequence (fixed)

```
Chapter 1: Introduction
  1.1 Brief overview of the work
  1.2 Objective
  1.3 Scope
  1.4 Project Modules
  1.5 Project Hardware/Software Requirements

Chapter 2: Literature Review
  (all literature referred during the project work, with citations, in proper sequence)

Chapter 3: System Analysis & Design
  3.1 Comparison of Existing Applications with your Project (merits and demerits)
  3.2 Project Feasibility Study
  3.3 Project Timeline chart
  3.4 Detailed Modules Description
  3.5 Project SRS
    3.5.1 Use Case Diagrams
    3.5.2 Data Flow Diagrams
    3.5.3 Class Diagram
    3.5.4 Entity Relationship Diagrams
    3.5.5 Sequence Diagrams
    3.5.6 State/Activity Diagram (whichever is applicable)
  3.6 Data Dictionary

Chapter 4: Implementation and Testing
  4.1 User Interface and Snapshot
  4.2 Testing using Use Cases

Chapter 5: Conclusion & Future Work

Chapter 6: References
  (full URL if web link; IEEE format for research articles)

Paper Publication (if any)
```

## 4. Typography & layout

| Element | Rule |
| --- | --- |
| Body / everything | **Times New Roman** |
| Main heading (H1) | 18 pt, **Bold** |
| Sub heading (H2) | 14 pt, **Bold** |
| Sub-sub heading (H3) | 12 pt, **Bold** *(convention — not defined in source spec)* |
| Body / content | 12 pt |
| Alignment | **Justified** |
| Line spacing | **1.5** |
| Header | Left: `Student ID. No.`  ·  Right: `Project Title` |
| Footer | Right: page number |
| Borders | none |

## 5. Cover page (as per given format — exact extraction)

Times New Roman. All lines centered. Sizes in points.

| Line | Text | Size | Bold |
| --- | --- | --- | --- |
| — | BVM logo (`assets/logo_cover.png`, 1.24in × 1.18in) | — | — |
| 1 | A | 14 | Y |
| 2 | PROJECT REPORT | 14 | Y |
| 3 | ON | 14 | Y |
| 4 | `<PROJECT TITLE>` | 18 | Y |
| 5 | *(blank spacer)* | — | — |
| 6 | Submitted by | 14 | Y |
| 7 | `<Student 1> (<ID 1>)` | 16 | Y |
| 8 | `<Student 2> (<ID 2>)` | 16 | Y |
| 9 | *(blank spacer)* | — | — |
| 10 | For Partial Fulfillment of the Requirements for Bachelor of Technology in Information Technology | 12 | Y |
| 11 | Guided by | 14 | Y |
| 12 | `<Guide Name>` | 14 | Y |
| 13 | *(blank spacer)* | — | — |
| 14 | `<Month, Year>` (cover date) | 14 | Y |
| 15 | *(blank spacer)* | — | — |
| 16 | Information Technology Department | 14 | Y |
| 17 | Birla Vishvakarma Mahavidyalaya Engineering College | 14 | Y |
| 18 | (An Autonomous Institution) | 14 | Y |
| 19 | Vallabh Vidyanagar - 388120 | 14 | Y |
| 20 | Gujarat, INDIA | 14 | Y |

## 6. Certificate page (as per given format — exact extraction)

Two borderless tables + headings, all Times New Roman.

**Header table** — 2 columns, widths 2977 / 6946 twips, fixed layout, no borders, 1.5 spacing:
- Col 1: BVM logo (`assets/logo_certificate.png`, 1.64in × 1.56in)
- Col 2 (centered, 14 pt, bold):
  - `Birla Vishvakarma Mahavidyalaya Engineering College`
  - `(An Autonomous Institution)`
  - `Information Technology Department`
  - `AY: <academic_year>, Semester <semester>`

Then:
- `CERTIFICATE` — centered, **26 pt, not bold**
- Body paragraph — **justified, 14 pt**, with these spans **bold**:
  the project title, the student names with IDs, and `Project I (4IT31)`. Full text:
  > This is to certify that the project work entitled **`<TITLE>`** has been successfully
  > carried out by **`<Student 1> (<ID 1>) and <Student 2> (<ID 2>)`** for the subject
  > **Project I (4IT31)** during the academic year `<AY>`, Semester-`<SEM>` for partial
  > fulfilment of Bachelor of Technology in Information Technology. The work carried out
  > during the semester is satisfactory.
- Blank spacer lines
- **Signature table** — 2 columns (5223 / 5152 twips), centered, 12 pt, bold:
  - Col 1: `<Guide Name>` / `IT Department` / `BVM`
  - Col 2: `<HOD Name>` / `Head, IT Department` / `BVM`

## 7. Page geometry

- Page: **A4** (11907 × 16839 twips / 8.27in × 11.69in), portrait.
- Margins: top 1in, right 1in, bottom 1in, left 1.25in.
- Header distance 0.5in, footer distance 0.5in.
- Default document font (from `docDefaults`): Times New Roman, 12 pt (sz=24 half-points).

## 8. Front-matter page titles

Rendered with direct formatting (18 pt bold, centered) — **not** Word Heading styles, so they
**do not** appear in the Table of Contents (spec: TOC lists Chapter 1 onwards only).

- `ACKNOWLEDGEMENT`
- `ABSTRACT`
- `LIST OF FIGURES`  → auto field `TOC \f F`
- `LIST OF TABLES`   → auto field `TOC \f T`
- `LIST OF ABBREVIATIONS` → static 2-column list
- `TABLE OF CONTENTS` → auto field `TOC \o "1-3"`
