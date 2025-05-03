"use client";

import React, { useState } from 'react';
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

interface CreateTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (taskData: Omit<Task, 'id' | 'status' | 'assignedBy'>) => void;
}

const formSchema = z.object({
  title: z.string().min(1, { message: 'Title is required.' }),
  description: z.string().min(1, { message: 'Description is required.' }),
  dueDate: z.date({ required_error: 'Due date is required.' }),
   // Add field for assigning to specific USN or group (e.g., 'all', '1rg22cs005')
  assignTo: z.string().min(1, {message: "Specify who to assign to ('all' or USN)."} ),
  // attachmentUrl: z.string().url().optional(), // Optional: For attaching files during creation
});

export function CreateTaskDialog({ isOpen, onClose, onCreate }: CreateTaskDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      dueDate: undefined,
      assignTo: 'all', // Default to assigning all students in the focus group
    },
  });

   const handleDialogClose = (open: boolean) => {
    if (!open) {
      form.reset(); // Reset form when dialog closes
      onClose();
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    console.log("Creating task with values:", values);
    // In a real app, you'd handle file uploads if needed before calling onCreate
    try {
        // Construct the task data, mapping assignTo to the USN field logic
        // This is simplified; backend would handle 'all' expansion
        const taskData = {
            title: values.title,
            description: values.description,
            dueDate: values.dueDate,
            usn: values.assignTo, // Pass 'all' or specific USN
            // attachmentUrl: values.attachmentUrl,
        };
        onCreate(taskData);
        form.reset();
        onClose(); // Close dialog on success
    } catch (error) {
        console.error("Failed to create task:", error);
        // Show error toast if needed
    } finally {
        setIsLoading(false);
    }

  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Task/Assignment</DialogTitle>
          <DialogDescription>
            Fill in the details for the new task. It will be added to the 'To Be Started' column.
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
                    <Input placeholder="e.g., Lab Assignment 4" {...field} />
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
                    <Textarea placeholder="Describe the task requirements..." {...field} />
                  </FormControl>
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
                     <Input placeholder="Enter 'all' or specific USN (e.g., 1RG22CS005)" {...field} />
                  </FormControl>
                   <FormMessage />
                   <p className="text-xs text-muted-foreground">Use 'all' for 1RG22CS001-098 focus group.</p>
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
                        >
                          {field.value ? (
                            format(field.value, "PPP") // e.g., Oct 25, 2024
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
                        disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))} // Disable past dates
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
