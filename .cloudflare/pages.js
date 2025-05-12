module.exports = {
  // Keep public directory contents in the deployment
  includeFiles: ['public/**/*'],
  // Build command
  buildCommand: 'npm run build',
  // Directory to serve static assets from
  outputDirectory: '.next',
  // Environment variables
  env: {
    JWT_SECRET: process.env.JWT_SECRET || 'Zq83vN!@uXP4w$Kt9sLrB^AmE5cG1dYz',
  },
};
