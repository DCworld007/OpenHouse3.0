export const runtime = 'edge';

export async function GET() {
  return Response.json({
    success: true,
    message: "API test route working",
    timestamp: new Date().toISOString()
  });
} 