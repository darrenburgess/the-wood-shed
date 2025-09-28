// ============================================================================
// APP.JS - The "Brain" of the Application
// ============================================================================

function initializeSupabaseClient() {
    // Production Keys
    const PROD_SUPABASE_URL = 'https://qjjjxesxlfmrnmzibdzg.supabase.co';
    const PROD_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqamp4ZXN4bGZtcm5temliZHpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1Njc5NTcsImV4cCI6MjA3MjE0Mzk1N30.ytUXWzmzsIcsfRqSLI6zZbBElrOTUnG6kI1EnLEqQvU'; 

    // Development Keys
    const DEV_SUPABASE_URL = 'https://aqtowjfapsviqlpiqxky.supabase.co'; 
    const DEV_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxdG93amZhcHN2aXFscGlxeGt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNjEwNTIsImV4cCI6MjA3NDYzNzA1Mn0.TCSdF3ZSJmydJdW4-vXf68ABbWwu7UGWe5VRapA5-wE'; // Paste your new dev project key here

    let supabaseUrl;
    let supabaseAnonKey;

    if (window.location.hostname === 'localhost' || window.location.protocol === 'file:') {
        console.log("Running in development mode.");
        supabaseUrl = DEV_SUPABASE_URL;
        supabaseAnonKey = DEV_SUPABASE_ANON_KEY;
    } else {
        console.log("Running in production mode.");
        supabaseUrl = PROD_SUPABASE_URL;
        supabaseAnonKey = PROD_SUPABASE_ANON_KEY;
    }

    return supabase.createClient(supabaseUrl, supabaseAnonKey);
}

const supabaseClient = initializeSupabaseClient();

// --- DATA LAYER ---
window.dataLayer = {
    async fetchPlanData() {
        const { data: topics, error } = await supabaseClient
            .from('topics')
            .select('id, topic_number, title, goals(*, logs(*))')
            .order('topic_number', { ascending: true });

        if (error) {
            console.error('Error fetching plan data:', error);
            return [];
        }

        // Handle numerical sorting of goals
        for (const topic of topics) {
            if (topic.goals) {
                topic.goals.sort((a, b) => {
                    const aParts = a.goal_number.split('.').map(Number);
                    const bParts = b.goal_number.split('.').map(Number);
                    if (aParts[0] !== bParts[0]) {
                        return aParts[0] - bParts[0];
                    }
                    return aParts[1] - bParts[1];
                });
            }
        }
        return topics;
    }
};

// --- GLOBAL APP STATE ---

// The main Alpine.js component will control the UI, but we can listen for auth
// changes to show/hide the main app vs the login form.
supabaseClient.auth.onAuthStateChange((event, session) => {
    const authContainer = document.getElementById('auth-container');
    const appContainer = document.getElementById('app-container');

    if (session) {
        // User is signed in
        appContainer.classList.remove('hidden');
        authContainer.classList.add('hidden');
    } else {
        // User is signed out
        appContainer.classList.add('hidden');
        authContainer.classList.remove('hidden');
    }
});
