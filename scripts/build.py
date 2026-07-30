"""Assemble html/data/*.json from build/sources.jsonl + curated + TA CSV. Exits non-zero on validation errors."""
import csv, json, pathlib, sys
from scripts.build_index import build_index
from scripts.tags import tags_for
from scripts.ta_overlay import build_overlay
from scripts.validate import validate_publishers, validate_ta

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "html/data"

def _load_jsonl(p): return [json.loads(l) for l in p.read_text().splitlines() if l.strip()]

def main():
    records = _load_jsonl(ROOT / "build/sources.jsonl")
    crosswalk = json.loads((ROOT / "scripts/crosswalk.json").read_text())
    index = build_index(records)
    by_issnl = {r["issn_l"]: r for r in records}
    for e in index:
        e["tags"] = tags_for(by_issnl[e["issn_l"]]["subfields"], crosswalk)
    ta_rows = list(csv.DictReader((ROOT / "data/northwestern-agreements.csv").open()))
    overlay, unmatched = build_overlay(ta_rows, index)
    publishers = json.loads((ROOT / "data/publishers.json").read_text())

    errs = validate_publishers(publishers) + validate_ta(overlay, index)
    if errs:
        print("BUILD FAILED:\n" + "\n".join(errs), file=sys.stderr)
        sys.exit(1)

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "journals-index.json").write_text(json.dumps(index, separators=(",", ":")))
    (OUT / "publishers.json").write_text(json.dumps(publishers, separators=(",", ":")))
    (OUT / "ta-agreements.json").write_text(json.dumps(overlay, separators=(",", ":")))
    (OUT / "taxonomy.json").write_text((ROOT / "data/taxonomy.json").read_text())
    print(f"OK: {len(index)} journals, {len(publishers)} publishers, {len(overlay)} TA journals; "
          f"{len(unmatched)} TA rows unmatched (see build/ta-unmatched.json)", file=sys.stderr)
    (ROOT / "build/ta-unmatched.json").write_text(json.dumps(unmatched, indent=2))

if __name__ == "__main__":
    main()
