import { z } from "zod";

export const storyTextStyleSchema = z.object({
  size: z.enum(["sm", "md", "lg", "xl"]).default("md"),
  weight: z.enum(["regular", "strong", "black"]).default("strong"),
  align: z.enum(["left", "center", "right"]).default("center"),
  background: z.enum(["none", "glass", "solid"]).default("none"),
  backgroundOpacity: z.number().int().min(0).max(100).default(0),
  positionX: z.number().int().min(12).max(88).default(50),
  positionY: z.number().int().min(14).max(86).default(50),
  rotation: z.number().int().min(-12).max(12).default(0),
}).strict();

export type StoryTextStyle = z.infer<typeof storyTextStyleSchema>;

export const DEFAULT_STORY_TEXT_STYLE: StoryTextStyle = {
  size: "md",
  weight: "strong",
  align: "center",
  background: "none",
  backgroundOpacity: 0,
  positionX: 50,
  positionY: 50,
  rotation: 0,
};

export function normalizeStoryTextStyle(value: unknown): StoryTextStyle {
  if (value === undefined || value === null) return DEFAULT_STORY_TEXT_STYLE;
  return storyTextStyleSchema.parse(value);
}

export function isAdvancedStoryTextStyle(value: unknown): boolean {
  const normalized = normalizeStoryTextStyle(value);
  return (Object.keys(DEFAULT_STORY_TEXT_STYLE) as Array<keyof StoryTextStyle>)
    .some((key) => normalized[key] !== DEFAULT_STORY_TEXT_STYLE[key]);
}
