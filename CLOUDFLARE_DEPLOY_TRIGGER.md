# Cloudflare Deployment Trigger

This file is used to trigger deployments to Cloudflare Pages when pushed to git.

## Deployment History

- 2025-05-14: Fixed Cloudflare Pages configuration issues
  - Removed Worker-specific settings
  - Updated .cloudflare/pages.js integration
  - Fixed invite functionality for planning rooms

- 2025-05-14: Fixed package-lock.json synchronization
  - Updated package-lock.json to match package.json
  - Resolved npm ci installation errors in Cloudflare deployment
  - Fixed dependencies for Google Auth and JWT libraries

## Current Deployment

Timestamp: 2025-05-14T12:50:00Z
Build triggered by: Fixing package-lock.json synchronization issues for Cloudflare deployment 