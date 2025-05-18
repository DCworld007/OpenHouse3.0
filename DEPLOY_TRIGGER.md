# Deployment Trigger

This file is used to trigger Cloudflare deployments.

Last deployment: May 17, 2023 12:30 PM PDT

## Changes in this deployment:
- **SECURITY FIX**: Removed hardcoded JWT secrets and credentials
- **SECURITY FIX**: Improved secret handling in authentication code
- **SECURITY FIX**: Added SECURITY.md guide for proper secret management
- Fixed TypeScript error in auth/me route that was preventing build
- Fixed IntakeCard toggle alignment to be consistent across all pages (What on left, Where on right)
- Enhanced PlanningRoom component to properly geocode 'where' type cards when adding them
- All 'where' type cards now receive lat/lng coordinates to ensure they appear on maps 