export const runtime = 'edge';

export async function GET() {
  return Response.json({
    message: 'Edge API route is working',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
} 