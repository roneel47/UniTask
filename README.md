# UniTask: Task Management System for Students and Admins

UniTask is a web application built with Next.js designed to streamline task and assignment management within an educational institution. It provides distinct interfaces and functionalities for students, administrators (teachers/CRs), and a master administrator.

## Core Features

*   **User Authentication:** Secure USN-based login and registration system.
*   **Role-Based Access Control:**
    *   **Student:** View assigned tasks, manage task progress (move between 'To Be Started', 'In Progress', 'Completed', 'Submitted'), upload submissions. Cannot move tasks to 'Done' or move tasks back from 'Submitted'/'Done'.
    *   **Admin (Teacher/CR):** Create tasks for specific semesters or individual users, view tasks assigned by them, view all tasks for users within selected filters (semester/USN), manage task status for students (including marking as 'Done'), refresh task data. Cannot create tasks if they are the Master Admin.
    *   **Master Admin:** Has all Admin privileges plus the ability to manage user accounts (view all users, change roles, promote student semesters, delete users, remove semester association from other Admins).
*   **Kanban Task Board:** Intuitive drag-and-drop interface for managing task status. Columns represent task stages: 'To Be Started', 'In Progress', 'Completed', 'Submitted', 'Done'.
*   **Task Creation (Admin):** Admins can assign tasks to all users within a specific semester ('1'-'8' or 'N/A' for non-student admins) or to an individual user by USN. Tasks include title, description, due date, and assigning admin's name.
*   **Due Date Indicators:** Task cards visually indicate urgency based on the due date (Red: < 24hrs, Yellow: 1-3 days, White: > 3 days).
*   **User Management (Master Admin):**
    *   View all registered users with filtering by role, semester, and USN search.
    *   Promote students from one semester to the next (specifically targeting semesters 1-7).
    *   Toggle user roles between 'student' and 'admin' (cannot change own role or Master Admin's role).
    *   Remove semester association for Admins (useful for teachers not tied to one student semester).
    *   Delete user accounts (permanently removes user and associated tasks).
*   **Task Assignment History (Admin):** Regular admins can view a list of the unique task assignments they have created, with options to delete the entire assignment for all users.
*   **Retroactive Task Assignment:** Newly registered students automatically receive tasks previously assigned to 'all' users in their semester.
*   **Data Persistence:** User and task data are stored locally using the browser's `localStorage` for persistence across sessions (mock backend).
*   **Theming:** Supports Light and Dark mode toggling.
*   **Responsive Design:** Adapts to different screen sizes.
*   **Loading States:** Provides visual feedback during data loading and operations.

## Tech Stack

*   **Framework:** Next.js (App Router)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS
*   **UI Components:** Shadcn/ui
*   **State Management:** React Context API
*   **Drag & Drop:** `@hello-pangea/dnd`
*   **Date Management:** `date-fns`
*   **Forms:** React Hook Form, Zod
*   **Icons:** Lucide React

## Getting Started

### Prerequisites

*   Node.js (v18 or later recommended)
*   npm or yarn

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```
2.  Install dependencies:
    ```bash
    npm install
    # or
    yarn install
    ```

### Running the Development Server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:9002](http://localhost:9002) (or the specified port) with your browser to see the application.

## Default Credentials

*   **Master Admin:**
    *   USN: `MASTERADMIN1`
    *   Password: `MasterPass!456`

_(Note: Other users need to be registered through the application's registration page.)_

## How It Works

*   **Authentication:** Users log in with their University Serial Number (USN) and password. New students can register. Data is stored in `localStorage`. USNs are always stored and compared in uppercase.
*   **Task Flow:**
    1.  Admins create tasks, assigning them by semester and specifying 'all' or a specific USN.
    2.  Tasks appear on the relevant users' Kanban boards in the 'To Be Started' column.
    3.  Students drag tasks through 'In Progress' and 'Completed'.
    4.  Students can upload a submission file, which moves the task to 'Submitted'.
    5.  Admins review submitted tasks and can move them to 'Done'.
*   **User Management:** The Master Admin uses the 'Manage Users' page to oversee all accounts, adjust roles, and manage semester progression.