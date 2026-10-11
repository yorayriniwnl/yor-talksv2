import cors from 'cors';
import { corsOrigins } from '../config/env.js';

export const credentialedCors = cors({
  origin(origin, callback) { callback(null, !origin || corsOrigins.includes(origin)); },
  credentials: true,
});
