import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// Schema shorthand — all tables live in go_aircon schema
export const db = {
  bookings:   () => supabase.schema('go_aircon').from('bookings'),
  quotations: () => supabase.schema('go_aircon').from('quotations'),
  staff:      () => supabase.schema('go_aircon').from('staff'),
}
