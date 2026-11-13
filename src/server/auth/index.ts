import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins";
import { db } from "../db";
import { sendEmail } from "../email";

export const auth = betterAuth({
  appName: "Reception",
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 10,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({ to: user.email, subject: "Reset your Reception password", text: `Reset link: ${url}` });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({ to: user.email, subject: "Verify your email for Reception", text: `Verify: ${url}` });
    },
  },
  rateLimit: { enabled: true, window: 60, max: 30 },
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      creatorRole: "owner",
      sendInvitationEmail: async ({ email, organization: org, id }) => {
        const url = `${process.env.BETTER_AUTH_URL}/accept-invite/${id}`;
        await sendEmail({ to: email, subject: `Join ${org.name} on Reception`, text: `Accept: ${url}` });
      },
    }),
    nextCookies(),
  ],
});
