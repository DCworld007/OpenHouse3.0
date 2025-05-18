import { NextRequest } from 'next/server';
import type { NextFetchEvent } from 'next/server';
import { onRequestGet, onRequestPost } from './invite';

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  context: { params: { groupId: string } } & NextFetchEvent
) {
  return onRequestGet(request, context.params);
}

export async function POST(
  request: NextRequest,
  context: { params: { groupId: string } } & NextFetchEvent
) {
  return onRequestPost(request, context.params);
} 