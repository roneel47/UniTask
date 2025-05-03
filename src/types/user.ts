
export interface User {
  usn: string;
  role: 'student' | 'admin';
  semester: number; // Ensure this field exists
  password?: string; // Add optional password for mock auth state management
  // Add other user-related fields if needed, e.g., name, department
  // name?: string;
  // department?: string;
}
