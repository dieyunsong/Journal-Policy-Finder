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
    assert out["subfields"] == [{"id": "2208", "name": "Electrical and Electronic Engineering"}]

def test_parse_source_handles_missing_topics():
    assert parse_source(S300)["subfields"] == []
