import unittest
from verify_site_capture_source import verify_headers


class CaptureSourceTest(unittest.TestCase):
    def test_expected_keys(self):
        verify_headers({
            "2_OPS_DAILY_PROGRESS": ["Date", "progress_event_id (PK)", "project_id (FK)"],
            "3_OPS_DAILY_READINESS": ["Work ID", "project_id (FK)"],
        })

    def test_missing_key_fails(self):
        with self.assertRaises(ValueError):
            verify_headers({"2_OPS_DAILY_PROGRESS": ["Date"]})
