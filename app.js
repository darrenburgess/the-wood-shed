import { getSupabaseClient } from '/supabase.js';
import { dataLayer } from '/data/index.js';
import { initializeAuth } from '/auth.js';
import app from '/alpine.js';

// Initialize the Supabase client so it's ready for use.
getSupabaseClient();

// Make the dataLayer available globally for Alpine.js
window.dataLayer = dataLayer;

document.addEventListener('alpine:init', () => {
    Alpine.data('app', app);
});

initializeAuth();
