// --- Initialize Supabase Client ---
// Production Keys
const PROD_SUPABASE_URL = 'https://qjjjxesxlfmrnmzibdzg.supabase.co';
const PROD_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqamp4ZXN4bGZtcm5temliZHpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1Njc5NTcsImV4cCI6MjA3MjE0Mzk1N30.ytUXWzmzsIcsfRqSLI6zZbBElrOTUnG6kI1EnLEqQvU'; 

// Development Keys
const DEV_SUPABASE_URL = 'https://aqtowjfapsviqlpiqxky.supabase.co'; 
const DEV_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxdG93amZhcHN2aXFscGlxeGt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNjEwNTIsImV4cCI6MjA3NDYzNzA1Mn0.TCSdF3ZSJmydJdW4-vXf68ABbWwu7UGWe5VRapA5-wE'; // Paste your new dev project key here

let supabaseUrl;
let supabaseAnonKey;

// Detect if we are running locally
if (window.location.hostname === 'localhost' || window.location.protocol === 'file:') {
    console.log("Running in development mode.");
    supabaseUrl = DEV_SUPABASE_URL;
    supabaseAnonKey = DEV_SUPABASE_ANON_KEY;
} else {
    console.log("Running in production mode.");
    supabaseUrl = PROD_SUPABASE_URL;
    supabaseAnonKey = PROD_SUPABASE_ANON_KEY;
}

const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// --- Element References ---
// Auth elements
const authContainer = document.getElementById('auth-container');
const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('auth-email');
const passwordInput = document.getElementById('auth-password');
const signInBtn = document.getElementById('sign-in-btn');
const signUpBtn = document.getElementById('sign-up-btn');
const authError = document.getElementById('auth-error');
const signOutBtn = document.getElementById('sign-out-btn');

// App elements
const appContainer = document.getElementById('app-container');
const plannerContent = document.getElementById('planner-content');
const expandAllBtn = document.getElementById('expand-all-btn');
const collapseAllBtn = document.getElementById('collapse-all-btn');
const addTopicBtn = document.getElementById('add-topic-btn');
const editModal = document.getElementById('edit-modal');
const modalTitle = document.getElementById('modal-title');
const modalInput = document.getElementById('modal-input');
const modalSaveBtn = document.getElementById('modal-save-btn');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const modalDeleteBtn = document.getElementById('modal-delete-btn');
const modalCompleteBtn = document.getElementById('modal-complete-btn');

const tabsContainer = document.querySelector('.tabs');
const tabButtons = document.querySelectorAll('.tab-btn');
const views = document.querySelectorAll('.view');

const logViewContent = document.getElementById('log-view-content');
const logViewDate = document.getElementById('log-view-date');
const prevDayBtn = document.getElementById('prev-day-btn');
const nextDayBtn = document.getElementById('next-day-btn');
const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');
const searchRangeBtn = document.getElementById('search-range-btn');

// FIX 3.3: Add references for the new YouTube modal elements
const youtubeModal = document.getElementById('youtube-modal');
const youtubeModalCloseBtn = document.getElementById('youtube-modal-close-btn');
const youtubePlayerContainer = document.getElementById('youtube-player-container');


// --- State Management ---
let detailsState = {};
let currentLogViewDate = new Date();
let currentUser = null;

// --- Helper Functions ---

// New helper to extract YouTube video ID from various URL formats
function getYoutubeVideoId(url) {
    let videoId = null;
    // This regex matches a wider variety of YouTube URL formats
    const youtubeRegex = /^(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})(?:\S+)?$/;
    const match = url.match(youtubeRegex);

    if (match && match[1]) {
        videoId = match[1];
    }

    return videoId;
}

// Modified linkify to specifically handle YouTube links
function linkify(text) {
    const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    return text.replace(urlRegex, (url) => {
        const videoId = getYoutubeVideoId(url);
        if (videoId) {
            // If it's a YouTube link, give it a special class and data attribute
            return `<a class="youtube-link" data-video-id="${videoId}">${url}</a>`;
        } else {
            // Otherwise, treat it as a normal link
            return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
        }
    });
}

