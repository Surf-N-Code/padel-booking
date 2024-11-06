"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const formSchema = z.object({
  date: z.date(),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  location: z.string().min(1),
  level: z.string().min(1),
  players: z.array(z.string().optional()).length(4),
})

const GAME_LEVELS = [
  { value: "beginner", label: "Beginner (0-2.0)" },
  { value: "intermediate", label: "Intermediate (2.5-3.5)" },
  { value: "advanced", label: "Advanced (4.0-4.5)" },
  { value: "expert", label: "Expert (5.0+)" },
  { value: "mixed", label: "Mixed Levels" },
] as const

export function NewGameForm() {
  const router = useRouter()
  const form = useForm<z.infer<typeof formSchema>>({
    defaultValues: {
      date: new Date(),
      startTime: "",
      endTime: "",
      location: "Hall 1",
      level: "mixed",
      players: ["", "", "", ""]
    },
    resolver: zodResolver(formSchema)
  })

  const createGame = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const dateTime = new Date(values.date)
      const [startHour, startMinute] = values.startTime.split(":")
      dateTime.setHours(parseInt(startHour), parseInt(startMinute))

      const response = await fetch("/api/games", {
        method: "POST",
        body: JSON.stringify({
          dateTime: dateTime.toISOString(),
          location: values.location,
          level: values.level,
          players: values.players
            .filter(Boolean)
            .map(name => ({
              id: crypto.randomUUID(),
              name,
              userId: "temp-user-id"
            }))
        })
      })
      return response.json()
    },
    onSuccess: () => {
      router.push("/")
      router.refresh()
    }
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    createGame.mutate(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-xl">
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date & Time</FormLabel>
              <FormControl>
                <Input 
                  type="date" 
                  value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    const date = new Date(e.target.value);
                    field.onChange(date);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex gap-4">
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="level"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Game Level</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {GAME_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex gap-4">
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Time</FormLabel>
                <FormControl>
                  <Input 
                    type="time" 
                    value={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Time</FormLabel>
                <FormControl>
                  <Input 
                    type="time" 
                    value={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <FormLabel>Players</FormLabel>
          {[0, 1, 2, 3].map((index) => (
            <FormField
              key={index}
              control={form.control}
              name={`players.${index}`}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input 
                      placeholder={`Player ${index + 1}`} 
                      value={field.value ?? ''}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
        </div>

        <Button type="submit" className="w-full">
          Create Game
        </Button>
      </form>
    </Form>
  )
}