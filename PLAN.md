# OP Media CRM - Development Plan

## 1. System Architecture
- **iOS App (SwiftUI):** Employee-facing app for task management, time tracking, and chat.
- **Web Admin Panel (React):** Management dashboard for agency owners to monitor activity and assign tasks.
- **Backend (Node.js/Express):** API for administrative actions (user creation, analytics).
- **Database (Firestore):** Real-time NoSQL database for all application data.
- **Storage (Firebase Storage):** Cloud storage for task submissions and screenshots.
- **Auth (Firebase Auth):** Email/Password and Google authentication.

## 2. Database Schema (Firestore)

### `users` (Collection)
- `uid`: string (Primary Key)
- `email`: string
- `name`: string
- `role`: "admin" | "employee"
- `photoURL`: string
- `status`: "online" | "offline"
- `lastSeen`: timestamp

### `tasks` (Collection)
- `id`: string
- `title`: string
- `description`: string
- `assignedTo`: string (User UID)
- `status`: "pending" | "in-progress" | "submitted"
- `priority`: "low" | "medium" | "high"
- `createdAt`: timestamp
- `submittedAt`: timestamp
- `submission`: {
    `files`: string[],
    `notes`: string
  }

### `sessions` (Collection)
- `id`: string
- `userId`: string
- `startTime`: timestamp
- `endTime`: timestamp
- `activeTime`: number (seconds)
- `status`: "active" | "completed"

### `screenshots` (Collection)
- `id`: string
- `sessionId`: string
- `userId`: string
- `storagePath`: string
- `timestamp`: timestamp

### `messages` (Collection)
- `id`: string
- `chatId`: string (e.g., `admin_employeeUID`)
- `senderId`: string
- `text`: string
- `timestamp`: timestamp
- `fileUrl`: string (optional)

## 3. iOS App Folder Structure (MVVM)
```text
OPMediaCRM/
├── App/
│   └── OPMediaCRMApp.swift
├── Models/
│   ├── User.swift
│   ├── Task.swift
│   └── Session.swift
├── ViewModels/
│   ├── AuthViewModel.swift
│   ├── TaskViewModel.swift
│   └── TrackingViewModel.swift
├── Views/
│   ├── Auth/
│   │   └── LoginView.swift
│   ├── Dashboard/
│   │   └── EmployeeDashboardView.swift
│   ├── Tasks/
│   │   ├── TaskListView.swift
│   │   └── TaskDetailView.swift
│   └── Chat/
│       └── ChatView.swift
├── Services/
│   ├── FirebaseService.swift
│   └── MonitoringService.swift
└── Utils/
    └── Extensions.swift
```

## 4. Web Admin Structure
```text
src/
├── components/
│   ├── layout/
│   │   └── Sidebar.tsx
│   ├── dashboard/
│   │   ├── StatsOverview.tsx
│   │   └── EmployeeActivity.tsx
│   └── ui/ (shadcn)
├── pages/
│   ├── Dashboard.tsx
│   ├── Employees.tsx
│   ├── Tasks.tsx
│   └── Chat.tsx
├── hooks/
│   └── useAuth.ts
└── lib/
    └── firebase.ts
```

## 5. Key Feature Implementation Strategy
- **Time Tracking:** iOS app uses a background task to track active app time. Inactivity is detected by monitoring UI interaction.
- **Screenshots:** iOS app uses `UIScreen.main.snapshotView` or similar (within app context) at random intervals (3-10 mins) and uploads to Firebase Storage.
- **Real-time Chat:** Firestore `onSnapshot` listeners for instant message delivery.
- **Productivity Scoring:** Gemini AI analyzes task completion rates vs. active time to generate a weekly score.

## 6. Security Best Practices
- **Firestore Rules:** Strict ownership-based access. Employees can only read their own tasks and sessions. Admins have full access.
- **Environment Variables:** All API keys stored in `.env`.
- **Validation:** Server-side validation for all task submissions.