// FIX 3.3: New functions to open and close the YouTube modal
function openYoutubeModal(videoId) {
    youtubePlayerContainer.innerHTML = `
        <iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen>
        </iframe>
    `;
    youtubeModal.classList.remove('hidden');
}

function closeYoutubeModal() {
    youtubeModal.classList.add('hidden');
    // Important: Stop the video from playing in the background
    youtubePlayerContainer.innerHTML = '';
}


// FIX 1.1: The entire renderPlanView function is updated for correct goal sorting.
async function renderPlanView() {
    // RLS automatically filters data, so the query remains simple
    const { data: topics, error } = await supabaseClient
        .from('topics')
        .select(`*, goals (*, logs (*))`)
        .order('topic_number', { ascending: true })
        // FIX 1.1: Removed the incorrect alpha-sort for goals from the query
        // .order('goal_number', { foreignTable: 'goals', ascending: true })
        .order('created_at', { foreignTable: 'goals.logs', ascending: false });

    if (error) { console.error('Error fetching plan data:', error); return; }

    plannerContent.innerHTML = '';
    const today = new Date().toISOString().split('T')[0];
    
    for (const topic of topics) {

        // FIX 1.1: Add client-side numerical sorting for goals
        if (topic.goals) {
            topic.goals.sort((a, b) => {
                const aParts = a.goal_number.split('.').map(Number);
                const bParts = b.goal_number.split('.').map(Number);
                // Compare the main topic number first (e.g., the '1' in '1.10')
                if (aParts[0] !== bParts[0]) {
                    return aParts[0] - bParts[0];
                }
                // If main numbers are the same, compare the sub-number (e.g., the '10' in '1.10')
                return aParts[1] - bParts[1];
            });
        }

        const topicId = `topic-${topic.id}`;
        const topicDetails = document.createElement('details');
        topicDetails.className = 'topic-details';
        topicDetails.id = topicId;
        topicDetails.open = detailsState[topicId] ?? true;
        const topicSummary = document.createElement('summary');
        topicSummary.className = 'summary-flex';
        topicSummary.innerHTML = `
            <h2 id="topic-title-${topic.id}">Topic ${topic.topic_number}: ${topic.title}</h2>
            <button class="edit-btn" data-id="${topic.id}" data-type="topic"><i data-feather="edit-2"></i></button>
        `;
        topicDetails.appendChild(topicSummary);

        const activeGoalsForTopic = topic.goals.filter(g => !g.is_complete);
        const completedGoalsForTopic = topic.goals.filter(g => g.is_complete);

        for (const goal of activeGoalsForTopic) {
            const goalId = `goal-${goal.id}`;
            const goalDetails = document.createElement('details');
            goalDetails.className = 'goal-details';
            goalDetails.id = goalId;
            goalDetails.open = detailsState[goalId] ?? false;
            const goalSummary = document.createElement('summary');
            goalSummary.className = 'summary-flex';
            goalSummary.innerHTML = `
                <span class="goal-text" id="goal-text-${goal.id}">
                    <strong>${goal.goal_number}:</strong> ${goal.description}
                </span>
                <button class="edit-btn" data-id="${goal.id}" data-type="goal"><i data-feather="edit-2"></i></button>
            `;
            goalDetails.appendChild(goalSummary);
            
            const addLogForm = document.createElement('form');
            addLogForm.className = 'add-log-form';
            addLogForm.dataset.goalId = goal.id;
            addLogForm.dataset.goalNumber = goal.goal_number;
            addLogForm.innerHTML = `<input type="text" name="logEntry" class="log-input" placeholder="New log entry..." required autocomplete="off"><button type="submit">Add Log</button>`;
            goalDetails.appendChild(addLogForm);
            
            const logList = document.createElement('ul');
            const logsForGoal = goal.logs || [];
            if (logsForGoal.length === 0) {
                logList.innerHTML = `<li><em>(No log entries yet for this goal)</em></li>`;
            } else {
                logsForGoal.forEach((log, index) => {
                    const listItem = document.createElement('li');
                    listItem.id = `log-item-${log.id}`;
                    if (log.date === today) { listItem.classList.add('todays-log'); }
                    if (index >= 3) { listItem.classList.add('log-hidden'); }
                    const linkedEntry = linkify(log.entry);
                    listItem.innerHTML = `
                        <span id="log-text-${log.id}">${new Date(log.date).toLocaleDateString('en-US', { timeZone: 'UTC' })} (${goal.goal_number}): ${linkedEntry}</span>
                        <button class="edit-btn" data-id="${log.id}" data-type="log"><i data-feather="edit-2"></i></button>
                    `;
                    logList.appendChild(listItem);
                });
            }
            goalDetails.appendChild(logList);
            if (logsForGoal.length > 3) {
                const toggleBtn = document.createElement('button');
                toggleBtn.className = 'toggle-logs-btn';
                toggleBtn.textContent = '...';
                goalDetails.appendChild(toggleBtn);
            }
            topicDetails.appendChild(goalDetails);
        }
        
        const addGoalForm = document.createElement('form');
        addGoalForm.className = 'add-goal-form';
        addGoalForm.dataset.topicId = topic.id;
        addGoalForm.dataset.topicNumber = topic.topic_number;
        addGoalForm.innerHTML = `<input type="text" name="goalDescription" class="goal-input" placeholder="New goal description..." required autocomplete="off"><button type="submit">Add Goal</button>`;
        topicDetails.appendChild(addGoalForm);

        if (completedGoalsForTopic.length > 0) {
            const completedTitle = document.createElement('h4');
            completedTitle.textContent = 'Completed Goals';
            topicDetails.appendChild(completedTitle);
            for (const goal of completedGoalsForTopic) {
                const goalId = `goal-${goal.id}`;
                const goalDetails = document.createElement('details');
                goalDetails.className = 'goal-details completed-goal';
                goalDetails.id = goalId;
                goalDetails.open = detailsState[goalId] ?? false;
                const goalSummary = document.createElement('summary');
                goalSummary.className = 'summary-flex';
                const completedDate = new Date(goal.date_completed).toLocaleDateString('en-US', { timeZone: 'UTC' });
                goalSummary.innerHTML = `
                    <span class="goal-text" id="goal-text-${goal.id}">
                        <strong>${goal.goal_number}:</strong> ${goal.description} <em>(Completed: ${completedDate})</em>
                    </span>
                    <button class="reopen-goal-btn" data-goal-id="${goal.id}"><i data-feather="rotate-ccw"></i></button>
                `;
                goalDetails.appendChild(goalSummary);
                const logList = document.createElement('ul');
                const logsForGoal = goal.logs || [];
                if (logsForGoal.length > 0) {
                    logsForGoal.forEach(log => {
                        const listItem = document.createElement('li');
                        if (log.date === today) { listItem.classList.add('todays-log'); }
                        const linkedEntry = linkify(log.entry);
                        listItem.innerHTML = `<span>${new Date(log.date).toLocaleDateString('en-US', { timeZone: 'UTC' })} (${goal.goal_number}): ${linkedEntry}</span>`;
                        logList.appendChild(listItem);
                    });
                }
                goalDetails.appendChild(logList);
                topicDetails.appendChild(goalDetails);
            }
        }
        
        plannerContent.appendChild(topicDetails);
    }
    
    feather.replace();
}

