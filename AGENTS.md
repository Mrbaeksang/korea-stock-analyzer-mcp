# Repository Guidelines

Korea Stock Analyzer MCP bridges TypeScript services and Python market data to deliver investor-style reports. Follow this guide to navigate the codebase, keep tooling aligned, and ship reliable updates quickly.

## Project Structure & Module Organization
- `src/` hosts the MCP server: `server.ts` wires tool handlers, `analyzers/` encodes guru playbooks, `services/` wraps data fetchers and the Python bridge, `reports/` assembles sections, `types/` centralizes shared contracts.
- `api/` contains Vercel serverless entry points (`mcp.ts`, `stock-data.ts`) plus the `stock_data.py` worker mirrored by `requirements.txt` for cloud runs.
- `public/` exposes the minimal landing page, while build artifacts land in `dist/` after `npm run build`.
- `requirements.txt` in the repo root mirrors local Python needs for pykrx-backed calls executed via `PythonExecutor`.

## Build, Test, and Development Commands
- `npm install` installs TypeScript + MCP dependencies; run once after cloning or updating lockfiles.
- `npm run dev` starts the TypeScript entry point through `tsx src/index.ts` for interactive MCP sessions.
- `npm run build` emits `dist/` by compiling with `tsc`; run before packaging or publishing.
- `npm run start` executes the built server with an extended memory ceiling for production-like smoke tests.
- `python -m pip install -r requirements.txt` primes local pykrx usage; mirror for deployments with `api/requirements.txt`.

## Coding Style & Naming Conventions
- TypeScript is authored in ES modules with two-space indentation, semicolons, and camelCase functions; classes and service singletons remain PascalCase.
- Surface changes through barrel exports in `src/index.ts` and `src/services/index.ts` to keep downstream imports stable.
- Keep translation-ready strings and user messages in Korean + English where precedents exist; avoid hard-coding secrets.
- Prefer async/await, explicit return types on public methods, and descriptive interface names under `src/types` suffixed with `.types.ts`.

## Testing Guidelines
- `npm run test` currently proxies the MCP CLI (`tsx src/index.ts`); use it for fast regressions when exercising tools manually.
- For end-to-end HTTP validation, run `python test_kcc_glass.py` after exporting `BASE_URL` if you target a non-default deployment.
- Extend pytest-style scripts under `api/` or root with the `test_*.py` pattern; document sample tickers in comments for reproducibility.
- Capture new data sources with fixture snapshots or mocked responses to avoid hammering external APIs during CI.

## Commit & Pull Request Guidelines
- Follow conventional commits (`feat:`, `fix:`, `chore:`) as seen in `git log`; keep the scope concise and imperative.
- Each PR should summarize functional changes, list affected tools or endpoints, and link tracking issues; add before/after CLI output or screenshots when user-visible behaviour changes.
- Validate build + key manual tests locally, note any skipped coverage, and request review when APIs or analyzer logic shifts.

## Security & Configuration Tips
- Do not commit API keys; load environment variables via your MCP host or Vercel project settings.
- When modifying the Python bridge, sanitize ticker inputs and keep timeouts aligned with `PythonExecutor` defaults to prevent stalled workers.
- Update `vercel.json` cautiously—function memory and headers are tuned for cross-origin clients relying on wide CORS allowances.
