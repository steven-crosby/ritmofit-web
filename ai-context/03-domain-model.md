# 03 — Domain Model

## Core domain concepts

### User

A person using RitmoFit.

A user owns classes, custom moves, and music provider connections.

### Class

A planned workout/class sequence.

A class contains ordered tracks and choreography metadata.

### Track

A normalized RitmoFit representation of a song or audio item.

The same track can appear in many classes.

### ProviderTrack

A provider-specific reference to a track from SoundCloud, Spotify, or Apple Music.

A track can have multiple provider references.

### ClassTrack

A specific use of a track inside a class.

This is where instructor-specific choreography details live:

- order
- display BPM
- intensity
- segment type
- notes
- duration override
- class-specific metadata

### Cue

A timestamped item attached to a class track.

Examples:

- move cue
- coaching note
- beat drop
- resistance change
- cadence target
- transition

### Move

A global movement in RitmoFit’s default library.

Examples:

- Climb
- Sprint
- Recovery
- Tap Back
- Push
- Jog

### UserMove

A user-defined custom move or custom coaching language.

User custom language should be supported from v1 because instructors often have personal phrasing.

A `UserMove` may optionally map to a global `Move` through `base_move_id`.

## Important modeling rule

Do not store choreography directly on `tracks`.

A track is reusable.

Choreography belongs to `class_tracks` and `cues`.

## Proposed schema

### users

```txt
id
email
name
image_url
created_at
updated_at
```

### auth_accounts

```txt
id
user_id
provider
provider_account_id
created_at
updated_at
```

### sessions

```txt
id
user_id
session_token_hash
expires_at
created_at
updated_at
```

### music_connections

```txt
id
user_id
provider
access_token_encrypted
refresh_token_encrypted
expires_at
scope
provider_user_id
created_at
updated_at
```

### tracks

```txt
id
title
artist_name
album_name
duration_ms
artwork_url
isrc
created_at
updated_at
```

### provider_tracks

```txt
id
track_id
provider
provider_track_id
provider_url
preview_url
artwork_url
raw_metadata_json
created_at
updated_at
```

### classes

```txt
id
user_id
title
description
class_type
target_duration_ms
status
created_at
updated_at
last_opened_at
```

Recommended class status values:

```txt
draft
ready
archived
```

Recommended initial class type values:

```txt
cycle
```

Other class types can be added later:

```txt
hiit
sculpt
tread
```

### class_tracks

```txt
id
class_id
track_id
order_index
display_bpm
original_bpm
segment_type
intensity
notes
color_role
starts_at_ms
duration_override_ms
created_at
updated_at
```

Recommended segment values:

```txt
warmup
climb
sprint
recovery
freestyle
cooldown
other
```

Recommended intensity values:

```txt
none
easy
mod
hard
all_out
```

### moves

```txt
id
name
description
class_type
created_at
updated_at
```

### user_moves

```txt
id
user_id
name
description
base_move_id
class_type
created_at
updated_at
```

### cues

```txt
id
class_track_id
timestamp_ms
cue_type
move_id
user_move_id
text
intensity
created_at
updated_at
```

Recommended cue type values:

```txt
move
note
beat_drop
resistance
cadence
transition
```

### class_snapshots

Optional/future-ready table.

```txt
id
class_id
version
snapshot_json
created_at
```

Use this later for history, restore, conflict detection, and iOS-ready class caching.

## Run payload concept

A class run payload should include all data required for live mode in a single response.

The iOS app should not need to make many requests while preparing to run a class.

Suggested shape:

```json
{
  "schemaVersion": 1,
  "class": {
    "id": "...",
    "title": "Mon POWER 6/8",
    "classType": "cycle",
    "targetDurationMs": 2700000
  },
  "tracks": [
    {
      "classTrackId": "...",
      "orderIndex": 0,
      "displayBpm": 122,
      "segmentType": "warmup",
      "intensity": "mod",
      "notes": "Start seated, build energy",
      "track": {
        "id": "...",
        "title": "Baianá",
        "artistName": "Bakermat",
        "durationMs": 180000,
        "artworkUrl": "..."
      },
      "providerRefs": [
        {
          "provider": "soundcloud",
          "providerTrackId": "...",
          "providerUrl": "..."
        }
      ],
      "cues": [
        {
          "timestampMs": 45000,
          "cueType": "beat_drop",
          "text": "Prepare for drop"
        }
      ]
    }
  ]
}
```
