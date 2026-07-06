import { prisma } from "../prisma/client.js";

type EmailInput = {
  userId?: string | null;
  templateId?: string | null;
  toEmail: string;
  subject: string;
  body: string;
};

export const emailService = {
  async queueAndSend(input: EmailInput) {
    const emailLog = await prisma.emailLog.create({
      data: {
        userId: input.userId,
        templateId: input.templateId,
        toEmail: input.toEmail,
        subject: input.subject,
        body: input.body,
        status: "PENDING",
        provider: "development-log"
      }
    });

    try {
      return await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: "SENT",
          sentAt: new Date(),
          providerMessageId: `dev-${emailLog.id}`
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
