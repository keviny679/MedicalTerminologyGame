# Your lo-fi music 🎧

Put your rainy lo-fi tracks in this `audio/` folder. The game shuffles them during a run.
There are volume, skip and on/off controls behind the ♪ button in the corner of the game screen.

## Option A: share a Google Drive folder (best for big files)

The deploy workflow downloads every song from a Google Drive folder and compresses it
to 96 kbps MP3 for the website. Your originals in Drive are never changed.

1. In Google Drive, right-click the **audio** folder → **Share** → **General access** →
   **Anyone with the link** (Viewer).
2. Re-run the **Build and deploy** workflow, or push any change.
   New songs you add to the folder are picked up within a week, or on the next run after
   you edit `scripts/fetch_music.py`.

The folder ID is set in `scripts/fetch_music.py` (`DEFAULT_FOLDER`). To use a different folder,
change that ID. You can also add a repository variable `MUSIC_DRIVE_FOLDER`; the workflow
passes it through as an environment variable.

## Option B: upload to GitHub

GitHub's website only accepts files up to **25 MB**. Long mixes need option A, or `git push`
from your computer (limit 100 MB per file).

1. Open this folder on GitHub: **`audio/`** on the branch the site deploys from.
2. Click **Add file → Upload files**.
3. Drag your songs in. **MP3** works in every browser; `.m4a`, `.ogg` and `.opus` work too.
4. Click **Commit changes**.

That's it. The **Build and deploy** workflow finds every audio file in this folder and
writes `tracks.json` for you. The site updates about a minute later.

**Track names.** In-game titles come from the file names.
`01_rainy-night-study.mp3` shows as **Rainy Night Study** (a leading number is dropped).
Use numbers if you want to control the order on the music screen. Playback is shuffled either way.

## Size tips

- GitHub rejects files over **100 MB**, and anything over 50 MB gets a warning.
  Lo-fi at 128–192 kbps is about 1–1.5 MB per minute, so a 3-minute track is roughly 3–5 MB.
- The whole site has a 1 GB limit, so keep the folder under a few hundred MB.
- If a file is big, re-export it as 128 kbps MP3 (Audacity, or `ffmpeg -i in.wav -b:a 128k out.mp3`).

## Rights

The site is public, so anyone who opens it can download these files.
Only upload music you made, music you've licensed, or tracks labelled royalty-free or Creative Commons.
Follow any credit the license asks for, for example a note in the main README.

## Testing locally

```sh
python scripts/build_music.py   # regenerates audio/tracks.json
python -m http.server 8000      # then open http://localhost:8000
```

Browsers only start audio after a click, so the music begins when you press **Start**.
