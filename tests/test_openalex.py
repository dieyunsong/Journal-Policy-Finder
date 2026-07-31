import json, pathlib
from scripts.openalex import keep_source, parse_source

FIX = json.loads((pathlib.Path(__file__).parent / "fixtures/openalex_sources.json").read_text())
S100, S200, S300, S400 = FIX

def test_keep_source_filters():
    assert keep_source(S100) is True
    assert keep_source(S200) is True          # 80 >= 25
    assert keep_source(S300) is False         # 10 < 25
    assert keep_source(S400) is False         # repository, no issn_l

def test_parse_source_shapes_record():
    out = parse_source(S100)
    assert out["name"] == "Journal of Widget Science"
    assert out["issn_l"] == "1111-2222"
    assert out["issns"][0] == "1111-2222" and "3333-4444" in out["issns"]
    assert out["publisher"] == "P1"
    assert out["publisher_name"] == "Wiley"
    assert out["works_count"] == 1200
    assert out["subfields"] == [
        {"id": "2208", "name": "Electrical and Electronic Engineering", "count": 0}
    ]

def test_parse_source_handles_missing_topics():
    assert parse_source(S300)["subfields"] == []

def test_parse_source_sums_counts_per_subfield_and_orders_by_count():
    # Two topics roll up to subfield 1000 (3+5=8); one topic gives 2000 a count
    # of 7. Summing first must rank 1000 ahead of 2000, even though the raw
    # topic order leads with the smaller 1000 entry.
    rec = {
        "display_name": "J", "issn_l": "1111-1111", "issn": ["1111-1111"],
        "type": "journal", "works_count": 100,
        "host_organization": "https://openalex.org/P1", "host_organization_name": "Pub",
        "topics": [
            {"count": 3, "subfield": {"id": "https://openalex.org/subfields/1000", "display_name": "A"}},
            {"count": 7, "subfield": {"id": "https://openalex.org/subfields/2000", "display_name": "B"}},
            {"count": 5, "subfield": {"id": "https://openalex.org/subfields/1000", "display_name": "A"}},
        ],
    }
    out = parse_source(rec)["subfields"]
    assert [s["id"] for s in out] == ["1000", "2000"]
    assert out[0]["count"] == 8 and out[1]["count"] == 7
