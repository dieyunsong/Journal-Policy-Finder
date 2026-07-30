"""Rank publishers by summed works_count to pick the curation set."""
from collections import defaultdict

def rank_publishers(records: list[dict], n: int = 200) -> list[dict]:
    agg: dict[str, dict] = defaultdict(lambda: {"total_works": 0, "journal_count": 0, "publisher_name": None})
    for r in records:
        pid = r.get("publisher")
        if not pid:
            continue
        a = agg[pid]
        a["total_works"] += r.get("works_count") or 0
        a["journal_count"] += 1
        a["publisher_name"] = a["publisher_name"] or r.get("publisher_name")
    rows = [{"publisher": pid, "publisher_name": a["publisher_name"],
             "total_works": a["total_works"], "journal_count": a["journal_count"]}
            for pid, a in agg.items()]
    rows.sort(key=lambda x: x["total_works"], reverse=True)
    return rows[:n]
