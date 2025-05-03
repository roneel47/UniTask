
export interface User {
  usn: string;
  role: 'student' | 'admin';
  semester: number | null; // Allow semester to be null
  password?: string; // Add optional password for mock auth state management
  // Add other user-related fields if needed, e.g., name, department
  // name?: string;
  // department?: string;
}
