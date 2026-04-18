# MedBook Frontend

React + TypeScript frontend for the MedBook clinical UI.

## Run locally

1. Start your existing backend project and note its base URL.
2. Create a `.env` file in the project root:

```env
VITE_API_BASE_URL=http://localhost:8080
```

3. Install dependencies and start the frontend:

```bash
npm install
npm run dev
```

## API wiring

In development, the frontend runs on `http://localhost:5173` and Vite proxies `/health` and `/api` to the backend URL from `VITE_API_BASE_URL`.

The frontend already calls these backend endpoints through `src/lib/medbookApi.ts`:

- `GET /health`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/register-by-admin`
- `GET /api/v1/doctors`
- `GET /api/v1/appointments/`
- `POST /api/v1/appointments/`
- `PATCH /api/v1/appointments/:id/cancel`
- `GET /api/v1/doctor/appointments/`
- `PATCH /api/v1/doctor/appointments/:id/confirm`
- `PATCH /api/v1/doctor/appointments/:id/complete`

## Notes

- The backend is not recreated here; this frontend is designed to consume your existing backend as the source of truth.
- Login stores the returned token in `localStorage` under `medbook_token`.
