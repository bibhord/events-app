# Events

A small React app over the assignment's events API: list, create, update,
delete, plus a detail view. React 19 + TypeScript + Vite, `react-router` for
routing, `fetch` for the API, no other runtime dependencies.

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # 39 unit tests
```

The API is `https://rf-json-server.herokuapp.com/events-3/`. All five endpoints
hold the same data; this one is shared by fewer people, so demo data is less
likely to be someone else's.

It was live when this was written — GET, POST, PUT and DELETE all verified
against it. It is a shared public `json-server`, so the records are whatever
other people have left behind, and if the host is ever down the app shows the
"Could not reach the server" banner with a retry rather than an empty screen.

---

## Acceptance criteria, and where each one lives

| Requirement | Where |
|---|---|
| List showing name, description, company | `components/EventList.tsx` |
| Form to add, list updates after | `components/EventForm.tsx`, `hooks/useEvents.ts` |
| Delete, list updates after | `routes/EventsPage.tsx` (confirm step), `useEvents.remove` |
| Error handling for API failures | `api/client.ts`, `components/ErrorBanner.tsx` |
| Sort by company after loading | `lib/sort.ts` |
| Update name, description, company, color | `EventForm` reused in a modal, `useEvents.update` |
| Detail view via react-router | `routes/EventDetail.tsx` at `/events/:id` |
| Validate inputs | `lib/validation.ts` |

---

## Decisions worth explaining

### Errors are typed, so the UI can say something specific

The brief asks for error handling while warning that the API will probably
never fail. Catching everything into one "something went wrong" would satisfy
the letter of that and teach nobody anything, so `api/client.ts` turns every
failure into an `ApiError` with a `kind`:

| kind | what happened | retryable |
|---|---|---|
| `network` | offline, DNS, CORS — the request never landed | yes |
| `timeout` | still open after 10s, aborted by us | yes |
| `http` | the server answered with a status we did not want | 5xx only |
| `parse` | a 2xx whose body was not the JSON we expected | no |

`ErrorBanner` picks its wording from the kind and only offers **Try again**
when `retryable` is true, so a 404 does not get a retry button that will
produce another 404.

Because the API genuinely does not fail, there is a **Simulate API failures**
toggle in the header. It makes every request reject with a shaped error so the
banner, the retry path and the "your typing is still here" behaviour can be
demonstrated rather than described. It is the only way to actually see the
error handling work.

Two smaller things in the same file: requests carry a 10 second timeout via
`AbortController`, and a caller's own signal is composed with it, so a
component unmounting mid-flight aborts its request and an abort is never
reported to the user as an error.

### Load errors and action errors are kept apart

A failed delete should not blank out a list that is on screen and still
correct. `useEvents` holds `loadError` and `actionError` separately: the first
replaces the list, the second appears above it while the list keeps rendering.

An action error is rendered wherever the action was started. Edit and delete
both happen inside a modal, and a modal has a backdrop over the page, so a
banner at the top of the page would be invisible exactly when it matters. The
modals render it themselves, and the page-level banner is suppressed while one
is open so the same message does not appear twice.

A failed save also leaves the form filled in. That is why `EventForm` seeds its
state from `initial` once and never syncs it back in an effect: the parent
builds a fresh object on every render, so an effect watching `initial` would
reset the form the moment `busy` flipped back after a failure, throwing away
what the user typed. The edit modal mounts the form with `key={event.id}`
instead, so switching to a different event still starts clean. Losing someone's
typing because a request failed is a worse bug than the failure.

### PUT sends the whole record

`PUT` on this server *replaces* the record rather than merging into it. The
form only edits four fields, so sending just those four silently destroys the
other six — `date`, `email`, `phone`, `address`, `isActive`, `image`. Nothing
in the UI shows those columns, so the damage is invisible from the screen:
the list would keep displaying a complete event while the server held a
gutted one.

`updateEvent` therefore sends `{ ...existing, ...draft }`, and the list takes
the server's returned record rather than merging it over the local copy — a
merge is exactly what would hide a divergence like this again. There are
regression tests in `api/events.test.ts` asserting the untouched fields are
present in the request body.

