# Prompt 05: OCR agent
**When to use:** After the desktop flow works end to end (06A is done and committed).
**Before you start:** put at least 20 (ideally 50+) real strip photos in /test-assets and a
file /test-assets/labels.json listing the correct medicine name for each photo.

```
AGENT: OCR
Read /AGENTS.md and /docs/PRD.md (FR-5, FR-6, FR-7 and section 11) and /docs/PLAN.md.

Own only /client/src/ocr. Expose one clean function the Frontend and Integration agents can
call: scanStrip(imageFile, knownNames) which returns a list of
{ rawText, matchedName, confidence, status }, where status is "matched", "check_this" or
"unrecognized". `knownNames` is a list of medicine names passed IN by the caller. Do not fetch
the list yourself and do not call any API.

TASKS (show me a short plan first and wait for approval):
1. Image pre-processing: resize (max width 1200px), grayscale, contrast boost, threshold,
   deskew.
2. Tesseract.js running inside a Web Worker, so the screen does not freeze.
3. Candidate extraction: pull likely medicine names from raw text and ignore batch numbers,
   dates, prices, manufacturer lines and licence numbers.
4. Fuse.js fuzzy matching against knownNames, returning a confidence score. Low-confidence
   results are labeled "check_this". Anything not matched is returned as "unrecognized" with
   its raw text. Never drop a candidate silently.
5. An evaluation script that runs the pipeline on every image in /test-assets, compares it
   with /test-assets/labels.json, and prints a table: file, expected name, detected name,
   correct yes/no, confidence. Also print overall accuracy and the most common failure types
   (glare, curved text, small font, wrong crop, mixed language). Report the numbers honestly,
   including before and after pre-processing.

RULES:
- Images never leave the device, are never stored, and are never logged.
- OCR output is only a suggestion. It never goes to the safety check directly; the user
  confirm screen and /api/medicines/normalize come first.
- Do not edit any file outside /client/src/ocr. If a change is needed elsewhere, tell me.
- Never claim OCR results are "verified" or accurate beyond what the evaluation shows.

DONE WHEN: the evaluation script runs, you report accuracy numbers and common failure types,
and scanStrip works in the browser without freezing the page.
Finish with the summary format from AGENTS.md section 7.
```