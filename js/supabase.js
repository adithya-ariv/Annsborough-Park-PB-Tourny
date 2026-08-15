const SUPABASE_URL = "https://iewcfioeemfzefehuhdn.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_baORELQbNFieV1gj1mGgbQ_kHnjw_ZX";

const { createClient } = supabase;

const db = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);