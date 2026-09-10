import { describe, it, expect } from 'vitest';
import { validateDatasetFile, validateUserCsvFile } from '../fileValidation';

// ── File factory helpers ───────────────────────────────────────────────────────

function makeCsvFile(content: string, name = 'data.csv'): File {
    return new File([content], name, { type: 'text/csv' });
}

// ── validateDatasetFile ───────────────────────────────────────────────────────

describe('validateDatasetFile', () => {

    // ── Happy path ───────────────────────────────────────────────────────────

    describe('valid files', () => {
        it('accepts a CSV with all three required headers and data', async () => {
            const file = makeCsvFile('prompt,llm1,llm2\nhello,world,foo');
            const result = await validateDatasetFile(file);
            expect(result.isValid).toBe(true);
            expect(result.error).toBeUndefined();
        });

        it('accepts headers regardless of letter case', async () => {
            const file = makeCsvFile('PROMPT,LLM1,LLM2\nhello,world,foo');
            const result = await validateDatasetFile(file);
            expect(result.isValid).toBe(true);
        });

        it('accepts a multi-row CSV with data in all cells', async () => {
            const csv = 'prompt,llm1,llm2\nrow1prompt,row1llm1,row1llm2\nrow2prompt,row2llm1,row2llm2';
            const result = await validateDatasetFile(makeCsvFile(csv));
            expect(result.isValid).toBe(true);
        });

        it('accepts headers with surrounding whitespace', async () => {
            const file = makeCsvFile(' prompt , llm1 , llm2 \nhello,world,foo');
            const result = await validateDatasetFile(file);
            expect(result.isValid).toBe(true);
        });
    });

    // ── Missing / extra headers ───────────────────────────────────────────────

    describe('header errors', () => {
        it('rejects a CSV missing the llm2 header', async () => {
            const file = makeCsvFile('prompt,llm1\nhello,world');
            const result = await validateDatasetFile(file);
            expect(result.isValid).toBe(false);
            expect(result.error).toMatch(/missing required headers/i);
            expect(result.error).toContain('llm2');
        });

        it('rejects a CSV with no recognised headers', async () => {
            const file = makeCsvFile('a,b,c\n1,2,3');
            const result = await validateDatasetFile(file);
            expect(result.isValid).toBe(false);
            expect(result.error).toMatch(/missing required headers/i);
        });

        it('rejects a CSV with extra headers beyond the allowed three', async () => {
            const file = makeCsvFile('prompt,llm1,llm2,extra\nhello,world,foo,bar');
            const result = await validateDatasetFile(file);
            expect(result.isValid).toBe(false);
            expect(result.error).toMatch(/invalid headers found/i);
            expect(result.error).toContain('extra');
        });
    });

    // ── Empty cells ───────────────────────────────────────────────────────────

    describe('empty cell detection', () => {
        it('rejects when the prompt column is empty in any row', async () => {
            const file = makeCsvFile('prompt,llm1,llm2\n,response1,response2');
            const result = await validateDatasetFile(file);
            expect(result.isValid).toBe(false);
            expect(result.error).toMatch(/empty cell/i);
            expect(result.error).toContain('prompt');
        });

        it('rejects when the llm1 column is empty', async () => {
            const file = makeCsvFile('prompt,llm1,llm2\nhello,,response');
            const result = await validateDatasetFile(file);
            expect(result.isValid).toBe(false);
            expect(result.error).toMatch(/empty cell/i);
        });

        it('rejects when the llm2 column is empty in a later row', async () => {
            const csv = 'prompt,llm1,llm2\nrow1,resp1,resp2\nrow2,resp3,';
            const result = await validateDatasetFile(makeCsvFile(csv));
            expect(result.isValid).toBe(false);
            expect(result.error).toMatch(/empty cell/i);
        });

        it('rejects cells that contain only whitespace', async () => {
            const file = makeCsvFile('prompt,llm1,llm2\n   ,resp,resp2');
            const result = await validateDatasetFile(file);
            expect(result.isValid).toBe(false);
        });
    });

    // ── Empty / unreadable file ───────────────────────────────────────────────

    describe('empty or unreadable files', () => {
        it('rejects an empty CSV file', async () => {
            const file = makeCsvFile('');
            const result = await validateDatasetFile(file);
            expect(result.isValid).toBe(false);
        });

        it('rejects an unsupported file extension', async () => {
            const file = new File(['content'], 'data.txt', { type: 'text/plain' });
            const result = await validateDatasetFile(file);
            expect(result.isValid).toBe(false);
        });
    });
});

// ── validateUserCsvFile ───────────────────────────────────────────────────────

