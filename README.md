# The Wood Shed

A practice journal and learning management application for musicians.

## Features

- **Practice Today**: Track daily practice sessions with goals and logs
- **Topics**: Organize practice goals by musical topics
- **Content**: Manage learning resources (YouTube videos, articles, etc.) with tags
- **Repertoire**: Track pieces being learned with practice history
- **Logs**: View and filter all practice logs with linked content and repertoire

## Tech Stack

- **Frontend**: React 18 with Vite
- **Styling**: Tailwind CSS with shadcn/ui components
- **Backend**: Supabase (PostgreSQL + Authentication)
- **State Management**: React Context API

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Variables

Create a `.env.local` file in the root directory:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Project Structure

```
src/
├── components/       # React components
│   ├── ui/          # shadcn/ui components
│   └── ...          # Feature components (tabs, modals)
├── contexts/        # React contexts (Auth)
├── lib/             # Utilities and queries
│   ├── queries.js   # Supabase database queries
│   ├── supabase.js  # Supabase client
│   └── utils.js     # Helper functions
├── App.jsx          # Main application component
└── main.jsx         # Application entry point
```
