import { z } from 'zod';

export const formSchema = z.object({
  date: z.date(),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  venue: z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    link: z.string().min(1),
    addressLines: z.string().min(1),
  }),
  level: z.string().min(1),
  players: z.array(z.string().optional()).length(4),
});
