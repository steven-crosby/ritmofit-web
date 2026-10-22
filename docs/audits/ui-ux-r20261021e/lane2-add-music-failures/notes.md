# Lane 2 Chrome pass — Add a track

Viewport 1440×1000. Local Vite `http://localhost:5173` and Worker `http://localhost:8787`, mock providers, empty Cycle class “Lane 2 QA”. 390 and native 200% were not checked (`NOT_ASSESSED`).

| Shot | What it shows |
| --- | --- |
| `add-track-idle-1440.png` | Add a track open on SoundCloud search, before a query. |
| `add-track-canned-search-1440.png` | Query `house` after the provider search request failed. Alert text: `Couldn’t search SoundCloud right now. Try again.` Try again is beside it. |

The empty-message blanks (`new ApiError('', 'REAUTH_REQUIRED', 409)`, `new Error('')`, and a non-Error) are not produced by the Worker client. `api.ts` replaces an empty HTTP message with `Request failed (status)` before TrackSearch sees it. Those blanks are covered by `TrackSearch.test.tsx`.
