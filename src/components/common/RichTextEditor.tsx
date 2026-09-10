import { forwardRef, useImperativeHandle } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Box, IconButton, Divider, Stack, ToggleButton, ToggleButtonGroup, useTheme, alpha } from '@mui/material';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import FormatAlignCenterIcon from '@mui/icons-material/FormatAlignCenter';
import FormatAlignRightIcon from '@mui/icons-material/FormatAlignRight';
import LinkIcon from '@mui/icons-material/Link';
import CodeIcon from '@mui/icons-material/Code';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    error?: boolean;
    helperText?: string;
}

export interface RichTextEditorHandle {
    insertText: (text: string) => void;
}

/**
 * Component: RichTextEditor
 *
 * Purpose: WYSIWYG HTML editor (built on Tiptap/ProseMirror) used for
 * authoring email template bodies, with a formatting toolbar (bold, italic,
 * headings, lists, alignment, links, code blocks).
 *
 * Responsibilities:
 * - Wraps a Tiptap `useEditor` instance configured with StarterKit, Link,
 *   TextAlign, TextStyle, and Color extensions.
 * - Renders a toolbar whose buttons reflect the active formatting state
 *   (`editor.isActive(...)`) and toggle it on click.
 * - Propagates content changes to the parent via `onChange` with the
 *   editor's serialized HTML.
 * - Exposes an imperative `insertText` method (via `useImperativeHandle`) so
 *   parent components (e.g. `EmailTemplateEditor`) can insert template
 *   variable tokens directly at the current cursor position.
 *
 * Props:
 * - value (string): initial/controlled HTML content for the editor.
 * - onChange ((value: string) => void): called with updated HTML on every edit.
 * - error (boolean, optional): renders the editor border in the error color.
 * - helperText (string, optional): text shown below the editor (error or hint).
 *
 * Imperative handle (`RichTextEditorHandle`):
 * - insertText(text): inserts raw text/HTML at the current cursor position.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(({ value, onChange, error, helperText }, ref) => {
    const theme = useTheme();

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    style: 'color: #1976d2; text-decoration: underline;',
                },
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            TextStyle,
            Color,
        ],
        content: value,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'tiptap-editor',
                style: `
                    min-height: 300px;
                    padding: 16px;
                    outline: none;
                    font-family: Arial, sans-serif;
                    font-size: 14px;
                    line-height: 1.6;
                `,
            },
        },
    });

    // Exposes `insertText` to parent components holding a ref to this editor
    // (e.g. EmailTemplateEditor inserting a {{variable}} token at the cursor).
    // Re-created only when the underlying Tiptap `editor` instance changes.
    useImperativeHandle(ref, () => ({
        insertText: (text: string) => {
            editor?.chain().focus().insertContent(text).run();
        },
    }), [editor]);

    /**
     * Toggles the link mark on the current selection, triggered by the toolbar's
     * Link button. Prompts the user for a URL via a native `prompt()` dialog;
     * an empty URL removes an existing link, and cancelling leaves it unchanged.
     */
    const setLink = () => {
        const previousUrl = editor?.getAttributes('link').href;
        const url = globalThis.prompt('URL', previousUrl);

        if (url === null) {
            return;
        }

        if (url === '') {
            editor?.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }

        editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    };

    return (
        <Box>
            {/* Toolbar */}
            <Box
                sx={{
                    border: `1px solid ${error ? theme.palette.error.main : theme.palette.divider}`,
                    borderBottom: 'none',
                    borderRadius: '4px 4px 0 0',
                    backgroundColor: alpha(theme.palette.background.default, 0.5),
                    p: 1,
                }}
            >
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {/* Text Formatting */}
                    <IconButton
                        size="small"
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        sx={{
                            backgroundColor: editor.isActive('bold') ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                            '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.2) },
                        }}
                        title="Bold"
                    >
                        <FormatBoldIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                        size="small"
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        sx={{
                            backgroundColor: editor.isActive('italic') ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                            '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.2) },
                        }}
                        title="Italic"
                    >
                        <FormatItalicIcon fontSize="small" />
                    </IconButton>

                    <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

                    {/* Headings */}
                    <ToggleButtonGroup size="small" exclusive>
                        <ToggleButton
                            value="h1"
                            selected={editor.isActive('heading', { level: 1 })}
                            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                            sx={{ px: 1.5, py: 0.5, fontSize: '0.75rem' }}
                        >
                            H1
                        </ToggleButton>
                        <ToggleButton
                            value="h2"
                            selected={editor.isActive('heading', { level: 2 })}
                            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                            sx={{ px: 1.5, py: 0.5, fontSize: '0.75rem' }}
                        >
                            H2
                        </ToggleButton>
                        <ToggleButton
                            value="h3"
                            selected={editor.isActive('heading', { level: 3 })}
                            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                            sx={{ px: 1.5, py: 0.5, fontSize: '0.75rem' }}
                        >
                            H3
                        </ToggleButton>
                    </ToggleButtonGroup>

                    <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

                    {/* Lists */}
                    <IconButton
                        size="small"
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        sx={{
                            backgroundColor: editor.isActive('bulletList') ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                            '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.2) },
                        }}
                        title="Bullet List"
                    >
                        <FormatListBulletedIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                        size="small"
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        sx={{
                            backgroundColor: editor.isActive('orderedList') ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                            '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.2) },
                        }}
                        title="Numbered List"
                    >
                        <FormatListNumberedIcon fontSize="small" />
                    </IconButton>

                    <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

                    {/* Alignment */}
                    <IconButton
                        size="small"
                        onClick={() => editor.chain().focus().setTextAlign('left').run()}
                        sx={{
                            backgroundColor: editor.isActive({ textAlign: 'left' }) ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                            '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.2) },
                        }}
                        title="Align Left"
                    >
                        <FormatAlignLeftIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                        size="small"
                        onClick={() => editor.chain().focus().setTextAlign('center').run()}
                        sx={{
                            backgroundColor: editor.isActive({ textAlign: 'center' }) ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                            '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.2) },
                        }}
                        title="Align Center"
                    >
                        <FormatAlignCenterIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                        size="small"
                        onClick={() => editor.chain().focus().setTextAlign('right').run()}
                        sx={{
                            backgroundColor: editor.isActive({ textAlign: 'right' }) ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                            '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.2) },
                        }}
                        title="Align Right"
                    >
                        <FormatAlignRightIcon fontSize="small" />
                    </IconButton>

                    <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

                    {/* Link */}
                    <IconButton
                        size="small"
                        onClick={setLink}
                        sx={{
                            backgroundColor: editor.isActive('link') ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                            '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.2) },
                        }}
                        title="Insert Link"
                    >
                        <LinkIcon fontSize="small" />
                    </IconButton>

                    {/* Code Block */}
                    <IconButton
                        size="small"
                        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                        sx={{
                            backgroundColor: editor.isActive('codeBlock') ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                            '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.2) },
                        }}
                        title="Code Block"
                    >
                        <CodeIcon fontSize="small" />
                    </IconButton>
                </Stack>
            </Box>

            {/* Editor Content */}
            <Box
                sx={{
                    border: `1px solid ${error ? theme.palette.error.main : theme.palette.divider}`,
                    borderRadius: '0 0 4px 4px',
                    backgroundColor: theme.palette.background.paper,
                    '& .tiptap-editor': {
                        '& p': {
                            margin: '0 0 1em 0',
                        },
                        '& h1, & h2, & h3': {
                            marginTop: '0.5em',
                            marginBottom: '0.5em',
                            fontWeight: 600,
                        },
                        '& h1': {
                            fontSize: '2em',
                        },
                        '& h2': {
                            fontSize: '1.5em',
                        },
                        '& h3': {
                            fontSize: '1.25em',
                        },
                        '& ul, & ol': {
                            paddingLeft: '2em',
                            margin: '0 0 1em 0',
                        },
                        '& a': {
                            color: theme.palette.primary.main,
                            textDecoration: 'underline',
                        },
                        '& code': {
                            backgroundColor: alpha(theme.palette.text.primary, 0.05),
                            padding: '2px 4px',
                            borderRadius: '4px',
                            fontFamily: 'monospace',
                        },
                        '& pre': {
                            backgroundColor: alpha(theme.palette.text.primary, 0.05),
                            padding: '1em',
                            borderRadius: '4px',
                            overflow: 'auto',
                            '& code': {
                                backgroundColor: 'transparent',
                                padding: 0,
                            },
                        },
                    },
                }}
            >
                <EditorContent editor={editor} />
            </Box>

            {/* Helper Text */}
            {helperText && (
                <Box
                    sx={{
                        mt: 0.5,
                        ml: 1.75,
                        fontSize: '0.75rem',
                        color: error ? theme.palette.error.main : theme.palette.text.secondary,
                    }}
                >
                    {helperText}
                </Box>
            )}
        </Box>
    );
});

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;
