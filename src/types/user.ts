
export interface User {
  usn: string;
  role: 'student' | 'admin';
  semester: number; // Added semester field
  password?: string; // Add optional password for mock auth state management
  // Add other user-related fields if needed, e.g., name, department
  // name?: string;
  // department?: string;
}
