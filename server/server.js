const { WebSocketServer } = require('ws');
const http = require('http');

const PORT = process.env.PORT || 3000;

// Simple HTTP server — Render needs a port to health-check
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('SAB Museum – servidor multijugador activo');
});

const wss = new WebSocketServer({ server });

// rooms: Map<roomId, Set<WebSocket>>
const rooms = new Map();

wss.on('connection', (ws, req) => {
  const params = new URL(req.url, `http://localhost`).searchParams;
  const roomId = params.get('room') || 'sab';

  if (!rooms.has(roomId)) rooms.set(roomId, new Set());
  const room = rooms.get(roomId);

  // Only 2 players per room
  if (room.size >= 2) {
    ws.send(JSON.stringify({ type: 'room_full' }));
    ws.close();
    return;
  }

  room.add(ws);
  ws._roomId = roomId;

  // Tell this client its assigned ID
  const playerId = `p${Date.now()}`;
  ws._playerId = playerId;
  ws.send(JSON.stringify({ type: 'connected', id: playerId }));

  // Tell existing partner someone joined
  broadcast(room, ws, { type: 'partner_joined', id: playerId });

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      // Just relay to the other player in the room
      broadcast(room, ws, msg);
    } catch {
      // ignore malformed messages
    }
  });

  ws.on('close', () => {
    room.delete(ws);
    if (room.size === 0) {
      rooms.delete(roomId);
    } else {
      broadcast(room, ws, { type: 'partner_left' });
    }
  });

  ws.on('error', () => ws.close());
});

function broadcast(room, sender, msg) {
  const data = JSON.stringify(msg);
  for (const client of room) {
    if (client !== sender && client.readyState === 1 /* OPEN */) {
      client.send(data);
    }
  }
}

server.listen(PORT, () => {
  console.log(`SAB Museum server escuchando en puerto ${PORT}`);
});
