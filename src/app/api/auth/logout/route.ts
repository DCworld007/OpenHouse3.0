import { NextRequest, NextResponse } from 'next/server';
import { serialize } from 'cookie';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    // Create an expired cookie to effectively delete it
    const cookie = serialize('auth_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      expires: new Date(0), // Set expiry in the past
      path: '/',
      sameSite: 'lax'
    });

    return NextResponse.json(
      { success: true },
      { 
        status: 200,
        headers: { 
          'Set-Cookie': cookie
        }
      }
    );
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
} 