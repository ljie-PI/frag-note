# Desktop Capture MVP Design

Date: 2026-03-28
Project: sui-note
Status: Draft for user review

## Overview

This spec defines phase 1 of sui-note: a desktop-first capture product for fragmented note intake. The goal is to let a user save note fragments from anywhere in seconds, persist them locally immediately, sync them asynchronously, and have the backend automatically process them into structured artifacts and related-note links for later retrieval.

Phase 1 focuses on desktop capture for macOS, Windows, and Linux, built with Tauri 2. Mobile support remains part of the product direction but is not in scope for this spec.

## Product Goal

The phase 1 product should make this flow reliable:

1. A user triggers capture from anywhere on desktop.
2. The user records a text, image, link, screenshot, PDF, or voice-transcribed fragment.
3. The fragment is saved locally immediately.
4. The fragment syncs to the backend asynchronously.
5. The backend automatically performs extraction, understanding, tagging, and relation linking.
6. The user can inspect the original fragment, processing status, and AI-derived outputs without losing the original evidence.

## Success Criteria

The MVP is successful if a user can:

- Use a global shortcut to open a lightweight capture UI.
- Save supported content types in a few seconds.
- Continue capturing while offline, with no data loss.
- See sync and processing state for each recent capture.
- View AI-derived summary, tags, and related captures after backend processing completes.
- Trust that original captures remain preserved and separable from AI-generated artifacts.

## Scope

### In Scope

- Desktop app for macOS, Windows, and Linux using Tauri 2
- Global shortcut to open a capture palette
- Main desktop window for recent captures and capture detail
- Supported content types:
  - Text
  - Images
  - Links
  - Screenshots with OCR
  - PDF files
  - Voice transcription input
- Local-first persistence
- Asynchronous upload and sync
- Backend task orchestration for OCR, transcription, extraction, summary, tagging, embeddings, and relation linking
- Personal account with private knowledge base
- Relation links between captures

### Out of Scope

- Full mobile app implementation
- Automatic aggregate note generation
- Shared workspaces or collaboration
- Rich document editing comparable to a full note editor
- Local model inference
- Video ingestion and understanding
- Automatic merging of new content into existing notes

## Product Principles

- Capture must be faster than organizing.
- Original content is the source of truth.
- AI augments captured material but never overwrites raw evidence.
- Save-first behavior must work offline.
- Processing is asynchronous, visible, and recoverable.
- Relations are links, not merges.

## Target User Experience

The primary user action is fast capture from anywhere on desktop. The product should feel like a system-level intake tool rather than a heavy editor.

There are two desktop surfaces:

### 1. Capture Palette

A lightweight window opened via global shortcut.

Requirements:

- Opens quickly and focuses the main input field
- Accepts direct typing
- Accepts pasted clipboard text
- Accepts pasted clipboard images
- Shows an area for file selection and drag-and-drop
- Supports PDF and image attachments
- Includes a screenshot action
- Supports voice transcription input as a capture source
- Has a single clear primary save action
- Can close immediately after save while work continues in the background

### 2. Main Window

A management surface for visibility and recovery, not the primary capture flow.

Requirements:

- Shows recent captures
- Shows per-capture sync and processing state
- Allows retry for failed upload or failed AI tasks
- Opens a detail view for each capture
- Separates raw content from derived artifacts

## Supported Content Handling

### Text

- Stored as raw capture content
- Included directly in downstream understanding and indexing

### Image

- Stored as an asset
- OCR runs in the backend
- OCR text is stored as a derived artifact

### Link

- Stored as raw URL plus lightweight metadata
- Backend extracts page title, metadata, and text candidate where possible

### Screenshot

- Stored as an image asset
- OCR runs automatically
- Screenshot acquisition is initiated from the capture palette

### PDF

- Stored as an asset
- Backend extracts text
- OCR may run for image-based pages

### Voice Transcription

- Phase 1 desktop voice input is defined as microphone recording initiated from the capture palette
- The client stores the recorded audio locally as a raw asset before upload
- If offline, the audio asset remains queued locally until sync is available
- The client must handle microphone permission prompts at the OS level and surface a clear failure state if permission is denied
- Backend speech-to-text produces transcript text
- Transcript becomes the main derived textual artifact for understanding and retrieval
- Importing arbitrary audio files is out of scope for phase 1 unless explicitly added in planning

## Architecture

The phase 1 system has four major units.

### 1. Desktop Capture App

Responsibilities:

