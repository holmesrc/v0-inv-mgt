-- Supplier Integration Requests table
CREATE TABLE IF NOT EXISTS supplier_integration_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_name TEXT NOT NULL,
  supplier_website TEXT,
  api_docs_url TEXT,
  requester TEXT NOT NULL,
  notes TEXT,
  lab_id UUID REFERENCES labs(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'denied')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
