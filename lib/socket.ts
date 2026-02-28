import { io, Socket } from "socket.io-client";

const SOCKET_URL = "http://localhost:5001";

export const socket: Socket = io(SOCKET_URL, {
    autoConnect: false,
});
