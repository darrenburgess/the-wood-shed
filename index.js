import { supabaseClient } from './supabase.js';
import { repertoireData } from './repertoire.js';

function getLocalDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // getMonth() is 0-indexed
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// DEFINE THE DATA LAYER (This section USES the supabaseClient)
const dataLayer = {
    async fetchPlanData() {
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

    getYoutubeVideoId(url) {
        if (!url) return null; // Safety check for bad data
        let videoId = null;
        const youtubeRegex = /^(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})(?:\S+)?$/;
        const match = url.trim().match(youtubeRegex);

        if (match && match[1]) {
            videoId = match[1];
        }
        return videoId;
    },

    async addTopic(title) {
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
        const { error } = await supabaseClient
            .from('topics')
            .delete()
            .eq('id', topicId);

        if (error) {
            console.error('Error deleting topic:', error);
        }
    },

    async updateGoal(goalId, newDescription) {
        const { error } = await supabaseClient
            .from('goals')
            .update({ description: newDescription })
            .eq('id', goalId);
        if (error) console.error('Error updating goal:', error);
    },

    async deleteGoal(goal) {
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
            await supabaseClient.rpc('update_repertoire_stats', { rep_id: repertoireId });
            return true; // Signal that stats were updated
        }

        return false; // Signal that stats were not updated
    },

    async addGoal(topic, description) {
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

    async addLog(goal, entryText, contentIds = []) {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return null;

        const { data: newLog, error: logError } = await supabaseClient
            .from('logs')
            .insert({
                goal_id: goal.id,
                entry: entryText,
                date: getLocalDateString(),
                user_id: user.id
            })
            .select('*')
            .single();

        if (logError) {
            console.error('Error creating log:', logError);
            return { newLog: null, statsUpdated: false };
        }

        if (contentIds && contentIds.length > 0) {
            const linksToCreate = contentIds.map(contentId => ({
                log_id: newLog.id,
                content_id: contentId
            }));
            const { error: linkError } = await supabaseClient.from('log_content').insert(linksToCreate);
            if (linkError) console.error('Error linking content:', linkError);
        }

        if (goal.repertoire_id) {
            await supabaseClient.rpc('update_repertoire_stats', { rep_id: goal.repertoire_id });
            return { newLog, statsUpdated: true };
        }

        // This is the key change: always return the same object shape
        return { newLog, statsUpdated: false };
    },
    
    async updateLog(logId, newEntry) {
        const { error } = await supabaseClient
            .from('logs')
            .update({ entry: newEntry })
            .eq('id', logId);
        if (error) console.error('Error updating log:', error);
    },

    async deleteLog(log, goal) {
        const { error } = await supabaseClient.from('logs').delete().eq('id', log.id);
        if (error) {
            console.error('Error deleting log:', error);
            return false;
        }

        if (goal.repertoire_id) {
            await supabaseClient.rpc('update_repertoire_stats', { rep_id: goal.repertoire_id });
            return true;
        }
        return false;
    },

    async searchContent(searchTerm) {
        if (!searchTerm || searchTerm.length < 2) return [];
        const { data, error } = await supabaseClient
            .from('content')
            .select('id, title')
            .ilike('title', `%${searchTerm}%`)
            .limit(10);
        if (error) console.error('Error searching content:', error);
        return data || [];
    },

    async fetchLogsByDateRange(startDate, endDate) {
        const { data, error } = await supabaseClient
            .from('logs')
            .select('*, goals(*, topics(*))')
            .gte('date', startDate)
            .lte('date', endDate)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching logs:', error);
            return [];
        }
        return data;
    },

    async fetchContentLibrary() {
        const { data, error } = await supabaseClient
            .from('content')
            .select('*')
            .order('created_at', { descending: true });

        if (error) {
            console.error('Error fetching content library:', error);
            return [];
        }
        return data;
    },

    async createContent(title, url, type) {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return null;

        const { data: newContent, error } = await supabaseClient
            .from('content')
            .insert({ title, url, type, user_id: user.id })
            .select()
            .single();

        if (error) {
            console.error('Error creating content:', error);
            return null;
        }
        return newContent;
    },

    async updateContent(contentId, title, url, type) {
        const { data: updatedContent, error } = await supabaseClient
            .from('content')
            .update({ title, url, type })
            .eq('id', contentId)
            .select()
            .single();
        
        if (error) {
            console.error('Error updating content:', error);
            return null;
        }
        return updatedContent;
    },

    async deleteContent(contentId) {
        const { error } = await supabaseClient
            .from('content')
            .delete()
            .eq('id', contentId);

        if (error) {
            console.error('Error deleting content:', error);
        }
    },

    async linkContentToGoal(goalId, contentId) {
        const { error } = await supabaseClient
            .from('goal_content')
            .insert({ goal_id: goalId, content_id: contentId });

        if (error) {
            console.error('Error linking content to goal:', error);
        }
    },

    async unlinkContentFromGoal(goalId, contentId) {
        const { error } = await supabaseClient
            .from('goal_content')
            .delete()
            .match({ goal_id: goalId, content_id: contentId });

        if (error) {
            console.error('Error unlinking content from goal:', error);
        }
    },

    async linkContentToLog(logId, contentId) {
        const { error } = await supabaseClient
            .from('log_content')
            .insert({ log_id: logId, content_id: contentId });

        if (error) {
            console.error('Error linking content to log:', error);
        }
    },

    async unlinkContentFromLog(logId, contentId) {
        const { error } = await supabaseClient
            .from('log_content')
            .delete()
            .match({ log_id: logId, content_id: contentId });

        if (error) {
            console.error('Error unlinking content from log:', error);
        }
    },

    ...repertoireData
};

export { dataLayer };