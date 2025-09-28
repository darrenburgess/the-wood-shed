// DEFINE HOW TO CREATE THE CLIENT
function initializeSupabaseClient() {
    // Production Keys
    const PROD_SUPABASE_URL = 'https://qjjjxesxlfmrnmzibdzg.supabase.co';
    const PROD_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqamp4ZXN4bGZtcm5temliZHpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1Njc5NTcsImV4cCI6MjA3MjE0Mzk1N30.ytUXWzmzsIcsfRqSLI6zZbBElrOTUnG6kI1EnLEqQvU'; // Make sure this is filled in

    // Development Keys
    const DEV_SUPABASE_URL = 'https://aqtowjfapsviqlpiqxky.supabase.co';
    const DEV_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxdG93amZhcHN2aXFscGlxeGt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNjEwNTIsImV4cCI6MjA3NDYzNzA1Mn0.TCSdF3ZSJmydJdW4-vXf68ABbWwu7UGWe5VRapA5-wE'; // Make sure this is filled in

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

// CREATE THE CLIENT (MUST BE BEFORE ANYTHING THAT USES IT)
const supabaseClient = initializeSupabaseClient();


// DEFINE THE DATA LAYER (This section USES the supabaseClient)
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

        // Add isOpen property for UI state
        for (const topic of topics) {
            topic.isOpen = true; 
        }

        return topics;
    }
};


// SET UP AUTH LISTENER (This section USES the supabaseClient)
supabaseClient.auth.onAuthStateChange((event, session) => {
    const authContainer = document.getElementById('auth-container');
    const appContainer = document.getElementById('app-container');

    if (session) {
        // User is signed in
        appContainer.classList.remove('hidden');
        authContainer.classList.add('hidden');
        
        // Send the "ready" signal to our Alpine component
        window.dispatchEvent(new CustomEvent('user-signed-in'));

    } else {
        // User is signed out
        appContainer.classList.add('hidden');
        authContainer.classList.remove('hidden');
    }
});