- Global shortcut registration
- Capture palette UI
- Main window UI
- Clipboard intake
- File drag-and-drop
- Screenshot trigger
- Local persistence
- Sync queue management
- Status presentation

Non-responsibilities:

- Heavy AI processing
- Cross-capture semantic decisions
- Knowledge synthesis beyond local display of returned artifacts

### 2. Local Persistence and Sync Queue

Responsibilities:

- Persist raw captures and assets before any network dependency
- Track sync state
- Retry upload when online
- Restore queue state after app restart

Core rule:

- A capture is considered saved once it is durably persisted locally, not when cloud processing finishes

### 3. Cloud Ingestion and AI Orchestrator

Responsibilities:

- Accept uploaded captures and assets
- Normalize input metadata
- Generate per-capability processing jobs
- Route jobs to different providers by task type
- Persist derived artifacts incrementally
- Compute and store relations to prior captures

### 4. Private Knowledge Store and Retrieval Base

Responsibilities:

- Store raw captures
- Store derived artifacts
- Store relation links
- Store search indexes for future search and QA

## Core Data Model

Phase 1 should at minimum support these core objects.

### Capture

Represents one user capture event.

Suggested fields:

- `capture_id`
- `user_id`
- `created_at`
- `source_type`
- `title_optional`
- `raw_text_optional`
- `status`
- `device_metadata`
- `language_hint_optional`

### Asset

Represents raw attached material associated with a capture.

Suggested fields:

- `asset_id`
- `capture_id`
- `asset_type`
- `mime_type`
- `storage_path`
- `file_name_optional`
- `size_bytes`

### DerivedArtifact

Represents machine-generated or extraction-generated outputs.

Examples:

- OCR text
- PDF extracted text
- Transcript text
- Summary
- Tags
- Embedding references
- Extracted entities

Suggested fields:

- `artifact_id`
- `capture_id`
- `artifact_type`
- `version`
- `content`
- `provider_metadata`
- `created_at`

### Relation

Represents a link between captures without merging them.

Suggested fields:

- `relation_id`
- `source_capture_id`
- `target_capture_id`
- `relation_type`
- `confidence`
- `explanation`
- `created_at`

### ProcessingJob

Represents upload, extraction, understanding, or linking work.

Suggested fields:

- `job_id`
- `capture_id`
- `job_type`
- `status`
- `attempt_count`
- `provider`
- `error_code_optional`
- `error_message_optional`
- `started_at_optional`
- `completed_at_optional`

## Processing Pipeline

The backend must operate as a job orchestration system, not a single-model endpoint.

### Stage 1. Ingestion

Responsibilities:

- Receive raw capture and assets
- Validate metadata
- Persist raw materials
- Enqueue downstream jobs

### Stage 2. Extraction

Responsibilities:

- OCR for images and screenshots
- Speech-to-text for voice input
- PDF text extraction and optional OCR for image-based pages
- Link metadata and content extraction
- Basic normalization and cleanup

Output:

- Derived textual and structural artifacts usable by later stages

### Stage 3. Understanding

Responsibilities:

- Summary generation
- Tag generation
- Entity or keyword extraction
- Language detection if needed
- Embedding generation

### Stage 4. Linking

Responsibilities:

- Retrieve candidate prior captures using semantic similarity and metadata signals
- Re-rank or validate candidate links
- Persist relation records with explanation text

Phase 1 linking rule:

- New captures remain independent records even when highly related to older captures

## Model Routing

The backend should include a capability-oriented routing layer so each task type can use a different provider.

At minimum, routing should support:

- OCR provider
- Speech-to-text provider
- Embedding provider
- LLM provider for summarization, tagging, understanding, and relation explanation

The routing layer should be configurable so providers can be swapped without redesigning the pipeline.

## Client Status Model

Each capture should surface clear states to the user.

Suggested state model:

- `local_only`
- `queued_upload`
- `syncing`
- `processing`
- `partially_processed`
- `ready`
- `failed`

Failures should distinguish:

- Local save failure
- Upload failure
- Extraction failure
- Understanding failure
- Linking failure

The UI must make it obvious that a capture can still exist safely even when some AI work fails.

## Capture Detail View

The detail view should separate:

### Raw Content

- Original typed text
- Original URL
- Original assets such as image, PDF, screenshot, or audio attachment

### Derived Artifacts

- OCR text
- Transcript text
- Summary
- Tags
- Related captures

This separation is required so the user can distinguish evidence from interpretation.

## Knowledge Base Design

Phase 1 should organize data in three layers.

