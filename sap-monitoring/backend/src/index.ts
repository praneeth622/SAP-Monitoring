import express from 'express';
import systemRoutes from './routes/systemRoutes';
import kpiRoutes from './routes/kpiRoutes';
import monitoringAreaRoutes from './routes/monitoringAreaRoutes';
import kpiGroupRoutes from './routes/kpiGroupRoutes';

const app = express();

// Middleware to parse JSON requests
app.use(express.json());

// Use routes for different API models
app.use('/api', systemRoutes);
app.use('/api', kpiRoutes);
app.use('/api', monitoringAreaRoutes);
app.use('/api', kpiGroupRoutes);

// Default route
app.get('/', (req, res) => {
  res.send('Welcome to the Prisma API!');
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
