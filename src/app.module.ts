import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { AuthMiddleware } from './common/guards/authCheak.guard';

@Module({
  imports: [UserModule, AuthModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .exclude(
        { path: '/auth/signup', method: RequestMethod.POST },
        { path: '/auth/signin', method: RequestMethod.POST },
        { path: '/auth/refresh', method: RequestMethod.GET },
      )
      .forRoutes('');
  }
}
