import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { LoggingService } from '../logging/logging.service.js';
import { RedisService } from '../redis/redis.service.js';

interface ChatMessage {
  id: string;
  nickname: string;
  message: string;
  timestamp: number;
  symbol: string;
}

interface JoinRoomData {
  symbol: string;
  nickname: string;
}

interface UserData {
  nickname: string;
  symbol: string;
}

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:3000',
      'https://stock-regret-8thaihnqm-jaenam1212s-projects.vercel.app',
    ],
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly redisService: RedisService,
    private readonly loggingService: LoggingService,
  ) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);

    // 사용자 접속 로깅 (성능 최적화를 위해 비동기로 처리)
    this.loggingService
      .logUserActivity({
        userId: client.id,
        action: 'connect',
        timestamp: Date.now(),
        ip: client.handshake.address,
        userAgent: client.handshake.headers['user-agent'],
      })
      .catch(console.error);
  }

  async handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    // 사용자가 접속한 모든 채팅방에서 제거
    const rooms = Array.from(client.rooms);
    for (const room of rooms) {
      if (room !== client.id) {
        await this.handleLeaveRoom(client, { symbol: room });
      }
    }
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinRoomData,
  ) {
    const { symbol, nickname } = data;
    // 기존 방에서 나가기
    const rooms = Array.from(client.rooms);
    for (const room of rooms) {
      if (room !== client.id && room.startsWith('stock:')) {
        await client.leave(room);
      }
    }

    // 새 방에 참가
    const roomName = `stock:${symbol}`;
    await client.join(roomName);
    // 사용자 정보 저장
    await this.redisService.set(
      `user:${client.id}`,
      JSON.stringify({ nickname, symbol }),
      3600, // 1시간 TTL
    );

    // 최근 메시지 로드 (최대 50개)
    const messages = await this.redisService.lrange(roomName, 0, 49);
    const parsedMessages = messages
      .map((msg) => JSON.parse(msg) as ChatMessage)
      .reverse();

    // 방 참가 알림
    client.emit('roomJoined', {
      symbol,
      messages: parsedMessages,
    });

    // 다른 사용자들에게 참가 알림
    client.to(roomName).emit('userJoined', {
      nickname,
      timestamp: Date.now(),
    });

    console.log(`${nickname} joined ${symbol} room`);

    // 채팅방 참가 로깅 (성능 최적화를 위해 비동기로 처리)
    this.loggingService
      .logUserActivity({
        userId: client.id,
        action: 'joinRoom',
        symbol,
        timestamp: Date.now(),
      })
      .catch(console.error);
  }

  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { symbol: string },
  ) {
    const roomName = `stock:${data.symbol}`;
    await client.leave(roomName);
    // 사용자 정보 삭제
    await this.redisService.del(`user:${client.id}`);
    console.log(`Client left ${data.symbol} room`);
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { message: string; symbol: string },
  ) {
    const { message, symbol } = data;
    // 사용자 정보 가져오기
    const userData = await this.redisService.get(`user:${client.id}`);
    if (!userData) {
      client.emit('error', { message: 'User not found' });
      return;
    }

    const userInfo = JSON.parse(userData) as UserData;
    const { nickname } = userInfo;
    const roomName = `stock:${symbol}`;
    // 메시지 생성
    const chatMessage: ChatMessage = {
      id: `${client.id}-${Date.now()}`,
      nickname,
      message,
      timestamp: Date.now(),
      symbol,
    };

    // Redis에 메시지 저장 (최대 100개 유지)
    await this.redisService.lpush(roomName, JSON.stringify(chatMessage));
    await this.redisService.ltrim(roomName, 0, 99);
    await this.redisService.expire(roomName, 86400); // 24시간 TTL

    // 방의 모든 사용자에게 메시지 전송
    this.server.to(roomName).emit('newMessage', chatMessage);
    console.log(`${nickname} sent message in ${symbol}: ${message}`);

    // 메시지 전송 로깅 (성능 최적화를 위해 비동기로 처리)
    this.loggingService
      .logUserActivity({
        userId: client.id,
        action: 'sendMessage',
        symbol,
        timestamp: Date.now(),
      })
      .catch(console.error);
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { symbol: string; isTyping: boolean },
  ) {
    const roomName = `stock:${data.symbol}`;
    client.to(roomName).emit('userTyping', {
      userId: client.id,
      isTyping: data.isTyping,
    });
  }
}