async function renderLogsView(startDate, endDate) {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    if (!startDate) startDate = todayString;
    if (!endDate) endDate = startDate;

    // RLS handles security
    let query = supabaseClient
        .from('logs')
        .select(`*, goals ( description, goal_number, topics ( title ) )`)
        .order('created_at', { ascending: false })
        .gte('date', startDate)
        .lte('date', endDate);

    const { data: logs, error } = await query;

    if (startDate === endDate) {
        if (startDate === todayString) { logViewDate.textContent = "Today's Logs"; } 
        else { const displayDate = new Date(startDate); displayDate.setMinutes(displayDate.getMinutes() + displayDate.getTimezoneOffset()); logViewDate.textContent = `Logs for ${displayDate.toLocaleDateString('en-US')}`; }
    } else {
        logViewDate.textContent = `Logs from ${startDate} to ${endDate}`;
    }

    if (error) { console.error('Error fetching logs:', error); return; }

    if (logs.length === 0) {
        logViewContent.innerHTML = `<p>No practice logged for this period.</p>`;
        return;
    }
    
    const logsByTopic = logs.reduce((acc, log) => {
        const topicTitle = log.goals.topics.title;
        if (!acc[topicTitle]) { acc[topicTitle] = {}; }
        const goalDescription = `${log.goals.goal_number}: ${log.goals.description}`;
        if (!acc[topicTitle][goalDescription]) { acc[topicTitle][goalDescription] = []; }
        acc[topicTitle][goalDescription].push(log);
        return acc;
    }, {});

    let listHtml = '';
    for (const topicTitle in logsByTopic) {
        listHtml += `<h2>${topicTitle}</h2>`;
        for (const goalDescription in logsByTopic[topicTitle]) {
            listHtml += `<h4>${goalDescription}</h4><ul>`;
            logsByTopic[topicTitle][goalDescription].forEach(log => {
                const displayDate = new Date(log.date).toLocaleDateString('en-US', { timeZone: 'UTC' });
                const linkedEntry = linkify(log.entry);
                listHtml += `<li><span><strong>${displayDate}:</strong> ${linkedEntry}</span></li>`;
            });
            listHtml += '</ul>';
        }
    }

    logViewContent.innerHTML = listHtml;
    feather.replace();
}


