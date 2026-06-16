# Paper Management System Frontend

Frontend application for the Paper Management System. It supports document management, organization management, document approval workflows, subscription plans, payments, notifications, and system administration.

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui and Radix UI
- TanStack Query
- React Router
- Sonner
- Lucide React

## Requirements

- Node.js 18 or later
- npm

## Installation

```bash
npm install
```

## Environment Variables

Create or update `.env.local` inside the `fe` folder.

```env
VITE_API_BASE_URL=
VITE_CDN_BASE_URL=
```

Variable meaning:

- `VITE_API_BASE_URL`: Main backend API base URL.
- `VITE_CDN_BASE_URL`: CDN API base URL for file upload, download, and preview.

When using local backend services, replace these values with the corresponding local URLs.

## Run Locally

```bash
npm run dev
```

Vite is configured to run locally at:

```text
http://localhost:8080
```

If port `8080` is already in use, Vite may use another available port.

## Production Build

```bash
npm run build
```

The production output is generated in the `dist` folder.

## Preview Production Build

```bash
npm run preview
```

## Code Checks

```bash
npm run lint
```

```bash
npx tsc -p tsconfig.app.json --noEmit
```

## Tests

```bash
npm run test
```

Run tests in watch mode:

```bash
npm run test:watch
```

## Main Folder Structure

```text
src/
  api/              API clients and DTO types
  app/              App shell and app-level setup
  components/       Shared UI components, including shadcn/ui
  context/          AuthContext, OrganizationContext, and app-level state
  features/         Main business modules
  hooks/            Custom hooks
  lib/              Shared utilities
  pages/            Entry pages and screen orchestration
  shared/           Layout, sidebar, modal, and shared components
  test/             Test setup and helpers
```

## Main Feature Modules

```text
features/admin/          System administration screens
features/billing/        Subscription plans, billing, and VNPay payment flow
features/calendar/       Document deadlines and reminder calendar
features/dashboard/      User dashboard
features/documents/      Document repository, submissions, approvals, document detail
features/notifications/  User notifications
features/organizations/  Organization selector, organization creation, members, job titles
features/settings/       Account settings
```

## Main User Flow

1. Log in or register an account.
2. Select the organization to work in.
3. If the user is the organization owner, they can create, edit, delete the organization and manage members.
4. Upload a file through the CDN.
5. Create a document from the uploaded file.
6. Assign approvers from the current organization.
7. Submit the document to start the approval workflow.
8. Assigned users process documents from the pending tasks screen.
9. Completed documents are shown in the document repository.

## System Admin Flow

System admins can manage:

- System dashboard
- Users
- Subscription plans
- Payments
- CDN files
- Activity logs
- Notifications

## Development Guidelines

- Do not call APIs directly inside components if an API client already exists in `src/api`.
- Add new API calls to the correct business API file under `src/api`.
- Server data should be cached with TanStack Query.
- Mutations should invalidate related query keys after success.
- Business modals should use `AppModal` from `src/shared/components/AppModal.tsx`.
- UI text should use one language consistently per screen.
- Do not expose technical IDs to users unless they are necessary.
- Do not change backend logic from the frontend.

## CDN Notes

The CDN uses a separate base URL through `VITE_CDN_BASE_URL`.

File upload, download, and preview should go through `cdnApi`.

If a CORS error happens during upload, check whether the CDN URL is using `http` or `https`. Prefer `https` when the frontend runs in the browser and the deployed CDN backend supports HTTPS.

## Payment Notes

VNPay payment URLs are created by the main backend API. The frontend only calls the create-payment-url endpoint and redirects the user to the returned URL.

The payment result screen depends on the return URL configured in the backend and the merchant configuration in VNPay sandbox or production.

## Common Issues

### API requests fail

Check `.env.local`:

```env
VITE_API_BASE_URL=
VITE_CDN_BASE_URL=
```

After changing environment variables, stop and restart the dev server.

### File upload fails because of CORS

Check whether the CDN URL is using `http` or `https`.

Check whether the CDN backend allows the local frontend origin.

### Data does not refresh after a mutation

Check whether the mutation invalidates the correct query key in `src/api/queryKeys.ts`.

### Build shows a large chunk warning

This is a Vite/Rollup warning. The app can still be built successfully. It can be optimized later with dynamic imports or manual chunks.

