
"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
// No need for useRouter for redirection, layout handles it
// import { useRouter } from 'next/navigation';
import { KanbanBoard } from '@/components/kanban/kanban-board';
import { Task, TaskStatus } from '@/types/task'; // Assuming types are defined
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { CreateTaskDialog } from '@/components/kanban/create-task-dialog';
import { Skeleton } from '@/components/ui/skeleton';

// Mock data - Replace with API calls
const initialTasks: Task[] = [
  { id: '1', title: 'Complete Project Proposal', description: 'Finalize and submit the project proposal document.', dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), status: TaskStatus.ToBeStarted, assignedBy: 'Prof. Smith', usn: '1RG22CS001' },
  { id: '2', title: 'Study for Midterm Exam', description: 'Review chapters 1-5 for the upcoming exam.', dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), status: TaskStatus.InProgress, assignedBy: 'Prof. Doe', usn: '1RG22CS001' },
  { id: '3', title: 'Lab Assignment 3', description: 'Implement the algorithm described in the lab manual.', dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), status: TaskStatus.Completed, assignedBy: 'TA Jane', usn: '1RG22CS001' },
   { id: '4', title: 'Prepare Presentation', description: 'Create slides for the group presentation.', dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), status: TaskStatus.Submitted, assignedBy: 'Prof. Doe', usn: '1RG22CS001', submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
   { id: '5', title: 'Read Research Paper', description: 'Analyze the assigned research paper.', dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), status: TaskStatus.Done, assignedBy: 'Prof. Smith', usn: '1RG22CS001', completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
   { id: '6', title: 'Code Review Session', description: 'Participate in the peer code review.', dueDate: new Date(Date.now() + 3 * 60 * 60 * 1000), status: TaskStatus.ToBeStarted, assignedBy: 'TA Jane', usn: '1RG22CS002' }, // Different USN
];


export default function DashboardPage() {
  // Layout handles loading and user presence check
  const { user } = useAuth();
  // const router = useRouter(); // No longer needed for redirection
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // useEffect(() => {
  //   // Layout handles redirection if user is not logged in
  //   if (!loading && !user) {
  //     router.replace('/login');
  //   }
  // }, [user, loading, router]);

 useEffect(() => {
    // User object is guaranteed to be present here because of the layout
    if (user) {
      setIsDataLoading(true);
      // Simulate fetching tasks for the logged-in user
      // In a real app, this would be an API call filtering by user.usn
      // and potentially department/semester based on USN prefix
      setTimeout(() => {
        // Filter tasks based on user role and USN
        const userTasks = initialTasks.filter(task =>
          user.role === 'admin' || task.usn.toUpperCase() === user.usn.toUpperCase()
        );
        setTasks(userTasks);
        setIsDataLoading(false);
      }, 1000); // Simulate network delay
    }
 }, [user]); // Depend on user object

  const handleTaskMove = (taskId: string, newStatus: TaskStatus) => {
    // Simulate updating task status via API
    console.log(`Moving task ${taskId} to ${newStatus}`);
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId ? { ...task, status: newStatus } : task
      )
    );
    // Add optimistic update and error handling here in real app
  };

  const handleCreateTask = (newTaskData: Omit<Task, 'id' | 'status' | 'assignedBy'>) => {
    // User is guaranteed to be present and role check is still valid
     if (user?.role !== 'admin') return;

     console.log("Creating new task:", newTaskData);
     const taskIdBase = String(Date.now()); // Base ID for the task

     // Handle 'all' assignment vs specific USN
     let targetUsns: string[] = [];
     if (newTaskData.usn.toLowerCase() === 'all') {
         // Example: Assign to all students in the mock focus group (1RG22CS001-098)
         // In a real app, get this list from a database/API based on admin's context
         targetUsns = Array.from({ length: 98 }, (_, i) => `1RG22CS${String(i + 1).padStart(3, '0')}`);
     } else {
         // Assign to a specific USN
         targetUsns = [newTaskData.usn.toUpperCase()];
         // You might want to add validation here to check if the USN exists
     }


     const newTasks: Task[] = targetUsns.map(usn => ({
        id: `${taskIdBase}-${usn}`, // Unique ID per student assignment
        title: newTaskData.title,
        description: newTaskData.description,
        dueDate: newTaskData.dueDate,
        status: TaskStatus.ToBeStarted,
        assignedBy: user.usn, // Assign by the current admin user
        usn: usn, // Specific USN for this task instance
        // attachmentUrl: newTaskData.attachmentUrl, // Include if added
     }));

     // Update state - if admin, show all tasks including newly created ones
     // If 'all' was used, this adds tasks for all students, visible only to admin initially
     // or to each student respectively.
      setTasks(prevTasks => {
         // Filter out any potential duplicates before adding new tasks
         const existingIds = new Set(prevTasks.map(t => t.id));
         const uniqueNewTasks = newTasks.filter(nt => !existingIds.has(nt.id));
         return [...prevTasks, ...uniqueNewTasks];
      });

     // Add API call and error handling here
  };

  // Loading state handled by layout, but keep data loading state
  // if (loading || !user) { ... } // Removed, handled by layout

  // The user object is guaranteed by the layout, so direct access is safe
  return (
    <div className="container mx-auto p-4 pt-8">
       <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-primary">
          {user.role === 'admin' ? 'Admin Dashboard' : `Student Dashboard (${user.usn})`}
        </h1>
        {user.role === 'admin' && (
          <Button onClick={() => setIsCreateTaskOpen(true)} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="mr-2 h-4 w-4" /> Create Task
          </Button>
        )}
      </div>

      {isDataLoading ? (
         <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-secondary p-4 rounded-lg shadow animate-pulse">
              <Skeleton className="h-6 w-3/4 mb-4 bg-muted" />
              <Skeleton className="h-24 w-full mb-2 bg-muted" />
              <Skeleton className="h-24 w-full bg-muted" />
            </div>
          ))}
        </div>
      ) : (
        // Filter tasks again just before rendering board for the current user's view
        <KanbanBoard
            tasks={tasks.filter(task => user.role === 'admin' || task.usn.toUpperCase() === user.usn.toUpperCase())}
            onTaskMove={handleTaskMove}
            isAdmin={user.role === 'admin'}
         />
      )}


      {user.role === 'admin' && (
        <CreateTaskDialog
          isOpen={isCreateTaskOpen}
          onClose={() => setIsCreateTaskOpen(false)}
          onCreate={handleCreateTask}
        />
      )}
    </div>
  );
}
