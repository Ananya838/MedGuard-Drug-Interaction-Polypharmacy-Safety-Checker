import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { authRouter } from './routes/auth.routes.js';
import { medicineRouter } from './routes/medicine.routes.js';
import { checkRouter } from './routes/check.routes.js';
import { patientRouter } from './routes/patient.routes.js';
import { errorHandler } from './middleware/errorHandler.js';

export const app = express();

// Security and parser middleware
app.use(
  cors({
    origin: config.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json());

// Health check endpoint (for monitoring and deploy verification)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'medguard-api' });
});

// Mount Routes
app.use('/api/auth', authRouter);
app.use('/api/medicines', medicineRouter);
app.use('/api/check', checkRouter);
app.use('/api/patients', patientRouter);

// Global Error Handler
app.use(errorHandler);

