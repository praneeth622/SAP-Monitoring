import express from 'express';
import systemValidationRoutes from './routes/systemValidationRoutes';
import systemStatsRoutes from './routes/systemStatsRoutes';
import systemListRoutes from './routes/systemListRoutes';

const app = express();

// Middleware to parse JSON requests
app.use(express.json());

// Use routes for different API models
app.use('/api', systemValidationRoutes);
app.use('/api', systemStatsRoutes);
app.use('/api', systemListRoutes);

// Default route
app.get('/', (req, res) => {
  res.send('Welcome to the Prisma API!');
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
