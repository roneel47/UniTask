import { differenceInHours, differenceInDays, format, isToday, isTomorrow } from 'date-fns';

/**
 * Determines the color code based on the due date's urgency.
 * @param dueDate The due date of the task.
 * @returns 'red', 'yellow', or 'white' based on urgency.
 */
export function getDueDateColor(dueDate: Date): 'red' | 'yellow' | 'white' {
  const now = new Date();
  const hoursDifference = differenceInHours(dueDate, now);

  if (hoursDifference < 24) {
    return 'red'; // Due in less than 24 hours or overdue
  }

  const daysDifference = differenceInDays(dueDate, now);

  if (daysDifference <= 3) {
    return 'yellow'; // Due in 1-3 days
  }

  return 'white'; // Due in more than 3 days
}

/**
 * Formats the due date for display.
 * @param dueDate The due date to format.
 * @param includeTime Whether to include the time in the format.
 * @returns A formatted date string (e.g., "Today, 5:00 PM", "Tomorrow", "Oct 25").
 */
export function formatDueDate(dueDate: Date, includeTime: boolean = false): string {
  const now = new Date();

  if (isToday(dueDate)) {
    return includeTime ? `Today, ${format(dueDate, 'p')}` : 'Today';
  }
  if (isTomorrow(dueDate)) {
     return includeTime ? `Tomorrow, ${format(dueDate, 'p')}` : 'Tomorrow';
  }
    if (differenceInDays(dueDate, now) < 7 && differenceInDays(dueDate, now) > 0) {
     return includeTime ? format(dueDate, 'EEE, p') : format(dueDate, 'EEEE'); // e.g., "Wed, 5:00 PM" or "Wednesday"
  }

  return includeTime ? format(dueDate, 'MMM d, p') : format(dueDate, 'MMM d'); // e.g., "Oct 25, 5:00 PM" or "Oct 25"
}
