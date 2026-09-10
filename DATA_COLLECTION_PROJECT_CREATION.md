# Data Collection Project — Complete Feature Document

> **Purpose:** Reference document for rebuilding the data collection project creation flow in a new application.  
> **Source:** Reverse-engineered from QualiCollect codebase (FastAPI backend + ReactJS frontend).  
> **Date:** 2026-06-08

---

## Table of Contents

1. [What Is a Data Collection Project](#1-what-is-a-data-collection-project)
2. [Project Fields & Schema](#2-project-fields--schema)
3. [Phase Configuration — Full Structure](#3-phase-configuration--full-structure)
4. [Demographic Target Configuration](#4-demographic-target-configuration)
5. [Reference Enums (All Allowed Values)](#5-reference-enums-all-allowed-values)
6. [Project Lifecycle & States](#6-project-lifecycle--states)
7. [Phase Progression Logic](#7-phase-progression-logic)
8. [User Assignment Rules](#8-user-assignment-rules)
9. [File Upload — How Phase Config Drives It](#9-file-upload--how-phase-config-drives-it)
10. [Dataset Quality States & QA Flow](#10-dataset-quality-states--qa-flow)
11. [Demographic Target Enforcement](#11-demographic-target-enforcement)
12. [Tracking & Analytics](#12-tracking--analytics)
13. [Validation Rules — Full List](#13-validation-rules--full-list)
14. [What to Build — Backend (New App)](#14-what-to-build--backend-new-app)
15. [What to Build — Frontend (New App)](#15-what-to-build--frontend-new-app)
16. [API Specification](#16-api-specification)
17. [Data Flow Diagrams](#17-data-flow-diagrams)

---

## 1. What Is a Data Collection Project

A **Data Collection Project** is a configured workspace where:
- An **admin** defines what kind of files/data to collect, in how many phases, at what quality constraints
- **Users** are assigned and upload files (images, videos, audio, text) phase by phase
- **QA reviewers** accept or reject uploads
- The system tracks demographic distribution against configured targets

### Project Types in the System

| Type | Constant | Description |
|------|----------|-------------|
| Collection | `collection` | Users upload media files/text in phases |
| Annotation | `annotation` | Users annotate existing datasets |

This document covers **Collection** type only.

---

## 2. Project Fields & Schema

### 2.1 MongoDB Document — `projects` Collection

```
{
  _id:                  ObjectId          // auto-generated
  name:                 string            // unique, 1-50 chars, no special chars
  project_type:         "collection"      // fixed for collection projects
  target:               int               // total target uploads (>0)
  startDate:            string (YYYY-MM-DD)
  endDate:              string (YYYY-MM-DD)
  isactive:             int               // 1=active, 0=inactive
  instruction:          string            // shown to uploader, 1-350 chars
  initial_scene:        string            // optional, max 350 chars
  action_template:      string            // optional
  users:                list[string]      // email list OR ["All"]
  phases:               dict              // phase_1: [...], phase_2: [...] etc.
  demographic_data:     list[dict]        // [{age: DemographicTarget}, ...]
  annotation_data:      null              // not used for collection projects
  validation_data:      null              // not used for collection projects
  selected_project:     null              // not used for collection projects
  selected_data_ids:    null              // not used for collection projects
  created_by:           string (email)
  created_on:           string (YYYY-MM-DD HH:MM)
  need_auto_verification: int (1)         // always 1 on creation
  user_phases:          list[dict]        // [{email, phase, completed_phases}] — runtime tracking
}
```

### 2.2 Input Fields for Project Creation

| Field | Type | Required | Constraints | Notes |
|-------|------|----------|-------------|-------|
| `name` | string | Yes | 1–50 chars, no escape characters | Must be unique across all projects |
| `project_type` | string | Yes | Must be `"collection"` or `"annotation"` | Drives which other fields are required |
| `target` | int | Yes | > 0 | Total uploads expected across all users |
| `startDate` | date | Yes | Cannot be in past (recommended) | Format: YYYY-MM-DD |
| `endDate` | date | Yes | Must be >= startDate | Cannot be less than startDate — validated |
| `instruction` | string | Yes | 1–350 chars | Shown to user on upload page |
| `users` | list | Yes | List of email strings OR `["All"]` | `"All"` includes all ROLE_USER accounts |
| `phases` | dict | Yes (collection) | See Phase Config section | Key must be `phase_1`, `phase_2`, etc. |
| `demographic_data` | list | No | See Demographic section | Optional; if omitted no demographic targeting |
| `initial_scene` | string | No | Max 350 chars | Optional annotation-related field |
| `action_template` | string | No | — | Optional annotation-related field |

---

## 3. Phase Configuration — Full Structure

### 3.1 What a Phase Is

A phase is a **collection task** within a project. One project can have multiple phases (`phase_1`, `phase_2`, ...). Users must complete phase_1 before moving to phase_2. Each phase contains **one or more dataset items** (upload slots).

### 3.2 phases Object Structure

```json
{
  "phases": {
    "phase_1": [
      {
        "id": "phase1_img001",
        "name": "Front Face Photo",
        "device": "iPhone",
        "data_type": "Image",
        "file_format": "JPEG",
        "iPhone_11_or_Newer": true,
        "video_time_limit": 0,
        "file_size": 10,
        "dimension": {
          "width": "1920",
          "height": "1080",
          "dimension_match": "Exact"
        },
        "user_validation": true,
        "admin_validation": true,
        "phaseCount": 1
      }
    ],
    "phase_2": [
      {
        "id": "phase2_vid001",
        "name": "Walking Video",
        "device": "Android",
        "data_type": "Video",
        "file_format": "MP4",
        "iPhone_11_or_Newer": false,
        "video_time_limit": 30,
        "file_size": 100,
        "dimension": {},
        "user_validation": true,
        "admin_validation": true,
        "phaseCount": 1
      }
    ]
  }
}
```

### 3.3 Phase Item Fields — Complete Reference

| Field | Type | Required | Allowed Values | Description |
|-------|------|----------|----------------|-------------|
| `id` | string | Yes | min 10 chars | Unique identifier for this dataset slot. Becomes `dataset_key` on uploads. |
| `name` | string | Yes | any | Display name shown to user |
| `device` | string | Yes | any | Target device (e.g. iPhone, Android, DSLR) |
| `data_type` | string | Yes | `Image`, `Video`, `Audio`, `Text` | Determines upload UI and validation type |
| `file_format` | string | Yes | `JPEG`, `PNG`, `MP4`, `MOV`, `LivePhoto`, `MP3`, `WAV`, `HEIC` | Accepted file extension. `LivePhoto` = HEIC + MOV pair |
| `iPhone_11_or_Newer` | boolean | Yes | `true`, `false` | Device constraint flag (displayed to user) |
| `video_time_limit` | int | Yes | ≥ 0 (seconds) | 0 = no limit. For Video type: max allowed duration in seconds |
| `file_size` | int | Yes | > 0 (MB) | Maximum allowed file size in megabytes |
| `dimension` | object | Yes | see below | Image/video dimension constraints |
| `user_validation` | boolean | Yes | `true`, `false` | Whether user must confirm before submitting |
| `admin_validation` | boolean | Yes | `true`, `false` | Whether admin QA is required for this phase |
| `phaseCount` | int | Yes | > 0 | Number of uploads required from each user for this slot |

### 3.4 Dimension Object

```json
{
  "width":           "1920",         // string or "" for no constraint
  "height":          "1080",         // string or "" for no constraint
  "dimension_match": "Exact"         // "Exact" | "10" | ""
}
```

| `dimension_match` Value | Behaviour |
|------------------------|-----------|
| `"Exact"` | Image width must exactly equal configured width; height must exactly equal configured height |
| `"10"` | Image width must be within ±10% of configured width; same for height |
| `""` (empty) | No dimension validation applied |

### 3.5 Data Type → File Format Mapping

| data_type | Accepted file_format values | Special Handling |
|-----------|-----------------------------|-----------------|
| `Image` | `JPEG`, `PNG`, `HEIC`, `LivePhoto` | `LivePhoto` triggers dual-file upload (HEIC + MOV) |
| `Video` | `MP4`, `MOV` | Duration validated against `video_time_limit` |
| `Audio` | `MP3`, `WAV`, `M4A` | No dimension check; no thumbnail (audio only) |
| `Text` | (no file — plain text input) | Stored as string; no S3 file |

### 3.6 LivePhoto Special Case

When `file_format == "LivePhoto"`:
- User must upload **two files**: a `.HEIC` image AND a `.MOV` video
- Both stored separately in S3 (`s3_key` + `s3_key_secondary`)
- Both get individual thumbnails
- Frontend shows two file pickers simultaneously
- Backend route `/upload/file-live` is used instead of `/upload/file`

---

## 4. Demographic Target Configuration

### 4.1 What Demographic Targets Do

When enabled, the system counts how many **Accepted/Auto-Accepted** uploads exist per demographic value (e.g. Male: 45). When that count reaches the target (e.g. Male: 200), new uploads with that demographic value are **blocked (413 error)**.

### 4.2 demographic_data Structure

```json
{
  "demographic_data": [
    {
      "age": {
        "enabled": true,
        "target": {
          "L1": 50,
          "L2": 100,
          "L3": 150,
          "L4": 100,
          "L5": 50,
          "L6": 20,
          "L7": 0
        }
      }
    },
    {
      "gender": {
        "enabled": true,
        "target": {
          "Male": 200,
          "Female": 200,
          "Non-binary": 50,
          "Other": 20
        }
      }
    },
    {
      "skintone": {
        "enabled": false,
        "target": {}
      }
    },
    {
      "ethnicity": {
        "enabled": false,
        "target": {}
      }
    }
  ]
}
```

### 4.3 DemographicTarget Field Rules

| Field | Type | Rule |
|-------|------|------|
| `enabled` | boolean | If `false`, the demographic is not collected; field is excluded from upload form |
| `target` | dict[str, int] | Required when `enabled=true`. Keys are demographic value codes. Values are integers 0–1000. 0 = unlimited for that value. |

### 4.4 Demographic Enabled/Disabled Behaviour

| `enabled` | Upload form shows field? | Target checked on upload? | QA can update value? |
|-----------|--------------------------|---------------------------|----------------------|
| `true` | Yes | Yes (if target > 0) | Yes |
| `false` | No | No | No |

---

## 5. Reference Enums (All Allowed Values)

### 5.1 Age Range (`age`)

| Storage Key | Display Value |
|-------------|---------------|
| `L1` | 15-17 |
| `L2` | 18-24 |
| `L3` | 25-34 |
| `L4` | 35-45 |
| `L5` | 46-64 |
| `L6` | 65+ |
| `L7` | PreferNotToSay |

### 5.2 Gender (`gender`)

| Storage Key | Display Value |
|-------------|---------------|
| `Female` | Female |
| `Male` | Male |
| `Non-binary` | Non-Binary |
| `Other` | Other |

### 5.3 Skin Tone (`skintone`)

| Storage Key | Display Value |
|-------------|---------------|
| `Type1` | Light / Pale White |
| `Type2` | White / Fair |
| `Type3` | Medium White to Olive |
| `Type4` | Olive / Moderate Brown |
| `Type5` | Brown / Dark Brown |
| `Type6` | Black / Very Dark Brown to Black |

### 5.4 Ethnicity (`ethnicity`)

| Storage Key | Display Value |
|-------------|---------------|
| `african` | African |
| `east_asian` | East Asian |
| `european` | European |
| `indigenous_peoples_of_north_america` | Indigenous Peoples of North America |
| `latin_american` | Latin American |
| `middle_eastern_north_african` | Middle Eastern / North African |
| `pacific_islander` | Pacific Islander |
| `south_asian` | South Asian |
| `southeast_asian` | Southeast Asian |
| `unlisted` | Unlisted |

### 5.5 Dataset Quality States

| Value | Who Sets It | Meaning |
|-------|-------------|---------|
| `Pending` | System (on upload) | Just uploaded, awaiting QA review |
| `Accepted` | Admin / QA | Manually accepted by reviewer |
| `Rejected` | Admin / QA | Rejected with reason; user may re-upload |
| `Auto Accepted` | System | Automatically approved (auto-verification) |
| `Auto Rejected` | System | Automatically rejected |
| `QA Rejected` | QA role | Rejected specifically by QA reviewer |
| `Needs Manual Review` | System | Flagged for manual QA (e.g. AI flagged issue) |

### 5.6 User Roles

| Role Constant | Display Name | Permissions |
|---------------|--------------|-------------|
| `admin` | Admin | Full access — create/edit/delete projects, QA |
| `region-admin` | Region Admin | Create projects scoped to their ethnicity group |
| `user` | User | Upload data to assigned projects |
| `vendor-user` | Vendor User | Same as user but vendor-sourced |
| `qaer` | QA Reviewer | Review and mark dataset quality |
| `vendor-qaer` | Vendor QA | Same as qaer but vendor-sourced |

---

## 6. Project Lifecycle & States

### 6.1 Project Status Flags

| Flag | Field | Values | Meaning |
|------|-------|--------|---------|
| Active | `isactive` | `1` = active, `0` = inactive | Inactive projects don't appear to users |
| Expired | Computed | `endDate < today` | `is_expired` flag added to response |
| Completed | Derived | All users at final phase | No explicit flag; derived from tracking |

### 6.2 Project State Machine

```
Created (isactive=1)
    ↓
Live (visible to users, startDate ≤ today ≤ endDate)
    ↓
Expired (endDate < today — still visible to admin)
    ↓
Deactivated (isactive=0 by admin)
    ↓
Deleted (permanently removed, datasets also deleted)
```

### 6.3 Edit Operations Allowed on Live Projects

| Field | Editable? | API |
|-------|-----------|-----|
| `endDate` | Yes | `PUT /editproj` |
| `target` | Yes | `PUT /editproj` |
| `isactive` | Yes (toggle) | `PUT /editproj` |
| `name` | No | Not supported |
| `phases` | No | Not supported after creation |
| `demographic_data` | Targets only | `POST /tracking/updatetarget` |
| `users` | Yes | `POST /users/assign-project` |

---

## 7. Phase Progression Logic

### 7.1 How a User Moves Through Phases

The system determines each user's **active phase** dynamically using `get_phase_status(project_name, email)`.

```
For each phase in [phase_1, phase_2, phase_3, ...]:

  1. Count datasets uploaded by this user for this phase
  2. Count required datasets = len(phases[phase])  ← number of items in phase array

  IF count_uploaded < count_required:
      → active_phase = this phase   (not enough uploads yet)
      STOP

  ELSE (all uploads present):
      IF any upload has quality in [Pending, Rejected, Auto Rejected]:
          → active_phase = this phase   (waiting for QA or re-upload)
          STOP
      ELSE (all Accepted / Auto Accepted):
          → advance to next phase (increment phase digit)
          IF no next phase exists:
              → active_phase = last phase, completed_phase = last phase
          STOP
```

### 7.2 Completed Phases List

`get_completed_phase_list(project_name, email)` returns the list of all phases fully completed (all uploads accepted) before the current active phase.

### 7.3 user_phases Tracking in Project Document

Every time a QA mark is set, the `project.user_phases` array is updated:

```json
{
  "user_phases": [
    {
      "email": "user@example.com",
      "phase": "phase_2",
      "completed_phases": ["phase_1"]
    }
  ]
}
```

This is used by the **Tracking** feature to show how many users have passed each phase.

### 7.4 Phase Advancement Trigger

Phase advancement is triggered **only when `markquality_now()` is called** (i.e. QA marks a dataset). It is NOT triggered on upload.

---

## 8. User Assignment Rules

### 8.1 Assignment Modes

| Mode | `users` field value | Who can upload |
|------|---------------------|----------------|
| All users | `["All"]` | Every account with `role=user` |
| Specific users | `["a@x.com", "b@x.com"]` | Only listed emails |

### 8.2 Region Admin Scoping

When a `region-admin` creates a project with `users=["All"]`:
- System looks up the admin's `ethnicity` list from their user profile
- Expands `"All"` to only users whose `ethnicity` intersects with the admin's ethnicity list
- This enforces regional data collection boundaries

### 8.3 User Access Check on Upload

When a user loads the upload page, the system calls `getprojectdata_now()` which:
1. Fetches project by name
2. Checks: `user.email in project.users` OR `"All" in project.users`
3. If check fails: returns error "User does not have access to this project"
4. If check passes: computes `active_phase` and returns full project config

### 8.4 Project Assignment Email

When a project is created with specific users, or users are added later via `/users/assign-project`, the system sends an email notification to each newly assigned user using the `project_assigned.html` template.

---

## 9. File Upload — How Phase Config Drives It

### 9.1 Upload Page Data Load Sequence

```
1. User navigates to upload page with {pro.pname, pro.iname, pro.id} in route state
2. Frontend calls POST /getprojectdata  {project: pro.pname}
3. Backend returns full project doc including:
   - active_phase (computed per user)
   - phases config
4. Frontend finds phaseData = phases[active_phase].find(item => item.name == pro.iname)
5. From phaseData, frontend extracts:
   - data_type → determines upload UI (image picker / video picker / text input)
   - file_format → determines accepted file extension
   - video_time_limit → shown as warning; validated client + server side
   - file_size → shown as note (currently not shown, should be)
   - dimension → for future client-side display
6. Frontend also calls POST /getuserdatasetstatus {project, dataset_key: pro.id}
   to determine if user already uploaded for this slot
```

### 9.2 Upload Already Done — Status Check

`/getuserdatasetstatus` returns:

| `status` value | Meaning | UI behaviour |
|----------------|---------|--------------|
| `0` | No upload yet (or previous was rejected) | Show upload form |
| `1` | Upload exists and is Pending or Accepted | Show "Already uploaded" message |
| Message string | Max rejections reached (rejection_count ≥ 3) | Show rejection limit message |

### 9.3 Server-Side Validation Pipeline (in order)

| Step | Check | Error Code | Error Message |
|------|-------|------------|---------------|
| 1 | Daily rate limit ≤ 50 uploads/user/today | 403 | "You have reached the maximum allowed uploads per day." |
| 2 | File magic bytes match declared filetype | 400 | "Invalid file type" |
| 3 | Duplicate file hash in same project+phase+dataset_key | 409 | "Identical file already uploaded" |
| 4 | File size ≤ phase.file_size (MB) | 413 | "File size should be less than {N} MB." |
| 5 | Video duration ≤ phase.video_time_limit (seconds) | 413 | "Video duration should be less than {N} second." |
| 6 | Image width/height matches phase.dimension (Exact or 10%) | 413 | "Image dimension should be {W}x{H}." or range message |
| 7 | Demographic values are enabled in project config | 400 | (silently filters out disabled fields) |
| 8 | Demographic target not already filled | 413 | "Project dataset limit reached for {demographic} demographic." |

### 9.4 What Happens on Successful Upload

```
1. Carry forward rejection_count from any previous rejected upload for same dataset_key
2. Soft-delete any previous Rejected dataset for same dataset_key + uploadedby
3. Strip EXIF metadata from image bytes
4. Upload file bytes to S3 → get s3_key
5. Insert dataset document to MongoDB (with s3_key, no binary data)
6. Insert dataset_history record
7. Increment Redis daily upload counter for user
8. Queue background task: generate thumbnail → upload to S3 → update dataset.thumbnail_s3_key
9. Return {message: "Saved successfully", statuscode: 200}
```

### 9.5 Dataset Document Written on Upload

```json
{
  "_id": "ObjectId",
  "file_hash": "sha256hexstring",
  "s3_key": "project/phase_1/dataset_key001/uuid_filename.jpg",
  "s3_url": "https://bucket.s3.region.amazonaws.com/...",
  "s3_key_secondary": "",
  "thumbnail_s3_key": "thumbnails/project/phase_1/uuid.jpg",
  "filename": "photo.jpg",
  "project": "ProjectAlpha",
  "fileformat": "image/jpeg",
  "filetype": "Image",
  "uploadedby": "user@example.com",
  "isactive": 1,
  "tags": [],
  "quality": "Pending",
  "attributes": {
    "name": "photo.jpg",
    "size": 2048000,
    "type": "image/jpeg",
    "width": 1920,
    "height": 1080
  },
  "createdon": "2026-06-08 10:30",
  "modifiedon": "2026-06-08 10:30",
  "modifiedby": "user@example.com",
  "phase": "phase_1",
  "dataset_key": "phase1_img001_abc",
  "rejection_count": 0,
  "demographic_data": {
    "age": "L2",
    "gender": "Female"
  },
  "reason": "",
  "is_deleted": false
}
```

---

## 10. Dataset Quality States & QA Flow

### 10.1 Quality State Machine

```
Upload → quality = "Pending"
            ↓
    QA Reviews Dataset
    ┌─────────────────────────────────┐
    │                                 │
    ↓                                 ↓
"Accepted" / "Auto Accepted"     "Rejected" / "QA Rejected"
    ↓                                 ↓
Phase may advance              rejection_count += 1
                               User may re-upload IF rejection_count < 3
                               IF rejection_count >= 3: upload permanently blocked
```

### 10.2 Rejection Count System

| `rejection_count` | User can upload again? |
|-------------------|------------------------|
| 0 | Yes (first rejection) |
| 1 | Yes |
| 2 | Yes (last chance) |
| 3+ | No — permanently blocked for this dataset_key |

`REJECTED_COUNT = 3` is a configurable constant.

When user re-uploads after rejection:
- Old rejected dataset is **soft-deleted** (`is_deleted=true`)
- New upload carries forward the `rejection_count` from the old record

### 10.3 QA Mark Quality API

`POST /markquality` with `MarkQualityData`:

**Path A — Quality only:**
```json
{
  "id": "dataset_objectid",
  "quality": "Accepted",
  "reason": ""
}
```

**Path B — Demographic override (no quality change):**
```json
{
  "id": "dataset_objectid",
  "age": "L3",
  "gender": "Male",
  "skintone": "",
  "ethnicity": ""
}
```
If any demographic field is non-empty, the system updates demographic_data only (does NOT change quality).

### 10.4 History Record Written on Every QA Action

```json
{
  "project": "ProjectAlpha",
  "phase": "phase_1",
  "dataset_id": "string ObjectId",
  "filename": "photo.jpg",
  "modifiedby": "admin@example.com",
  "modifiedon": "2026-06-08 11:00",
  "demographic_data": {"age": "L2", "gender": "Female"},
  "quality": "Accepted",
  "dataset_key": "phase1_img001_abc",
  "reason": "",
  "uploadedby": "user@example.com"
}
```

---

## 11. Demographic Target Enforcement

### 11.1 How Targets Are Checked

On every upload, `validate_target(project, demographic_data_input)` runs:

```
For each demographic key in submitted demographic_data:
  1. Get demographic value (e.g. key="gender", value="Male")
  2. Query dataset collection:
     COUNT WHERE project=X AND demographic_data.gender="Male"
     AND quality IN [Accepted, Auto Accepted]
  3. Get target for "Male" from project.demographic_data[gender].target
  4. IF target > 0 AND count >= target:
       → REJECT upload with 413: "Project dataset limit reached for Female demographic."
```

### 11.2 Tracking Category Status

The tracking system assigns a `category_status` per demographic value:

| Category | Condition |
|----------|-----------|
| `Need More Submissions` | in_pipeline < target |
| `Need More QA` | in_pipeline == target AND accepted < target |
| `Demographic Fulfilled` | accepted == target |
| `Overflow` | in_pipeline > target AND accepted < target |
| `Fulfilled & Overview` | in_pipeline > target AND accepted >= target |

Where `in_pipeline = accepted + pending`.

### 11.3 Updating Targets After Project Creation

Admin can update individual demographic targets without recreating the project:

`POST /tracking/updatetarget`
```json
{
  "project": "ProjectAlpha",
  "demographic_name": "gender",
  "demographic_value": "Male",
  "target": 250
}
```
Constraint: `target` must be > 0 and < 1000.

---

## 12. Tracking & Analytics

### 12.1 Basic Tracking — `/tracking/basic`

Returns:
- `pending_count`: datasets with quality Pending or Needs Manual Review
- `qa_approved_count`: datasets with quality Accepted or Auto Accepted
- `in_pipeline`: pending + qa_approved
- `assigned_users`: total users assigned to project
- `phase_user_count`: per-phase counts of users who have completed it

### 12.2 Advance Tracking — `/tracking/advance`

Input: `{project, demographic_key}` (e.g. `demographic_key = "gender"`)

Returns per demographic value:
- `pending`, `accepted`, `rejected`, `submitted`, `in_pipeline`
- `target_value`
- `in_pipeline_percent` (% of target filled)
- `in_pipeline_vs_target` (e.g. "45/200")
- `category_status`
- Per-phase breakdown of users who submitted with that demographic value

### 12.3 Drilldown Tracking — `/tracking/drilldown`

Returns list of rejected datasets for phase_1 with:
- `filename`, `uploaded_by`, `phase`, `status`, `date_submitted`
- `qaed_by`, `qaed_on`, `reason`
- All demographic_data fields

### 12.4 Phase User Count Tracking

The tracking system counts how many users are at each phase by reading `project.user_phases`:

```
{
  "phase_1": 45,           // users currently on phase 1
  "passed_phase_1": 30,    // users who completed phase 1
  "phase_2": 28,           // users currently on phase 2
  "passed_phase_2": 10,    // users who completed phase 2
  "total_assigned_users": 80,
  "total_active_users": 73
}
```

---

## 13. Validation Rules — Full List

### 13.1 Project Creation Validation

| Field | Rule | Error |
|-------|------|-------|
| `name` | 1–50 chars, no `<>'"&` escape characters, must be unique | 409 Conflict if name exists |
| `project_type` | Must be `"collection"` or `"annotation"` | 422 |
| `endDate` | Must be >= `startDate` | 422 |
| `phases` | Required for collection type; must be non-empty dict | 400 |
| `phases[key]` | Key must follow `phase_N` pattern | 400 |
| `phases[key][item]` | Must contain all 11 required keys | 400 |
| `demographic_data[item].key` | Must be one of `[age, gender, ethnicity, skintone]` | 422 |
| `demographic_data[item].target.value` | Integer 0–1000 | 422 |
| `endDate` (on edit) | Cannot be less than today's date | 422 |
| `target` | Must be > 0 | 422 |
| `instruction` | 1–350 chars | 422 |

### 13.2 File Upload Validation

| Rule | Condition | Error Code |
|------|-----------|------------|
| Rate limit | > 50 uploads by same user today | 403 |
| File magic bytes | MIME does not match declared filetype | 400 |
| Duplicate hash | Same SHA-256 already in same project+phase+dataset_key | 409 |
| File size | `file.size > phase.file_size * 1024 * 1024` | 413 |
| Video duration | `attributes.duration > phase.video_time_limit` | 413 |
| Image width — Exact | `width != phase.dimension.width` | 413 |
| Image height — Exact | `height != phase.dimension.height` | 413 |
| Image width — 10% | `width < min_width OR width > max_width` | 413 |
| Image height — 10% | `height < min_height OR height > max_height` | 413 |
| Demographic target | `accepted_count >= target for demographic value` | 413 |
| dataset_key length | `len(dataset_key) < 10` | 422 |
| phase format | Must match `phase_N` pattern (7 chars) | 422 |

### 13.3 QA / Mark Quality Validation

| Rule | Error |
|------|-------|
| `quality` must be one of 7 valid values | 422 |
| `reason` max 100 chars | 422 |
| `reason` cannot contain `\r` or `\t` | 422 |
| `id` must be valid ObjectId | 400 |
| If demographic fields submitted + quality submitted → only demographic path runs | Logic path (not error) |

---

## 14. What to Build — Backend (New App)

### 14.1 Project Creation Route

**Endpoint:** `POST /projects/create`  
**Auth:** Admin only  
**Request body:**

```python
class ProjectData(BaseModel):
    name: str                           # unique, 1-50 chars, escape-sanitized
    project_type: Literal["collection", "annotation"]
    target: int                         # > 0
    startDate: date
    endDate: date                       # >= startDate
    instruction: str                    # 1-350 chars
    users: List[str]                    # emails or ["All"]
    phases: Optional[dict]              # required for collection type
    demographic_data: Optional[List[Dict[str, DemographicTarget]]]
    initial_scene: Optional[str]        # max 350 chars
    action_template: Optional[str]
```

**Business logic steps:**

```
1. Validate name: escape characters, uniqueness check in DB
2. Validate endDate >= startDate
3. If project_type == "collection":
   a. Require phases is not None
   b. Call validate_phase(phases):
      - Each key matches "phase_\d+" pattern
      - Each value is list of phase configs
      - Each config has all 11 required keys
4. If ROLE_REG_ADMIN and users == ["All"]:
   - Expand users to all ROLE_USER emails whose ethnicity intersects admin's ethnicity list
5. Serialize demographic_data from [{"age": DemographicTarget}] format to [{age: {...}}]
6. Insert project document with created_by, created_on, isactive=1, need_auto_verification=1
7. Send project_assignment_email to users list (background task)
8. Return 201 Created
```

**Error handling:**

| Condition | Status | Message |
|-----------|--------|---------|
| Name already exists | 409 | "Project name already Exists" |
| Invalid phase data | 400 | "Invalid Phase data" |
| Missing phases for collection | 400 | "Project phase is missing." |
| Unhandled exception | 500 | str(exception) |

### 14.2 Phase Validation Function

```python
def validate_phase(phases: dict) -> bool:
    REQUIRED_PHASE_KEYS = [
        "device", "name", "data_type", "iPhone_11_or_Newer",
        "file_format", "video_time_limit", "user_validation",
        "admin_validation", "phaseCount", "id", "file_size"
    ]
    if not isinstance(phases, dict) or not phases:
        return False
    for phase_key, phase_items in phases.items():
        if "phase" not in phase_key:
            return False
        if not isinstance(phase_items, list):
            return False
        for item in phase_items:
            if not all(k in item for k in REQUIRED_PHASE_KEYS):
                return False
    return True
```

### 14.3 Project Edit Route

**Endpoint:** `PUT /projects/edit`  
**Auth:** Admin + QA  
**Fields editable:** `endDate`, `target`, `isactive`  
**Constraint:** `endDate` cannot be < today on edit

### 14.4 Project Delete Route

**Endpoint:** `POST /projects/delete`  
**Auth:** Admin only  
**Steps:**
1. Check project exists
2. Delete `projects` document
3. Query `dataset` for all records where `project = name`, collect `s3_key` and `thumbnail_s3_key`
4. Call `bulk_delete_files(keys)` on S3
5. Delete all `dataset` documents for this project
6. Return 200

### 14.5 Get Project Data Route (User-facing)

**Endpoint:** `POST /projects/get-data`  
**Auth:** Any authenticated user  
**Steps:**
1. Fetch project by name
2. If user is ROLE_USER or ROLE_VEN_USER:
   - Check user is in `project.users` or `"All"` in `project.users`
   - Call `get_phase_status(name, user.email)` → inject `active_phase` into response
3. Strip `users` list and `user_phases` from response (not exposed to regular users)
4. Return enriched project document

### 14.6 Required MongoDB Indexes for Projects

```javascript
db.projects.createIndex({ "name": 1 }, { unique: true })
db.projects.createIndex({ "project_type": 1 })
db.projects.createIndex({ "isactive": 1, "endDate": 1 })
db.projects.createIndex({ "created_by": 1 })
db.projects.createIndex({ "users": 1 })
```

### 14.7 Phase Status Algorithm (Python)

```python
def get_phase_status(project_name: str, email: str) -> tuple[str, str | None]:
    project = get_project_by_name(project_name)
    if not project or "phases" not in project:
        return {}, None

    phase_list = list(project["phases"].keys())
    completed_phase = None

    for phase in phase_list:
        uploads = list(dataset_collection.find(
            {"project": project_name, "uploadedby": email, "phase": phase}
        ))
        required = len(project["phases"][phase])

        if len(uploads) < required:
            return phase, completed_phase  # not enough uploads

        qualities = [u["quality"] for u in uploads]
        if any(q in ["Pending", "Rejected", "Auto Rejected"] for q in qualities):
            return phase, completed_phase  # waiting for QA or re-upload

        # All accepted → advance
        idx = phase_list.index(phase)
        if idx + 1 < len(phase_list):
            # Move to next phase
            continue
        else:
            completed_phase = phase  # last phase, all done
            return phase, completed_phase

    return phase_list[-1], completed_phase
```

### 14.8 Tracking Route Requirements

Build three tracking routes:

**Basic** (`POST /tracking/basic`):
- Input: `project_id` (ObjectId string)
- Aggregate dataset by quality for the project
- Count users in `user_phases` per phase (passed counts)
- Return: `{pending_count, qa_approved_count, in_pipeline, phase_user_count, assigned_users}`

**Advance** (`POST /tracking/advance`):
- Input: `project`, `demographic_key` (e.g. "gender")
- Group datasets by `demographic_data[key]` + quality
- Merge counts with project targets
- Return: per-demographic-value stats + per-phase breakdown

**Drilldown** (`POST /tracking/drilldown`):
- Input: `project`
- Return all rejected datasets for phase_1 with uploader/QA info

**Update Target** (`POST /tracking/update-target`):
- Input: `{project, demographic_name, demographic_value, target (1–999)}`
- Use MongoDB array filters to update nested `demographic_data.$[elem].key.target.value`

---

## 15. What to Build — Frontend (New App)

### 15.1 Create Project Page — Multi-Step Form

Build a **5-step MUI Stepper**:

**Step 1 — Basic Info**

| Field | Component | Validation |
|-------|-----------|------------|
| Project Name | `<TextField>` | Required, 1-50 chars, no special chars |
| Project Type | `<Select>` | `Collection` or `Annotation`; drives step 2 |
| Total Target | `<TextField number>` | Required, > 0 |
| Start Date | `<DatePicker>` | Required |
| End Date | `<DatePicker>` | Required, must be >= Start Date |
| Instructions | `<TextField multiline>` | Required, 1–350 chars |

**Step 2 — Phase Configuration** *(collection type only)*

Dynamic section — admin can add/remove phases.

Per phase:
- Add Dataset Slot button → adds a new item to the phase array
- Per slot fields:

| Field | Component | Options |
|-------|-----------|---------|
| Slot Name | `<TextField>` | Free text |
| Device | `<TextField>` | Free text |
| Data Type | `<Select>` | Image / Video / Audio / Text |
| File Format | `<Select>` | JPEG, PNG, MP4, MOV, LivePhoto, MP3, WAV, HEIC |
| File Size (MB) | `<TextField number>` | > 0 |
| Video Time Limit (s) | `<TextField number>` | Shown only if Data Type = Video |
| Dimension Width | `<TextField number>` | Optional |
| Dimension Height | `<TextField number>` | Optional |
| Dimension Match | `<Select>` | Exact / 10% / None |
| iPhone 11 or Newer | `<Switch>` | boolean |
| User Validation | `<Switch>` | boolean |
| Admin Validation | `<Switch>` | boolean |
| Phase Count | `<TextField number>` | > 0 |

**Step 3 — Demographic Targets**

Per demographic category (age, gender, skintone, ethnicity):
- Toggle `enabled` with `<Switch>`
- When enabled: show target input per allowed value
- Each target input: `<TextField number>` 0–1000

Example layout:
```
Gender  [enabled toggle: ON]
  Male:      [200] uploads
  Female:    [200] uploads
  Non-binary: [50] uploads
  Other:      [20] uploads
```

**Step 4 — User Assignment**

- Radio: `All Users` | `Select Specific Users`
- If specific: searchable `<Autocomplete multiple>` with user email list from `/users/all`
- Show selected user count

**Step 5 — Review & Submit**

- Summary of all configured fields
- Expandable sections per phase
- Confirm & Create button → calls `POST /createproject`
- On success: redirect to project list

### 15.2 Edit Project Page

Simple form (not a stepper):

| Field | Editable |
|-------|----------|
| End Date | Yes — `<DatePicker>` (cannot be < today) |
| Target | Yes — `<TextField number>` |
| Active/Inactive | Yes — `<Switch>` |
| Name / Phases / Demographics | Not editable |

Calls `PUT /editproj`.

### 15.3 Upload Page — Phase-Aware

The upload page receives `{pro.pname, pro.iname, pro.id}` from route state and must:

1. Call `POST /getprojectdata` on mount → extract `active_phase` and `phaseData`
2. Call `POST /getuserdatasetstatus` → determine if already uploaded
3. Show `phaseData` constraints before file picker: format, max size, dimension if applicable
4. Render correct input based on `data_type`:
   - `Image` (non-LivePhoto): single image file picker
   - `Image` (LivePhoto): two pickers — HEIC + MOV
   - `Video`: video file picker + video preview
   - `Audio`: audio file picker
   - `Text`: multiline text input
5. On file select: extract EXIF (images), extract duration/framerate (videos), validate format client-side
6. Show demographic form if project has enabled demographics:
   - Only show enabled demographic fields
   - Use `<Select>` dropdowns with the enum values from Section 5
7. Submit builds FormData and calls `/uploadfile` or `/uploadfilelive` or `/uploadtext`
8. Handle all response codes with specific messages (see Section 13.2)

### 15.4 Track Report Page (Admin)

Three tabs:
1. **Basic** — upload totals, QA approved %, phase completion bars
2. **Advance** — demographic selector dropdown; bar chart (current vs target per value); per-phase breakdown table
3. **Drilldown** — table of rejected datasets with QA info

Inline target editing on Advance tab: click a target number → `<TextField>` → save → `POST /tracking/updatetarget`.

### 15.5 State Required on Frontend

```javascript
// For project creation
projectForm: {
  name, project_type, target, startDate, endDate, instruction,
  users,  // list of emails or ["All"]
  phases: {
    phase_1: [
      { id, name, device, data_type, file_format, iPhone_11_or_Newer,
        video_time_limit, file_size, dimension: {width, height, dimension_match},
        user_validation, admin_validation, phaseCount }
    ]
  },
  demographic_data: [
    { age:      { enabled: bool, target: { L1: int, L2: int, ... } } },
    { gender:   { enabled: bool, target: { Male: int, Female: int, ... } } },
    { skintone: { enabled: bool, target: {} } },
    { ethnicity:{ enabled: bool, target: {} } }
  ]
}
```

---

## 16. API Specification

### 16.1 Create Project

```
POST /services/createproject
Auth: ROLE_ADMIN or ROLE_REG_ADMIN (JWT)
Content-Type: application/json

Request: ProjectData (see Section 2.2)

Responses:
201 Created   → {"message": "Project created successfully", "statuscode": 201}
400 Bad Req   → {"error": "Invalid Phase data" | "Project phase is missing.", ...}
409 Conflict  → {"error": "Project name already Exists", "statuscode": 409}
422 Unprocess → Pydantic validation errors
500 Server    → {"error": str(exception), "statuscode": 500}
```

### 16.2 Edit Project

```
PUT /services/editproj
Auth: ROLE_ADMIN or ROLE_QA (JWT)
Content-Type: application/json

Request:
{
  "project": "string",       // existing project name
  "endDate": "YYYY-MM-DD",   // cannot be < today
  "target": int,             // > 0
  "isactive": 0 | 1
}

Response:
200 OK  → {"message": "Updated successfully", "statuscode": 200}
403     → {"error": "Project does not exist", "statuscode": 403}
```

### 16.3 Get Project Data (User-facing)

```
POST /services/getprojectdata
Auth: Any authenticated user (JWT)
Content-Type: application/json

Request: { "project": "ProjectName" }

Response (200):
{
  "_id": "objectid string",
  "name": "ProjectAlpha",
  "project_type": "collection",
  "target": 500,
  "startDate": "2026-01-01",
  "endDate": "2026-12-31",
  "isactive": 1,
  "instruction": "Upload a clear photo of your face.",
  "phases": { "phase_1": [...], "phase_2": [...] },
  "demographic_data": [...],
  "active_phase": "phase_1"   ← injected by server per requesting user
}
```

### 16.4 Delete Project

```
POST /services/delete-project
Auth: ROLE_ADMIN (JWT)
Content-Type: application/json

Request: { "project": "ProjectName" }

Responses:
200 OK   → {"message": "Project data deleted successfully", "statuscode": 200}
409      → {"error": "Project does not exists", "statuscode": 409}
```

### 16.5 All Projects (Admin list)

```
GET /services/allprojects
Auth: ROLE_ADMIN or ROLE_QA (JWT)
Body (optional): { "project_type": "collection" }

Response: Array of project documents, sorted by created_on desc
```

### 16.6 All User Projects (User-facing)

```
GET /services/allUserProjects
Auth: Any authenticated user (JWT)

Response:
{
  "data": [
    {
      "name": "ProjectAlpha",
      "project_type": "collection",
      "active_phase": "phase_1",
      "is_expired": false,
      ...
    }
  ],
  "statuscode": 200
}
```

### 16.7 Update Demographic Target

```
POST /services/tracking/updatetarget
Auth: ROLE_ADMIN (JWT)
Content-Type: application/json

Request:
{
  "project": "ProjectAlpha",
  "demographic_name": "gender",
  "demographic_value": "Male",
  "target": 300
}
Note: target must be > 0 and < 1000

Response:
200 OK → {"message": "Target updated.", "statuscode": 200}
```

---

## 17. Data Flow Diagrams

### 17.1 Project Creation Flow

```
Admin fills form
    │
    ▼
Frontend validates per step (react-hook-form + zod)
    │
    ▼
POST /createproject → ProjectData Pydantic model
    │
    ├─ name uniqueness check (MongoDB find_one)
    ├─ endDate >= startDate
    ├─ validate_phase(phases) if collection type
    ├─ expand "All" users if ROLE_REG_ADMIN
    ├─ serialize demographic_data
    │
    ▼
MongoDB insert (projects collection)
    │
    ▼
Send assignment emails (background task)
    │
    ▼
201 Created → redirect to project list
```

### 17.2 User Upload Flow (Phase-aware)

```
User selects project card on Dashboard
    │
    ├─ route state: { pro: { pname, iname, id } }
    ▼
Upload Page mounts
    │
    ├─ POST /getprojectdata → active_phase, phaseData
    ├─ POST /getuserdatasetstatus → can user upload?
    │
    ├─ If status=1 → "Already uploaded" → no form
    ├─ If status=0 → show upload form
    │
    ▼
User selects file
    │
    ├─ Client validates: file extension, video duration
    ├─ EXIF extracted (display only)
    │
    ▼
User fills demographic fields (if enabled)
    │
    ▼
User submits
    │
    ▼
POST /uploadfile (or /uploadfilelive or /uploadtext)
    │
    ├─ Rate limit check (Redis)
    ├─ Magic byte validation
    ├─ Dedup hash check
    ├─ File size / dimension / duration check
    ├─ Demographic validation & target check
    │
    ├─ S3 upload
    ├─ MongoDB insert
    ├─ History record insert
    ├─ Background: thumbnail generate + S3 upload
    │
    ▼
200 OK → navigate to /dashboard
```

### 17.3 Phase Advancement Flow

```
QA marks dataset as Accepted
    │
    ▼
markquality_now(id, "Accepted", admin_email, reason="")
    │
    ├─ Update dataset.quality = "Accepted"
    ├─ Call get_phase_status(project, uploadedby)
    │   └─ Returns new active_phase based on upload counts + quality
    ├─ Update project.user_phases[user].phase = active_phase
    ├─ Call get_completed_phase_list(project, uploadedby)
    ├─ Update project.user_phases[user].completed_phases = [...]
    ├─ Insert dataset_history record
    │
    ▼
Next time user opens project:
    POST /getprojectdata
    → active_phase = "phase_2"  ← automatically advanced
    → Upload form shows phase_2 items
```

---

*Document generated from full codebase analysis of QualiCollect (FastAPI + ReactJS). All field names, validation rules, and enum values are sourced directly from the running code.*