### Raw Layer

Stores raw capture events and raw assets. This is the final citation target for future search and QA.

### Derived Layer

Stores extraction and AI outputs. These artifacts are replaceable and can be regenerated.

### Relation Layer

Stores links between captures and why they are related.

This layered design supports future search, question answering, and user-triggered aggregate note generation without corrupting original captures.

## Retrieval Foundations for Later Phases

Although phase 1 does not implement full search and QA, it should preserve the minimum data hooks needed for those later phases.

### Phase 1 Requirements

- Store enough normalized text from raw and derived artifacts so later keyword indexing can be added without redefining the capture model
- Generate and persist embeddings or embedding-ready artifact boundaries needed for relation linking
- Preserve pointers from derived artifacts back to the originating raw capture or asset
- Preserve relation explanation data so future retrieval can expand context intelligibly

### Explicit Non-Requirement for Phase 1

- Phase 1 does not need to ship a user-facing search experience
- Phase 1 does not need to provision a production-grade general retrieval stack beyond what is required for relation linking

The purpose of this section is to keep the data model compatible with later search and QA work without forcing phase 1 to implement those later features now.

## Privacy and Data Boundaries

Phase 1 account model:

- One personal account per user
- One private knowledge base per user

Data boundary rules:

- Raw captures and derived artifacts belong to the user private space
- Cloud processing may use multiple providers by task type
- Raw captures are not overwritten by AI output
- The product should support deletion semantics for captures and their derived artifacts

The product should clearly communicate that processing is cloud-first in phase 1.

### Deletion Semantics

- Phase 1 should treat user deletion as deletion of the capture, its assets, and its derived artifacts as one logical unit
- The user-facing product behavior should be immediate removal from normal views
- Whether the backend uses soft delete or hard delete internally can be decided in planning, but the external contract should assume the item is no longer available to the user after deletion completes

## Reliability and Error Handling

The system must preserve a strict distinction between capture durability and downstream processing success.

Rules:

- A saved local capture is durable even if the network is unavailable
- Upload retries must survive app restarts
- AI subtask failure must not invalidate the capture record
- Subtasks must be retryable independently
- Partial results may be shown before all tasks finish

## Testing Strategy

Planning and implementation should cover at least these test layers:

### Desktop Flow Tests

- Global shortcut opens the capture palette
- Paste text and paste image flows
- Drag-and-drop for supported files
- Screenshot initiation and returned asset handling

### Local Persistence and Sync Tests

- Offline save behavior
- Queue replay after reconnect
- Queue restoration after app restart

### Backend Pipeline Tests

- Correct job generation per content type
- Independent retries for failed subtasks
- Incremental artifact persistence

### Retrieval Foundation Tests

- Embedding generation for supported content
- Relation candidate generation
- Relation explanation persistence
- Evidence and citation pointer persistence

## Open Decisions Deferred to Planning

The design intentionally defers implementation-specific choices such as:

- Exact local database technology
- Exact cloud storage technology
- Exact message queue or workflow engine
- Exact model providers and cost controls
- Exact screenshot implementation details per OS
- Exact auth provider

These should be decided in implementation planning, not added as implicit requirements here.

## Acceptance Criteria

The design is implemented correctly if phase 1 can demonstrate:

1. On macOS, Windows, and Linux, a user can open a capture palette with a global shortcut.
2. The user can save text, images, links, screenshots, PDFs, and voice transcription inputs.
3. The app saves captures locally before any cloud dependency.
4. The app syncs captures asynchronously and recovers from temporary offline conditions.
5. The backend processes captures using task-specific providers.
6. The system stores summaries, tags, and related-capture links as derived artifacts rather than overwriting originals.
7. The UI shows recent captures, status, failures, and retry actions.
8. The resulting data model supports future natural-language search with citations to original captured material.

## Recommended Implementation Order

To keep planning bounded, the expected phase 1 delivery order is:

1. Desktop shell, local persistence, and capture palette for text and image flows
2. Sync queue and backend ingestion
3. File flows for link, screenshot, and PDF capture
4. Cloud extraction and understanding jobs
5. Relation linking and detail view enrichment
6. Voice recording and transcription flow
7. Hardening for retries, offline recovery, and cross-platform behavior

## Planning Boundary

This spec is intentionally limited to phase 1 desktop capture. It provides the design basis for a subsequent implementation plan. Search UX, answer formatting, aggregate note generation, and full mobile experiences should be designed in later specs as separate sub-projects.
