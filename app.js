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
            topic.isOpen = true; // Topics start expanded
            if (topic.goals) {
                for (const goal of topic.goals) {
                    goal.isOpen = false; // Goals start collapsed
                }
            }
        }

        return topics;
    },
    
    // youtube links are turned into clickable links in the log
    linkify(text) {
        const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
        const youtubeRegex = /^(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})(?:\S+)?$/;

        // This regex is simplified to just process URLs, not Markdown
        return text.replace(urlRegex, (url) => {
            const match = url.match(youtubeRegex);
            const videoId = match ? match[1] : null;

            if (videoId) {
                // Use href="#" to prevent navigation, as Alpine will handle the click
                return `<a class="youtube-link" data-video-id="${videoId}" href="#">${url}</a>`;
            } else {
                return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
            }
        });
    },

    async addTopic(title) {
        // Find the highest existing topic_number for the current user
        const { data: topics, error: fetchError } = await supabaseClient
            .from('topics')
            .select('topic_number')
            .order('topic_number', { ascending: false })
            .limit(1);

        if (fetchError) {
            console.error('Error fetching latest topic number:', fetchError);
            return null;
        }

        const nextTopicNumber = topics.length > 0 ? topics[0].topic_number + 1 : 1;

        // Insert the new topic
        const { data: newTopic, error: insertError } = await supabaseClient
            .from('topics')
            .insert({ 
                title: title, 
                topic_number: nextTopicNumber, 
                user_id: supabaseClient.auth.user().id // Get current user's ID
            })
            .select()
            .single();

        if (insertError) {
            console.error('Error adding new topic:', insertError);
            return null;
        }

        // Return the newly created topic object
        return newTopic;
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
// --- AUTH UI LISTENERS ---

// Get references to the authentication form elements
const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('auth-email');
const passwordInput = document.getElementById('auth-password');
const signUpBtn = document.getElementById('sign-up-btn');
const authError = document.getElementById('auth-error');
const signOutBtn = document.getElementById('sign-out-btn');


// Handle Sign In (when the form is submitted)
authForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const { error } = await supabaseClient.auth.signInWithPassword({
        email: emailInput.value,
        password: passwordInput.value,
    });

    if (error) {
        authError.textContent = error.message;
        authError.classList.remove('hidden');
    } else {
        authError.classList.add('hidden');
        // The onAuthStateChange listener will automatically show the app
    }
});

// Handle Sign Up
signUpBtn.addEventListener('click', async () => {
    const { error } = await supabaseClient.auth.signUp({
        email: emailInput.value,
        password: passwordInput.value,
    });

    if (error) {
        authError.textContent = error.message;
        authError.classList.remove('hidden');
    } else {
        // Clear any previous errors and show a success message
        authError.textContent = 'Check your email for a confirmation link!';
        authError.classList.remove('hidden');
    }
});

// Handle Sign Out
signOutBtn.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
});
