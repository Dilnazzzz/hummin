import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins";
import { db } from "./db";
import * as schema from "./db/schema";
import { sendMagicLinkEmail } from "./email/magic-link";
import { env } from "./env";

const google =
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } }
    : {};

const isProduction = env.NODE_ENV === "production";

/** Private-network origins (phone on the same Wi-Fi) are fine in development. */
function isPrivateDevOrigin(origin: string) {
  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== "http:") return false;
    return (
      hostname === "localhost" ||
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
    );
  } catch {
    return false;
  }
}

export const auth = betterAuth({
  appName: "Hummin'",
  // In development the base URL follows the request host, so localhost and a
  // phone on the same Wi-Fi both get working links. Production pins it.
  baseURL: isProduction
    ? env.BETTER_AUTH_URL
    : { allowedHosts: ["localhost:*", "127.0.0.1:*", "10.*", "172.*", "192.168.*"], fallback: env.APP_URL },
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: isProduction
    ? [env.APP_URL]
    : (request) => {
        const origin = request?.headers.get("origin");
        return origin && isPrivateDevOrigin(origin) ? [env.APP_URL, origin] : [env.APP_URL];
      },
  database: drizzleAdapter(db, { provider: "pg", schema }),
  advanced: {
    // Railway (and most hosts) put the client address in x-forwarded-for.
    ipAddress: { ipAddressHeaders: ["x-forwarded-for", "x-real-ip"] },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh once a day when used
  },
  account: {
    accountLinking: { enabled: true, trustedProviders: ["google"] },
  },
  socialProviders: google,
  plugins: [
    magicLink({
      expiresIn: 60 * 15,
      sendMagicLink: async ({ email, url }) => {
        await sendMagicLinkEmail(email, url);
      },
    }),
    // Must stay last so Server Actions can set cookies.
    nextCookies(),
  ],
});

