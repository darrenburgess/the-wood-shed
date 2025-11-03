import { getSupabaseClient } from '/supabase.js';
import { getLocalDateString } from '/utils.js';

export const sessionData = {
    /**
     * Get or create today's session for the current user
     * @returns {Object|null} The session object or null on error
     */
    async getTodaySession() {
        const supabaseClient = getSupabaseClient();
        const today = getLocalDateString();

        // Get current user
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        if (userError || !user) {
            console.error('No user logged in or error fetching user:', userError);
            return null;
        }

        // Try to get existing session for today
        const { data: existingSession, error: fetchError } = await supabaseClient
            .from('sessions')
            .select('*, session_goals(goal_id)')
            .eq('user_id', user.id)
            .eq('session_date', today)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
            console.error('Error fetching session:', fetchError);
            return null;
        }

        if (existingSession) {
            return existingSession;
        }

        // Create new session if none exists
        const { data: newSession, error: createError } = await supabaseClient
            .from('sessions')
            .insert({
                user_id: user.id,
                session_date: today
            })
            .select('*')
            .single();

        if (createError) {
            console.error('Error creating session:', createError);
            return null;
        }

        // Add empty session_goals array
        newSession.session_goals = [];
        return newSession;
    },

    /**
     * Add a goal to today's session
     * @param {string} goalId - The goal ID to add
     * @returns {boolean} Success status
     */
    async addGoalToTodaySession(goalId) {
        const supabaseClient = getSupabaseClient();

        // Get or create today's session
        const session = await this.getTodaySession();
        if (!session) {
            return false;
        }

        // Check if goal is already in session
        const alreadyInSession = session.session_goals?.some(sg => sg.goal_id === goalId);
        if (alreadyInSession) {
            console.log('Goal already in session');
            return true; // Not an error, just already there
        }

        // Add goal to session
        const { error } = await supabaseClient
            .from('session_goals')
            .insert({
                session_id: session.id,
                goal_id: goalId
            });

        if (error) {
            console.error('Error adding goal to session:', error);
            return false;
        }

        return true;
    },

    /**
     * Remove a goal from today's session
     * @param {string} goalId - The goal ID to remove
     * @returns {boolean} Success status
     */
    async removeGoalFromTodaySession(goalId) {
        const supabaseClient = getSupabaseClient();

        // Get today's session
        const session = await this.getTodaySession();
        if (!session) {
            return false;
        }

        // Remove goal from session
        const { error } = await supabaseClient
            .from('session_goals')
            .delete()
            .eq('session_id', session.id)
            .eq('goal_id', goalId);

        if (error) {
            console.error('Error removing goal from session:', error);
            return false;
        }

        return true;
    },

    /**
     * Get all goal IDs in today's session
     * @returns {Array<string>} Array of goal IDs
     */
    async getTodaySessionGoalIds() {
        const session = await this.getTodaySession();
        if (!session || !session.session_goals) {
            return [];
        }
        return session.session_goals.map(sg => sg.goal_id);
    }
};
