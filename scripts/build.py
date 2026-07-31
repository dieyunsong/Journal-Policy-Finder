"""Assemble html/data/*.json from build/sources.jsonl + curated + TA CSV. Exits non-zero on validation errors."""
import csv, json, pathlib, sys
from collections import Counter
from scripts.build_index import build_index
from scripts.tags import tags_for, intern_tags
from scripts.ta_overlay import build_overlay
from scripts.validate import (
    validate_publishers, validate_ta, validate_publisher_ids, validate_crosswalk,
)

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "html/data"

def _load_jsonl(p): return [json.loads(l) for l in p.read_text().splitlines() if l.strip()]

def main():
    records = _load_jsonl(ROOT / "build/sources.jsonl")
    crosswalk = json.loads((ROOT / "scripts/crosswalk.json").read_text())
    taxonomy = json.loads((ROOT / "data/taxonomy.json").read_text())
    index = build_index(records)
    by_issnl = {r["issn_l"]: r for r in records}

    # Tags are interned to integer ids: the slug strings repeat across ~52k
    # journals and dominated the payload (31MB of 40MB) when stored inline.
    tag_ids: dict[str, int] = {}
    for e in index:
        slugs = tags_for(by_issnl[e["issn_l"]]["subfields"], crosswalk)
        e["tags"] = intern_tags(slugs, tag_ids)

    ta_rows = list(csv.DictReader((ROOT / "data/northwestern-agreements.csv").open()))
    overlay, unmatched = build_overlay(ta_rows, index)
    publishers = json.loads((ROOT / "data/publishers.json").read_text())

    errs = (
        validate_publishers(publishers)
        + validate_ta(overlay, index)
        + validate_publisher_ids(publishers, index)
        + validate_crosswalk(crosswalk, taxonomy)
    )
    if errs:
        print("BUILD FAILED:\n" + "\n".join(errs), file=sys.stderr)
        sys.exit(1)

    # Homepages for uncurated publishers, so a fallback card can still link out
    # instead of naming a publisher the researcher then has to go google.
    # Restricted to publishers that actually appear in the index.
    homepages_path = ROOT / "build/publishers.jsonl"
    homepages = {}
    if homepages_path.exists():
        in_index = {e["publisher"] for e in index}
        homepages = {
            r["id"]: r["homepage"]
            for r in _load_jsonl(homepages_path)
            if r["id"] in in_index
        }

    # Ship the id->slug table alongside the taxonomy so the browse UI can both
    # resolve interned ids and hide chips no journal actually carries.
    tag_list = [t for t, _ in sorted(tag_ids.items(), key=lambda kv: kv[1])]
    used = Counter(t for e in index for t in e["tags"])
    taxonomy_out = {
        "areas": taxonomy,
        "tag_list": tag_list,
        "tag_counts": {str(i): used[i] for i in range(len(tag_list)) if used[i]},
        "publisher_homepages": homepages,
    }

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "journals-index.json").write_text(json.dumps(index, separators=(",", ":")))
    (OUT / "publishers.json").write_text(json.dumps(publishers, separators=(",", ":")))
    (OUT / "ta-agreements.json").write_text(json.dumps(overlay, separators=(",", ":")))
    (OUT / "taxonomy.json").write_text(json.dumps(taxonomy_out, separators=(",", ":")))
    live = sum(1 for i in range(len(tag_list)) if used[i])
    print(f"OK: {len(index)} journals, {len(publishers)} publishers, {len(overlay)} TA journals; "
          f"{len(tag_list)} tags ({live} with journals); "
          f"{len(unmatched)} TA rows unmatched (see build/ta-unmatched.json)", file=sys.stderr)
    (ROOT / "build/ta-unmatched.json").write_text(json.dumps(unmatched, indent=2))

if __name__ == "__main__":
    main()
