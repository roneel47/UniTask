"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
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
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

 useEffect(() => {
    if (user) {
      setIsDataLoading(true);
      // Simulate fetching tasks for the logged-in user
      // In a real app, this would be an API call filtering by user.usn
      // and potentially department/semester based on USN prefix
      setTimeout(() => {
        const userTasks = initialTasks.filter(task => user.role === 'admin' || task.usn === user.usn);
        setTasks(userTasks);
        setIsDataLoading(false);
      }, 1000); // Simulate network delay
    }
 }, [user]);

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
    // Simulate creating task via API - Only Admins should be able to do this
     if (user?.role !== 'admin') return;

     console.log("Creating new task:", newTaskData);
     const newTask: Task = {
       id: String(Date.now()), // Temporary ID generation
       ...newTaskData,
       status: TaskStatus.ToBeStarted,
       assignedBy: user.usn, // Assign by the current admin user
       // Assign to all students in the focus group (example logic)
       // In real app, logic would be more robust based on department/semester
       usn: '1RG22CSXXX' // Placeholder for bulk assign or specific student
     };

     // Example for bulk assigning to the focus group
     const focusGroupUsns = Array.from({ length: 98 }, (_, i) => `1RG22CS${String(i + 1).padStart(3, '0')}`);
     const newTasks = focusGroupUsns.map(usn => ({
        ...newTask,
        id: `${newTask.id}-${usn}`, // Unique ID per student assignment
        usn: usn,
     }));

     setTasks(prevTasks => [...prevTasks, ...newTasks]);
     // Add API call and error handling here
  };

  if (loading || !user) {
    // Show loading state or redirect handled by useEffect
     return (
      <div className="container mx-auto p-4 pt-8">
         <div className="flex justify-between items-center mb-6">
            <Skeleton className="h-8 w-48 bg-muted" />
            <Skeleton className="h-10 w-24 bg-muted" />
         </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-secondary p-4 rounded-lg shadow">
              <Skeleton className="h-6 w-3/4 mb-4 bg-muted" />
              <Skeleton className="h-24 w-full mb-2 bg-muted" />
              <Skeleton className="h-24 w-full bg-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }


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
        <KanbanBoard tasks={tasks} onTaskMove={handleTaskMove} isAdmin={user.role === 'admin'} />
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
