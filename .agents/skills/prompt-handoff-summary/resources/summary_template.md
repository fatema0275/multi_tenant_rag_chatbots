# [Module Name / Prompt Title] — Technical Handoff Summary

**Date / Timestamp**: YYYY-MM-DD  
**Target Module**: [e.g., Module 2: Crawler & Extraction Pipeline]  
**Primary Developer / Pair**: Antigravity & User  
**Status**: [Complete / Tested / Ready for Merge]  

---

## 1. Executive Summary & Objective

- **Prompt Goal**: [Concise statement of what was requested]
- **Key Outcome**: [What changed and why it matters for the application]
- **Touched Modules**:
  - `[service/subsystem]`: [Specific modification]
  - Untouched: [List modules explicitly kept intact to ensure safety]

---

## 2. Code Delta: Added vs. Subtracted / Replaced

### What was ADDED:
- `[file_path]`:
  - `[function_name()]`: [Details on what it does]
  - `[new logic/constant]`: [Thresholds, routes, enums]

### What was SUBTRACTED / REPLACED:
- `[file_path]`:
  - `[old_function() / old_logic]`: [Explain why and how it was replaced]
  - [Deprecations or removed branches]

---

## 3. Deep Technical Mechanics & Function Call Trace

### Detailed Workflow:
1. **[Step 1]**: [Technical description, input types, buffers]
2. **[Step 2 — Core Execution]**:
   - `[exact_function_call()]`: [Explain parameters, memory handling, e.g. BytesIO, DPI=200, regex/thresholds]
3. **[Step 3 — Routing & Outcomes]**:
   - State transition and status codes returned.

---

## 4. Comprehensive Imports Reference Table

| Import / Symbol | Source Library | Purpose / Role | Where Used (File & Function) | New or Existing |
| :--- | :--- | :--- | :--- | :--- |
| `[symbol]` | `[package]` | [Why it's needed] | `[file.py]` (`[function]`) | [New / Existing] |

---

## 5. System, Database & Environment Dependencies

- **OS / System Packages (apt/brew)**:
  ```bash
  sudo apt install -y [packages]
  ```
- **Package Manifest Changes (`requirements.txt` / `package.json`)**:
  ```txt
  [package_name]==[version]
  ```
- **Database Schema / Migration**:
  - Migration: `[migration_filename]`
  - Enums/Columns added: `[details]`

---

## 6. Team Partner Verification & Quickstart

```bash
# Test command
[command]
```
- **Expected Outcome**: `[output description]`
- **System Limitations**: `[Any edge cases, limitations, or caveats]`