// --- Event Listeners ---

// Main App Listeners
collapseAllBtn.addEventListener('click', () => { document.querySelectorAll('#planner-content details').forEach(detail => detailsState[detail.id] = false); renderPlanView(); });
expandAllBtn.addEventListener('click', () => { document.querySelectorAll('.topic-details').forEach(detail => detailsState[detail.id] = true); document.querySelectorAll('.goal-details, #completed-details').forEach(detail => detailsState[detail.id] = false); renderPlanView(); });

if (addTopicBtn) {
    addTopicBtn.addEventListener('click', () => openEditModal('new_topic', {}));
}

appContainer.addEventListener('click', async (event) => {
    // FIX 3.3: Add logic to handle clicks on YouTube links
    const youtubeLink = event.target.closest('.youtube-link');
    if (youtubeLink) {
        event.preventDefault(); // Prevent the link from opening a new tab
        const videoId = youtubeLink.dataset.videoId;
        openYoutubeModal(videoId);
        return;
    }

    const editButton = event.target.closest('.edit-btn');
    const toggleLogsButton = event.target.closest('.toggle-logs-btn');
    const reopenButton = event.target.closest('.reopen-goal-btn');
    const summary = event.target.closest('summary');

    if (editButton) {
        const type = editButton.dataset.type;
        const id = Number(editButton.dataset.id);
        let item = null;
        if (type === 'topic') { const { data } = await supabaseClient.from('topics').select('*').eq('id', id).single(); item = data; }
        else if (type === 'goal') { const { data } = await supabaseClient.from('goals').select('*').eq('id', id).single(); item = data; }
        else if (type === 'log') { const { data } = await supabaseClient.from('logs').select('*').eq('id', id).single(); item = data; }
        if (item) { openEditModal(type, item); }
        return;
    } 
    if (reopenButton) {
        const goalId = Number(reopenButton.dataset.goalId);
        await supabaseClient.from('goals').update({ is_complete: false, date_completed: null }).eq('id', goalId);
        renderPlanView();
        return;
    }
    if (toggleLogsButton) {
        const goalDetails = toggleLogsButton.parentElement;
        const logList = goalDetails.querySelector('ul');
        const hiddenLogs = logList.querySelectorAll('li.log-hidden');
        if (hiddenLogs.length > 0) {
            hiddenLogs.forEach((logItem, index) => { if (index < 3) { logItem.classList.remove('log-hidden'); } });
            if (logList.querySelectorAll('li.log-hidden').length === 0) { toggleLogsButton.textContent = 'Show Less'; }
        } else {
            logList.querySelectorAll('li').forEach((logItem, index) => { if (index >= 3) { logItem.classList.add('log-hidden'); } });
            toggleLogsButton.textContent = '...';
        }
        return;
    }
    if (summary) {
        event.preventDefault();
        const detailsElement = summary.parentElement;
        detailsState[detailsElement.id] = !detailsElement.open;
        renderPlanView();
    }
});

