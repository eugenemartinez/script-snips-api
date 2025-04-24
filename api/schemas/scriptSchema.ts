import { z } from 'zod';

// Schema for a single line object
const lineSchema = z.object({
    character: z.string().min(1, { message: "Character name cannot be empty" }),
    dialogue: z.string().min(1, { message: "Dialogue cannot be empty" })
});

// Schema for creating a script
export const createScriptSchema = z.object({
    title: z.string().optional(), // Title is optional
    characters: z.array(z.string().min(1, { message: "Character name cannot be empty" }))
                 .min(1, { message: "At least one character is required" }),
    lines: z.array(lineSchema)
            .min(1, { message: "At least one line is required" })
});

// Schema for updating a script (all fields optional)
export const updateScriptSchema = z.object({
    title: z.string().optional(),
    characters: z.array(z.string().min(1)).optional(),
    lines: z.array(lineSchema).optional()
}).partial().refine(data => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update" // Ensure at least one field is being updated
});