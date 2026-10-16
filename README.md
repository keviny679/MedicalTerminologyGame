# Root & Blade

A pixel-art dungeon game for learning medical **prefixes, suffixes and roots**.
Pick a hero (Ren or Aiko), then fight yokai across four floors: Lantern Alley,
Torii Path, Sakura Temple and Moonlit Wave. Each floor has three monsters and a boss.

- Every attack is a multiple-choice question: what does this word part mean? There are 4 choices.
- A right answer hits the monster. A wrong one lets it hit you, and the correct meaning is shown.
- You get **3 hints per floor**. A hint shows an example word from Wikipedia, when one is listed.
- Keys: `1`–`4` answer · `H` hint · `Enter` continue.

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
