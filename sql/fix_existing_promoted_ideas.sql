-- ============================================================================
-- FIX: Mark existing promoted ideas with promoted_to_resolution_id
-- ============================================================================
-- This script finds ideas that have been promoted to resolutions
-- (by checking resolutions.metadata->>'fact.source_idea_id')
-- and updates their metadata.fact.promoted_to_resolution_id
-- ============================================================================

DO $$
DECLARE
    v_resolution RECORD;
    v_idea RECORD;
    v_idea_new_metadata jsonb;
    v_count int := 0;
BEGIN
    RAISE NOTICE 'Searching for existing promoted ideas...';
    
    -- Find all resolutions that came from ideas
    FOR v_resolution IN 
        SELECT id, metadata->>'fact.source_idea_id' as source_idea_id
        FROM resolutions
        WHERE metadata->>'fact.source_idea_id' IS NOT NULL
    LOOP
        -- Get the source idea
        SELECT * INTO v_idea 
        FROM ideas 
        WHERE id = v_resolution.source_idea_id::uuid;
        
        IF FOUND THEN
            -- Check if already has promoted_to_resolution_id
            IF v_idea.metadata->'fact'->>'promoted_to_resolution_id' IS NULL THEN
                -- Update idea metadata
                v_idea_new_metadata := COALESCE(v_idea.metadata, '{}'::jsonb);
                
                -- Ensure fact object exists
                IF NOT v_idea_new_metadata ? 'fact' THEN
                    v_idea_new_metadata := jsonb_set(v_idea_new_metadata, '{fact}', '{}'::jsonb);
                END IF;
                
                -- Set promoted_to_resolution_id
                v_idea_new_metadata := jsonb_set(
                    v_idea_new_metadata,
                    '{fact,promoted_to_resolution_id}',
                    to_jsonb(v_resolution.id::text)
                );
                
                UPDATE ideas
                SET metadata = v_idea_new_metadata
                WHERE id = v_idea.id;
                
                v_count := v_count + 1;
                RAISE NOTICE 'Updated idea % with resolution %', v_idea.id, v_resolution.id;
            ELSE
                RAISE NOTICE 'Idea % already has promoted_to_resolution_id', v_idea.id;
            END IF;
        ELSE
            RAISE NOTICE 'Source idea % not found for resolution %', v_resolution.source_idea_id, v_resolution.id;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Done. Updated % ideas.', v_count;
END $$;

-- Verify results
SELECT 
    i.id as idea_id,
    i.title,
    i.metadata->'fact'->>'phase' as phase,
    i.metadata->'fact'->>'promoted_to_resolution_id' as promoted_to_resolution_id
FROM ideas i
WHERE i.metadata->'fact'->>'phase' = 'ready_for_vote';