appContainer.addEventListener('submit', async (event) => { 
    if (!currentUser) return; // Prevent actions if not logged in

    if (event.target.matches('.add-log-form')) { 
        event.preventDefault(); 
        const form = event.target; 
        const goalId = Number(form.dataset.goalId); 
        const logEntryText = form.querySelector('.log-input').value.trim(); 
        if (logEntryText) { 
            // MODIFIED: Add user_id to the new log
            const newLog = { goal_id: goalId, entry: logEntryText, date: new Date().toISOString().split('T')[0], user_id: currentUser.id }; 
            await supabaseClient.from('logs').insert(newLog);
            detailsState[`goal-${goalId}`] = true; 
            renderPlanView();
            renderLogsView(currentLogViewDate.toISOString().split('T')[0]);
        } 
    }
    else if (event.target.matches('.add-goal-form')) {
        event.preventDefault();
        const form = event.target;
        const topicId = Number(form.dataset.topicId);
        const topicNumber = form.dataset.topicNumber;
        const description = form.querySelector('.goal-input').value.trim();
        if (description) {
            const { data: goalsForTopic } = await supabaseClient.from('goals').select('goal_number').eq('topic_id', topicId);
            const nextGoalSubNumber = goalsForTopic.length > 0 ? Math.max(...goalsForTopic.map(g => Number(g.goal_number.split('.')[1] || 0))) + 1 : 1;
            const newGoalNumber = `${topicNumber}.${nextGoalSubNumber}`;
            // MODIFIED: Add user_id to the new goal
            const newGoal = { topic_id: topicId, description, goal_number: newGoalNumber, is_complete: false, date_completed: null, user_id: currentUser.id };
            await supabaseClient.from('goals').insert(newGoal);
            detailsState[`topic-${topicId}`] = true;
            renderPlanView();
        }
    }
});

tabsContainer.addEventListener('click', (event) => {
    if (event.target.matches('.tab-btn')) {
        const targetViewId = event.target.dataset.view;
        views.forEach(view => view.classList.remove('active'));
        tabButtons.forEach(btn => btn.classList.remove('active'));
        document.getElementById(targetViewId).classList.add('active');
        event.target.classList.add('active');
    }
});

prevDayBtn.addEventListener('click', () => {
    currentLogViewDate.setDate(currentLogViewDate.getDate() - 1);
    renderLogsView(currentLogViewDate.toISOString().split('T')[0]);
});
nextDayBtn.addEventListener('click', () => {
    currentLogViewDate.setDate(currentLogViewDate.getDate() + 1);
    renderLogsView(currentLogViewDate.toISOString().split('T')[0]);
});
searchRangeBtn.addEventListener('click', () => {
    const start = startDateInput.value;
    const end = endDateInput.value;
    if (start && end) {
        renderLogsView(start, end);
    }
});

// Modal Functions
function openEditModal(type, item) {
    modalDeleteBtn.classList.toggle('hidden', type === 'topic');
    modalCompleteBtn.classList.toggle('hidden', type !== 'goal');
    
    if (!item) { console.error("Item not found for editing"); return; }
    
    if (type === 'new_topic') {
        modalTitle.textContent = 'Add New Topic';
        modalInput.value = '';
        editModal.dataset.editingType = 'new_topic';
    } else {
        modalTitle.textContent = `Edit ${type.charAt(0).toUpperCase() + type.slice(1)}`;
        modalInput.value = (type === 'topic') ? item.title : (type === 'goal') ? item.description : item.entry;
        editModal.dataset.editingType = type;
        editModal.dataset.editingId = item.id;
        if (type === 'goal') {
            if (item.is_complete) {
                modalCompleteBtn.textContent = 'Re-open Goal';
                modalCompleteBtn.className = 'btn-reopen';
            } else {
                modalCompleteBtn.textContent = 'Complete Goal';
                modalCompleteBtn.className = 'btn-complete';
            }
        }
    }
    
    editModal.classList.remove('hidden');
    modalInput.focus();
}

