import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('database.uri'),
        // Serverless optimizations to prevent cold-start timeouts and connection exhaustion
        serverSelectionTimeoutMS: 5000, 
        maxPoolSize: 10,
        socketTimeoutMS: 45000,
      }),
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
