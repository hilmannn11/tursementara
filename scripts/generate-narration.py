"""Generate static Indonesian neural audio. Requires edge-tts==7.2.8.

Run export-narration.cjs first. Audio is generated ahead of deployment, so
visitors do not depend on a third-party TTS endpoint or an API key.
"""
import asyncio
import argparse
import json
from pathlib import Path
import edge_tts

ROOT = Path(__file__).resolve().parent.parent
VOICE = "id-ID-GadisNeural"
parser = argparse.ArgumentParser()
parser.add_argument("--force", action="store_true", help="Regenerate audio after changing voice, rate, or pitch")
OPTIONS = parser.parse_args()

async def main():
    passages = json.loads((ROOT / "scripts/narration-passages.json").read_text(encoding="utf-8"))
    directory = ROOT / "assets/narration"
    directory.mkdir(parents=True, exist_ok=True)
    semaphore = asyncio.Semaphore(3)

    async def generate(key, passage):
        audio_path = directory / f"{key}.mp3"
        marks_path = directory / f"{key}.json"
        if not OPTIONS.force and audio_path.exists() and audio_path.stat().st_size > 1000 and marks_path.exists():
            marks = json.loads(marks_path.read_text(encoding="utf-8"))
        else:
            starts = []
            position = 0
            for chunk in passage["chunks"]:
                starts.append(position)
                position += len(chunk) + 1
            async with semaphore:
                for attempt in range(3):
                    try:
                        marks = [{"time": 0, "index": 0}]
                        cursor = 0
                        index = 0
                        speech = edge_tts.Communicate(passage["text"], VOICE, rate="+3%", pitch="+2Hz", boundary="WordBoundary")
                        temporary = audio_path.with_suffix(".mp3.tmp")
                        with temporary.open("wb") as audio:
                            async for event in speech.stream():
                                if event["type"] == "audio":
                                    audio.write(event["data"])
                                elif event["type"] == "WordBoundary":
                                    found = passage["text"].find(event["text"], cursor)
                                    if found >= 0:
                                        cursor = found + len(event["text"])
                                        while index + 1 < len(starts) and found >= starts[index + 1]:
                                            index += 1
                                            marks.append({"time": round(event["offset"] / 10000000, 3), "index": index})
                        if temporary.stat().st_size < 1000:
                            raise RuntimeError("Empty audio")
                        temporary.replace(audio_path)
                        marks_path.write_text(json.dumps(marks), encoding="utf-8")
                        print(f"Generated {key} ({audio_path.stat().st_size} bytes)", flush=True)
                        break
                    except Exception:
                        if attempt == 2:
                            raise
                        await asyncio.sleep(2 * (attempt + 1))
        return key, {"text": passage["text"], "src": f"./assets/narration/{key}.mp3", "marks": marks}

    results = await asyncio.gather(*(generate(key, passage) for key, passage in passages.items()))
    library = dict(results)
    (ROOT / "narration-audio.js").write_text("// Generated with id-ID-GadisNeural (+3% rate, +2Hz pitch).\nwindow.LITHERA_NARRATION_AUDIO = " + json.dumps(library, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
    print(f"Ready: {len(library)} audio passages", flush=True)

if __name__ == "__main__":
    asyncio.run(main())
