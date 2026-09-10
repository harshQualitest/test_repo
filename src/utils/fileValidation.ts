/**
 * Purpose: Client-side validation for two distinct file-upload flows, run
 * before a file is sent to the backend so the user gets instant feedback:
 *
 * 1. `validateDatasetFile` — the LLM-grading dataset upload (CSV/Excel). It
 *    requires exactly the columns `prompt`, `llm1`, `llm2` (no more, no less)
 *    with no empty cells, since the grading pipeline reads those columns
 *    positionally by name.
 * 2. `validateUserCsvFile` — the bulk user-invite CSV upload. It requires
 *    `email`/`role` columns, validates email format and allowed role values,
 *    enforces an `@quality-ai.com` domain restriction for privileged roles
 *    (workspace/project manager) to prevent externally-invited accounts from
 *    getting elevated access, and flags duplicate emails within the file.
 *
 * Both flows share CSV parsing (`parseCSV`) and a `FileReader`-based file
 * read helper; Excel parsing uses the `xlsx` library. All entry points return
 * a result object rather than throwing, so callers can render validation
 * errors directly without a try/catch.
 */
import * as XLSX from 'xlsx';

export interface FileValidationResult {
    isValid: boolean;
    error?: string;
}

const REQUIRED_HEADERS = ['prompt', 'llm1', 'llm2'];

/**
 * Validates dataset file (CSV or Excel)
 * Checks for required headers and empty cells
 * @param file - The uploaded CSV/Excel file.
 * @returns `{ isValid: true }` on success, or `{ isValid: false, error }` describing the first
 * validation failure (empty file, missing/extra headers, or an empty required cell).
 * Never throws — read/parse errors are caught and surfaced via `error` instead.
 */
export const validateDatasetFile = async (file: File): Promise<FileValidationResult> => {
    try {
        const data = await readFile(file);
        
        console.log('Parsed data:', data); // Debug log
        
        if (!data || data.length === 0) {
            return {
                isValid: false,
                error: 'File is empty or could not be read',
            };
        }

        // Check headers
        const headers = Object.keys(data[0]).map(h => h.toLowerCase().trim());
        console.log('Headers found:', headers); // Debug log
        
        const missingHeaders = REQUIRED_HEADERS.filter(h => !headers.includes(h));
        
        if (missingHeaders.length > 0) {
            return {
                isValid: false,
                error: `Missing required headers: ${missingHeaders.join(', ')}. Required headers are: prompt, llm1, llm2`,
            };
        }

        // Check for extra headers — the grading pipeline expects exactly these
        // three columns, so an unexpected extra column likely means the wrong
        // file was uploaded rather than a harmless addition.
        const extraHeaders = headers.filter(h => !REQUIRED_HEADERS.includes(h));
        if (extraHeaders.length > 0) {
            return {
                isValid: false,
                error: `Invalid headers found: ${extraHeaders.join(', ')}. Only prompt, llm1, and llm2 are allowed`,
            };
        }

        // Check for empty cells in required columns
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            for (const header of REQUIRED_HEADERS) {
                const value = row[header];
                
                console.log(`Row ${i + 2}, ${header}:`, JSON.stringify(value)); // Debug log
                
                // Check if value is empty, null, undefined, or just whitespace
                const isEmpty = value === null || 
                               value === undefined || 
                               value === '' ||
                               (typeof value === 'string' && value.trim() === '');
                
                if (isEmpty) {
                    return {
                        isValid: false,
                        error: `Empty cell found in row ${i + 2} (${header} column). All cells in prompt, llm1, and llm2 columns must contain data`,
                    };
                }
            }
        }

        return {
            isValid: true,
        };
    } catch (error) {
        console.error('Validation error:', error); // Debug log
        return {
            isValid: false,
            error: error instanceof Error ? error.message : 'Failed to validate file',
        };
    }
};

/**
 * Reads file and returns data as array of objects
 * @param file - The file to read; branches on extension to pick CSV vs Excel parsing.
 * @returns A promise resolving to an array of row objects keyed by lowercased header name.
 * @throws Rejects with an `Error` for an unsupported extension, an unreadable file, or a parse failure.
 */
const readFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                if (!data) {
                    reject(new Error('Failed to read file'));
                    return;
                }

                let parsedData: any[] = [];

                if (file.name.endsWith('.csv')) {
                    // Parse CSV
                    parsedData = parseCSV(data as string);
                } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                    // Parse Excel
                    parsedData = parseExcel(data);
                } else {
                    reject(new Error('Unsupported file format'));
                    return;
                }

                resolve(parsedData);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };

        if (file.name.endsWith('.csv')) {
            reader.readAsText(file);
        } else {
            reader.readAsArrayBuffer(file);
        }
    });
};

/**
 * Parse CSV file with proper handling of quoted fields and empty cells
 * @param csvString - Raw CSV file contents.
 * @returns Array of row objects keyed by lowercased, trimmed header name. Blank lines are
 * skipped; the first non-blank line is always treated as the header row.
 */
const parseCSV = (csvString: string): any[] => {
    const lines = csvString.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
        return [];
    }

    // Hand-rolled parser (no CSV library dependency) that still handles quoted
    // fields correctly — needed because a naive `split(',')` would break on
    // commas embedded inside quoted prompt/response text.
    const parseLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    // Escaped quote
                    current += '"';
                    i++; // Skip next quote
                } else {
                    // Toggle quote state
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                // End of field
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        // Add last field
        result.push(current.trim());
        return result;
    };

    const headers = parseLine(lines[0]).map(h => h.toLowerCase().trim());
    const data: any[] = [];

    for (let i = 1; i < lines.length; i++) {
        const values = parseLine(lines[i]);
        const row: any = {};
        
        headers.forEach((header, index) => {
            // Get value and ensure undefined is set for missing columns
            const value = index < values.length ? values[index] : '';
            row[header] = value;
        });
        
        data.push(row);
    }

    return data;
};

