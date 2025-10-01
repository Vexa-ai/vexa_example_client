import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string; nativeMeetingId: string; token: string }> }
) {
  try {
    const { platform, nativeMeetingId, token } = await params

    if (!platform || !nativeMeetingId || !token) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    const url = `https://live.vexa.hq.symfa.com/api/transcription_notes/${platform}/${nativeMeetingId}/${token}`
    
    console.log(`Proxying transcription notes request to: ${url}`)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Transcription notes API error: ${response.status} ${response.statusText}`, errorText)
      return NextResponse.json(
        { error: `API error: ${response.status} ${response.statusText}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('Error proxying transcription notes request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
