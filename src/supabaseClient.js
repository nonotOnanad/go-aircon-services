import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// Tables live in public schema with goac_ prefix (custom schemas require extra Supabase config)
export const db = {
  bookings:   () => supabase.from('goac_bookings'),
  quotations: () => supabase.from('goac_quotations'),
  staff:      () => supabase.from('goac_staff'),
  ocular:     () => supabase.from('goac_ocular'),
}