describe('validateUserCsvFile', () => {

    // ── Happy path ───────────────────────────────────────────────────────────

    describe('valid files', () => {
        it('accepts a CSV with valid email and annotator role', async () => {
            const file = makeCsvFile('email,role\nuser@example.com,annotator');
            const result = await validateUserCsvFile(file);
            expect(result.isValid).toBe(true);
            expect(result.data).toEqual([{ email: 'user@example.com', role: 'annotator' }]);
        });

        it('accepts a reviewer row', async () => {
            const file = makeCsvFile('email,role\nreviewer@org.com,reviewer');
            const result = await validateUserCsvFile(file);
            expect(result.isValid).toBe(true);
        });

        it('accepts a workspace_manager with the required @quality-ai.com domain', async () => {
            const file = makeCsvFile('email,role\nadmin@quality-ai.com,workspace_manager');
            const result = await validateUserCsvFile(file);
            expect(result.isValid).toBe(true);
        });

        it('accepts a project_manager with the required @quality-ai.com domain', async () => {
            const file = makeCsvFile('email,role\npm@quality-ai.com,project_manager');
            const result = await validateUserCsvFile(file);
            expect(result.isValid).toBe(true);
        });

        it('accepts multiple valid rows and returns all in data array', async () => {
            const csv = 'email,role\na@example.com,annotator\nb@example.com,reviewer';
            const result = await validateUserCsvFile(makeCsvFile(csv));
            expect(result.isValid).toBe(true);
            expect(result.data).toHaveLength(2);
        });

        it('is case-insensitive for header names', async () => {
            const file = makeCsvFile('EMAIL,ROLE\nuser@test.com,annotator');
            const result = await validateUserCsvFile(file);
            expect(result.isValid).toBe(true);
        });
    });

    // ── Header validation ─────────────────────────────────────────────────────

    describe('header validation', () => {
        it('rejects a file missing the role header', async () => {
            const file = makeCsvFile('email\nuser@example.com');
            const result = await validateUserCsvFile(file);
            expect(result.isValid).toBe(false);
            expect(result.errors?.[0]).toMatch(/missing required headers/i);
        });

        it('rejects a file missing the email header', async () => {
            const file = makeCsvFile('role\nannotator');
            const result = await validateUserCsvFile(file);
            expect(result.isValid).toBe(false);
            expect(result.errors?.[0]).toMatch(/missing required headers/i);
        });
    });

    // ── Email validation ──────────────────────────────────────────────────────

    describe('email validation', () => {
        it('rejects an invalid email format (no @ sign)', async () => {
            const file = makeCsvFile('email,role\nnotanemail,annotator');
            const result = await validateUserCsvFile(file);
            expect(result.isValid).toBe(false);
            expect(result.errors?.[0]).toMatch(/invalid email format/i);
        });

        it('rejects an email missing the domain part', async () => {
            const file = makeCsvFile('email,role\nuser@,annotator');
            const result = await validateUserCsvFile(file);
            expect(result.isValid).toBe(false);
        });

        it('rejects an empty email', async () => {
            const file = makeCsvFile('email,role\n,annotator');
            const result = await validateUserCsvFile(file);
            expect(result.isValid).toBe(false);
            expect(result.errors?.[0]).toMatch(/email is required/i);
        });
    });

    // ── Role validation ───────────────────────────────────────────────────────

    describe('role validation', () => {
        it('rejects an unrecognised role', async () => {
            const file = makeCsvFile('email,role\nuser@example.com,super_admin');
            const result = await validateUserCsvFile(file);
            expect(result.isValid).toBe(false);
            expect(result.errors?.[0]).toMatch(/invalid role/i);
        });

        it('rejects an empty role field', async () => {
            const file = makeCsvFile('email,role\nuser@example.com,');
            const result = await validateUserCsvFile(file);
            expect(result.isValid).toBe(false);
            expect(result.errors?.[0]).toMatch(/role is required/i);
        });
    });

    // ── Domain restriction ────────────────────────────────────────────────────

    describe('domain restriction', () => {
        it('rejects workspace_manager with a non-@quality-ai.com email', async () => {
            const file = makeCsvFile('email,role\nadmin@gmail.com,workspace_manager');
            const result = await validateUserCsvFile(file);
            expect(result.isValid).toBe(false);
            expect(result.errors?.[0]).toMatch(/@qualitestgroup\.com/i);
        });

        it('rejects project_manager with a non-@quality-ai.com email', async () => {
            const file = makeCsvFile('email,role\npm@gmail.com,project_manager');
            const result = await validateUserCsvFile(file);
            expect(result.isValid).toBe(false);
            expect(result.errors?.[0]).toMatch(/@qualitestgroup\.com/);
        });

        it('does NOT apply domain restriction to annotator', async () => {
            const file = makeCsvFile('email,role\nannotator@gmail.com,annotator');
            const result = await validateUserCsvFile(file);
            expect(result.isValid).toBe(true);
        });

        it('does NOT apply domain restriction to reviewer', async () => {
            const file = makeCsvFile('email,role\nr@outlook.com,reviewer');
            const result = await validateUserCsvFile(file);
            expect(result.isValid).toBe(true);
        });

        it('domain check is case-insensitive for the email', async () => {
            const file = makeCsvFile('email,role\nADMIN@QUALITESTGROUP.COM,workspace_manager');
            const result = await validateUserCsvFile(file);
            expect(result.isValid).toBe(true);
        });
    });

    // ── Duplicate email detection ─────────────────────────────────────────────

    describe('duplicate email detection', () => {
        it('rejects when the same email appears twice', async () => {
            const csv = 'email,role\ndup@example.com,annotator\ndup@example.com,reviewer';
            const result = await validateUserCsvFile(makeCsvFile(csv));
            expect(result.isValid).toBe(false);
            const dupeError = result.errors?.find(e => /duplicate/i.test(e));
            expect(dupeError).toBeDefined();
            expect(dupeError).toContain('dup@example.com');
        });

        it('duplicate check is case-insensitive', async () => {
            const csv = 'email,role\nUser@Example.com,annotator\nuser@example.com,reviewer';
            const result = await validateUserCsvFile(makeCsvFile(csv));
            expect(result.isValid).toBe(false);
            expect(result.errors?.some(e => /duplicate/i.test(e))).toBe(true);
        });

        it('accepts two different emails (no duplicate)', async () => {
            const csv = 'email,role\na@example.com,annotator\nb@example.com,reviewer';
            const result = await validateUserCsvFile(makeCsvFile(csv));
            expect(result.isValid).toBe(true);
        });
    });

    // ── Empty / unreadable ────────────────────────────────────────────────────

    describe('empty file handling', () => {
        it('rejects an empty CSV file', async () => {
            const result = await validateUserCsvFile(makeCsvFile(''));
            expect(result.isValid).toBe(false);
        });
    });
});
