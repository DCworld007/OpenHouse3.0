import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const roomName = searchParams.get('roomName');

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#4F46E5',
            padding: '40px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'white',
              borderRadius: '24px',
              padding: '40px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
              width: '90%',
              height: '80%',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
              <span style={{ fontSize: 64, marginRight: '16px' }}>🗂️</span>
              <h1 style={{ fontSize: 48, fontWeight: 'bold', color: '#1F2937' }}>
                {roomName || 'UnifyPlan'}
              </h1>
            </div>
            <div style={{ fontSize: 24, color: '#4B5563', textAlign: 'center', marginTop: '20px' }}>
              Collaborative Planning Room
            </div>
            <div style={{ fontSize: 20, color: '#6B7280', textAlign: 'center', marginTop: '12px' }}>
              Join to review ideas, vote on options, and chat live with your group
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e) {
    console.error(e);
    return new Response(`Failed to generate image`, {
      status: 500,
    });
  }
} 