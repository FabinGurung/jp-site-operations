"""Read-only, fail-closed semantic Google Docs adapter for Operations Pages.

Google Sheets remain the row-data authority. Semantic Docs provide an indexed,
versioned interpretation contract; reviewed Google Doc originals are checked
against the source register before notice text can enter public JSON.
No free-text AI execution, edits, code generation, or arbitrary URL fetching.
"""
import hashlib
import json
import os
import re
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

INDEX_DOC_ID = "1tLhw31P5nrrexLpYKz7-05cKXRDfz4bWlvyNcQAAHs4"
DOC_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{20,}$")
VALID_ROLES = frozenset({
    "projects", "choices", "messages", "notices",
    "progress", "organizations", "directory",
})


def _body_text(content):
    sections = []
    for element in content:
        para = element.get("paragraph")
        if para:
            for run in para.get("elements", []):
                sections.append(run.get("textRun", {}).get("content", ""))
        table = element.get("table")
        if table:
            for row in table.get("tableRows", []):
                for cell in row.get("tableCells", []):
                    sections.append(_body_text(cell.get("content", [])))
    return "".join(sections)


def extract_doc_text(payload):
    """Extract the exact paragraph text from Google Docs (including tabbed Docs)."""
    tabs = payload.get("tabs")
    if tabs:
        def walk(items):
            chunks = []
            for tab in items:
                chunks.append(_body_text(tab.get("documentTab", {}).get("body", {}).get("content", [])))
                chunks.extend(walk(tab.get("childTabs", [])))
            return chunks
        content = "".join(walk(tabs))
    else:
        content = _body_text(payload.get("body", {}).get("content", []))
    if not content.strip():
        raise ValueError("Empty semantic Google Doc")
    return content


def read_doc(doc_id, token):
    if not DOC_ID_PATTERN.fullmatch(doc_id):
        raise ValueError("Invalid Google Doc file identity")
    if not token:
        raise ValueError("Google Docs read-only access token missing")
    uri = "https://docs.googleapis.com/v1/documents/" + doc_id + "?includeTabsContent=true"
    try:
        with urlopen(Request(uri, headers={"Authorization": "Bearer " + token}), timeout=30) as response:
            payload = json.load(response)
    except HTTPError as error:
        if error.code != 403:
            raise RuntimeError(f"Google Doc read failed ({error.code})") from None
        return read_doc_export(doc_id, token)
    except (URLError, TimeoutError) as error:
        raise RuntimeError(f"Google Doc read failed ({type(error).__name__})") from None
    return extract_doc_text(payload)


def read_doc_export(doc_id, token):
    """Use the read-only Drive export if the Docs endpoint rejects this reader."""
    uri = ("https://www.googleapis.com/drive/v3/files/" + doc_id
           + "/export?mimeType=text%2Fplain")
    try:
        with urlopen(Request(uri, headers={"Authorization": "Bearer " + token}), timeout=30) as response:
            raw = response.read(2_000_001)
    except (HTTPError, URLError, TimeoutError) as error:
        code = getattr(error, "code", type(error).__name__)
        raise RuntimeError(f"Google Doc export failed ({code})") from None
    if len(raw) > 2_000_000:
        raise ValueError("Semantic Google Doc export is too large")
    text = raw.decode("utf-8-sig")
    if not text.strip():
        raise ValueError("Empty semantic Google Doc export")
    return text


def _block(text, begin, end):
    if text.count(begin) != 1 or text.count(end) != 1:
        raise ValueError("Missing or duplicate semantic contract boundary")
    middle = text.split(begin, 1)[1].split(end, 1)[0]
    if not middle.strip():
        raise ValueError("Empty semantic contract")
    return middle


def parse_index(text):
    if "INDEX_FORMAT=OPS_SEMANTIC_INDEX_V1" not in text:
        raise ValueError("Unexpected semantic index version")
    entries = {}
    for line in _block(text, "MACHINE_INDEX_START", "MACHINE_INDEX_END").splitlines():
        line = line.strip()
        if not line:
            continue
        fields = line.split("|")
        if len(fields) != 5 or fields[0] != "CONTRACT":
            raise ValueError("Malformed semantic source index line")
        _, role, doc_id, sheet_id, tab = fields
        if role not in VALID_ROLES or role in entries:
            raise ValueError("Unapproved or duplicate semantic source role")
        if not DOC_ID_PATTERN.fullmatch(doc_id) or not DOC_ID_PATTERN.fullmatch(sheet_id):
            raise ValueError("Invalid semantic source file identity")
        if not re.fullmatch(r"[A-Za-z0-9_]+", tab):
            raise ValueError("Invalid semantic source tab")
        entries[role] = (doc_id, sheet_id, tab)
    if set(entries) != VALID_ROLES:
        raise ValueError("Incomplete semantic source index")
    return entries


