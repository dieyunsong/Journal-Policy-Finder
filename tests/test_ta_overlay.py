from scripts.ta_overlay import build_overlay

INDEX = [
    {"name": "Journal of Widget Science", "issn_l": "1111-2222", "issns": ["1111-2222", "3333-4444"], "publisher": "P1", "works_count": 1200, "tags": []},
]
TA_ROWS = [
    {"Publisher": "Wiley", "Journal Title": "Journal of Widget Science", "eISSN": "3333-4444", "Notes": "covered by BTAA Wiley agreement"},
    {"Publisher": "Wiley", "Journal Title": "Not In Index Journal", "eISSN": "9999-0000", "Notes": "missing"},
]

def test_matches_on_any_issn_and_keys_by_issn_l():
    overlay, unmatched = build_overlay(TA_ROWS, INDEX)
    assert overlay == {"1111-2222": {"note": "covered by BTAA Wiley agreement"}}
    assert unmatched == [{"publisher": "Wiley", "title": "Not In Index Journal", "eissn": "9999-0000"}]
