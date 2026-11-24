# Operations — active reading scope (24 November 2026)

This is a short navigation index, not another authority. For a normal Operations task, read only the relevant live sources and current files. Do not recursively read the whole repository.

- **Google Drive authority:** [Operations source root](https://drive.google.com/drive/folders/1w5piZ3Pkn0NJ1JeQI-hCdowYGyFOx6BR), [Start Here](https://docs.google.com/document/d/1mv-2L79uEmEIo9Xhkj3F5QDJKa6ZyFGljQ2-kF0lAJo/edit), [semantic master](https://docs.google.com/document/d/1tLhw31P5nrrexLpYKz7-05cKXRDfz4bWlvyNcQAAHs4/edit).
- **Live website:** https://fabingurung.github.io/jp-site-operations/
- **Production workflow:** `.github/workflows/operations-sheets-pages.yml` → `scripts/docs_semantic_read.py`, `scripts/sheets_read.py`, `scripts/notification_projection.py`, `scripts/publish_operations.py` → `publication/operations/` and generated Pages JSON. Gallery installation: `.github/source-gallery/`. Release and branch governance: `.github/workflows/operations-milestone-release.yml`, `ops/control/branch-lane-registry.json`. Read relevant current tests only.
- **Current changes:** `AGENTS.md`, `A7_MODULE.json`, `docs/operations/OPERATIONS_SOURCE_DECISIONS_MEMORY_WALL.md`, `ops/control/operations-source-decision-ledger.v1.json`.
- **Legacy validation/compatibility:** root HTML/CSV, `assets/`, `controls/`, `guide/`, `workspace/`, `site-operations/`, `ops/data/` and old scripts/workflows are not the seven-Sheet live data authority. Some are still referenced by validation or compatibility routes; inspect only for a specific maintenance task.
- **Archive:** all `99_VERSION_ARCHIVE` paths, frozen branches, old release notes and archive packets are excluded from routine AI reading. Inspect only when explicitly investigating history or restoring. [Drive archive](https://drive.google.com/drive/folders/1ZSjf4fC2P3UXpTpog_fDEb_GqYz3H9be). No private source permissions changed; Git history remains intact.

## Live inputs

The master semantic Doc registers the seven per-role semantic Docs. Actions verifies their contracts, reads the seven live Sheet tabs, and checks registered source Doc digests and reviewed quotes before publication. A registered source Doc may be an immutable POST snapshot. It does not fetch arbitrary Docs linked by the source directory/gallery. Source records and permission flags govern publication; do not infer completion.

| Role | Original live Sheet | Tab |
|---|---|---|
| projects | [Projects and Locations](https://docs.google.com/spreadsheets/d/1JqzjBNBCT_AAIBkuGsIR5VBOJ3_HyifdPDc7K_jF5Bo/edit) | projects |
| choices | [Website Display Choices](https://docs.google.com/spreadsheets/d/1tDpsphzARq-rk1MExU4DXC8mG_clh-0TXJwRr2qljXU/edit) | project_publication_settings |
| messages | [Message Sources](https://docs.google.com/spreadsheets/d/1aWHzjEK0doiUcBbqhySiA6DWCp8d-aq2I08McslilAQ/edit) | message_sources |
| notices | [Notification Instructions](https://docs.google.com/spreadsheets/d/1ZPtTos8t9Cym_qnpiUhiyuTxndSc6sGzzv390ahAw4I/edit) | site_notifications |
| progress | [Project Work](https://docs.google.com/spreadsheets/d/17YPRpaXIdHloH5-lzsjUpNvXLbsDfrIrlsn2jZ-7KKc/edit) | project_work_items |
| organizations | [Companies and Organizations](https://docs.google.com/spreadsheets/d/1cwubE_4nB2SAEdLu6ry80G0HeNjbBdu4X3DA6jrcQ1E/edit) | organizations |
| directory | [Website Publishing and Source Directory](https://docs.google.com/spreadsheets/d/17y3ki0SLSG_Hmz8AipfWhhffnKastcjHvRqIdepJMu4/edit) | 00_SOURCE_DIRECTORY |

## Historical archive — verified 24 November 2026

[Archive index](https://docs.google.com/document/d/1lgQRLux4dmNdvD0iaCiGTrU2gZOO1xzl9jBUucrPgfI/edit) — **191 original historical files**, 25 native Google Docs, 3,632,280 original bytes. Original paths, blob SHAs, byte counts and exact text are preserved. [Drive folder](https://drive.google.com/drive/folders/1ZSjf4fC2P3UXpTpog_fDEb_GqYz3H9be). Original pinned Git baseline: `8f3ed0be4256ea4ee852ebff4c95b8b3d8218e8c`. PR #53 removed 61 archived copies; R19 removes the remaining 130 verified copies. Do not read the archive index or any archive packet during ordinary AI work. Open a packet only for explicit restoration/history. No ZIPs, no changes to the original source Sheet/Doc records or permissions, no deletion of Git history, frozen branch refs or active compatibility/QA dependencies. The production task tree above remains the routine read scope.

Legacy notebook lineage QA verifies the pinned Git archive objects (exact blob hash), rather than loading retired snapshots into the current working tree. Routine AI work still excludes historical Git objects and Drive archive packets.

## Project sources and admission (24 November 2026)

[Company/project source index](https://docs.google.com/document/d/1mv-2L79uEmEIo9Xhkj3F5QDJKa6ZyFGljQ2-kF0lAJo/edit) contains 29 project-specific native Sheet/Doc pairs in [Fishtail](https://drive.google.com/drive/folders/1yyKNj1dbESxCxXSP_oqxmzzWfYIHYc40) (27) and [Rohini](https://drive.google.com/drive/folders/1HrbCyRN4gO-PwYLhDLw38fqaGenl0zvv) (2). PRJ-000030 is a retired alias and is excluded. The project workbooks are routing views, not duplicate source facts; signed-in AI reads the relevant project Doc and original register by project ID. Existing Sharada notifications Doc was moved without changing identity or content. New notes are not evidence of performed work.

Fishtail's original transferred workbook owns manual daily progress and readiness. Its `2_OPS_DAILY_PROGRESS` and `3_OPS_DAILY_READINESS` headers expose project_id (FK); progress also uses progress_event_id (PK). The control hub and intake are separate: intake is non-authoritative, hub admission is reviewed. Header-only readback in Actions verifies the transferred source without importing private rows. Public Maps, Progress and Notifications still consume their existing seven approved workbooks and reviewed Doc evidence; private source changes require reviewed promotion to the corresponding owner. No new automated raw-note publication, access grants or changes to the original workbook. Estimation retains financial, attendance, BBS and measurement ownership.

## Owner-requested refresh

Owner-directed notification mode: no scheduled polling; map defaults to reviewed notices, quiet project pins remain browseable. Site Scout is decorative, not a source status indicator. Current manually reviewed notices remain; no fabricated new notices or changes to original source records. ChatGPT reads the selected project Doc and linked Sheet on owner request, reconciles stable IDs and publication approval, then promotes approved source changes; Actions publishes on intentional code merges or manual workflow dispatch. Direct project workbook ingestion is not implemented; central owner Sheets and original reviewed Doc evidence still govern. Private source notes are never published wholesale.
