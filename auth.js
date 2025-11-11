import { getSupabaseClient } from '/supabase.js';

export function initializeAuth() {
    const supabaseClient = getSupabaseClient();

    // SET UP AUTH LISTENER (This section USES the supabaseClient)
    supabaseClient.auth.onAuthStateChange((event, session) => {
        const authContainer = document.getElementById('auth-container');
        const appContainer = document.getElementById('app-container');

        if (session) {
            // User is signed in
            appContainer.classList.remove('hidden');
            authContainer.classList.add('hidden');

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
            authError.textContent = 'Check your email for a confirmation link!';
            authError.classList.remove('hidden');
        }
    });

    // Note: Sign out is handled by Alpine.js @click in the sidebar
}