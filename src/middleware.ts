import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define o tempo máximo de inatividade (Ex: 1 hora em milissegundos)
const MAX_INACTIVITY = 1 * 60 * 60 * 1000;

export function middleware(request: NextRequest) {
  const authToken = request.cookies.get('auth_token')?.value;
  const lastActivity = request.cookies.get('last_activity')?.value;
  const pathname = request.nextUrl.pathname;

  // Só verifica inatividade se o usuário estiver tentando acessar rotas do Dashboard
  if (pathname.startsWith('/dashboard')) {
    // 1. Se não houver token, manda para o login
    if (!authToken) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // 2. Verifica tempo de inatividade
    if (lastActivity) {
      const now = Date.now();
      const diff = now - parseInt(lastActivity);

      if (diff > MAX_INACTIVITY) {
        // Excedeu o tempo, limpa o token e manda para login
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete('auth_token');
        response.cookies.delete('last_activity');
        return response;
      }
    }

    // 3. Atualiza o carimbo de última atividade a cada requisição válida
    const response = NextResponse.next();
    response.cookies.set('last_activity', Date.now().toString(), {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/nova-senha'],
};
