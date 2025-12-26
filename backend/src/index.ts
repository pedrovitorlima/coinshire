import app from './server.js';
import { initDb } from './db.js';

const port = process.env.PORT ? Number(process.env.PORT) : 3021;

initDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`Backend listening on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database', err);
    process.exit(1);
  });
