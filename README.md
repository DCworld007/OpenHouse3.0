# OpenHouse3.0

A modern home planning application built with Next.js and Cloudflare Pages.

## Features

- Find and save properties
- Create and manage house viewing plans
- Collaborative planning tools
- Authentication with Google Sign-in
- Map integration for location-based planning

## Technology Stack

- **Frontend**: Next.js 15, React 18, TailwindCSS
- **Backend**: Next.js API Routes, Edge Runtime
- **Deployment**: Cloudflare Pages
- **Authentication**: Google OAuth, JWT
- **Storage**: Cloudflare D1 Database, KV Storage

## Development

To run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

This project is configured for deployment to Cloudflare Pages. See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deployment Steps

1. Clone the repository
2. Install dependencies: `npm install`
3. Build the project: `npm run build`
4. Deploy to Cloudflare Pages: `npm run pages:deploy`

## Environment Variables

The following environment variables need to be set in the Cloudflare Pages dashboard:

- `JWT_SECRET` - Secret for signing JWT tokens
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` - Google OAuth Client ID

## Authentication

Authentication is handled through Google Sign-in and JWT tokens. See [AUTH_DEBUG.md](AUTH_DEBUG.md) for more information about debugging auth issues.

## Troubleshooting

If you encounter deployment issues, see [DEPLOYMENT.md](DEPLOYMENT.md) for common issues and fixes.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 