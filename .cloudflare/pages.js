module.exports = {
  // Keep public directory contents in the deployment
  includeFiles: ['public/**/*', 'functions/**/*'],
  // Build command
  buildCommand: 'npm run build',
  // Directory to serve static assets from
  outputDirectory: '.next',
  // Environment variables
  env: {
    // JWT_SECRET should be set as a secret in the Cloudflare dashboard
    JWT_SECRET: process.env.JWT_SECRET,
    NODE_VERSION: process.env.NODE_VERSION || '18.20.8',
  },
  // Compatibility flags
  compatibility_flags: ["nodejs_compat"],
};
