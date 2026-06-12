-- ─── Waybill feature: run once in Supabase SQL Editor ────────────────────────

CREATE TABLE waybills (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  waybill_no       text UNIQUE NOT NULL,            -- WB-2026-0001
  date             date NOT NULL,
  company_name     text NOT NULL,
  company_address  text,
  recipient_name   text NOT NULL,
  expected_return  date,
  status           text NOT NULL DEFAULT 'Pending IT Approval'
                   CHECK (status IN ('Pending IT Approval','Pending Security Approval','Approved','Rejected')),
  created_by       text NOT NULL,
  it_approved_by         text,
  it_approved_at         timestamptz,
  security_approved_by   text,
  security_approved_at   timestamptz,
  rejected_by      text,
  rejected_at      timestamptz,
  rejection_reason text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE waybill_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  waybill_id    uuid NOT NULL REFERENCES waybills(id) ON DELETE CASCADE,
  asset_id      uuid REFERENCES assets(id) ON DELETE SET NULL,
  description   text NOT NULL,
  serial_number text,
  qty           integer NOT NULL DEFAULT 1 CHECK (qty > 0),
  purpose       text,
  position      integer NOT NULL DEFAULT 0
);

CREATE INDEX waybill_items_waybill_idx ON waybill_items(waybill_id);

-- Match the RLS posture of the existing tables. If your other tables have
-- RLS enabled with authenticated-only policies, mirror them here, e.g.:
-- ALTER TABLE waybills ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE waybill_items ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "auth all" ON waybills FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- CREATE POLICY "auth all" ON waybill_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
