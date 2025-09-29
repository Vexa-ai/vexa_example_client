import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const N8N_URL = 'https://n8n.service.gotricky.app/webhook/d724afd8-ec4f-4dd8-9c1f-f45d7b00f1e5'
const BASIC_AUTH = 'Basic ' + Buffer.from('symfa:u8Oons4ZXkcibowe').toString('base64')

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))

    const resp = await fetch(N8N_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': BASIC_AUTH,
      },
      body: JSON.stringify(body),
      // Make sure we don't send cookies to external service
      redirect: 'follow',
    })

    const text = await resp.text()
    const isJson = resp.headers.get('content-type')?.includes('application/json')
    return new NextResponse(text, { status: resp.status, headers: { 'Content-Type': isJson ? 'application/json' : 'text/plain' } })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Forwarding failed' }, { status: 500 })
  }
}


