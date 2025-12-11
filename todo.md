# Как реализовать Google OAuth авторизацию в NestJS проекте

## Обзор

Авторизация реализована через Google OAuth 2.0 с использованием Passport.js и cookie-session.

**Стек:** NestJS, passport-google-oauth20, cookie-session

---

## Шаг 1: Установка зависимостей

```bash
npm install @nestjs/passport passport passport-google-oauth20 cookie-session
npm install -D @types/passport-google-oauth20
```

---

## Шаг 2: Создание Google OAuth credentials

1. Зайти в [Google Cloud Console](https://console.cloud.google.com/)
2. Создать проект (или выбрать существующий)
3. Перейти в **APIs & Services** → **Credentials**
4. Нажать **Create Credentials** → **OAuth 2.0 Client ID**
5. Выбрать тип приложения: **Web application**
6. Добавить в **Authorized redirect URIs**:
   - Для dev: `http://localhost:3000/api/auth/google/callback`
   - Для prod: `https://yourdomain.com/api/auth/google/callback`
7. Сохранить **Client ID** и **Client Secret**

---

## Шаг 3: Настройка конфигурации

Создать файл с переменными окружения (или в `utils.ts`):

```typescript
export const isDevelopment = process.env.NODE_ENV === 'development';

export const frontendURL = isDevelopment
  ? 'http://localhost:3006/'
  : 'https://yourdomain.com/';

export const callbackURL = isDevelopment
  ? 'http://localhost:3000/api/auth/google/callback'
  : frontendURL + 'api/auth/google/callback';
```

---

## Шаг 4: Создание Google Strategy

Файл: `src/auth/google.strategy.ts`

```typescript
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { callbackURL } from 'src/utils';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: 'YOUR_CLIENT_ID',
      clientSecret: 'YOUR_CLIENT_SECRET',
      callbackURL: callbackURL,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, emails, displayName } = profile;
    const user = {
      id,
      email: emails[0].value,
      name: displayName,
    };
    done(null, user);
  }
}
```

---

## Шаг 5: Создание Auth Module и Controller

Файл: `src/auth/auth.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { GoogleStrategy } from './google.strategy';
import { PassportModule } from '@nestjs/passport';
import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { frontendURL } from 'src/utils';
import { findOrCreatePlayer } from 'src/player/player.service';

@Controller('api/auth')
export class AuthController {
  // Редирект на Google
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth(@Req() req: Request) {}

  // Callback после авторизации
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res: Response) {
    if (req.user) {
      // Найти или создать пользователя в БД
      const player = await findOrCreatePlayer(
        generateUniqueUid(req.user.email),
        req.user.name,
        req.user.email,
      );
      // Сохранить в сессию
      req.session.user = player;
    }
    res.redirect(frontendURL);
  }

  // Выход
  @Get('logout')
  logout(@Req() req, @Res() res: Response) {
    req.session = null;
    res.redirect(frontendURL);
  }
}

@Module({
  imports: [PassportModule.register({ session: true })],
  controllers: [AuthController],
  providers: [GoogleStrategy],
})
export class AuthModule {}
```

---

## Шаг 6: Настройка сессий в main.ts

Файл: `src/main.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as session from 'cookie-session';
import { isDevelopment, frontendURL } from './utils';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Trust proxy для работы за nginx/load balancer
  app.getHttpAdapter().getInstance().set('trust proxy', true);

  // CORS настройки
  app.enableCors({
    origin: frontendURL.slice(0, -1), // без trailing slash
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['set-cookie'],
  });

  // Cookie-session middleware
  app.use(
    session({
      name: 'session',
      secret: 'YOUR_SECRET_KEY', // заменить на случайную строку
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 дней
      httpOnly: true,
      sameSite: 'lax',
      secure: !isDevelopment, // true в production (https)
    }),
  );

  await app.listen(3000);
}
bootstrap();
```

---

## Шаг 7: Подключить AuthModule в AppModule

Файл: `src/app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [AuthModule, /* другие модули */],
})
export class AppModule {}
```

---

## Шаг 8: Использование сессии в контроллерах

Для получения текущего пользователя в любом контроллере:

```typescript
@Get('profile')
getProfile(@Req() req) {
  if (!req.session?.user) {
    throw new UnauthorizedException();
  }
  return req.session.user;
}
```

---

## Шаг 9: Фронтенд

Для авторизации на фронтенде:

```javascript
// Кнопка входа - редирект на бекенд
window.location.href = 'http://localhost:3000/api/auth/google';

// Кнопка выхода
window.location.href = 'http://localhost:3000/api/auth/logout';
```

Важно: все запросы к API делать с `credentials: 'include'`:

```javascript
fetch('/api/profile', { credentials: 'include' });
// или axios
axios.get('/api/profile', { withCredentials: true });
```

---

## Итого: Маршруты API

| Маршрут | Метод | Описание |
|---------|-------|----------|
| `/api/auth/google` | GET | Редирект на Google OAuth |
| `/api/auth/google/callback` | GET | Callback после авторизации |
| `/api/auth/logout` | GET | Выход из системы |

---

## Чеклист

- [ ] Установить зависимости
- [ ] Создать Google OAuth credentials
- [ ] Настроить переменные окружения (CLIENT_ID, SECRET, URLs)
- [ ] Создать GoogleStrategy
- [ ] Создать AuthModule с контроллером
- [ ] Настроить cookie-session в main.ts
- [ ] Настроить CORS с credentials: true
- [ ] Подключить AuthModule в AppModule
- [ ] На фронте использовать withCredentials для запросов
