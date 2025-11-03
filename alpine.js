import { dataLayer } from '/data/index.js';
import { getSupabaseClient } from '/supabase.js';
import { loadAndInjectHtml } from './viewLoader.js';

export default function app() {
    return {
        // --- STATE PROPERTIES ---
        topics: [],
        isLoading: true,
        activeView: 'topics',
        isDevEnvironment: (window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:'),
        
        // Modal states
        isNewTopicModalOpen: false,
        newTopicTitle: '',
        isEditTopicModalOpen: false,
        editingTopic: null,
        isEditGoalModalOpen: false,
        editingGoal: null,
        isEditLogModalOpen: false,
        editingLog: null,
        editingLogGoal: null,
        isAddLogModalOpen: false,
        loggingForGoal: null,
        isContentModalOpen: false,
        editingContent: null,
        isYouTubeModalOpen: false,
        youTubeVideoId: '',

        // Logs View state
        logs: [],
        isLogsLoading: false,
        logsLoaded: false,
        logViewDate: new Date(),
        logViewTitle: 'Today\'s Logs',
        searchStartDate: '',
        searchEndDate: '',

        // Content View state
        content: [],
        isContentLoading: false,

        // Repertoire View state
        repertoire: [],
        isRepertoireLoading: false,
        isRepertoireStale: false,
        isRepertoireModalOpen: false,
        editingRepertoire: null,
        repertoireSortKey: 'last_practiced',
        repertoireSortDirection: 'desc',

        // Practice Today / Session state
        todaySessionGoalIds: [],

        // Persisted UI state
        uiState: this.$persist({
            topicStates: {},
            goalStates: {},
            completedGoalStates: {}
        }),

        // --- INITIALIZATION ---
        async init() {
            // This function is called by Alpine when the component is initialized.

            // Load views and modals into the DOM
            await Promise.all([
                this.loadViews(),
                this.loadModals()
            ]);

            // Set up window event listeners that were previously in the HTML
            window.addEventListener('user-signed-in', () => this.loadData());
            window.addEventListener('scroll', this.handleScroll.bind(this));
            window.addEventListener('keydown', this.handleGlobalKeydown.bind(this));
            this.$el.addEventListener('click', this.handleGlobalClick.bind(this));

            // Check if user is already signed in (handles page refresh with existing session)
            const { data: { session } } = await this.supabase.auth.getSession();
            if (session) {
                this.loadData();
            }

            // This replaces the x-effect directive
            this.$watch('activeView', (newView) => {
                if (newView === 'content' && this.content.length === 0) this.loadContent();
                if (newView === 'logs' && !this.logsLoaded) {
                    this.getLogsForDate(this.logViewDate);
                    this.logsLoaded = true;
                }
                if (newView === 'repertoire' && (this.repertoire.length === 0 || this.isRepertoireStale)) {
                    this.loadRepertoire();
                    this.isRepertoireStale = false;
                }
            });

            if (this.isDevEnvironment) document.title = '(Dev) The Wood Shed';
        },

        // --- EVENT HANDLERS ---
        handleScroll: Alpine.debounce(function() {
            localStorage.setItem('scrollPosition', window.scrollY);
        }, 250),

        handleGlobalKeydown(event) {
            if (event.key === ' ' && this.isYouTubeModalOpen) {
                event.preventDefault();
            }
        },

        handleGlobalClick(event) {
            const link = event.target.closest('.youtube-link');
            if (link) {
                event.preventDefault();
                const videoId = link.dataset.videoId;
                if (videoId) {
                    this.youTubeVideoId = videoId;
                    this.isYouTubeModalOpen = true;
                }
            }
        },

        // --- METHODS ---
        async loadViews() {
            // Load all views in parallel for better performance
            await Promise.all([
                loadAndInjectHtml('topics-view', 'topics-view'),
                loadAndInjectHtml('logs-view', 'logs-view'),
                loadAndInjectHtml('content-view', 'content-view'),
                loadAndInjectHtml('repertoire-view', 'repertoire-view')
            ]);
        },

        async loadModals() {
            // Load all modals in parallel for better performance
            await Promise.all([
                loadAndInjectHtml('new-topic-modal', 'new-topic-modal'),
                loadAndInjectHtml('edit-topic-modal', 'edit-topic-modal'),
                loadAndInjectHtml('edit-goal-modal', 'edit-goal-modal'),
                loadAndInjectHtml('add-log-modal', 'add-log-modal'),
                loadAndInjectHtml('edit-log-modal', 'edit-log-modal'),
                loadAndInjectHtml('content-modal', 'content-modal'),
                loadAndInjectHtml('repertoire-modal', 'repertoire-modal'),
                loadAndInjectHtml('youtube-modal', 'youtube-modal')
            ]);
        },

        async loadData() {
            this.isLoading = true;
            const fetchedTopics = await dataLayer.fetchTopicsData();

            fetchedTopics.forEach(topic => {
                if (topic.goals) {
                    topic.goals.forEach(goal => {
                        goal.logsToShow = 5;
                    });
                }
            });

            this.topics = fetchedTopics;

            // Load today's session goal IDs
            this.todaySessionGoalIds = await dataLayer.getTodaySessionGoalIds();

            this.isLoading = false;
            this.$nextTick(() => {
                feather.replace();
                const savedPosition = localStorage.getItem('scrollPosition');
                if (savedPosition) {
                    window.scrollTo(0, parseInt(savedPosition));
                }
            });
        },

        expandAll() {
            this.topics.forEach(topic => {
                this.uiState.topicStates[topic.id] = true;
                if (topic.goals) {
                    topic.goals.filter(g => !g.is_complete).forEach(goal => this.uiState.goalStates[goal.id] = true);
                }
            });
        },

        collapseAll() {
            this.topics.forEach(topic => {
                this.uiState.topicStates[topic.id] = false;
                if (topic.goals) {
                    topic.goals.forEach(goal => this.uiState.goalStates[goal.id] = false);
                }
            });
        },

        // Logs View Methods
        formatDate(date) {
            return date.toISOString().split('T')[0];
        },
        async getLogsForDate(date) {
            this.isLogsLoading = true;
            this.logViewTitle = `Logs for ${date.toLocaleDateString('en-US')}`;
            const dateString = this.formatDate(date);
            this.logs = await dataLayer.fetchLogsByDateRange(dateString, dateString);
            this.isLogsLoading = false;
        },
        async prevDay() {
            this.logViewDate.setDate(this.logViewDate.getDate() - 1);
            this.getLogsForDate(this.logViewDate);
        },
        async nextDay() {
            this.logViewDate.setDate(this.logViewDate.getDate() + 1);
            this.getLogsForDate(this.logViewDate);
        },
        async searchDateRange() {
            if (!this.searchStartDate || !this.searchEndDate) return;
            this.isLogsLoading = true;
            this.logViewTitle = `Logs from ${this.searchStartDate} to ${this.searchEndDate}`;
            this.logs = await dataLayer.fetchLogsByDateRange(this.searchStartDate, this.searchEndDate);
            this.isLogsLoading = false;
        },

        // Content View Methods
        async loadContent() {
            this.isContentLoading = true;
            this.content = await dataLayer.fetchContentLibrary();
            this.isContentLoading = false;
            this.$nextTick(() => feather.replace());
        },

        // Repertoire View Methods
        async loadRepertoire() {
            this.isRepertoireLoading = true;
            this.repertoire = await dataLayer.fetchRepertoire();
            this.isRepertoireLoading = false;
            this.isRepertoireStale = false; // Reset stale flag
            this.$nextTick(() => feather.replace());
        },

        sortRepertoireBy(key) {
            if (this.repertoireSortKey === key) {
                this.repertoireSortDirection = this.repertoireSortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                this.repertoireSortKey = key;
                this.repertoireSortDirection = (key === 'title' || key === 'artist') ? 'asc' : 'desc';
            }
        },

        // Practice Today / Session Methods
        async toggleGoalInTodaySession(goalId) {
            const isInSession = this.todaySessionGoalIds.includes(goalId);

            if (isInSession) {
                // Remove from session
                const success = await dataLayer.removeGoalFromTodaySession(goalId);
                if (success) {
                    this.todaySessionGoalIds = this.todaySessionGoalIds.filter(id => id !== goalId);
                }
            } else {
                // Add to session
                const success = await dataLayer.addGoalToTodaySession(goalId);
                if (success) {
                    this.todaySessionGoalIds.push(goalId);
                }
            }
        },

        isGoalInTodaySession(goalId) {
            return this.todaySessionGoalIds.includes(goalId);
        },

        // --- COMPUTED PROPERTIES (Getters) ---
        get groupedLogs() {
            return this.logs.reduce((acc, log) => {
                if (!log.goals || !log.goals.topics) return acc;
                const topicTitle = log.goals.topics.title;
                const goalDesc = `${log.goals.goal_number}: ${log.goals.description}`;

                if (!acc[topicTitle]) acc[topicTitle] = {};
                if (!acc[topicTitle][goalDesc]) acc[topicTitle][goalDesc] = [];

                acc[topicTitle][goalDesc].push(log);
                return acc;
            }, {});
        },

        get sortedRepertoire() {
            if (!this.repertoire) return [];
            return [...this.repertoire].sort((a, b) => {
                const direction = this.repertoireSortDirection === 'asc' ? 1 : -1;
                const key = this.repertoireSortKey;

                if (a[key] === null || a[key] === undefined) return 1;
                if (b[key] === null || b[key] === undefined) return -1;

                const valA = a[key];
                const valB = b[key];

                if (typeof valA === 'string' && typeof valB === 'string') {
                    return valA.localeCompare(valB, undefined, { sensitivity: 'base' }) * direction;
                }

                if (valA < valB) return -1 * direction;
                if (valA > valB) return 1 * direction;
                return 0;
            });
        },
        
        // Expose supabaseClient to the template for the sign-out button
        get supabase() {
            return getSupabaseClient();
        }
    };
}