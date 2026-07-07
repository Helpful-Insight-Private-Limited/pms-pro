import { prisma } from "../prisma/client.js";
import { env } from "../config/env.js";
import nodemailer from "nodemailer";

type EmailInput = {
  userId?: string | null;
  templateId?: string | null;
  toEmail: string;
  subject: string;
  body: string;
};

export const emailService = {
  isConfigured() {
    return Boolean(env.email.enabled && env.email.host && env.email.user && env.email.password && env.email.fromEmail);
  },

  status() {
    return {
      enabled: env.email.enabled,
      configured: this.isConfigured(),
      host: env.email.host ?? null,
      port: env.email.port,
      secure: env.email.secure,
      fromName: env.email.fromName,
      fromEmail: env.email.fromEmail ?? null
    };
  },

  async queueAndSend(input: EmailInput) {
    const emailLog = await prisma.emailLog.create({
      data: {
        userId: input.userId,
        templateId: input.templateId,
        toEmail: input.toEmail,
        subject: input.subject,
        body: input.body,
        status: "PENDING",
        provider: this.isConfigured() ? "smtp" : "disabled"
      }
    });

    try {
      if (!this.isConfigured()) {
        return await prisma.emailLog.update({
          where: { id: emailLog.id },
          data: {
            status: "FAILED",
            failedAt: new Date(),
            errorMessage: "Email service is disabled or SMTP is not configured"
          }
        });
      }

      const transporter = nodemailer.createTransport({
        host: env.email.host,
        port: env.email.port,
        secure: env.email.secure,
        auth: {
          user: env.email.user,
          pass: env.email.password
        }
      });
      const result = await transporter.sendMail({
        from: `"${env.email.fromName}" <${env.email.fromEmail}>`,
        to: input.toEmail,
        subject: input.subject,
        text: input.body.replace(/<[^>]+>/g, " "),
        html: input.body
      });

      return await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: "SENT",
          sentAt: new Date(),
          providerMessageId: result.messageId
        }
      });
    } catch (error) {
      return prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: "FAILED",
          failedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : "Unknown email delivery error"
        }
      });
    }
  }
};
