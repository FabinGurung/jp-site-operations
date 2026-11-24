"""Read only the header rows of the transferred Fishtail source. Never emit site records."""
import json
import os
from urllib.parse import urlencode
from urllib.request import Request, urlopen

BOOK = "1-pE1d4uxytIZsKF8Tzu3eBDlXL4MLIYiGGvVoKMqo1k"
REQUIRED = {
    "2_OPS_DAILY_PROGRESS": {"project_id (FK)", "progress_event_id (PK)"},
    "3_OPS_DAILY_READINESS": {"project_id (FK)"},
}


def verify_headers(headers):
    for tab, required in REQUIRED.items():
        actual = {str(value).strip().casefold() for value in headers.get(tab, [])}
        if not {value.casefold() for value in required} <= actual:
            raise ValueError(f"Required source key header missing: {tab}")


def main():
    token = os.environ["GOOGLE_ACCESS_TOKEN"]
    query = urlencode([("ranges", f"'{tab}'!A1:AZ1") for tab in REQUIRED])
    url = f"https://sheets.googleapis.com/v4/spreadsheets/{BOOK}/values:batchGet?{query}"
    with urlopen(Request(url, headers={"Authorization": f"Bearer {token}"}), timeout=30) as response:
        result = json.load(response)["valueRanges"]
    if len(result) != len(REQUIRED):
        raise ValueError("Incomplete capture header response")
    verify_headers({tab: value.get("values", [[]])[0] for tab, value in zip(REQUIRED, result)})
    print("FISHTAIL_CAPTURE_HEADERS_PASS: two tabs; no site rows read")


if __name__ == "__main__":
    main()
