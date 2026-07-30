"""Fetch OpenAlex journal sources into build/sources.jsonl. Thin loop; logic lives in openalex.py."""
import argparse, json, pathlib, sys, time
import requests
from scripts.openalex import keep_source, parse_source

BASE = "https://api.openalex.org/sources"
SELECT = "id,display_name,issn_l,issn,type,works_count,host_organization,host_organization_name,topics"
MAILTO = "dieyun.song@northwestern.edu"

def fetch(min_works: int, limit: int | None, out: pathlib.Path):
    out.parent.mkdir(parents=True, exist_ok=True)
    cursor, pages, written = "*", 0, 0
    with out.open("w") as f:
        while cursor:
            params = {
                "filter": f"type:journal,works_count:>{min_works - 1}",
                "select": SELECT, "per-page": 200, "cursor": cursor, "mailto": MAILTO,
            }
            r = requests.get(BASE, params=params, timeout=60)
            r.raise_for_status()
            body = r.json()
            for rec in body["results"]:
                if keep_source(rec, min_works):
                    f.write(json.dumps(parse_source(rec)) + "\n")
                    written += 1
            cursor = body["meta"].get("next_cursor")
            pages += 1
            if limit and pages >= limit:
                break
            time.sleep(0.1)
    print(f"wrote {written} journals across {pages} pages -> {out}", file=sys.stderr)

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--min-works", type=int, default=25)
    p.add_argument("--limit", type=int, default=None)
    p.add_argument("--out", type=pathlib.Path, default=pathlib.Path("build/sources.jsonl"))
    a = p.parse_args()
    fetch(a.min_works, a.limit, a.out)
