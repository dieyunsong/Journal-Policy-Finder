"""Fetch publisher homepage URLs from OpenAlex into build/publishers.jsonl.

The journal index only carries a publisher's id and display name, so an
uncurated publisher renders as a name with nothing to click. OpenAlex's
/publishers endpoint has homepage_url; this pulls it for every publisher so the
fallback card can at least send the researcher to the right website.

Thin network loop, same shape as fetch_openalex.py; the transform is trivial and
inline.
"""
import argparse, json, pathlib, sys, time
import requests

BASE = "https://api.openalex.org/publishers"
SELECT = "id,display_name,homepage_url"
MAILTO = "dieyun.song@northwestern.edu"


def fetch(out: pathlib.Path, limit: int | None = None):
    out.parent.mkdir(parents=True, exist_ok=True)
    cursor, pages, written = "*", 0, 0
    with out.open("w") as f:
        while cursor:
            params = {"select": SELECT, "per-page": 200, "cursor": cursor, "mailto": MAILTO}
            r = requests.get(BASE, params=params, timeout=60)
            r.raise_for_status()
            body = r.json()
            for rec in body["results"]:
                home = rec.get("homepage_url")
                if not home:
                    continue
                pid = (rec.get("id") or "").rstrip("/").split("/")[-1]
                if pid:
                    f.write(json.dumps({"id": pid, "homepage": home}) + "\n")
                    written += 1
            cursor = body["meta"].get("next_cursor")
            pages += 1
            if limit and pages >= limit:
                break
            time.sleep(0.1)
    print(f"wrote {written} publisher homepages across {pages} pages -> {out}", file=sys.stderr)


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--limit", type=int, default=None)
    p.add_argument("--out", type=pathlib.Path, default=pathlib.Path("build/publishers.jsonl"))
    a = p.parse_args()
    fetch(a.out, a.limit)
