import cors from 'cors';
import express from 'express';

import config from './config';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middlewares';

export const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use(cors());

  app.get('/', async (_req, res) => {
    res.send('Hello World!');
  });

  app.use(routes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

if (require.main === module) {
  const app = createApp();

  app.listen(config.port, () => {
    console.log(`Server running at http://localhost:${config.port}`);
  });
}
