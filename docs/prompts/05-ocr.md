# Prompt 05: OCR agent
**When to use:** After the manual search flow works end to end.

```
AGENT: OCR
Read /AGENTS.md and /docs/PRD.md (FR-5, FR-6, FR-7 and section 11).

Own only /client/src/ocr. Expose a clean function the Frontend can call, for example
scanStrip(imageFile) which returns a list of {rawText, matchedName, confidence}.

TASKS (show me a short plan first and wait for approval):
1. Image pre-processing: resize, grayscale, contrast boost, threshold, deskew.
2. Tesseract.js running inside a Web Worker, so the screen does not freeze.
3. Candidate extraction: pull likely medicine names from raw text and ignore batch numbers,
   dates, prices and manufacturer lines.
4. Fuse.js fuzzy matching against the medicine names list, returning a confidence score.
   Low-confidence results must be labeled "Check this".
5. A small test script that runs the pipeline on every image in /test-assets and prints a
   table: file, expected name, detected name, correct yes/no, confidence.

RULES: images never leave the device and are never stored; no uploading to any server.

DONE WHEN: the test script runs, and you report accuracy numbers and the most common
failure types. Suggest improvements, but do not skip the confirm screen.
Finish with the summary format from AGENTS.md section 7.
```
