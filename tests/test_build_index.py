from scripts.build_index import build_index

def test_dedupes_by_issn_l_keeping_higher_works():
    recs = [
        {"name": "A", "issn_l": "1111-2222", "issns": ["1111-2222"], "publisher": "P1", "works_count": 100, "subfields": []},
        {"name": "A dup", "issn_l": "1111-2222", "issns": ["1111-2222"], "publisher": "P1", "works_count": 500, "subfields": []},
        {"name": "B", "issn_l": "5555-6666", "issns": ["5555-6666"], "publisher": "P9", "works_count": 80, "subfields": []},
    ]
    idx = build_index(recs)
    assert len(idx) == 2
    a = next(e for e in idx if e["issn_l"] == "1111-2222")
    assert a["works_count"] == 500 and a["name"] == "A dup"
    assert all(e["tags"] == [] for e in idx)

def test_drops_records_without_publisher():
    recs = [{"name": "X", "issn_l": "9999-9999", "issns": ["9999-9999"], "publisher": None, "works_count": 90, "subfields": []}]
    assert build_index(recs) == []
