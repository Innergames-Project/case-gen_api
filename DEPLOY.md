# Deploy

This project is prepared for a stable deploy on Render.

## Recommended option

Use Render with the root [render.yaml](/Users/karanjeet/Desktop/case-gen_api/render.yaml:1).

Render's official Blueprint reference documents `render.yaml`, including `buildCommand` and `startCommand` for non-Docker services. Render Web Services docs also note that the app must bind to a port that Render provides, which this backend already does through `process.env.PORT` in [src/main.ts](/Users/karanjeet/Desktop/case-gen_api/src/main.ts:13).

## What is already configured

- Public web service config: [render.yaml](/Users/karanjeet/Desktop/case-gen_api/render.yaml:1)
- Portable container config: [Dockerfile](/Users/karanjeet/Desktop/case-gen_api/Dockerfile:1)
- API contract for frontend: [openapi.yaml](/Users/karanjeet/Desktop/case-gen_api/openapi.yaml:1)

## Render setup steps

1. Push this repo to GitHub.
2. Create a new Render Blueprint or Web Service from the repo.
3. Confirm these settings:
   - Build command: `npm ci && npm run build`
   - Start command: `npm run start:prod`
   - Health check path: `/health`
4. Add environment variables:
   - `GROQ_API_KEY`: your real Groq key
   - `GROQ_MODEL`: `openai/gpt-oss-20b`
   - `API_ACCESS_TOKEN`: a shared secret that frontend requests must send
   - `CORS_ORIGIN`: comma-separated frontend origins, for example `https://your-frontend.app,http://localhost:5173`
5. Deploy.
6. Share the resulting public Render URL with the frontend team.

## What to send the frontend team

- Base URL: the Render URL, for example `https://case-gen-api.onrender.com`
- API contract: [openapi.yaml](/Users/karanjeet/Desktop/case-gen_api/openapi.yaml:1)
- Quick guide: [FRONTEND_README.md](/Users/karanjeet/Desktop/case-gen_api/FRONTEND_README.md:1)

## Notes

- Do not share `GROQ_API_KEY` with the frontend.
- The frontend needs the public backend URL plus `API_ACCESS_TOKEN`.
- Frontend requests can send either `x-api-key: <token>` or `Authorization: Bearer <token>`.
- `GET /health` stays public so Render can run health checks.
- Long PDFs are now condensed before card generation, but very large PDFs can still take longer to process than short documents.
