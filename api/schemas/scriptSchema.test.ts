import { describe, it, expect } from 'vitest';
import { createScriptSchema, updateScriptSchema } from './scriptSchema'; // Adjust path if needed

describe('Script Schemas', () => {

    // --- Tests for createScriptSchema ---
    describe('createScriptSchema', () => {
        const validLine = { character: 'Alice', dialogue: 'Hello there.' };
        const validCharacter = 'Alice';

        it('should validate correct data with title', () => {
            const data = {
                title: 'Test Script',
                characters: [validCharacter, 'Bob'],
                lines: [validLine, { character: 'Bob', dialogue: 'Hi!' }]
            };
            const result = createScriptSchema.safeParse(data);
            expect(result.success).toBe(true);
        });

        it('should validate correct data without title', () => {
            const data = {
                // title is omitted
                characters: [validCharacter],
                lines: [validLine]
            };
            const result = createScriptSchema.safeParse(data);
            expect(result.success).toBe(true);
        });

        it('should fail if characters array is empty', () => {
            const data = { characters: [], lines: [validLine] };
            const result = createScriptSchema.safeParse(data);
            expect(result.success).toBe(false);
            expect(result.error?.errors[0]?.message).toBe('At least one character is required');
        });

        it('should fail if a character name is empty', () => {
            const data = { characters: [validCharacter, ''], lines: [validLine] };
            const result = createScriptSchema.safeParse(data);
            expect(result.success).toBe(false);
            expect(result.error?.errors[0]?.message).toBe('Character name cannot be empty');
            expect(result.error?.errors[0]?.path).toEqual(['characters', 1]);
        });

        it('should fail if lines array is empty', () => {
            const data = { characters: [validCharacter], lines: [] };
            const result = createScriptSchema.safeParse(data);
            expect(result.success).toBe(false);
            expect(result.error?.errors[0]?.message).toBe('At least one line is required');
        });

        it('should fail if a line object has empty character', () => {
            const data = { characters: [validCharacter], lines: [{ character: '', dialogue: 'Test' }] };
            const result = createScriptSchema.safeParse(data);
            expect(result.success).toBe(false);
            expect(result.error?.errors[0]?.message).toBe('Character name cannot be empty');
            expect(result.error?.errors[0]?.path).toEqual(['lines', 0, 'character']);
        });

        it('should fail if a line object has empty dialogue', () => {
            const data = { characters: [validCharacter], lines: [{ character: 'Alice', dialogue: '' }] };
            const result = createScriptSchema.safeParse(data);
            expect(result.success).toBe(false);
            expect(result.error?.errors[0]?.message).toBe('Dialogue cannot be empty');
            expect(result.error?.errors[0]?.path).toEqual(['lines', 0, 'dialogue']);
        });

         it('should fail if characters is missing', () => {
            const data = { lines: [validLine] }; // Missing characters
            const result = createScriptSchema.safeParse(data);
            expect(result.success).toBe(false);
            expect(result.error?.errors[0]?.path).toEqual(['characters']);
        });

         it('should fail if lines is missing', () => {
            const data = { characters: [validCharacter] }; // Missing lines
            const result = createScriptSchema.safeParse(data);
            expect(result.success).toBe(false);
            expect(result.error?.errors[0]?.path).toEqual(['lines']);
        });
    });

    // --- Tests for updateScriptSchema ---
    describe('updateScriptSchema', () => {
        const validLine = { character: 'Alice', dialogue: 'Updated dialogue.' };
        const validCharacter = 'Alice';

        it('should validate updating title only', () => {
            const data = { title: 'New Title' };
            const result = updateScriptSchema.safeParse(data);
            expect(result.success).toBe(true);
        });

        it('should validate updating characters only', () => {
            const data = { characters: ['Charlie'] };
            const result = updateScriptSchema.safeParse(data);
            expect(result.success).toBe(true);
        });

        it('should validate updating lines only', () => {
            const data = { lines: [validLine] };
            const result = updateScriptSchema.safeParse(data);
            expect(result.success).toBe(true);
        });

        it('should validate updating multiple fields', () => {
            const data = { title: 'Another Title', lines: [validLine] };
            const result = updateScriptSchema.safeParse(data);
            expect(result.success).toBe(true);
        });

        it('should fail if data object is empty', () => {
            const data = {};
            const result = updateScriptSchema.safeParse(data);
            expect(result.success).toBe(false);
            expect(result.error?.errors[0]?.message).toBe('At least one field must be provided for update');
        });

        it('should fail if characters array contains empty string', () => {
            const data = { characters: [validCharacter, ''] };
            const result = updateScriptSchema.safeParse(data);
            expect(result.success).toBe(false);
            // Note: Zod's partial makes the array optional, but the string inside still needs validation
            expect(result.error?.errors[0]?.message).toBe('String must contain at least 1 character(s)');
            expect(result.error?.errors[0]?.path).toEqual(['characters', 1]);
        });

        it('should fail if lines array contains invalid line object', () => {
            const data = { lines: [validLine, { character: 'Bob', dialogue: '' }] };
            const result = updateScriptSchema.safeParse(data);
            expect(result.success).toBe(false);
            expect(result.error?.errors[0]?.message).toBe('Dialogue cannot be empty');
            expect(result.error?.errors[0]?.path).toEqual(['lines', 1, 'dialogue']);
        });

         it('should allow empty characters array if provided', () => {
            // While create requires min(1), update allows setting it to empty
            const data = { characters: [] };
            const result = updateScriptSchema.safeParse(data);
            expect(result.success).toBe(true);
        });

         it('should allow empty lines array if provided', () => {
             // While create requires min(1), update allows setting it to empty
            const data = { lines: [] };
            const result = updateScriptSchema.safeParse(data);
            expect(result.success).toBe(true);
        });
    });
});