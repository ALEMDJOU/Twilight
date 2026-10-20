# Third-party notices

Twilight's own source code is released under the [MIT License](LICENSE).
It bundles or downloads the following third-party components, each under its own license.

## Bundled in this repository

| Component | Location | License |
|---|---|---|
| [Fraunces](https://github.com/undercasetype/Fraunces) font | `public/fonts/` | SIL Open Font License 1.1 (`public/fonts/LICENSE-Fraunces.txt`) |
| [Plus Jakarta Sans](https://github.com/tokotype/PlusJakartaSans) font | `public/fonts/` | SIL Open Font License 1.1 (`public/fonts/LICENSE-PlusJakartaSans.txt`) |

## Downloaded at setup time (not committed)

| Component | Command | License |
|---|---|---|
| [ONNX Runtime Web](https://github.com/microsoft/onnxruntime) 1.18.0 | `npm run setup:voice` | MIT |
| [piper-wasm / vits-web](https://github.com/diffusionstudio/vits-web) (Piper phonemizer compiled to WebAssembly) | `npm run setup:voice` | MIT, includes [eSpeak NG](https://github.com/espeak-ng/espeak-ng) (GPL-3.0-or-later) |
| [Piper](https://github.com/rhasspy/piper) voice `en_US-lessac-medium` | `npm run setup:voice` | See the voice's [model card](https://huggingface.co/rhasspy/piper-voices/tree/main/en/en_US/lessac/medium) |
| Photos from [Wikimedia Commons](https://commons.wikimedia.org) | `npm run images` | Various free licenses (CC BY, CC BY-SA, public domain…). The author, license and source of every photo are stored in `public/content/images.json` and shown under each picture in the app. |

## Learning content

The lessons, exercises and flashcards are **not** part of this repository.
They are personal study notes made from books that are protected by copyright
(Cambridge University Press and others). Only an original sample is provided in `samples/content/`.
