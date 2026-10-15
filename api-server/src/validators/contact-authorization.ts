import { z } from 'zod';

export const contactRequestBodySchema=z.object({recipientId:z.string().uuid()}).strict();
export const contactRequestParamsSchema=z.object({requestId:z.string().uuid()}).strict();
export const noContactRequestBodySchema=z.preprocess(value=>value??{},z.object({}).strict());
