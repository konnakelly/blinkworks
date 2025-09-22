# BlinkWorks - Creative Brief Platform

A comprehensive platform for managing creative briefs, tracking progress, and delivering exceptional creative work to clients. Built with Next.js, TypeScript, and Firebase.

## Features

### For Brands/Clients
- **User Authentication** - Sign up with email/password or OAuth (Google, GitHub)
- **Brand Management** - Create detailed brand profiles with guidelines and preferences
- **Task Creation** - Comprehensive creative brief creation with detailed requirements
- **Progress Tracking** - Real-time updates and notifications on project status
- **Dashboard** - Overview of all tasks, deadlines, and project status

### For Creative Teams
- **Admin Dashboard** - View and manage all incoming creative briefs
- **Task Management** - Track task status, priority, and deadlines
- **Client Communication** - Built-in commenting and feedback system
- **File Delivery** - Secure delivery system for creative assets

### Core Functionality
- **Multi-step Task Creation** - Detailed brief creation with requirements, references, and guidelines
- **Status Management** - Track tasks from draft to completion
- **Priority System** - Organize tasks by urgency and importance
- **Deadline Tracking** - Monitor project timelines and deadlines
- **Reference Management** - Add and manage reference links and inspiration
- **Brand Guidelines** - Store and apply brand-specific requirements

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Firebase Firestore
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth with email/password
- **UI Components**: Radix UI, Lucide React icons
- **Forms**: React Hook Form with Zod validation

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd blinkworks
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   # Firebase Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id_here
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id_here

   ```

4. **Set up Firebase**
   - Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
   - Enable Authentication and Firestore Database
   - Copy your Firebase config values to the `.env` file


5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Database Schema

The platform uses a comprehensive database schema with the following main entities:

- **Users** - Authentication and user management
- **Brands** - Company/brand information and guidelines
- **Tasks** - Creative briefs and project management
- **CreativeRequirements** - Detailed project specifications
- **Deliverables** - Creative assets and file management
- **Comments** - Communication and feedback system
- **Notifications** - Real-time updates and alerts

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration

### Tasks
- `GET /api/tasks` - Get user's tasks
- `POST /api/tasks` - Create new task

### Admin
- `GET /api/admin/tasks` - Get all tasks (admin only)

## User Roles

- **CLIENT** - Brand users who create briefs and track progress
- **ADMIN** - Creative team members who manage and execute tasks
- **CREATIVE** - Individual creative team members (future feature)

## Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Client dashboard
│   ├── admin/             # Admin dashboard
│   └── globals.css        # Global styles
├── lib/                   # Utility functions
│   ├── firebase.ts       # Firebase configuration
│   ├── firestore.ts      # Firestore database functions
│   └── utils.ts          # Helper functions
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Database Management

- `npx prisma studio` - Open Prisma Studio (database GUI)
- `npx prisma migrate dev` - Create and apply migrations
- `npx prisma generate` - Generate Prisma client
- `npx prisma db push` - Push schema changes to database

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue in the GitHub repository.

---

Built with ❤️ using Next.js, TypeScript, and modern web technologies.
