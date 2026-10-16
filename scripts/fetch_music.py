#!/usr/bin/env python3
"""Download the lo-fi tracks from a shared Google Drive folder into audio/.

Runs in the deploy workflow (GitHub's servers can reach Google Drive). The
folder must be shared as "Anyone with the link - Viewer". Tracks are
re-encoded to 96 kbps MP3 so the long mixes stream quickly on the site; the
originals in Drive are never changed.

  python scripts/fetch_music.py [FOLDER_ID]

Compressed copies are kept in $MUSIC_CACHE (default .music-cache/) so unchanged songs aren't
downloaded and re-encoded on every deploy.
"""
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
AUDIO = ROOT / "audio"
CACHE = Path(os.environ.get("MUSIC_CACHE") or ROOT / ".music-cache")
DEFAULT_FOLDER = "14e7noaBsKc7bNoDQIbyqMrf7ebiQpVSy"
EXTS = {".mp3", ".m4a", ".wav", ".ogg", ".flac", ".aac", ".opus"}


def encode(src, out):
    print(f"Encoding {src.name} ...", flush=True)
    subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-y", "-i", str(src), "-vn",
         "-c:a", "libmp3lame", "-b:a", "96k", "-ac", "2", str(out)],
        check=True,
    )


def main():
    folder = (sys.argv[1] if len(sys.argv) > 1 else os.environ.get("MUSIC_DRIVE_FOLDER")) or DEFAULT_FOLDER
    import gdown  # installed by the workflow

    download = CACHE / "download"
    CACHE.mkdir(parents=True, exist_ok=True)
    try:
        listing = gdown.download_folder(id=folder, output=str(download), skip_download=True, quiet=True)
    except Exception as err:  # private folder, quota, network...
        listing = None
        print(f"::warning::Couldn't read the Google Drive music folder ({err}). "
              "Is it shared as 'Anyone with the link'? Using cached tracks only.")

    if listing:
        wanted = {}
        for f in listing:
            src = Path(f.local_path)
            if src.suffix.lower() in EXTS:
                wanted[src.stem] = f
        # forget songs that were removed from the Drive folder
        for old in CACHE.glob("*.mp3"):
            if old.stem not in wanted:
                old.unlink()
        for stem, f in wanted.items():
            out = CACHE / f"{stem}.mp3"
            if out.exists():
                continue
            src = Path(f.local_path)
            src.parent.mkdir(parents=True, exist_ok=True)
            try:
                gdown.download(id=f.id, output=str(src), quiet=False)
                encode(src, out)
            except Exception as err:
                print(f"::warning::Skipping {src.name}: {err}")
                out.unlink(missing_ok=True)
            finally:
                src.unlink(missing_ok=True)

    AUDIO.mkdir(exist_ok=True)
    for mp3 in sorted(CACHE.glob("*.mp3")):
        shutil.copy2(mp3, AUDIO / mp3.name)
        print(f"  audio/{mp3.name}  {mp3.stat().st_size / 1e6:.1f} MB")
    shutil.rmtree(download, ignore_errors=True)


if __name__ == "__main__":
    main()
