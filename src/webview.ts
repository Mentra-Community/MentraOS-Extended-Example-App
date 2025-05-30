import { AuthenticatedRequest, TpaServer } from '@augmentos/sdk';
import express from 'express';
import path from 'path';

/**
 * Sets up all Express routes and middleware for the TPA server
 * @param server The TPA server instance
 */
export function setupExpressRoutes(server: TpaServer): void {
  // Get the Express app instance
  const app = server.getExpressApp();

  // Set up EJS as the view engine
  app.set('view engine', 'ejs');
  app.engine('ejs', require('ejs').__express);
  app.set('views', path.join(__dirname, 'views'));

  // Register a route for handling webview requests
  app.get('/webview', (req: AuthenticatedRequest, res) => {
    if (req.authUserId) {
      // Render the reminders template
      res.render('webview', {
        userId: req.authUserId,
      });
    } else {
      res.render('webview', {
        userId: undefined,
      });
    }
  });
}
