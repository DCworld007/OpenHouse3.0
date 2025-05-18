import { NextRequest } from 'next/server';
import { onRequestGet, onRequestPost } from './invite';

export const runtime = 'edge';

export async function GET(request: NextRequest, { params }: { params: { groupId: string } }) {
  return onRequestGet(request, params);
}

export async function POST(request: NextRequest, { params }: { params: { groupId: string } }) {
  return onRequestPost(request, params);
} 