function closeEditModal() { editModal.classList.add('hidden'); }

modalSaveBtn.addEventListener('click', async () => { 
    const type = editModal.dataset.editingType; 
    const id = Number(editModal.dataset.editingId); 
    const newValue = modalInput.value.trim(); 
    if (newValue) { 
        if (type === 'topic') { await supabaseClient.from('topics').update({ title: newValue }).eq('id', id); } 
        else if (type === 'goal') { await supabaseClient.from('goals').update({ description: newValue }).eq('id', id); } 
        else if (type === 'log') { await supabaseClient.from('logs').update({ entry: newValue }).eq('id', id); }
        else if (type === 'new_topic') {
            const { data: topics } = await supabaseClient.from('topics').select('topic_number');
            const nextTopicNumber = topics.length > 0 ? Math.max(...topics.map(t => t.topic_number)) + 1 : 1;
            // MODIFIED: Add user_id to the new topic
            await supabaseClient.from('topics').insert({ title: newValue, topic_number: nextTopicNumber, user_id: currentUser.id });
        }
    } 
    closeEditModal(); 
    renderPlanView(); 
    renderLogsView(currentLogViewDate.toISOString().split('T')[0]);
});

modalCompleteBtn.addEventListener('click', async () => {
    const id = Number(editModal.dataset.editingId);
    const { data: goal } = await supabaseClient.from('goals').select('is_complete').eq('id', id).single();
    if (goal.is_complete) {
        await supabaseClient.from('goals').update({ is_complete: false, date_completed: null }).eq('id', id);
    } else {
        const completionDate = new Date().toISOString().split('T')[0];
        await supabaseClient.from('goals').update({ is_complete: true, date_completed: completionDate }).eq('id', id);
    }
    closeEditModal();
    renderPlanView();
});

modalDeleteBtn.addEventListener('click', async () => { 
    const type = editModal.dataset.editingType; 
    const id = Number(editModal.dataset.editingId); 
    if (type === 'goal') { 
        const confirmed = confirm('DELETE this goal and ALL its log entries? This cannot be undone.'); 
        if (confirmed) { 
            await supabaseClient.from('goals').delete().eq('id', id);
            closeEditModal(); 
            renderPlanView(); 
        } 
    } else if (type === 'log') { 
        const confirmed = confirm('Are you sure you want to delete this log entry?'); 
        if (confirmed) { 
            await supabaseClient.from('logs').delete().eq('id', id);
            closeEditModal(); 
            renderPlanView();
            renderLogsView(currentLogViewDate.toISOString().split('T')[0]);
        } 
    } 
});

modalCancelBtn.addEventListener('click', closeEditModal);
editModal.addEventListener('click', (event) => { if (event.target === event.currentTarget) { closeEditModal(); } });

// --- Authentication Logic ---
signInBtn.addEventListener('click', async (event) => {
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

signOutBtn.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
});

// --- App Initialization ---
function initializeApp() {
    renderPlanView();
    renderLogsView();
}

// Listen for authentication state changes
supabaseClient.auth.onAuthStateChange((event, session) => {
    if (session) {
        // User is signed in
        currentUser = session.user;
        appContainer.classList.remove('hidden');
        authContainer.classList.add('hidden');
        initializeApp();
    } else {
        // User is signed out
        currentUser = null;
        appContainer.classList.add('hidden');
        authContainer.classList.remove('hidden');
    }
});

// event listeners to close the YouTube modal
youtubeModalCloseBtn.addEventListener('click', closeYoutubeModal);
youtubeModal.addEventListener('click', (event) => {
    // Only close if the click is on the overlay itself, not the content
    if (event.target === event.currentTarget) {
        closeYoutubeModal();
    }
});