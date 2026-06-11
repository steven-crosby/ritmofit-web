# 05 — Frontend Plan

## Web app purpose

The web app is the primary planning workspace for instructors.

It should feel like a creative production tool, not a generic CRUD dashboard.

## Recommended web stack

- React
- Vite
- TypeScript
- TanStack Router
- TanStack Query
- Tailwind CSS
- Shared Zod schemas from `packages/shared`
- Shared UI tokens/components from `packages/ui`

## Initial route structure

```txt
/
  Marketing landing page or redirect to app during early development

/app
  Authenticated shell

/app/classes
  Class library

/app/classes/new
  Create class

/app/classes/:classId/builder
  Class Builder Timeline

/app/music
  Music search/discovery

/app/settings/connections
  Music provider connections
```

## First high-priority screen

Build `/app/classes/:classId/builder` first after foundation/auth because it defines the product’s core data model.

## Class Builder Timeline layout

Recommended desktop layout:

```txt
Top bar
  - class title
  - duration total
  - save status
  - provider connection status
  - future live/run preview button

Left panel
  - SoundCloud search
  - imported/source tracks
  - add track to class
  - provider open button

Center panel
  - ordered class timeline
  - track cards
  - segment labels
  - drag-and-drop reorder
  - duration markers

Right panel
  - selected track editor
  - display BPM
  - segment type
  - intensity
  - notes
  - moves
  - timestamped cues
```

## Builder interactions

The MVP builder must support:

- Create class
- Load class
- Add track
- Reorder tracks
- Select track
- Edit display BPM
- Edit segment type
- Edit intensity
- Edit notes
- Add timestamped cue
- Edit cue
- Delete cue
- Add user custom move
- Save changes

## Music playback expectation

Do not implement full embedded streaming in v1.

The web planning app can open playback in the connected provider.

For SoundCloud, prefer storing and exposing `providerUrl` where available.

## Visual design principles

RitmoFit should feel like “Spotify for instructors”:

- dark-mode-first eventually
- strong contrast
- intentional motion
- clear hierarchy
- music-forward layouts
- colorblind-safe status indicators
- hue must not be the only carrier of meaning

However, do not block initial implementation on a fully polished design system.

Start with clean, usable components and centralize tokens so the visual system can evolve.

## Component candidates

```txt
AppShell
TopNav
Sidebar
ClassCard
ClassTimeline
ClassTrackCard
TrackSearchPanel
TrackSearchResult
TrackEditorPanel
CueList
CueEditor
MovePicker
IntensityControl
SegmentSelect
SaveStatus
ProviderBadge
```

## State management

Use TanStack Query for server state.

Prefer local React state for in-progress form edits.

Do not introduce a global state library unless there is a clear need.

## Saving strategy

Early MVP can use explicit save or simple optimistic patches.

Avoid complex real-time autosave until the data model is stable.

For builder UX, show:

```txt
Saved
Saving...
Unsaved changes
Error saving
```

## Accessibility expectations

- Keyboard navigable controls
- Visible focus states
- Accessible labels on icon buttons
- High contrast text
- Do not rely on color alone
- Reasonable hit target sizes

## Frontend testing expectations

At minimum:

- Validate route rendering
- Validate class builder loads mock/API data
- Validate track reorder behavior
- Validate cue creation/editing forms
- Validate API error handling states
