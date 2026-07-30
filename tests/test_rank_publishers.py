from scripts.rank_publishers import rank_publishers

RECS = [
    {"publisher": "P1", "publisher_name": "Wiley", "works_count": 1200, "issn_l": "a"},
    {"publisher": "P1", "publisher_name": "Wiley", "works_count": 300, "issn_l": "b"},
    {"publisher": "P9", "publisher_name": "Tiny", "works_count": 80, "issn_l": "c"},
]

def test_aggregates_and_ranks():
    out = rank_publishers(RECS, n=200)
    assert out[0] == {"publisher": "P1", "publisher_name": "Wiley", "total_works": 1500, "journal_count": 2}
    assert out[1]["publisher"] == "P9"

def test_respects_n():
    assert len(rank_publishers(RECS, n=1)) == 1
