interface RichTextContentProps {
  html: string
  className?: string
}

export function RichTextContent({ html, className }: RichTextContentProps) {
  return (
    <div
      className={[
        '[&_p]:mt-0 [&_p]:mb-2 [&_p:last-child]:mb-0',
        '[&_ul]:list-disc [&_ul]:pl-4 [&_ul]:mb-2 [&_ul:last-child]:mb-0',
        '[&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:mb-2 [&_ol:last-child]:mb-0',
        '[&_li]:my-0',
        '[&_strong]:font-semibold [&_em]:italic [&_u]:underline',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
