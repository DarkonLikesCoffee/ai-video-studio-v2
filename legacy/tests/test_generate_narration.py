import importlib.util
import unittest
from pathlib import Path


SCRIPT_PATH = Path(__file__).resolve().parents[1] / "scripts" / "generate-narration.py"
SPEC = importlib.util.spec_from_file_location("generate_narration", SCRIPT_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC is not None and SPEC.loader is not None
SPEC.loader.exec_module(MODULE)


class TimedPhoneme:
    def __init__(self, phoneme, start, end):
        self.phoneme = phoneme
        self.start = start
        self.end = end


class FakeTokenizer:
    def __init__(self, phonemized_words=None):
        self.phonemized_words = phonemized_words or {}

    def phonemize(self, word, language):
        return self.phonemized_words.get(word, word.lower().rstrip(".,!?;:"))


class FakeKokoro:
    def __init__(self, phonemized_words=None):
        self.tokenizer = FakeTokenizer(phonemized_words)


def group(text, start):
    result = []
    cursor = start
    for char in text:
        result.append(TimedPhoneme(char, cursor, cursor + 0.04))
        cursor += 0.05
    return result, cursor


class NarrationAlignmentTests(unittest.TestCase):
    def test_maps_phoneme_groups_to_written_words(self):
        first, cursor = group("hola", 0.0)
        second, _ = group("mundo", cursor + 0.05)
        timings = [*first, TimedPhoneme(" ", cursor, cursor + 0.05), *second]

        words = MODULE.map_words(FakeKokoro(), "Hola mundo.", "es", timings)

        self.assertEqual([word["text"] for word in words], ["Hola", "mundo."])
        self.assertAlmostEqual(words[0]["startSeconds"], 0.0, places=3)
        self.assertGreater(words[1]["startSeconds"], words[0]["endSeconds"])

    def test_aligns_small_context_sensitive_phoneme_difference(self):
        timed, _ = group("alphbeta", 0.0)

        words = MODULE.map_words(
            FakeKokoro(),
            "alpha beta",
            "en-us",
            timed,
        )

        self.assertEqual([word["text"] for word in words], ["alpha", "beta"])
        self.assertAlmostEqual(words[0]["startSeconds"], timed[0].start, places=3)
        self.assertAlmostEqual(words[0]["endSeconds"], timed[3].end, places=3)
        self.assertAlmostEqual(words[1]["startSeconds"], timed[4].start, places=3)
        self.assertAlmostEqual(words[1]["endSeconds"], timed[7].end, places=3)
    def test_maps_compound_word_when_sentence_context_collapses_phoneme_spaces(self):
        timed, _ = group("abcdef", 0.0)

        words = MODULE.map_words(
            FakeKokoro({"alpha": "ab cd", "beta": "ef"}),
            "alpha beta",
            "en-us",
            timed,
        )

        self.assertEqual([word["text"] for word in words], ["alpha", "beta"])
        self.assertAlmostEqual(words[0]["startSeconds"], timed[0].start, places=3)
        self.assertAlmostEqual(words[0]["endSeconds"], timed[3].end, places=3)
        self.assertAlmostEqual(words[1]["startSeconds"], timed[4].start, places=3)
        self.assertAlmostEqual(words[1]["endSeconds"], timed[5].end, places=3)

    def test_merges_expanded_numerals_back_into_one_written_word(self):
        groups = []
        cursor = 0.0
        for spoken in ("dos", "mil", "veintiseis", "años"):
            part, cursor = group(spoken, cursor + 0.04)
            groups.append(part)
        timings = []
        for index, part in enumerate(groups):
            if index:
                timings.append(TimedPhoneme(" ", part[0].start - 0.04, part[0].start))
            timings.extend(part)

        words = MODULE.map_words(
            FakeKokoro({"2026": "dos mil veintiseis", "años": "años"}),
            "2026 años",
            "es",
            timings,
        )

        self.assertEqual([word["text"] for word in words], ["2026", "años"])
        self.assertLess(words[0]["startSeconds"], words[0]["endSeconds"])

    def test_fails_instead_of_guessing_when_mapping_is_ambiguous(self):
        timings = []
        cursor = 0.0
        for spoken in ("u", "n", "o"):
            part, cursor = group(spoken, cursor)
            if timings:
                timings.append(TimedPhoneme(" ", cursor, cursor + 0.01))
                cursor += 0.02
            timings.extend(part)

        with self.assertRaisesRegex(RuntimeError, "differs too much"):
            MODULE.map_words(FakeKokoro(), "uno dos", "es", timings)


if __name__ == "__main__":
    unittest.main()
