"""Build 512 px multiresolution cube tiles from Lithera's HD panoramas.

Usage: python scripts/build-panorama-tiles.py [scene-number ...]
"""

from pathlib import Path
import sys

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "panoramas"
OUTPUT = SOURCE / "tiles"
FACE_SIZE = 2048
TILE_SIZE = 512
QUALITY = 88
FACES = "fbudlr"
Image.MAX_IMAGE_PIXELS = None


def sample_face(source: np.ndarray, face: str) -> Image.Image:
    height, width = source.shape[:2]
    pixels = np.empty((FACE_SIZE, FACE_SIZE, 3), dtype=np.uint8)
    horizontal = (np.arange(FACE_SIZE, dtype=np.float32) + 0.5) * (2 / FACE_SIZE) - 1

    for top in range(0, FACE_SIZE, 256):
        bottom = min(top + 256, FACE_SIZE)
        vertical = ((np.arange(top, bottom, dtype=np.float32) + 0.5) * (2 / FACE_SIZE) - 1)[:, None]
        u = horizontal[None, :]
        v = vertical

        if face == "f":
            x, y, z = u, -v, 1
        elif face == "b":
            x, y, z = -u, -v, -1
        elif face == "l":
            x, y, z = -1, -v, u
        elif face == "r":
            x, y, z = 1, -v, -u
        elif face == "u":
            x, y, z = u, 1, v
        else:
            x, y, z = u, -1, -v

        x, y, z = np.broadcast_arrays(x, y, z)
        longitude = np.arctan2(x, z)
        latitude = np.arctan2(y, np.sqrt(x * x + z * z))
        src_x = ((longitude / (2 * np.pi) + 0.5) * width - 0.5) % width
        src_y = np.clip((0.5 - latitude / np.pi) * height - 0.5, 0, height - 1)
        left = np.floor(src_x).astype(np.int32)
        right = (left + 1) % width
        upper = np.floor(src_y).astype(np.int32)
        lower = np.minimum(upper + 1, height - 1)
        mix_x = (src_x - left)[..., None]
        mix_y = (src_y - upper)[..., None]
        upper_pixels = source[upper, left] * (1 - mix_x) + source[upper, right] * mix_x
        lower_pixels = source[lower, left] * (1 - mix_x) + source[lower, right] * mix_x
        pixels[top:bottom] = np.clip(upper_pixels * (1 - mix_y) + lower_pixels * mix_y, 0, 255).astype(np.uint8)

    return Image.fromarray(pixels, "RGB")


def save_face(face: Image.Image, letter: str, destination: Path) -> None:
    for level, size in ((3, 2048), (2, 1024), (1, 512)):
        image = face if level == 3 else face.resize((size, size), Image.Resampling.LANCZOS)
        folder = destination / str(level)
        folder.mkdir(parents=True, exist_ok=True)
        for row in range(size // TILE_SIZE):
            for column in range(size // TILE_SIZE):
                tile = image.crop((column * TILE_SIZE, row * TILE_SIZE,
                                   (column + 1) * TILE_SIZE, (row + 1) * TILE_SIZE))
                tile.save(folder / f"{letter}{row}_{column}.webp", "WEBP", quality=QUALITY, method=5)
        if level == 1:
            fallback = destination / "fallback"
            fallback.mkdir(parents=True, exist_ok=True)
            image.save(fallback / f"{letter}.webp", "WEBP", quality=QUALITY, method=5)


def main() -> None:
    scenes = [int(arg) for arg in sys.argv[1:]] if len(sys.argv) > 1 else list(range(1, 8))
    for number in scenes:
        if number not in range(1, 8):
            raise ValueError(f"Invalid scene: {number}")
        with Image.open(SOURCE / f"{number}-hd.webp") as original:
            source = np.asarray(original.convert("RGB"))
        if source.shape[:2] != (4096, 8192):
            raise ValueError(f"Scene {number} is not 8192x4096")
        destination = OUTPUT / str(number)
        for letter in FACES:
            print(f"Scene {number}: {letter}", flush=True)
            save_face(sample_face(source, letter), letter, destination)


if __name__ == "__main__":
    main()
