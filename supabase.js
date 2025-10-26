// This file handles the creation of the Supabase client, switching between development and production keys based on the environment.

let supabaseClient = null;

const getSupabaseClient = () => {
    if (supabaseClient) {
        return supabaseClient;
    }

    const PROD_SUPABASE_URL = 'https://qjjjxesxlfmrnmzibdzg.supabase.co';
    const PROD_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqamp4ZXN4bGZtcm5temliZHpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1Njc5NTcsImV4cCI6MjA3MjE0Mzk1N30.ytUXWzmzsIcsfRqSLI6zZbBElrOTUnG6kI1EnLEqQvU';

    const DEV_SUPABASE_URL = 'https://aqtowjfapsviqlpiqxky.supabase.co';
    const DEV_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxdG93amZhcHN2aXFscGlxeGt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNjEwNTIsImV4cCI6MjA3NDYzNzA1Mn0.TCSdF3ZSJmydJdW4-vXf68ABbWwu7UGWe5VRapA5-wE';

    let supabaseUrl;
    let supabaseAnonKey;

    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:') {
        console.log("Running in development mode.");
        supabaseUrl = DEV_SUPABASE_URL;
        supabaseAnonKey = DEV_SUPABASE_ANON_KEY;
    } else {
        console.log("Running in production mode.");
        supabaseUrl = PROD_SUPABASE_URL;
        supabaseAnonKey = PROD_SUPABASE_ANON_KEY;
    }

    const { createClient } = supabase;
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    return supabaseClient;
};

export { getSupabaseClient };
