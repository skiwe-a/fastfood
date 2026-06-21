import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: number;
      name: string;
      email: string;
      role: 'CUSTOMER' | 'RESTAURANT' | 'ADMIN';
      image?: string | null;
    };
  }
  interface User {
    role: 'CUSTOMER' | 'RESTAURANT' | 'ADMIN';
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: number;
    role: 'CUSTOMER' | 'RESTAURANT' | 'ADMIN';
  }
}
