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
- Keys: `1`–`4` answer · `H` hint · `U` unsure · `Enter` continue. While typing an answer: `Esc` = I don't know,
  `Alt+H` hint, `Alt+U` unsure. Typing anywhere on the page goes into the answer box.
- **Phones:** typing `?` (or `idk`) and pressing Go counts as "I don't know". The ⛶ button goes
  fullscreen; on iPhone, where browsers can't, it switches to a compact full-screen layout instead.
  For true fullscreen on iPhone, use Share → Add to Home Screen and open it from there.
- **Essentials of Medical Language mode:** a calm study mode with the same battles but no random upgrades.
  Pick a chapter (1–7 so far) or one of its sections. Questions mix terms, definitions, abbreviations,
  word-part breakdowns and "name the highlighted structure" diagrams. Bigger chapters mean longer runs.
  Missed terms come back more often, and the game tracks how much of each chapter you've seen and mastered.
- **Read → recall → battle lessons:** picking a section opens a short lesson (original text, with the
  most relevant diagram). Then you write down every key term you remember (a "brain dump"), see what you
  missed, and the battle starts with those terms first, including fill-in-the-blank sentences from the
  lesson. Hints quote the lesson with the term blanked out, and after a miss, a guess or a hint the
  feedback shows what the lesson says about the term. Lessons live in the chapter files as `> ` lines, with key terms marked `[[term]]` or
  `[[shown text|entry name]]`.
- **Typed recall and spaced review:** in the default *Mixed* style, a term starts as multiple choice and
  switches to typed recall once you know it. A correct typed answer is a "recall strike" for +50% damage.
  Small typos in long words count, with a spelling note, but a different real term never does.
  Each term is scheduled for review 1, 3, 7, 14, 30, 60 and 120 days later as you keep recalling it;
  a miss brings it back the next day. The **Daily review** run (and the "due" count on the title screen)
  pulls whatever is due from every chapter. A term only counts as *mastered* after a typed recall.
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
