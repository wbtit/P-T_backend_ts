import { ClientSecretCredential } from "@azure/identity";
import { Client } from "@microsoft/microsoft-graph-client";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials";


export type MailAttachment = {
  name: string;
  contentType: string;
  /** Base64-encoded file content. Graph's inline sendMail attachments cap out around ~3MB total per message. */
  contentBytes: string;
};

export type MailOptions = {
  to: string | string[];
  subject: string;
  html: string;
  cc?: string | string[];
  /** Optional — existing callers that omit this are unaffected. */
  attachments?: MailAttachment[];
};

class MailService {
  private client: Client;
  private senderEmail: string;

  constructor() {
    const clientId = process.env.AZURE_CLIENT_ID;
    const tenantId = process.env.AZURE_TENANT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;
    this.senderEmail = process.env.MAIL_SENDER || "";

    if (!clientId || !tenantId || !clientSecret || !this.senderEmail) {
      console.warn("Missing Azure AD configuration for MailService.");
    }

    const credential = new ClientSecretCredential(tenantId || "", clientId || "", clientSecret || "");
    const authProvider = new TokenCredentialAuthenticationProvider(credential, {
      scopes: ["https://graph.microsoft.com/.default"],
    });

    this.client = Client.initWithMiddleware({
      authProvider: authProvider,
    });
  }

  async sendMail(options: MailOptions) {
    try {
      const toRecipients = Array.isArray(options.to)
        ? options.to.map((email) => ({ emailAddress: { address: email } }))
        : [{ emailAddress: { address: options.to } }];

      const ccRecipients = options.cc
        ? Array.isArray(options.cc)
          ? options.cc.map((email) => ({ emailAddress: { address: email } }))
          : [{ emailAddress: { address: options.cc } }]
        : [];

      const message: any = {
        subject: options.subject,
        body: {
          contentType: "HTML",
          content: options.html,
        },
        toRecipients,
      };

      if (ccRecipients.length > 0) {
        message.ccRecipients = ccRecipients;
      }

      if (options.attachments && options.attachments.length > 0) {
        message.attachments = options.attachments.map((att) => ({
          "@odata.type": "#microsoft.graph.fileAttachment",
          name: att.name,
          contentType: att.contentType,
          contentBytes: att.contentBytes,
        }));
      }

      const sendMailPayload = {
        message,
        saveToSentItems: false,
      };

      await this.client.api(`/users/${this.senderEmail}/sendMail`).post(sendMailPayload);
    } catch (error: any) {
      console.error("Graph API SendMail Error:", error);
      throw new Error(error.code || "Graph API Error");
    }
  }
}

export const mailService = new MailService();
