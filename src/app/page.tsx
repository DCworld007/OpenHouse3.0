export default function Home() {
  return (
    <div className="min-h-screen bg-white p-8">
      <h1 className="text-3xl font-bold">UnifyPlan</h1>
      <p className="mt-4">
        Collaborate, organize, and plan together in real-time.
      </p>
      <div className="mt-6">
        <a 
          href="/plans" 
          className="px-4 py-2 bg-blue-600 text-white rounded-md"
        >
          Get Started
        </a>
      </div>
    </div>
  );
} 