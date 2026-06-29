# DesignCraft

DesignCraft is a small zero-dependency learning project that demonstrates an interactive frontend design playground and a minimal PowerShell HTTP backend that persists moodboards to a local JSON file (db.json).

This branch contains the initial app files: frontend (index.html, styles.css, app.js), a PowerShell server script (server.ps1), and a starter db.json.

## Run locally

1. Clone the repository and switch to this branch:

   git clone https://github.com/sartorettosabrina950-create/designcraft-playbook2.git
   cd designcraft-playbook2
   git checkout initial-designcraft

2. (Optional) Allow script execution for the current PowerShell session:

   powershell -Command "Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass"

3. Start the backend server (PowerShell):

   .\server.ps1

   The server listens on http://localhost:5000/ and serves the frontend at `/`.

4. Open the app in your browser:

   http://localhost:5000/

## API

- GET /api/boards — returns saved moodboards from `db.json`.
- POST /api/boards — accepts a JSON payload for a new board. The server will assign `id` (GUID) and `createdAt` timestamp.
- DELETE /api/boards?id={id} — deletes a board by id.

## Notes

- The server expects the frontend files under `frontend/` (index.html, styles.css, app.js).
- `db.json` is stored in the repository root and is edited by the server. Keep backups if editing manually.

## Next steps

- Add tests, CI, or a small README improvement with screenshots.

