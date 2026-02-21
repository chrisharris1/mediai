import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import LinkedInProvider from "next-auth/providers/linkedin";
import CredentialsProvider from "next-auth/providers/credentials";
import { authService } from "@/lib/authService";
import clientPromise from "@/lib/mongodb";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    LinkedInProvider({
      clientId: process.env.LINKEDIN_CLIENT_ID || "",
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET || "",
      authorization: {
        params: {
          scope: "openid profile email"
        }
      },
      checks: ["state"],
      // Fix for LinkedIn OAuth issuer validation error
      client: {
        token_endpoint_auth_method: "client_secret_post"
      },
      issuer: "https://www.linkedin.com/oauth",
      wellKnown: "https://www.linkedin.com/oauth/.well-known/openid-configuration",
      // Map LinkedIn's 'sub' field to 'id'
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture
        };
      }
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please enter email and password");
        }

        const result = await authService.login(credentials.email, credentials.password);

        if (result.success && result.user) {
          return {
            id: result.user.id,
            email: result.user.email,
            name: result.user.full_name,
            role: result.user.role
          };
        }

        throw new Error(result.message || "Invalid credentials");
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle OAuth sign-in
      if (account?.provider === "google" || account?.provider === "linkedin") {
        try {
          console.log('🔵 OAuth sign-in attempt:', {
            provider: account.provider,
            userEmail: user.email,
            profileEmail: profile?.email,
            userName: user.name
          });

          const email = user.email || profile?.email;
          const name = user.name || profile?.name;
          
          if (!email) {
            console.error("❌ No email provided from OAuth provider");
            return false;
          }

          console.log('🔵 Attempting to connect to MongoDB...');
          
          // Check if user exists in MongoDB
          const client = await clientPromise;
          const db = client.db();
          const usersCollection = db.collection('users');
          
          console.log('✅ MongoDB connected successfully');
          
          const existingUser = await usersCollection.findOne({ email });
          
          if (existingUser) {
            // User exists - use their role from database
            user.id = existingUser._id.toString();
            user.email = existingUser.email;
            user.name = existingUser.full_name || existingUser.name;
            user.role = existingUser.role; // This will be 'patient', 'doctor', 'pending_doctor', or 'admin'
            
            console.log('✅ Existing user logged in with OAuth:', { 
              id: user.id,
              email: user.email, 
              name: user.name,
              role: user.role,
              provider: account.provider 
            });
          } else {
            // New OAuth user - create as patient (doctors must register through form)
            console.log('🔵 Creating new patient account for OAuth user...');
            
            const newUser = {
              email,
              full_name: name || email.split('@')[0],
              name: name || email.split('@')[0],
              role: 'patient',
              is_active: true,
              oauth_provider: account.provider,
              created_at: new Date()
            };
            
            const result = await usersCollection.insertOne(newUser);
            
            user.id = result.insertedId.toString();
            user.email = email;
            user.name = name || email.split('@')[0];
            user.role = 'patient';
            
            console.log('✅ New OAuth user created as patient:', { 
              id: user.id,
              email: user.email,
              provider: account.provider 
            });
          }
          
          console.log('✅ OAuth sign-in successful, returning true');
          return true;
        } catch (error) {
          const err = error as Error;
          console.error("❌ OAuth sign-in error:", error);
          console.error("❌ Error details:", {
            name: err.name,
            message: err.message,
            stack: err.stack
          });
          // Return true anyway to allow sign-in (fallback mode)
          console.log('⚠️  Allowing sign-in despite error (fallback mode)');
          return true;
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.id = (user.id || user.email) as string;
        token.role = (user.role || 'patient') as string;
        token.accessToken = (user.accessToken || '') as string;
        token.email = user.email as string;
        token.name = user.name as string;
      }
      
      if (account) {
        token.provider = account.provider;
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id || token.email) as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.role = (token.role || 'patient') as string;
        session.user.accessToken = (token.accessToken || '') as string;
        session.user.provider = (token.provider || '') as string;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // If redirecting to sign-in page, allow it
      if (url.includes('/login') || url.includes('/register')) {
        return url;
      }
      
      // If the URL is already provided (like from doctor registration), use it
      if (url.startsWith(baseUrl)) {
        return url;
      }
      
      // Default redirect to dashboard (ProtectedRoute will handle role-based redirects)
      return `${baseUrl}/dashboard`;
    }
  },
  pages: {
    signIn: '/login',
    error: '/api/auth/error', // Let our custom error route handle redirects
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};
