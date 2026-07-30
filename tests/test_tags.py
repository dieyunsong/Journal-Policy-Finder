from scripts.tags import tags_for

CROSSWALK = {
    "2208": "engineering-computer-science/electrical-electronic-engineering",
    "1202": "humanities-literature-arts/history",
}

def test_maps_subfields_to_tags():
    subfields = [{"id": "2208", "name": "Electrical and Electronic Engineering"}]
    assert tags_for(subfields, CROSSWALK) == ["engineering-computer-science/electrical-electronic-engineering"]

def test_skips_unmapped_and_dedupes():
    subfields = [{"id": "2208", "name": "x"}, {"id": "2208", "name": "x"}, {"id": "9999", "name": "unknown"}]
    assert tags_for(subfields, CROSSWALK) == ["engineering-computer-science/electrical-electronic-engineering"]
