-- Performance and lookup indexes
CREATE INDEX IF NOT EXISTS idx_brands_name_trgm ON brands USING gin (lower(brand_name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_ingredients_name ON ingredients (lower(name));
CREATE INDEX IF NOT EXISTS idx_ingredient_synonyms_name ON ingredient_synonyms (lower(synonym));
CREATE INDEX IF NOT EXISTS idx_interactions_lookup ON interactions (ingredient_a, ingredient_b);
CREATE INDEX IF NOT EXISTS idx_timing_lookup ON timing_rules (ingredient_a, ingredient_b);
CREATE INDEX IF NOT EXISTS idx_patient_medicines_active ON patient_medicines (patient_id) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens (user_id);

-- ROW LEVEL SECURITY (RLS) - SECOND-LAYER DEFENSE
-- Primary protection: API-level query filtering (WHERE caregiver_id = current_user_id)
-- Second-layer protection: Database RLS enforced on checked-out pool connections
-- Pool connects as unprivileged role: medguard_app (non-owner, non-superuser)
-- Each transaction executes: SET LOCAL app.current_user_id = '<authenticated_uuid>';

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE adherence_log ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owners / background connections
ALTER TABLE patients FORCE ROW LEVEL SECURITY;
ALTER TABLE patient_medicines FORCE ROW LEVEL SECURITY;
ALTER TABLE scan_history FORCE ROW LEVEL SECURITY;
ALTER TABLE reminders FORCE ROW LEVEL SECURITY;
ALTER TABLE adherence_log FORCE ROW LEVEL SECURITY;

-- Helper function to extract session-scoped user ID set by connection checkout
CREATE OR REPLACE FUNCTION get_current_user_id() RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_user_id', true), '')::UUID;
EXCEPTION
    WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Drop existing policies if any to allow safe idempotent re-runs
DROP POLICY IF EXISTS rls_patients_policy ON patients;
DROP POLICY IF EXISTS rls_patient_medicines_policy ON patient_medicines;
DROP POLICY IF EXISTS rls_scan_history_policy ON scan_history;
DROP POLICY IF EXISTS rls_reminders_policy ON reminders;
DROP POLICY IF EXISTS rls_adherence_log_policy ON adherence_log;

-- RLS Policy: Patients table (Caregiver owner or granted delegate)
CREATE POLICY rls_patients_policy ON patients
    FOR ALL
    USING (
        caregiver_id = get_current_user_id() 
        OR id IN (SELECT patient_id FROM caregiver_access WHERE user_id = get_current_user_id())
    );

-- RLS Policy: Patient Medicines table (Consistent with caregiver_access)
CREATE POLICY rls_patient_medicines_policy ON patient_medicines
    FOR ALL
    USING (
        patient_id IN (
            SELECT id FROM patients 
            WHERE caregiver_id = get_current_user_id()
               OR id IN (SELECT patient_id FROM caregiver_access WHERE user_id = get_current_user_id())
        )
    );

-- RLS Policy: Scan History table (Consistent with caregiver_access)
CREATE POLICY rls_scan_history_policy ON scan_history
    FOR ALL
    USING (
        patient_id IN (
            SELECT id FROM patients 
            WHERE caregiver_id = get_current_user_id()
               OR id IN (SELECT patient_id FROM caregiver_access WHERE user_id = get_current_user_id())
        )
    );

-- RLS Policy: Reminders table (Consistent with caregiver_access)
CREATE POLICY rls_reminders_policy ON reminders
    FOR ALL
    USING (
        patient_medicine_id IN (
            SELECT pm.id FROM patient_medicines pm
            JOIN patients p ON pm.patient_id = p.id
            WHERE p.caregiver_id = get_current_user_id()
               OR p.id IN (SELECT patient_id FROM caregiver_access WHERE user_id = get_current_user_id())
        )
    );

-- RLS Policy: Adherence Log table (Consistent with caregiver_access)
CREATE POLICY rls_adherence_log_policy ON adherence_log
    FOR ALL
    USING (
        reminder_id IN (
            SELECT r.id FROM reminders r
            JOIN patient_medicines pm ON r.patient_medicine_id = pm.id
            JOIN patients p ON pm.patient_id = p.id
            WHERE p.caregiver_id = get_current_user_id()
               OR p.id IN (SELECT patient_id FROM caregiver_access WHERE user_id = get_current_user_id())
        )
    );

