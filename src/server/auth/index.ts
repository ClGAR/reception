import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins";
import { db } from "../db";
import { emailLayout, sendEmail } from "../email";

export const auth = betterAuth({
  appName: "Reception",
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 10,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your Reception password",
        ...emailLayout({
          heading: "Reset your password",
          intro: "Someone asked to reset the password for this email. If it was you, press the button. If not, you can ignore this email.",
          button: { label: "Choose a new password", url },
          footer: "This link works once and expires in 1 hour.",
        }),
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Confirm your email for Reception",
        ...emailLayout({
          heading: `Welcome, ${user.name.split(/\s+/)[0] || "there"}`,
          intro: "Press the button to confirm your email. Then we'll help you set up your business in a few minutes.",
          button: { label: "Confirm my email", url },
          footer: "Didn't sign up for Reception? You can ignore this email.",
        }),
      });
    },
  },
  rateLimit: { enabled: true, window: 60, max: 30 },
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      creatorRole: "owner",
      sendInvitationEmail: async ({ email, organization: org, id }) => {
        const url = `${process.env.BETTER_AUTH_URL}/accept-invite/${id}`;
        await sendEmail({
          to: email,
          subject: `Join ${org.name} on Reception`,
          ...emailLayout({
            heading: `You're invited to ${org.name}`,
            intro: `${org.name} uses Reception to answer customers and manage bookings. Press the button to join the team.`,
            button: { label: "Join the team", url },
          }),
        });
      },
    }),
    nextCookies(),
  ],
});
