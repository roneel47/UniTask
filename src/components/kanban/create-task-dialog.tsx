
"use client";

import React from 'react'; // Removed useState as isLoading comes from props
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Task } from '@/types/task';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreateTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (taskData: Omit<Task, 'id' | 'status' | 'assignedBy'>) => Promise<void>; // Made onCreate async
  isLoading: boolean; // Add isLoading prop
}

// Define semester options
const semesterOptions = Array.from({ length: 8 }, (_, i) => String(i + 1));


const formSchema = z.object({
  title: z.string().min(1, { message: 'Title is required.' }),
  description: z.string().min(1, { message: 'Description is required.' }),
  dueDate: z.date({ required_error: 'Due date is required.' }),
  assignTo: z.string().min(1, {message: "Specify who to assign to ('all' or USN)."} ),
  semester: z.string().refine(val => /^[1-8]$/.test(val), { message: 'Semester must be selected.' }), // Add semester validation
  // attachmentUrl: z.string().url().optional(), // Optional
});

export function CreateTaskDialog({ isOpen, onClose, onCreate, isLoading }: CreateTaskDialogProps) {
  // isLoading state removed, now passed as prop

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      dueDate: undefined,
      assignTo: 'all', // Default to 'all' for the selected semester
      semester: '', // Default semester value
    },
  });

   const handleDialogClose = (open: boolean) => {
    if (!open && !isLoading) { // Prevent closing while loading
      form.reset();
      onClose();
    }
   };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    // isLoading state management moved to parent (DashboardPage)
    console.log("Submitting task creation with values:", values);
    try {
        const taskData = {
            title: values.title,
            description: values.description,
            dueDate: values.dueDate,
            usn: values.assignTo, // 'all' or specific USN
            semester: parseInt(values.semester, 10), // Ensure semester is a number
            // attachmentUrl: values.attachmentUrl,
        };
        await onCreate(taskData); // Call the async onCreate from props
        // Success handling (closing dialog, resetting form) is now managed in the parent's handleCreateTask
         form.reset(); // Reset form on successful submission *after* parent handles it
         // onClose(); // Let parent decide when to close
    } catch (error) {
        console.error("Error during task submission in dialog:", error);
        // Error display is handled in the parent component (DashboardPage) via toast/alert
    }
    // finally { setIsLoading(false); } // Removed, parent manages loading
  }

  return (
    // Prevent closing via overlay click or escape key when loading
    <Dialog open={isOpen} onOpenChange={handleDialogClose} modal={!isLoading}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Task/Assignment</DialogTitle>
          <DialogDescription>
            Fill in the details for the new task. Assigned tasks appear in the respective student's 'To Be Started' column.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Lab Assignment 4" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe the task requirements..." {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
                control={form.control}
                name="semester"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Semester</FormLabel>
                     <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select target semester" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {semesterOptions.map((sem) => (
                          <SelectItem key={sem} value={sem}>
                            {sem}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
             <FormField
              control={form.control}
              name="assignTo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign To</FormLabel>
                  <FormControl>
                     <Input placeholder="Enter 'all' or specific USN (e.g., 1RG22CS005)" {...field} disabled={isLoading} />
                  </FormControl>
                   <FormMessage />
                   <p className="text-xs text-muted-foreground">Use 'all' to assign to all students in the selected semester.</p>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Due Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={isLoading} // Disable popover trigger when loading
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date(new Date().setHours(0,0,0,0)) || isLoading} // Disable past dates and calendar when loading
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Add File Upload Field Here if needed during creation */}
             <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleDialogClose(false)} disabled={isLoading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading} className="bg-accent text-accent-foreground hover:bg-accent/90">
                   {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Create Task
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
