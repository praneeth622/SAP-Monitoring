import dotenv from 'dotenv';
// Configure dotenv before any other imports
dotenv.config();

import express from 'express';
import cors from 'cors';
import systemValidationRoutes from './routes/systemValidationRoutes';
import systemStatsRoutes from './routes/systemStatsRoutes';
import systemListRoutes from './routes/systemListRoutes';
import kpiHierarchyRoutes from './routes/kpiHierarchyRoutes';
import templateRoutes from './routes/templateRoutes';

const app = express();

// Enable CORS for all routes
app.use(cors());

// Middleware to parse JSON requests
app.use(express.json());

// Use routes for different API models
app.use('/api', systemValidationRoutes);
app.use('/api', systemStatsRoutes);
app.use('/api', systemListRoutes);
app.use('/api', kpiHierarchyRoutes);
app.use('/api', templateRoutes);

// Default route
app.get('/', (req, res) => {
  res.send('Welcome to the Prisma API!');
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});