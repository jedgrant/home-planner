import { useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { Bold, Italic, Underline as UnderlineIcon, List } from 'lucide-react'
import { Toggle } from '@/shared/components/ui/toggle'

interface PrepTaskTiptapProps {
  content: string
  editable: boolean
  /** Called with new HTML after the 1.5 s debounce fires */
  onDebouncedChange?: (html: string) => void
}

export function PrepTaskTiptap({ content, editable, onDebouncedChange }: PrepTaskTiptapProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const callbackRef = useRef(onDebouncedChange)
  callbackRef.current = onDebouncedChange

  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content,
    editable,
    onUpdate({ editor }) {
      if (!callbackRef.current) return
      if (debounceRef.current) clearTimeout(debounceRef.current)
      const html = editor.getHTML()
      debounceRef.current = setTimeout(() => {
        callbackRef.current?.(html)
      }, 1500)
    },
  })

  // Sync editable flag changes
  useEffect(() => {
    editor?.setEditable(editable)
  }, [editor, editable])

  // Flush any pending debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  if (!editor) return null

  return (
    <div className="flex-1 min-w-0">
      {editable && (
        <div className="flex items-center gap-0.5 mb-1">
          <Toggle
            size="sm"
            pressed={editor.isActive('bold')}
            onPressedChange={() => editor.chain().focus().toggleBold().run()}
            aria-label="Bold"
          >
            <Bold className="h-3.5 w-3.5" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive('italic')}
            onPressedChange={() => editor.chain().focus().toggleItalic().run()}
            aria-label="Italic"
          >
            <Italic className="h-3.5 w-3.5" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive('underline')}
            onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
            aria-label="Underline"
          >
            <UnderlineIcon className="h-3.5 w-3.5" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive('bulletList')}
            onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
            aria-label="Bullet list"
          >
            <List className="h-3.5 w-3.5" />
          </Toggle>
        </div>
      )}
      <EditorContent
        editor={editor}
        className={`prose prose-sm max-w-none focus-within:outline-none text-foreground
          [&_.ProseMirror]:outline-none
          [&_.ProseMirror]:min-h-[1.5rem]
          [&_.ProseMirror_ul]:list-disc
          [&_.ProseMirror_ul]:pl-4
          [&_.ProseMirror_p]:m-0
          ${editable ? '[&_.ProseMirror]:border [&_.ProseMirror]:border-input [&_.ProseMirror]:rounded-md [&_.ProseMirror]:px-3 [&_.ProseMirror]:py-1.5 [&_.ProseMirror]:text-sm' : ''}
        `}
      />
    </div>
  )
}
