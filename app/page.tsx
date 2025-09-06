import { MOCK_USER } from "@/lib/config"
import { AppLayout } from "@/components/layout/app-layout"
import { ApiKeyModal } from "@/components/transcription/api-key-modal"
import { WebSocketProvider } from "@/lib/websocket-context"

export default function Home() {
  return (
    <WebSocketProvider>
      <ApiKeyModal />
      <AppLayout user={MOCK_USER as any} />
    </WebSocketProvider>
  )
}
