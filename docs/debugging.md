# Debugging in VS Code

Copy `.env.example` to `.env`, stop any development servers already running in terminals, then choose **Debug Athena (full stack)** in Run and Debug and press F5.

The launch setup waits for PostgreSQL, compiles the API with source maps, starts the NestJS API under the Node debugger, starts Vite, and opens Chrome. API breakpoints in `api/src/` map from the compiled files in `api/dist/`; browser breakpoints belong in `src/`.

For API-only work, choose **Athena API**. For client-only work, choose **Athena in Chrome**.
