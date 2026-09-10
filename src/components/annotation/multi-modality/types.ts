/**
 * HeadLocation
 *
 * Purpose: Represents a single head-bounding-box annotation for one tracked person at one
 * sampled video frame. Used by HeadLocationsTab (editable table) and ConsolidatedView
 * (initial mock data / overlay rendering) in the multi-modality annotation flow.
 *
 * Fields:
 * - frame: Index of the sampled frame this annotation belongs to (frames are sampled at a
 *   fixed rate — see HeadLocationsTab's "Labeling at 2 frames per second" caption).
 * - timestamp: Human-readable `mm:ss.cc` timestamp string corresponding to `frame`.
 * - x, y: Top-left position of the bounding box. Units are context-dependent on the consumer —
 *   in ConsolidatedView's mock data these are percentages of the video viewport (0-100).
 * - w, h: Width/height of the bounding box, same unit basis as x/y.
 * - visibility: Coarse visibility bucket for the head (e.g. '100%', '50%-75%', '0%') used to
 *   flag partially occluded/obscured annotations.
 * - personId: Speaker/person identifier this head belongs to (correlates with speaker
 *   diarization IDs like 'spk12345').
 * - trackletId: Identifier of the tracklet (a short run of frames tracking the same person)
 *   this head location is part of; cross-referenced by TrackletVerificationTab.
 * - type: Classification of what was detected, e.g. 'Real Person' vs a non-person artifact
 *   ('Not Real (Image / Poster / reflection)').
 */
export interface HeadLocation {
    frame: number;
    timestamp: string;
    x: number;
    y: number;
    w: number;
    h: number;
    visibility: string;
    personId: string;
    trackletId: string;
    type: string;
}

/**
 * ActivityRow
 *
 * Purpose: Represents one speaker-activity segment (e.g. speech, side talk, non-speech) on
 * the audio timeline, used by SpeakerActivityTab for the editable segment table and the
 * overlap-highlighting timeline.
 *
 * Fields:
 * - id: Unique row identifier, used for React keys and update/remove lookups.
 * - start, end: Segment boundaries in seconds along the media timeline. `end` must be
 *   greater than `start`; overlap detection compares these ranges across rows.
 * - personId: Speaker/person identifier this activity belongs to (should stay consistent
 *   with HeadLocation.personId per the Speaker Activity Guidelines).
 * - type: Activity classification — 'Speech', 'Side Talk', or 'Non-Speech'.
 * - notes: Free-text annotator notes for this segment.
 */
export interface ActivityRow {
    id: string;
    start: number;
    end: number;
    personId: string;
    type: string;
    notes: string;
}
