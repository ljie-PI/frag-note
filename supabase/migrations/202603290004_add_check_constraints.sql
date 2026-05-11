-- Add CHECK constraints for text columns with known enum values

ALTER TABLE fragments
  ADD CONSTRAINT chk_fragments_source_type
    CHECK (source_type IN ('text', 'image', 'link', 'screenshot', 'pdf', 'voice', 'answer')),
  ADD CONSTRAINT chk_fragments_origin_kind
    CHECK (origin_kind IN ('user_capture', 'answer_promotion')),
  ADD CONSTRAINT chk_fragments_status
    CHECK (status IN ('local_only', 'queued_upload', 'syncing', 'processing', 'partially_processed', 'ready', 'failed'));

ALTER TABLE assets
  ADD CONSTRAINT chk_assets_asset_type
    CHECK (asset_type IN ('original', 'preview', 'attachment'));

ALTER TABLE derived_artifacts
  ADD CONSTRAINT chk_derived_artifacts_artifact_type
    CHECK (artifact_type IN ('ocr', 'transcript', 'summary', 'tags', 'embedding', 'answer'));

ALTER TABLE derived_objects
  ADD CONSTRAINT chk_derived_objects_object_type
    CHECK (object_type IN ('topic', 'project', 'entity')),
  ADD CONSTRAINT chk_derived_objects_status
    CHECK (status IN ('candidate', 'confirmed', 'dismissed', 'postponed'));

ALTER TABLE processing_jobs
  ADD CONSTRAINT chk_processing_jobs_status
    CHECK (status IN ('queued', 'running', 'failed', 'completed'));

ALTER TABLE relations
  ADD CONSTRAINT chk_relations_source_object_type
    CHECK (source_object_type IN ('fragment', 'artifact', 'derived_object', 'answer')),
  ADD CONSTRAINT chk_relations_target_object_type
    CHECK (target_object_type IN ('fragment', 'artifact', 'derived_object', 'answer'));

ALTER TABLE answers
  ADD CONSTRAINT chk_answers_query_type
    CHECK (query_type IN ('keyword', 'natural_language')),
  ADD CONSTRAINT chk_answers_answer_format
    CHECK (answer_format IN ('summary', 'bullets', 'timeline', 'comparison'));
