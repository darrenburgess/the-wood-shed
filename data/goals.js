import { getSupabaseClient } from '/supabase.js';

export const goalData = {
    async updateGoal(goalId, newDescription) {
        const supabaseClient = getSupabaseClient();
        const { error } = await supabaseClient
            .from('goals')
            .update({ description: newDescription })
            .eq('id', goalId);
        if (error) console.error('Error updating goal:', error);
    },

    async deleteGoal(goal) {
        const supabaseClient = getSupabaseClient();
        const repertoireId = goal.repertoire_id; // Get the ID before deleting

        const { error } = await supabaseClient
            .from('goals')
            .delete()
            .eq('id', goal.id);

        if (error) {
            console.error('Error deleting goal:', error);
            return false;
        }

        // After deleting, update stats if it was linked
        if (repertoireId) {
            const { error: rpcError } = await supabaseClient.rpc('update_repertoire_stats', { rep_id: repertoireId });
            if (rpcError) {
                console.error('Error updating repertoire stats:', rpcError);
            }
            return true; // Signal that stats were updated
        }

        return false; // Signal that stats were not updated
    },

    async addGoal(topic, description) {
        const supabaseClient = getSupabaseClient();
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return null;

        // Calculate the next goal sub-number for this topic
        const nextGoalSubNumber = topic.goals.length > 0 
            ? Math.max(...topic.goals.map(g => Number(g.goal_number.split('.')[1] || 0))) + 1 
            : 1;
        const newGoalNumber = `${topic.topic_number}.${nextGoalSubNumber}`;

        const { data: newGoal, error } = await supabaseClient
            .from('goals')
            .insert({
                topic_id: topic.id,
                description: description,
                goal_number: newGoalNumber,
                is_complete: false,
                user_id: user.id
            })
            .select()
            .single();

        if (error) {
            console.error('Error adding goal:', error);
            return null;
        }
        return newGoal;
    },

    async toggleGoalComplete(goal) {
        const supabaseClient = getSupabaseClient();
        const isNowComplete = !goal.is_complete;
        const { data: updatedGoal, error } = await supabaseClient
            .from('goals')
            .update({
                is_complete: isNowComplete,
                date_completed: isNowComplete ? new Date().toISOString().split('T')[0] : null
            })
            .eq('id', goal.id)
            .select()
            .single();

        if (error) {
            console.error('Error toggling goal complete status:', error);
            return null;
        }
        return updatedGoal;
    },
};
