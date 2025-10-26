import { getSupabaseClient } from '/supabase.js';

export const topicData = {
    async fetchPlanData() {
        const supabaseClient = getSupabaseClient();
        const today = new Date().toISOString().split('T')[0];

        const { data: topics, error } = await supabaseClient
            .from('topics')
            .select('id, topic_number, title, goals(*, content(*), repertoire(*), logs(*, content(*)))')
            .order('topic_number', { ascending: true })
            .order('created_at', { foreignTable: 'goals.logs', ascending: false });

        if (error) {
            console.error('Error fetching plan data:', error);
            return [];
        }

        for (const topic of topics) {
            if (topic.goals) {
                // 1. Simplified descending sort for goals
                topic.goals.sort((a, b) => {
                    const aNum = Number(a.goal_number.split('.')[1] || 0);
                    const bNum = Number(b.goal_number.split('.')[1] || 0);
                    return bNum - aNum;
                });

                // 2. Add 'isToday' flag to logs
                for (const goal of topic.goals) {
                    if (goal.logs) {
                        for (const log of goal.logs) {
                            log.isToday = log.date === today;
                        }
                    }
                }
            }
        }

        return topics;
    },

    async addTopic(title) {
        const supabaseClient = getSupabaseClient();
        // 1. Get the current user's ID using the new async method
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        if (userError || !user) {
            console.error("No user logged in or error fetching user:", userError);
            return null;
        }

        // 2. Find the highest existing topic_number for this user
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

        // 3. Insert the new topic with the correct user id
        const { data: newTopic, error: insertError } = await supabaseClient
            .from('topics')
            .insert({ 
                title: title, 
                topic_number: nextTopicNumber, 
                user_id: user.id 
            })
            .select('*')
            .single();

        if (insertError) {
            console.error('Error adding new topic:', insertError);
            return null;
        }
        
        // 4. Return the newly created topic object so the UI can update instantly
        return newTopic;
    },

    async updateTopicTitle(topicId, newTitle) {
        const supabaseClient = getSupabaseClient();
        const { error } = await supabaseClient
            .from('topics')
            .update({ title: newTitle })
            .eq('id', topicId);

        if (error) {
            console.error('Error updating topic title:', error);
        }
        // No need to return anything, the UI is already updated optimistically
    },

    async deleteTopic(topicId) {
        const supabaseClient = getSupabaseClient();
        const { error } = await supabaseClient
            .from('topics')
            .delete()
            .eq('id', topicId);

        if (error) {
            console.error('Error deleting topic:', error);
        }
    },
};
