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

## Archive batch 1

61 explicit historical files were copied into six readable native Google Docs; their full text, original paths and blob SHA/byte counts are preserved and readback matched. These are proposed for removal from the working tree, subject to PR validation and merge. Original Git baseline: `8f3ed0be4256ea4ee852ebff4c95b8b3d8218e8c`. No active workflow, current data, canonical source Sheet, or frozen branch is removed. Other archive files remain excluded from routine reading until backed up and validated.

- [Archived workflow versions](https://docs.google.com/document/d/1DQZEYMK5XST6ueSq2x6KoISIF8A6Za5qL2xoWKoPtfo/edit) — 3 original files
- [Archive packet 01](https://docs.google.com/document/d/1Fnky_7jnsKc1LczcXT9oCNKy7F36lDwhznRJx6-hKiI/edit) — 12 original files
- [Archive packet 02](https://docs.google.com/document/d/1vKbvw8XmvsQFswsw9e3xhoIa0FwhleHmwM3BLh-iDdA/edit) — 12 original files
- [Archive packet 03](https://docs.google.com/document/d/15bqUPmzQCoI5qYy0njv_D7dw0OnsWwb1rs9Fipf9P6o/edit) — 12 original files
- [Archive packet 04](https://docs.google.com/document/d/1mDMp523O4AxZCbc93AptryiXfplBgwhg6rgJzGLExRw/edit) — 10 original files
- [Archive packet 05](https://docs.google.com/document/d/1LM-lMjz2scLWPUlH6C0ssJSH6frdj51I_iN873LAbn4/edit) — 12 original files

Google Docs rate limit interrupted the next packet; no unverified copy qualifies for removal. No ZIP files created. For restoration, recover exact source from the original commit or the named packet.
