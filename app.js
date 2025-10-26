import { getSupabaseClient } from '/supabase.js';
import { dataLayer } from '/data/index.js';
import { initializeAuth } from '/auth.js';
import app from '/alpine.js';

// Initialize the Supabase client so it's ready for use.
getSupabaseClient();

// Make the dataLayer available globally for Alpine.js
window.dataLayer = dataLayer;

document.addEventListener('alpine:init', () => {
    // 1. Register the Alpine component. This runs its init() method, which sets up event listeners.
    Alpine.data('app', app);

    // 2. Initialize authentication *after* Alpine is ready.
    // This ensures the component's listeners are in place before any auth events can fire.
    initializeAuth();
});

initializeAuth();
