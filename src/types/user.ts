
export interface User {
  usn: string;
  role: 'student' | 'admin';
  password?: string; // Add optional password for mock auth state management
  // Add other user-related fields if needed, e.g., name, department, semester
  // name?: string;
  // department?: string;
  // semester?: number;
}
