# Indonesian narration

The site plays static MP3 recordings generated with `en-US-EmmaMultilingualNeural`, at
`+3%` speaking rate and the voice's original pitch. Emma's multilingual model
supports Indonesian and is categorized as cheerful, clear, and conversational.
Microsoft documents its [Indonesian language support](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-synthesis-markup-voice#multilingual-voices).
Each complete explanation is one recording;
word timing marks move the reading highlight between its paragraphs.

The audio library covers About, the tour introduction, research summaries,
both stone explanations, the site/decree explanation, and all nine questions'
correct, incorrect, repeat, and badge feedback variants. The tour guide player
removed at the user's request remains absent.

No visitor account, API key, or live synthesis server is required. Playback
uses browser audio, including on devices without Web Speech support. If audio
cannot load or newly edited text has no recording, show a retry/update message.
There is no automatic fallback to a device voice, which could sound robotic.
The player names the voice in its loading and playback status.

Emma recordings use the separate `assets/narration/emma-conversation-v1/`
directory to prevent playback of a cached older voice. Existing Gadis files
remain available for older tabs until those tabs reload.

## Refresh recordings after changing narrated content

Install development tools once:

```sh
npm install --no-save --package-lock=false playwright
npx playwright install chromium
python -m pip install edge-tts==7.2.8
```

Export current rendered explanations and quiz feedback, then generate recordings:

```sh
node scripts/export-narration.cjs
python scripts/generate-narration.py
```

Commit the updated passage JSON, `narration-audio.js`, and audio files together
with the content change. The generator reuses completed recordings; pass
`--force` after changing the voice or its speech settings. Bump script versions
in `index.html` when changing narration scripts or the generated audio library.

The optional `PLAYWRIGHT_MODULE` and `CHROME_PATH` environment variables let the
exporter use an existing Playwright installation and Chrome executable.

Generation uses the community [edge-tts](https://github.com/rany2/edge-tts)
client for Edge's online speech service. Playback of deployed recordings is
independent of that service; future regeneration requires it to be available.
