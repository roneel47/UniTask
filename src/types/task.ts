export enum TaskStatus {
  ToBeStarted = 'To Be Started',
  InProgress = 'In Progress',
  Completed = 'Completed', // Student marks as completed
  Submitted = 'Submitted', // Student submits (e.g., uploads file)
  Done = 'Done',         // Admin verifies and marks as done
}

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: Date;
  status: TaskStatus;
  assignedBy: string; // Admin's USN or name
  usn: string; // Student USN this task instance is for
  attachmentUrl?: string; // URL for admin-provided attachment
  submissionUrl?: string; // URL for student-submitted file
  submittedAt?: Date; // Timestamp when student submitted
  completedAt?: Date; // Timestamp when admin marked as Done
  // Add other relevant fields like subject, points, etc. if needed
  // subject?: string;
  // points?: number;
}
