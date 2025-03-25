const express = require("express");
const { WebSocketServer } = require("ws");
const http = require("http");

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const docs = {};

wss.on("connection", (ws) => {
  let currentDocId = null;

  ws.on("message", (message) => {
    const data = JSON.parse(message);

    if (data.type === "join") {
      currentDocId = data.docId;
      ws.docId = data.docId; // 🔥 클라이언트 객체에 docId 저장

      if (docs[currentDocId]) {
        ws.send(
          JSON.stringify({ type: "update", content: docs[currentDocId] })
        );
      }
    }

    if (data.type === "update") {
      docs[data.docId] = data.content;

      // 🔥 같은 문서(docId)를 보고 있는 사람에게만 전송
      wss.clients.forEach((client) => {
        if (
          client !== ws &&
          client.readyState === 1 &&
          client.docId === data.docId // 🔥 여기!
        ) {
          client.send(
            JSON.stringify({ type: "update", content: data.content })
          );
        }
      });
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 WebSocket Server running on port ${PORT}`);
});
