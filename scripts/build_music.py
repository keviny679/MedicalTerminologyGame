#!/usr/bin/env python3
"""List the audio files in audio/ into audio/tracks.json for the in-game player.

GitHub Pages can't list a folder, so the game reads this file instead.
The deploy workflow runs this automatically; run it yourself only when
testing locally:  python scripts/build_music.py
"""
import json
import re
from pathlib import Path

MUSIC = Path(__file__).resolve().parent.parent / "audio"
AUDIO = {".mp3", ".ogg", ".m4a", ".aac", ".wav", ".opus", ".webm", ".flac"}


def title_from(name):
    stem = Path(name).stem
    stem = re.sub(r"^\d+[\s._-]*", "", stem)  # "01 - rainy night" -> "rainy night"
    stem = re.sub(r"(?<=[a-z])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])", " ", stem)  # "IGaveItMyAll"
    title = re.sub(r"[_-]+", " ", stem).strip()
    return (title if title != title.lower() else title.title()) or stem


def main():
    files = sorted(p for p in MUSIC.iterdir() if p.suffix.lower() in AUDIO)
    tracks = [{"file": p.name, "title": title_from(p.name)} for p in files]
    (MUSIC / "tracks.json").write_text(json.dumps({"tracks": tracks}, indent=1, ensure_ascii=False) + "\n")
    print(f"Found {len(tracks)} track(s) in {MUSIC}")
    for t in tracks:
        print(f"  {t['file']}  ->  {t['title']}")


if __name__ == "__main__":
    main()
