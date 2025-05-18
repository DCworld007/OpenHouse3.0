import { NextRequest } from 'next/server';
import { onRequestGet, onRequestPost } from './invite';

export const runtime = 'edge';

type RouteContext = {
  params: {
    groupId: string;
  };
};

export async function GET(
  req: NextRequest,
  { params }: RouteContext
) {
  return onRequestGet(req, params);
}

export async function POST(
  req: NextRequest,
  { params }: RouteContext
) {
  return onRequestPost(req, params);
} 