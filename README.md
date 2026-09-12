# AI Study Hub

Build a modern, premium-quality web application called StudentHub AI. The application should feel like a combination of Notion, Google Classroom, Todoist, and ChatGPT, designed specifically for high school and college students.

The design must be extremely clean, responsive, fast, and visually appealing with smooth animations, rounded corners, glassmorphism effects where appropriate, dark mode, and light mode. Use a blue and purple modern color palette with excellent typography and spacing.

The application should include secure authentication with email/password and Google sign-in. Every user should have their own private dashboard and data.

Dashboard

 Personalized welcome message

 Current date and time

 Daily study goal

 Progress overview

 Upcoming assignments

 Today's timetable

 Study streak

 Quick actions

 Recent activity

 Motivational quote

Assignment Manager

 Create, edit, and delete assignments

 Subject categories

 Due dates

 Priority levels

 Progress status

 File attachments

 Reminder notifications

 Search and filters

 Calendar integration

Timetable

 Weekly timetable

 Color-coded subjects

 Drag-and-drop editing

 Class reminders

 Export and print support

Notes

 Rich text editor

 Markdown support

 Image uploads

 PDF attachments

 Auto-save

 Subject folders

 Powerful search

 Tags

 Favorites

Flashcards

 Create flashcard decks

 AI-generated flashcards

 Spaced repetition

 Quiz mode

 Progress tracking

AI Study Assistant

 Chat interface similar to ChatGPT

 Explain difficult concepts

 Summarize notes

 Generate quizzes

 Create revision plans

 Answer homework questions

 Improve essays

 Explain mathematics step-by-step

Past Papers

 Organize papers by subject and year

 Mark papers as completed

 Save difficult questions

 AI explanations

 Upload PDFs

Study Timer

 Pomodoro timer

 Custom timer lengths

 Session history

 Focus statistics

 Background music option

Goals

 Daily goals

 Weekly goals

 Monthly goals

 Achievement badges

 Progress charts

Calendar

 Monthly and weekly views

 Assignment deadlines

 Exam dates

 Study sessions

 Personal events

File Manager

 Upload notes

 Upload PDFs

 Upload presentations

 Folder organization

 Search files

Analytics

 Study hours

 Completed assignments

 Productivity score

 Subject performance

 Weekly reports

 Monthly reports

 Interactive charts

Notifications

 Assignment reminders

 Upcoming exams

 Timetable reminders

 Daily study reminders

User Profile

 Name

 School

 Grade/Class

 Subjects

 Profile picture

 Theme preference

 Notification settings

Settings

 Dark mode

 Light mode

 Language selection

 Account settings

 Security settings

 Export data

Search

 Global search across assignments, notes, files, flashcards, and timetable

Mobile Support

 Fully responsive

 Mobile navigation

 Tablet optimization

 Progressive Web App (PWA) support

Performance

 Fast page loading

 Lazy loading

 Optimized images

 Smooth animations

 Modern UI components

Backend

Use Supabase for:

 Authentication

 Database

 File storage

 Real-time updates

 User profiles

Database Tables

 users

 assignments

 timetable

 notes

 flashcards

 goals

 study_sessions

 files

 notifications

 exams

 subjects

 achievements

Technology

 React

 TypeScript

 Tailwind CSS

 shadcn/ui

 Supabase

 Framer Motion

 Recharts

 Lucide Icons

UI Requirements

 Modern SaaS-style interface

 Premium dashboard layout

 Beautiful cards with subtle shadows

 Smooth page transitions

 Accessible design (WCAG-friendly)

 Consistent spacing and typography

 Keyboard shortcuts for power users

 Professional empty states and loading skeletons

 Helpful onboarding tour for new users

Build the application with clean, reusable components and scalable architecture. Ensure it is production-ready, secure, and easy to extend with future features such as AI document analysis, collaborative study groups, and teacher dashboards. The final result should look polished enough to be presented as a startup-quality product rather than a basic student project.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://studenthub-ai.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/85fcc89e-85e1-48d9-a401-bc86eac81a80).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
