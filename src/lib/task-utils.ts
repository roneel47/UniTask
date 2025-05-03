import { Task, TaskStatus } from '@/types/task';

type GroupedTasks = {
  [key in TaskStatus]?: Task[];
};

/**
 * Groups an array of tasks by their status.
 * @param tasks Array of tasks.
 * @returns An object where keys are TaskStatus and values are arrays of tasks.
 */
export function groupTasksByStatus(tasks: Task[]): GroupedTasks {
  return tasks.reduce((acc, task) => {
    const status = task.status;
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status]?.push(task);
    // Optional: Sort tasks within each group, e.g., by due date
    // acc[status]?.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
    return acc;
  }, {} as GroupedTasks);
}
