# Root & Blade

A pixel-art roguelike for learning medical **prefixes, suffixes and roots**.
Pick a hero (Ren or Aiko) and fight yokai across four floors: Lantern Alley,
Torii Path, Sakura Temple and Moonlit Wave.

- **Combat:** every attack is a 4-choice question about what a word part means. A right answer hits the foe. A wrong one lets it hit you and shows the right meaning.
- **Doors (Hades-style):** after each room, pick a door by its reward: a kami blessing, a relic chest, mon, an elite fight, a merchant, or a hot spring. Four rooms, then the floor's boss.
- **Boons:** five kami (Amaterasu, Susanoo, Tsukuyomi, Inari, Raijin) each offer three upgrades in Common, Rare or Epic. Taking one you already have levels it up.
- **Relics (Risk of Rain-style):** stacking items in Common, Uncommon, Legendary and Cursed. Cursed relics are powerful but have a drawback.
- **Scaling:** foes get tougher every room. Elites (Armored, Vampiric, Furious, Warded) appear more often as you go. Bosses wind up a heavy attack every few turns: answer right to stagger them.
- **Shrine of Memory:** every run earns Spirit Embers, even a lost one. Spend them on permanent upgrades.
- **Review:** the end-of-run screen lists the word parts you missed.
- **Hints** show an example word from Wikipedia when one is listed.
- Keys: `1`–`4` answer · `H` hint · `Enter` continue.
- **Essentials of Medical Language mode:** a calm study mode with the same battles but no random upgrades.
  Pick a chapter (1–5 so far) or one of its sections. Questions mix terms, definitions, abbreviations,
  word-part breakdowns and "name the highlighted structure" diagrams. Bigger chapters mean longer runs.
  Missed terms come back more often, and the game tracks how much of each chapter you've seen and mastered.
  The content lives in `data/eml/*.txt` (one line per term). It is original study notes arranged by the
  textbook's chapters, not text copied from the book.
- **Music:** put lo-fi tracks in `audio/`. See [audio/README.md](audio/README.md).

## Data

Terms come from Wikipedia's
[List of medical roots, suffixes and prefixes](https://en.wikipedia.org/wiki/List_of_medical_roots,_suffixes_and_prefixes)
(CC BY-SA 4.0). `scripts/build_terms.py` downloads the page and writes `data/terms.json`.
It keeps only word parts (entries with a hyphen or a combining vowel such as `cardi(o)-`),
never whole words. It also reads the "English meanings" tables (Greek/Latin roots).

## Deploying on GitHub Pages

1. In the repo, go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
2. Push to the default branch. The `Build and deploy` workflow runs the tests, fetches the term list and publishes the site.
   It also runs weekly, so the list stays in sync with Wikipedia.

## Running locally

```sh
pip install beautifulsoup4
python scripts/build_terms.py        # writes data/terms.json (needs internet)
python -m http.server 8000           # open http://localhost:8000
```

Tests: `python -m unittest discover tests` and `node --test tests/*.mjs`.