/**
 * Parse Excel file
 * @param arrayBuffer - The file contents read via `FileReader.readAsArrayBuffer`.
 * @returns Array of row objects keyed by lowercased, trimmed header name, using only the
 * workbook's first sheet.
 */
const parseExcel = (arrayBuffer: any): any[] => {
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    // raw: false formats values as displayed strings (dates, numbers) rather than
    // raw cell values; defval: '' ensures missing cells become '' instead of undefined
    // so the later "empty cell" check can treat all row shapes uniformly.
    const data = XLSX.utils.sheet_to_json(firstSheet, { 
        raw: false,
        defval: '' 
    });

    // Normalize headers to lowercase
    return data.map((row: any) => {
        const normalizedRow: any = {};
        Object.keys(row).forEach(key => {
            normalizedRow[key.toLowerCase().trim()] = row[key];
        });
        return normalizedRow;
    });
};

export interface CsvValidationResult {
    isValid: boolean;
    errors?: string[];
    data?: Array<{ email: string; role: string }>;
}

/**
 * Validates user CSV file for bulk upload
 * Checks for required headers (email, role), valid email format, and role restrictions
 * @param file - The uploaded CSV file listing users to invite.
 * @returns `{ isValid: true, data }` with the validated `{ email, role }` rows on success, or
 * `{ isValid: false, errors }` with one message per problem found (missing headers, invalid
 * email/role, restricted-domain violation, or duplicate email) — all rows are checked and all
 * errors collected before returning, rather than failing on the first bad row.
 * Never throws — read/parse errors are caught and surfaced via `errors` instead.
 */
export const validateUserCsvFile = async (file: File): Promise<CsvValidationResult> => {
    try {
        const data = await readCsvFile(file);

        if (!data || data.length === 0) {
            return {
                isValid: false,
                errors: ['File is empty or could not be read'],
            };
        }

        const errors: string[] = [];
        const validData: Array<{ email: string; role: string }> = [];
        const emailMap: Map<string, number[]> = new Map(); // Track emails and their row numbers

        // Check headers
        const headers = Object.keys(data[0]).map(h => h.toLowerCase().trim());
        const requiredHeaders = ['email', 'role'];

        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        if (missingHeaders.length > 0) {
            return {
                isValid: false,
                errors: [`Missing required headers: ${missingHeaders.join(', ')}. Required headers are: email, role`],
            };
        }

        // Validate each row
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const rowNumber = i + 2; // +2 because of 0-index and header row

            const email = row.email?.toString().trim();
            const role = row.role?.toString().trim();

            // Check for empty email or role
            if (!email) {
                errors.push(`Row ${rowNumber}: Email is required`);
                continue;
            }
            if (!role) {
                errors.push(`Row ${rowNumber}: Role is required`);
                continue;
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                errors.push(`Row ${rowNumber}: Invalid email format: ${email}`);
                continue;
            }

            // Validate role
            const validRoles = ['project_manager', 'workspace_manager', 'reviewer', 'annotator'];
            if (!validRoles.includes(role)) {
                errors.push(`Row ${rowNumber}: Invalid role "${role}". Valid roles are: ${validRoles.join(', ')}`);
                continue;
            }

            // Validate domain restrictions — manager-level roles carry elevated
            // permissions, so bulk-inviting them is restricted to internal
            // company email addresses to prevent externally-invited accounts
            // from being granted that access via a CSV upload.
            const restrictedRoles = ['workspace_manager', 'project_manager'];
            if (restrictedRoles.includes(role)) {
                if (!email.toLowerCase().endsWith('@quality-ai.com')) {
                    errors.push(`Row ${rowNumber}: Role "${role}" requires email domain @quality-ai.com. Email: ${email}`);
                    continue;
                }
            }

            // Track email for duplicate detection
            const normalizedEmail = email.toLowerCase();
            if (emailMap.has(normalizedEmail)) {
                emailMap.get(normalizedEmail)?.push(rowNumber);
            } else {
                emailMap.set(normalizedEmail, [rowNumber]);
            }

            // If all validations pass, add to valid data
            validData.push({ email, role });
        }

        // Check for duplicate emails
        for (const [email, rowNumbers] of emailMap.entries()) {
            if (rowNumbers.length > 1) {
                errors.push(`Duplicate email found: "${email}" in rows ${rowNumbers.join(', ')}`);
            }
        }

        if (errors.length > 0) {
            return {
                isValid: false,
                errors,
            };
        }

        return {
            isValid: true,
            data: validData,
        };
    } catch (error) {
        console.error('CSV validation error:', error);
        return {
            isValid: false,
            errors: [error instanceof Error ? error.message : 'Failed to validate CSV file'],
        };
    }
};

/**
 * Reads CSV file and returns data as array of objects
 * @param file - The CSV file to read (text-only; unlike `readFile`, no Excel branch).
 * @returns A promise resolving to an array of row objects keyed by lowercased header name.
 * @throws Rejects with an `Error` if the file is unreadable or empty.
 */
const readCsvFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const csvString = e.target?.result as string;
                if (!csvString) {
                    reject(new Error('Failed to read file'));
                    return;
                }

                const data = parseCSV(csvString);
                resolve(data);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };

        reader.readAsText(file);
    });
};
