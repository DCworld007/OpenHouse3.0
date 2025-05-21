export default function InviteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Processing Invite...</h2>
          <p className="text-gray-500 mt-2">Please wait while we verify your invite.</p>
        </div>
      </div>
    </div>
  );
} 