import { AIMatchingAgentStatus } from '@/components/ai/AIMatchingAgentStatus'
import { CREAutoTriggerControls } from '@/components/cre/CREAutoTriggerControls'

export const metadata = {
  title: 'AI Matching Agent - PrivOTC',
  description: 'CRE auto-trigger + AI-powered OTC trade matching',
}

export default function AIAgentPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">🤖 Automated Matching System</h1>
          <p className="text-muted-foreground mt-2">
            CRE Auto-Trigger + Groq AI Integration • No Manual Commands Required
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* CRE Auto-Trigger (Main System) */}
        <div>
          <h2 className="text-xl font-semibold mb-4">🎯 CRE Auto-Trigger Service (Production)</h2>
          <CREAutoTriggerControls />
        </div>

        {/* AI Matching Agent (Secondary/Optional) */}
        <div>
          <h2 className="text-xl font-semibold mb-4">🧠 Frontend AI Agent (Optional Enhancement)</h2>
          <AIMatchingAgentStatus />
        </div>
      </div>
    </div>
  )
}
