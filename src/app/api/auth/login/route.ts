import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPass = String(password || '').trim();

    if (cleanEmail === 'super@pvm.com' && cleanPass === 'Pvm@2026@') {
      const response = NextResponse.json({
        success: true,
        user: {
          name: 'Super Admin',
          email: 'super@pvm.com',
          role: 'Admin Panel',
          org: 'Perfetti Van Melle Bangladesh',
        },
      });

      // Set cookie for session persistence (30 days)
      response.cookies.set('pvm_auth', 'authenticated', {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
      });

      return response;
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Invalid email or password. Please check your credentials.',
      },
      { status: 401 }
    );
  } catch (error: any) {
    console.error('API /auth/login error:', error?.message || error);
    return NextResponse.json(
      {
        success: false,
        message: 'Authentication error occurred.',
        detail: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
