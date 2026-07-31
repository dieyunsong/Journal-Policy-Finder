from scripts.validate import validate_publishers, validate_ta

def test_validate_publishers_flags_missing_fields():
    pubs = {"P1": {"homepage": "h", "oa_options": "o", "embargo_sharing": "e", "apc": "a", "note": "n", "verified": "2026-07-30"},
            "P2": {"homepage": "h"}}
    errs = validate_publishers(pubs)
    assert any("P2" in e for e in errs)
    assert not any("P1" in e for e in errs)

def test_validate_ta_flags_unknown_issnl():
    index = [{"issn_l": "1111-2222"}]
    errs = validate_ta({"1111-2222": {"note": ""}, "0000-0000": {"note": ""}}, index)
    assert any("0000-0000" in e for e in errs)

from scripts.validate import validate_publisher_ids, validate_crosswalk

def test_validate_publisher_ids_flags_id_matching_no_journal():
    index = [{"publisher": "P1"}, {"publisher": "P2"}]
    pubs = {"P1": {"name": "Good"}, "P404": {"name": "Typo'd"}}
    errs = validate_publisher_ids(pubs, index)
    assert len(errs) == 1 and "P404" in errs[0]

def test_validate_publisher_ids_accepts_a_match_via_alias():
    # Springer Nature's journals sit under a second OpenAlex id.
    index = [{"publisher": "P99"}]
    pubs = {"P1": {"name": "Springer Nature", "aliases": ["P99"]}}
    assert validate_publisher_ids(pubs, index) == []

def test_validate_crosswalk_flags_tag_missing_from_taxonomy():
    taxonomy = {"area-a": {"label": "A", "subcategories": {"sub-x": "X"}}}
    good = {"1000": "area-a/sub-x"}
    bad = {"1000": "area-a/does-not-exist"}
    assert validate_crosswalk(good, taxonomy) == []
    assert len(validate_crosswalk(bad, taxonomy)) == 1
