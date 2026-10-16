"""Run with: python -m unittest discover tests"""
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

from build_terms import parse, simplify_meaning  # noqa: E402


class ParseTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.terms = parse((ROOT / "tests" / "fixture.html").read_text(encoding="utf-8"))
        cls.by_affix = {t["affix"]: t for t in cls.terms}

    def test_keeps_only_word_parts(self):
        self.assertNotIn("heart", self.by_affix)
        for t in self.terms:
            self.assertTrue(any(c in t["affix"] for c in "-("), t)

    def test_multiple_affixes_and_examples(self):
        t = self.by_affix["a-, an-"]
        self.assertEqual(t["meaning"], "not, without (alpha privative)")
        self.assertEqual(t["examples"], ["analgesic", "apathy"])

    def test_strips_citations(self):
        self.assertEqual(self.by_affix["abdomin(o)-"]["meaning"], "abdomen")
        self.assertEqual(self.by_affix["-ectomy"]["examples"], ["appendectomy"])

    def test_rowspan_and_missing_examples(self):
        self.assertEqual(self.by_affix["cordi-"]["meaning"], "heart")
        self.assertEqual(self.by_affix["cordi-"]["examples"], [])

    def test_skips_repeated_headers(self):
        self.assertNotIn("Affix", self.by_affix)
        self.assertEqual(len(self.terms), 12)

    def test_english_meanings_tables(self):
        self.assertEqual(self.by_affix["haemat(o)-, haem(o)-"]["meaning"], "blood")
        self.assertEqual(self.by_affix["sangui-, sanguin-"]["meaning"], "blood")
        self.assertEqual(self.by_affix["dent(i)-"],
                         {"affix": "dent(i)-", "meaning": "tooth", "examples": []})
        self.assertNotIn("–", self.by_affix)

    def test_simplify_meaning(self):
        self.assertEqual(simplify_meaning("of or pertaining to the brain; see also cerebro-"), "brain")
        self.assertEqual(simplify_meaning("of or pertaining to the finger [rare as a root]"), "finger")
        self.assertEqual(simplify_meaning("process of measuring, -meter + -y (see -meter)"),
                         "process of measuring, -meter + -y")
        self.assertEqual(simplify_meaning("of or pertaining to medicine (common as a suffix; see -iatry)"),
                         "medicine")
        self.assertEqual(simplify_meaning("pertaining to"), "pertaining to")
        self.assertEqual(simplify_meaning("liver"), "liver")
        self.assertEqual(simplify_meaning("denoting a rose-red color"), "rose-red color")
        self.assertEqual(simplify_meaning('denotes something as "outside" another'), "outside another")


if __name__ == "__main__":
    unittest.main()
