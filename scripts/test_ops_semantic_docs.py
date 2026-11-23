"""Offline semantic Docs reader and immutable source-provenance checks."""
import hashlib
import io
import unittest
from unittest.mock import patch

from docs_semantic_read import (VALID_ROLES, INDEX_DOC_ID, extract_doc_text, read_doc_export,
                                parse_index, parse_contract, read_semantic_sources,
                                verify_registered_google_docs)

BASE = {
    "projects": ("17TTuqgoOGm64SzJrVFoJdA-CzkMO-UOduZJMxAhKNfI", "1JqzjBNBCT_AAIBkuGsIR5VBOJ3_HyifdPDc7K_jF5Bo", "projects"),
    "choices": ("1wkpB_qWkIE2ufRX4Z4G7EPczwjjfnclchItzb3doBhQ", "1tDpsphzARq-rk1MExU4DXC8mG_clh-0TXJwRr2qljXU", "project_publication_settings"),
    "messages": ("1xbHpXxJv4ggtzIQRV0_-W5vgS0DLvX62qgLP080d9q8", "1aWHzjEK0doiUcBbqhySiA6DWCp8d-aq2I08McslilAQ", "message_sources"),
    "notices": ("1_kLDSURXQyNPcVzzeJaDOYcvy2_fFiDnSIxC5xnpI2o", "1ZPtTos8t9Cym_qnpiUhiyuTxndSc6sGzzv390ahAw4I", "site_notifications"),
    "progress": ("1z2XKe1L_f8WjesGvtVlQC-WFQW-cjAbsfSfwRmfc7qU", "17YPRpaXIdHloH5-lzsjUpNvXLbsDfrIrlsn2jZ-7KKc", "project_work_items"),
    "organizations": ("1uMregAg_FvfGUP74FRGp-iFDEpt4VqGmWLSER_D95-M", "1cwubE_4nB2SAEdLu6ry80G0HeNjbBdu4X3DA6jrcQ1E", "organizations"),
    "directory": ("1yTrSrnK-HzaJ02415B2WhMyPBNxw0KfOmXw6AGxKIrE", "17y3ki0SLSG_Hmz8AipfWhhffnKastcjHvRqIdepJMu4", "00_SOURCE_DIRECTORY"),
}


class SemanticDocsTest(unittest.TestCase):
    def fixture(self):
        index = "INDEX_FORMAT=OPS_SEMANTIC_INDEX_V1\nMACHINE_INDEX_START\n"
        index += "\n".join("CONTRACT|" + role + "|" + "|".join(vals)
                           for role, vals in BASE.items()) + "\nMACHINE_INDEX_END"
        contents = {INDEX_DOC_ID: index}
        for role, (doc, book, tab) in BASE.items():
            contents[doc] = ("MACHINE_CONTRACT_START\n"
                             "SCHEMA_VERSION=OPS_SEMANTIC_V1\n"
                             "SOURCE_ROLE=" + role + "\n"
                             "SOURCE_SHEET_ID=" + book + "\n"
                             "SOURCE_TAB=" + tab + "\n"
                             "READ_POLICY=READ_ONLY\n"
                             "PUBLICATION_POLICY=FAIL_CLOSED\nMACHINE_CONTRACT_END")
        return contents

    def test_tabs_roundtrip(self):
        payload = {"tabs": [{"documentTab": {"body": {"content": [
            {"paragraph": {"elements": [{"textRun": {"content": "Site note\n"}}]}}]}}}]}
        self.assertEqual(extract_doc_text(payload), "Site note\n")

    def test_registry_matches_exact_seven_google_sheets(self):
        docs = self.fixture()
        sources, receipt = read_semantic_sources("fixture", VALID_ROLES,
                            fetcher=lambda doc_id, _: docs[doc_id])
        self.assertEqual(sources["projects"], BASE["projects"][1:])
        self.assertEqual(receipt["contract_count"], 7)

    def test_rejects_missing_contract_and_wrong_role(self):
        docs = self.fixture()
        with self.assertRaises(ValueError):
            parse_index(docs[INDEX_DOC_ID].replace("CONTRACT|notices|", "CONTRACT|bogus|"))
        with self.assertRaises(ValueError):
            parse_contract(docs[BASE["projects"][0]], "notices",
                           BASE["projects"][1], BASE["projects"][2])

    def test_reviewed_doc_quotes_are_not_completion(self):
        doc_id = "1Ubs7OVAMo2N_OloXedAHLzUEBxrKDo1CeByCvEwzenY"
        text = "SH-01 | MATERIAL: Delivery evidence pending.\n"
        tables = {
            "messages": [["Source ID", "Origin", "Saved Original",
                          "Source Message", "Source SHA256", "Source Version", "Text Bytes"],
                         ["SRC-01", "Google Doc",
                          "https://docs.google.com/document/d/" + doc_id + "/edit",
                          "https://docs.google.com/document/d/" + doc_id + "/edit",
                          hashlib.sha256(text.encode()).hexdigest(), "V000002", str(len(text.encode()))]],
            "notices": [["Notification ID", "Source ID", "Review State", "Publish", "Source Quote"],
                        ["NTF-01", "SRC-01", "Reviewed", True, "Delivery evidence pending."]],
        }
        f = lambda target, _: text if target == doc_id else ""
        receipt = verify_registered_google_docs(tables, "fixture", fetcher=f)
        self.assertEqual(receipt, {"registered_google_docs": 1, "quotes_verified": 1})
        tables["notices"][1][-1] = "Material delivered and approved."
        with self.assertRaises(ValueError):
            verify_registered_google_docs(tables, "fixture", fetcher=f)

    def test_drive_export_restores_line_endings_before_original_digest_check(self):
        url = "https://docs.google.com/document/d/" + INDEX_DOC_ID + "/edit"
        original = b"First line\nReviewed quote.\n\n"
        messages = [
            ["Source ID", "Origin", "Saved Original", "Source Message", "Source SHA256",
             "Source Version", "Text Bytes"],
            ["SRC-01", "Google Doc", url, url, hashlib.sha256(original).hexdigest(),
             "V000001", str(len(original))],
        ]
        notices = [
            ["Notification ID", "Source ID", "Review State", "Publish", "Source Quote"],
            ["NTF-01", "SRC-01", "Reviewed", True, "Reviewed quote."],
        ]
        tables = {"messages": messages, "notices": notices}
        exported = b"\xef\xbb\xbfFirst line\r\nReviewed quote."
        with patch("docs_semantic_read.urlopen", return_value=io.BytesIO(exported)):
            receipt = verify_registered_google_docs(tables, "fixture", fetcher=read_doc_export)
        self.assertEqual(receipt, {"registered_google_docs": 1, "quotes_verified": 1})

        with patch("docs_semantic_read.urlopen", return_value=io.BytesIO(exported.replace(b"First", b"Other"))):
            with self.assertRaisesRegex(ValueError, "digest mismatch"):
                verify_registered_google_docs(tables, "fixture", fetcher=read_doc_export)


if __name__ == "__main__":
    unittest.main()