def parse_contract(text, role, book, tab):
    entries = {}
    for line in _block(text, "MACHINE_CONTRACT_START", "MACHINE_CONTRACT_END").splitlines():
        line = line.strip()
        if not line:
            continue
        if line.count("=") != 1:
            raise ValueError("Malformed source semantic declaration")
        key, value = line.split("=", 1)
        if key in entries:
            raise ValueError("Duplicate semantic contract field")
        entries[key] = value
    required = {
        "SCHEMA_VERSION": "OPS_SEMANTIC_V1",
        "SOURCE_ROLE": role,
        "SOURCE_SHEET_ID": book,
        "SOURCE_TAB": tab,
        "READ_POLICY": "READ_ONLY",
        "PUBLICATION_POLICY": "FAIL_CLOSED",
    }
    if entries != required:
        raise ValueError("Unapproved or inconsistent semantic Google Doc contract")


def read_semantic_sources(token, expected_roles, fetcher=read_doc):
    """Read 8 Google Docs. The live index controls source IDs; no data rows in Git."""
    index = parse_index(fetcher(INDEX_DOC_ID, token))
    if set(index) != set(expected_roles):
        raise ValueError("Semantic index roles mismatch publisher")
    source_map = {}
    for role in sorted(index):
        doc_id, book, tab = index[role]
        parse_contract(fetcher(doc_id, token), role, book, tab)
        source_map[role] = (book, tab)
    return source_map, {"status": "GOOGLE_DOCS_VERIFIED",
                        "contract_count": len(source_map),
                        "schema_version": "OPS_SEMANTIC_V1"}


def _docs_id(url):
    u = urlparse(str(url))
    match = re.fullmatch(r"/document/d/([A-Za-z0-9_-]+)/(?:edit|view)", u.path)
    if u.scheme != "https" or u.netloc != "docs.google.com" or not match:
        raise ValueError("Source snapshot is not a native Google Doc URL")
    doc_id = match[1]
    if not DOC_ID_PATTERN.fullmatch(doc_id):
        raise ValueError("Invalid native Google Doc identity")
    return doc_id


def verify_registered_google_docs(tables, token, fetcher=read_doc):
    """Check reviewed original POST Doc bytes and all published source quotes.

    Only source-registered saved originals are fetched; never crawl arbitrary
    document links from a public page, a chat, or a service response.
    """
    from sheets_read import records
    originals = {}
    for row in records(tables["messages"], "source_id", "origin", "saved_original",
                       "source_sha256", "source_version"):
        if row["origin"].strip().lower() != "google doc":
            continue
        doc_id = _docs_id(row["saved_original"])
        _docs_id(row["source_message"])
        source_text = fetcher(doc_id, token)
        digest = hashlib.sha256(source_text.encode("utf-8")).hexdigest()
        if digest != row["source_sha256"].lower():
            raise ValueError("Reviewed Google Doc source digest mismatch")
        byte_count = str(len(source_text.encode("utf-8")))
        if row.get("text_bytes") and row["text_bytes"] != byte_count:
            raise ValueError("Reviewed Google Doc byte count mismatch")
        originals[row["source_id"]] = source_text
    count = 0
    for row in records(tables["notices"], "notification_id", "source_id"):
        if row["source_id"] not in originals:
            continue
        if row.get("review_state", "").lower() != "reviewed" or row.get("publish", "").upper() != "TRUE":
            continue
        quote = " ".join(row.get("source_quote", "").split())
        haystack = " ".join(originals[row["source_id"]].split())
        if not quote or quote not in haystack:
            raise ValueError("Published site notice not grounded in reviewed Google Doc")
        count += 1
    return {"registered_google_docs": len(originals), "quotes_verified": count}
