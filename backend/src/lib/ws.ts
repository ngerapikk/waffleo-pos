import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';

let wss: WebSocketServer;

export const initWebSocket = (server: Server) => {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('🔗 Client connected to WebSocket');
    
    ws.on('close', () => {
      console.log('🔗 Client disconnected from WebSocket');
    });
    
    ws.on('error', (err) => {
      console.error('WebSocket Error:', err);
    });
  });
};

export const broadcastOrderUpdate = () => {
  if (!wss) return;
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'ORDER_UPDATED' }));
    }
  });
};