### Mutations patch state from the response, not a re-fetch

Create, update and delete update local state using the record the server sends
back, rather than re-fetching the list. One round trip instead of two, and the
response is the authoritative record. The list is re-sorted after each change,
so renaming a company moves the row to where it belongs instead of leaving it
stranded.

The trade-off is that another person's concurrent edit is not picked up until
a reload. For a five-record demo that is the right side of the trade; a real
app would revalidate on focus, which is most of why React Query exists.

### Validation is one pure function

`lib/validation.ts` exports `validate(draft)` and both forms call it. Keeping
it out of the components means the create and edit rules cannot drift apart,
and it is testable without rendering anything.

Errors appear once a field is touched or submit is pressed, rather than
immediately — a form that turns red before you have typed is hostile. Submit
stays enabled and explains on click, because a disabled button that will not
say why is worse than a button that does.

Colors validate against the real CSS named-color list, since the brief asks
for "any web safe named color". That catches `ornage` before it reaches the
server and lets the list render an accurate swatch. The field is backed by a
`<datalist>` so the valid values are discoverable.

### The detail view is a route that renders as a modal

`/events/:id` is a real URL: linkable, reloadable, and closed with the back
button. Rendering a modal from the list's own state would have satisfied "use
a modal" but not "with the use of react-router", and it would have made the
detail view unlinkable.

It fetches the single event with `GET /events/{id}` instead of reading it out
of the list already in memory — the brief asks for that endpoint, and it means
the URL works on a cold load.

### No data-fetching library, and no modal library

A fetch wrapper plus one hook is about 150 lines, and every decision in it is
visible in this repo rather than inside a dependency. On a brief whose point is
error handling, "the library retried it for me" is not an answer. React Query
would be the right call on a real app with more than five records and real
caching needs.

The modal is ~40 lines: portal, backdrop, Escape, focus on open, scroll lock.
A modal dependency would have been more to explain than to write.

---

## Tests

```bash
npm test
```

39 tests, all over pure functions — no component rendering and no jsdom, so
the suite runs in under a second and stays worth running.

Most of them are in `api/client.test.ts`, because error handling is what the
brief is actually assessing and it is the one thing the real API will never
let you observe. They pin down the mapping from what went wrong to what the
user is told:

- A rejected `fetch` becomes `network`; a non-2xx becomes `http` carrying the
  status; an unreadable 2xx body becomes `parse`
- An empty body is success, not a parse failure — `DELETE` on this API answers
  with nothing
- A request cancelled by its caller is **not** turned into an `ApiError`, since
  a component unmounting is not something to show the user
- `retryable` is table-tested across every kind and status, because a 404 must
  not offer "Try again" — retrying produces another 404
- The simulation toggle fails requests without touching the network, and stops
  cleanly when switched off

`lib/validation.test.ts` covers empty and whitespace-only fields, the length
limits at and over the boundary, misspelled and hex colours, and that `normalize`
keeps `" Acme "` and `"Acme"` from becoming two companies. `lib/sort.test.ts`
covers case-insensitive ordering, the name tiebreak, numeric collation
(`Co 2` before `Co 10`), that the input array is not mutated, and that a
missing company does not throw.

`fetch` is stubbed with `vi.stubGlobal` rather than through a mocking library:
there is one call site and the stub is three lines.

---

## What I would do with more time

- **Component tests.** The unit tests cover the logic; React Testing Library
  over the form would cover the wiring — that errors appear only after a field
  is touched, and that a failed save leaves what was typed in place.
- **Focus trapping in the modal.** It focuses the panel and closes on Escape,
  but does not cycle focus within itself.
- **Optimistic delete.** Removing the row immediately and restoring it if the
  request fails would feel faster. I kept it honest instead, since the error
  path is the thing being assessed.
- **Pagination or search.** Unnecessary at five records, and the list groups by
  company so it stays readable at a few dozen.
- **A real toast system.** One dismissible banner is enough for one action at a
  time, which is all this UI allows.
