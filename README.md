# Study Assistant App

A React Native application to help students track their studies and improve productivity.

## Setup Instructions

1. Install dependencies:
```bash
npm install
```

2. Configure Supabase:
   - Create a Supabase project at https://supabase.com
   - Copy your project URL and anon key
   - Update the credentials in `src/lib/supabase.ts`

3. Run the app:
```bash
# For iOS
npm run ios

# For Android
npm run android
```

## Tech Stack

- React Native with Expo
- TypeScript
- Tailwind CSS (via NativeWind)
- Supabase

## Project Structure

```
src/
├── components/     # Reusable UI components
├── screens/        # Screen components
├── lib/           # Configuration and utilities
├── types/         # TypeScript type definitions
├── hooks/         # Custom React hooks
└── assets/        # Images, fonts, etc.
```

## Development

- Use `npm start` to start the Expo development server
- Use `npm run ios` to run on iOS simulator
- Use `npm run android` to run on Android emulator

## Future Roadmap

### Database Enhancements

1. Study Sessions Table
   - Add `status` field (completed, interrupted, planned)
   - Add `tags` or `categories` for better organization
   - Add `goals` or `objectives` fields
   - Add `productivity_rating` for self-assessment

2. Profiles Table
   - Add `preferences` JSON field for app settings
   - Add `study_goals` or `weekly_target`
   - Add `timezone` for better time management

3. New Tables
   - `study_goals` for tracking long-term objectives
   - `subjects` for managing preset subject lists
   - `statistics` for aggregated study data

### Additional Features

1. Android Support
2. AI Integration for Smart Features:
   - Personalized study recommendations
   - Time zone aware scheduling
   - Advanced analytics and insights
   - Goal setting and tracking assistance
