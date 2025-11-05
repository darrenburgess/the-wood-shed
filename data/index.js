import { getSupabaseClient } from '../supabase.js';
import { repertoireData } from './repertoire.js';
import { contentData } from './content.js';
import { topicData } from './topics.js';
import { goalData } from './goals.js';
import { logData } from './logs.js';
import { sessionData } from './sessions.js';
import { linkify, getYoutubeVideoId } from '../utils.js';

// DEFINE THE DATA LAYER (This section USES the supabaseClient)
const dataLayer = {
    // Re-export utility functions so they are available on the dataLayer object for the UI
    linkify,
    getYoutubeVideoId,
    getSupabaseClient,

    ...repertoireData,
    ...contentData,
    ...topicData,
    ...goalData,
    ...logData,
    ...sessionData
};

export { dataLayer };
