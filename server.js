const express = require("express");
const { WebSocketServer } = require("ws");
const http = require("http");

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const docs = {}; // 문서 내용 저장
const connections = {}; // { docId: Set of JSON.stringify(user) }

wss.on("connection", (ws) => {
  let currentDocId = null;
  let currentUser = null;

  ws.on("message", (message) => {
    const data = JSON.parse(message);

    if (data.type === "join") {
      currentDocId = data.docId;
      currentUser = data.user; // { email, name }
      ws.docId = currentDocId;
      ws.user = currentUser;

      // 문서 초기화
      if (docs[currentDocId]) {
        ws.send(
          JSON.stringify({ type: "update", content: docs[currentDocId] })
        );
      }

      // 접속자 목록 관리
      if (!connections[currentDocId]) {
        connections[currentDocId] = new Set();
      }
      connections[currentDocId].add(JSON.stringify(currentUser));

      // 접속자 목록 브로드캐스트
      broadcastUsers(currentDocId);
    }

    if (data.type === "update") {
      docs[data.docId] = data.content;

      wss.clients.forEach((client) => {
        if (
          client !== ws &&
          client.readyState === 1 &&
          client.docId === data.docId
        ) {
          client.send(
            JSON.stringify({ type: "update", content: data.content })
          );
        }
      });
    }
  });

  ws.on("close", () => {
    if (currentDocId && currentUser) {
      connections[currentDocId]?.delete(JSON.stringify(currentUser));
      broadcastUsers(currentDocId);
    }
  });

  // 🔄 접속자 목록 브로드캐스트 함수
  function broadcastUsers(docId) {
    const users = Array.from(connections[docId] || []).map((u) =>
      JSON.parse(u)
    );

    wss.clients.forEach((client) => {
      if (client.readyState === 1 && client.docId === docId) {
        client.send(JSON.stringify({ type: "users", users }));
      }
    });
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 WebSocket Server running on port ${PORT}`);
});
