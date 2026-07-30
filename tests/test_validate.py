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
