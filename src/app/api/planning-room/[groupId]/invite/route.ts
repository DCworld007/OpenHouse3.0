import { NextRequest } from 'next/server';
import { onRequestGet, onRequestPost } from './invite';

export const runtime = 'edge';

type Params = {
  params: {
    groupId: string;
  };
};

export async function GET(request: NextRequest, params: Params) {
  return onRequestGet(request, params.params);
}

export async function POST(request: NextRequest, params: Params) {
  return onRequestPost(request, params.params);
} 