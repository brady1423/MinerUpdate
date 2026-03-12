import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import rangesRouter from './routes/ranges.js';
import { createScanRouter, createMinersRouter } from './routes/scans.js';

const PORT = process.env.PORT ?? 3001;

const app = express();
const httpServer = createServer(app);

const io = new SocketServer(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }));
app.use(express.json());

// Routes
app.use('/api/ranges', rangesRouter);
app.use('/api/scans', createScanRouter(io));
app.use('/api/miners', createMinersRouter());

// WebSocket namespace
io.of('/scans').on('connection', (socket) => {
  console.log(`Scanner client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`Scanner client disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`MinerUpdate server running on http://localhost:${PORT}`);
});
