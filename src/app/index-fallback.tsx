'use client';

export default function HomeFallback() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-purple-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900">
              Welcome to <span className="text-indigo-600">UnifyPlan</span>
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              Collaborate, organize, and plan together in real-time.
            </p>
            <div className="mt-6 bg-white rounded-lg p-6 inline-block">
              <p className="text-gray-700 text-sm">
                <span className="font-semibold text-amber-600">Note:</span> You're viewing the demo mode of UnifyPlan.
                Some features are limited in this environment. Full functionality is available when self-hosted.
              </p>
            </div>
            <div className="mt-8 flex justify-center space-x-4">
              <a 
                href="/plans" 
                className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 transition"
              >
                View Demo
              </a>
              <a 
                href="https://github.com/DCworld007/OpenHouse3.0" 
                target="_blank"
                className="px-6 py-3 bg-white text-indigo-600 font-medium rounded-md border border-indigo-300 hover:bg-indigo-50 transition"
              >
                GitHub Repo
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-base font-semibold text-indigo-600 uppercase tracking-wide">FEATURES</h2>
            <h3 className="mt-2 text-3xl font-bold text-gray-900">Everything you need to plan together</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-6 bg-gray-50 rounded-lg">
              <h4 className="text-lg font-medium text-gray-900">Real-time Collaboration</h4>
              <p className="mt-2 text-gray-600">
                Work together in real-time with your team.
              </p>
            </div>

            <div className="p-6 bg-gray-50 rounded-lg">
              <h4 className="text-lg font-medium text-gray-900">Organized Planning</h4>
              <p className="mt-2 text-gray-600">
                Keep all your planning tasks organized.
              </p>
            </div>

            <div className="p-6 bg-gray-50 rounded-lg">
              <h4 className="text-lg font-medium text-gray-900">Mobile Friendly</h4>
              <p className="mt-2 text-gray-600">
                Access your plans from anywhere.
              </p>
            </div>

            <div className="p-6 bg-gray-50 rounded-lg">
              <h4 className="text-lg font-medium text-gray-900">Secure & Private</h4>
              <p className="mt-2 text-gray-600">
                Self-hostable for maximum data privacy.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-indigo-700 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white">Ready to try it out?</h2>
          <p className="mt-4 text-xl text-indigo-100">Explore the demo or deploy your own instance.</p>
          <div className="mt-8">
            <a 
              href="/plans" 
              className="px-8 py-3 bg-white text-indigo-700 font-medium rounded-md hover:bg-indigo-50 transition"
            >
              View Demo
            </a>
          </div>
        </div>
      </div>
    </div>
  );
} 