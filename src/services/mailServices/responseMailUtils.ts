import { getCCEmails, sendEmail } from "./mailconfig";

export type MailParticipant = {
  id?: string | null;
  email?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  username?: string | null;
  designation?: string | null;
};

type ResolveAudienceInput = {
  sender?: MailParticipant | null;
  primaryRecipient?: MailParticipant | null;
  multipleRecipients?: MailParticipant[] | null;
  responder?: MailParticipant | null;
};

type ResponseAudience = {
  greeting: string;
  involvedNames: string[];
  toEmails: string[];
};

type SendResponseParticipantMailInput = ResolveAudienceInput & {
  subject: string;
  text?: string;
  buildHtml: (audience: ResponseAudience) => string;
};

const normalizeEmail = (email?: string | null) => email?.trim().toLowerCase() || "";

export const formatParticipantName = (participant?: MailParticipant | null) =>
  [participant?.firstName, participant?.middleName, participant?.lastName]
    .filter(Boolean)
    .join(" ") ||
  participant?.username ||
  "Recipient";

const participantKey = (participant?: MailParticipant | null) => {
  if (!participant) return "";
  if (participant.id) return `id:${participant.id}`;

  const email = normalizeEmail(participant.email);
  if (email) return `email:${email}`;

  return `name:${formatParticipantName(participant)}`;
};

export const resolveResponseAudience = ({
  sender,
  primaryRecipient,
  multipleRecipients = [],
  responder,
}: ResolveAudienceInput): ResponseAudience => {
  const involvedParticipants = [sender, primaryRecipient, ...(multipleRecipients || [])].filter(
    Boolean
  ) as MailParticipant[];

  const uniqueParticipants = Array.from(
    new Map(
      involvedParticipants
        .map((participant) => [participantKey(participant), participant] as const)
        .filter(([key]) => key)
    ).values()
  );

  const responderEmail = normalizeEmail(responder?.email);
  const responderId = responder?.id || "";

  const targetParticipants = uniqueParticipants.filter((participant) => {
    const participantEmail = normalizeEmail(participant.email);

    if (!participantEmail) return false;
    if (responderId && participant.id === responderId) return false;
    if (responderEmail && participantEmail === responderEmail) return false;

    return true;
  });

  const recipientNames = targetParticipants.map((participant) => formatParticipantName(participant));

  return {
    greeting:
      recipientNames.length > 1
        ? recipientNames.join(", ")
        : recipientNames[0] || "Team",
    involvedNames: uniqueParticipants.map((participant) => formatParticipantName(participant)),
    toEmails: Array.from(
      new Set(
        targetParticipants
          .map((participant) => normalizeEmail(participant.email))
          .filter(Boolean)
      )
    ),
  };
};

const sanitizeCcEmails = (
  ccEmails: string[],
  toEmails: string[],
  excludedEmails: string[]
) => {
  const excluded = new Set(
    [...toEmails, ...excludedEmails].map((email) => normalizeEmail(email)).filter(Boolean)
  );

  return Array.from(
    new Set(
      ccEmails
        .map((email) => normalizeEmail(email))
        .filter((email) => email && !excluded.has(email))
    )
  );
};

export const sendResponseParticipantMail = async ({
  sender,
  primaryRecipient,
  multipleRecipients,
  responder,
  subject,
  text,
  buildHtml,
}: SendResponseParticipantMailInput) => {
  const audience = resolveResponseAudience({
    sender,
    primaryRecipient,
    multipleRecipients,
    responder,
  });

  if (audience.toEmails.length === 0) {
    return { sent: false, audience };
  }

  const ccEmails = sanitizeCcEmails(
    await getCCEmails(),
    audience.toEmails,
    [responder?.email || ""]
  );

  await sendEmail({
    to: audience.toEmails.join(","),
    cc: ccEmails.length ? ccEmails : undefined,
    subject,
    text,
    html: buildHtml(audience),
  });

  return { sent: true, audience };
};
