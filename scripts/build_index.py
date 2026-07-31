"""Build the deduplicated journal lookup index from parsed OpenAlex records."""

def build_index(records: list[dict]) -> list[dict]:
    best: dict[str, dict] = {}
    for r in records:
        if not r.get("publisher") or not r.get("issn_l"):
            continue
        key = r["issn_l"]
        if key not in best or r["works_count"] > best[key]["works_count"]:
            best[key] = {
                "name": r["name"], "issn_l": r["issn_l"], "issns": r["issns"],
                "publisher": r["publisher"], "publisher_name": r.get("publisher_name"),
                "works_count": r["works_count"], "tags": [],
            }
    return sorted(best.values(), key=lambda e: (e["name"] or "").lower())
