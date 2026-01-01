import { PageLayout } from '@/components/layout/page-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { readFile } from 'fs/promises'
import { join } from 'path'

/**
 * Privacy Policy Page
 * 
 * GDPR-compliant privacy policy for the platform.
 * Reads content from public/documents/platformos-privatumo-politika.md
 * This page should be accessible to all users (public).
 */
export default async function PrivacyPolicyPage() {
  // Read markdown file from public directory
  let markdownContent = ''
  try {
    const filePath = join(process.cwd(), 'public', 'documents', 'platformos-privatumo-politika.md')
    markdownContent = await readFile(filePath, 'utf-8')
  } catch (error) {
    console.error('Error reading privacy policy file:', error)
    markdownContent = 'Privatumo politikos dokumentas nerastas.'
  }

  // Simple markdown to HTML conversion (basic formatting)
  const formatMarkdown = (text: string): string => {
    let html = text
      // Headers
      .replace(/^PLATFORMOS.*$/gm, '<h1 class="text-3xl font-bold mb-6">$&</h1>')
      .replace(/^PRIVATUMO POLITIKA$/gm, '<h1 class="text-3xl font-bold mb-6">$&</h1>')
      .replace(/^Versija:.*$/gm, '<p class="text-sm text-slate-600 mb-4">$&</p>')
      .replace(/^Statusas:.*$/gm, '<p class="text-sm text-slate-600 mb-4">$&</p>')
      .replace(/^Įsigaliojimo data:.*$/gm, '<p class="text-sm text-slate-600 mb-6">$&</p>')
      // Section headers (1.1, 2.1, etc.)
      .replace(/^(\d+\.\d+\.)\s+(.+)$/gm, '<h3 class="text-xl font-semibold mt-6 mb-3">$1 $2</h3>')
      // Main section headers (1., 2., etc.)
      .replace(/^(\d+\.)\s+(.+)$/gm, '<h2 class="text-2xl font-semibold mt-8 mb-4">$1 $2</h2>')
      // Bullet points
      .replace(/^•\s+(.+)$/gm, '<li class="ml-6 mb-2">$1</li>')
      // Bold text (simple)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Line breaks
      .replace(/\n\n/g, '</p><p class="mb-4">')
      // Horizontal rules
      .replace(/^_{20,}$/gm, '<hr class="my-6 border-slate-300" />')
      // Wrap in paragraphs
      .split('\n')
      .filter(line => line.trim() && !line.match(/^•|^\d+\.|^PLATFORMOS|^PRIVATUMO|^Versija|^Statusas|^Įsigaliojimo|^_{20,}$/))
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('<br />')
    
    // Wrap lists
    html = html.replace(/(<li[^>]*>.*?<\/li>)/gs, (match) => {
      if (!match.includes('<ul')) {
        return '<ul class="list-disc list-inside space-y-2 mb-4 ml-4">' + match + '</ul>'
      }
      return match
    })
    
    return `<div class="prose prose-slate max-w-none">${html}</div>`
  }

  const formattedContent = formatMarkdown(markdownContent)

  return (
    <PageLayout showHeader={true} showFooter={true}>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-6">
          <Button variant="ghost" asChild>
            <Link href="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Grįžti
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Privatumo Politika</CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="prose prose-slate max-w-none text-slate-700"
              dangerouslySetInnerHTML={{ __html: formattedContent }}
            />
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
}
