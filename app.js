import express from 'express';
import * as http from 'node:http';
import { WebSocketServer } from 'ws';

// Create an Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Initialize WebSocket Server
const wss = new WebSocketServer({ server });

// Map to store clients with their userIds
const clients = new Map();

// Endpoint for testing server status
app.get('/', (req, res) => {
    res.json({ message: 'WebSocket Server is running!' });
});

// WebSocket connection handling
wss.on('connection', (ws, req) => {
    // Extract userId from query parameters (e.g., ws://localhost:5005?userId=123)
    const userId = req.url.split('?userId=')[1];

    if (!userId) {
        ws.close(1008, 'User ID is required for connection');
        return;
    }

    console.log(`User connected: ${userId}`);
    clients.set(userId, ws); // Store connection in the clients map

    // Handle incoming messages
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log(`Message from ${userId}:`, data);

            switch (data.event) {
                case 'greet':
                    ws.send('Hello, Client!');
                    break;

                case 'echo':
                    ws.send(`Echo: ${data.payload}`);
                    break;

                case 'sendToUser': // One-to-one messaging
                    const targetUserId = data.targetUserId; // ID of the recipient
                    const targetClient = clients.get(targetUserId); // Get recipient's WebSocket
                    if (targetClient && targetClient.readyState === WebSocket.OPEN) {
                        targetClient.send(
                            JSON.stringify({ from: userId, message: data.payload })
                        );
                    } else {
                        ws.send(`User ${targetUserId} is not online`);
                    }
                    break;

                case 'broadcast': // Broadcast to all connected clients
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(data.payload);
                        }
                    });
                    break;

                default:
                    ws.send('Unknown event');
            }
        } catch (error) {
            console.error('Error handling message:', error.message);
            ws.send('Invalid message format');
        }
    });

    // Handle errors
    ws.on('error', (err) => {
        console.error(`WebSocket error for ${userId}:`, err);
    });

    // Handle disconnection
    ws.on('close', () => {
        console.log(`User disconnected: ${userId}`);
        clients.delete(userId);
    });
});

// Function to send notifications to a specific user
function sendNotification(targetUserId, message) {
    const targetClient = clients.get(targetUserId);
    if (targetClient && targetClient.readyState === WebSocket.OPEN) {
        targetClient.send(JSON.stringify({ type: 'notification', message }));
    } else {
        console.log(`User ${targetUserId} is not online`);
    }
}

// Start the server
const PORT = 5005;
server.listen(PORT, () => {
    console.log(`WebSocket server is running on http://localhost:${PORT}`);
});

// Example usage of sending notifications (for demonstration)
// Uncomment this block to send a notification after 10 seconds
/*
setTimeout(() => {
    sendNotification('123', 'You have a new notification!');
}, 10000);
*/
