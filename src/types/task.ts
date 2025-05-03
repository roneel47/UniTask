
export enum TaskStatus {
  ToBeStarted = 'To Be Started',
  InProgress = 'In Progress',
  Completed = 'Completed', // Student marks as completed (before submission if needed)
  Submitted = 'Submitted', // Student submits (e.g., uploads file)
  Done = 'Done',         // Admin verifies and marks as done,
}

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: Date; // Ensure this is Date
  status: TaskStatus;
  assignedBy: string; // Admin's USN (must be uppercase)
  assignedByName?: string; // Optional: Admin's Display Name/Title (e.g., "Prof. Smith", "CR") - NEW FIELD
  usn: string; // Student USN this task instance is for (must be uppercase)
  semester: number | null; // Allow semester to be null
  attachmentUrl?: string; // URL for admin-provided attachment
  submissionUrl?: string; // URL for student-submitted file
  submittedAt?: Date; // Ensure this is Date | undefined
  completedAt?: Date; // Ensure this is Date | undefined
  // Add other relevant fields like subject, points, etc. if needed
  // subject?: string;
  // points?: number;
}
