// AWS Lambda (Node 24): forwards mail received by Amazon SES to the owner's inbox.
// SES stores each message in S3 and then calls this function with the message's
// id and spam and virus verdicts. Environment (set by create-inbound.sh):
//   BUCKET, OBJECT_PREFIX  where SES put the message
//   FORWARDER_ADDRESS      the address the forwarded mail is sent from
//   OWNER_INBOX            where it goes (kept only here, not in the repository)
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { SendRawEmailCommand, SESClient } from '@aws-sdk/client-ses';
import { isLoop, rewriteMessage, shouldDrop } from './rewrite.mjs';

const s3 = new S3Client({});
const ses = new SESClient({});

export const handler = async (event) => {
  const { BUCKET, OBJECT_PREFIX = '', FORWARDER_ADDRESS, OWNER_INBOX } = process.env;
  for (const record of event.Records ?? []) {
    const id = record.ses.mail.messageId;
    if (shouldDrop(record.ses.receipt)) {
      console.log(`Dropped ${id}: spam or virus verdict FAIL`);
      continue;
    }
    const object = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: OBJECT_PREFIX + id }));
    const raw = Buffer.from(await object.Body.transformToByteArray());
    if (isLoop(raw, FORWARDER_ADDRESS)) {
      console.log(`Dropped ${id}: already forwarded, or sent as the forwarder`);
      continue;
    }
    await ses.send(
      new SendRawEmailCommand({
        Source: FORWARDER_ADDRESS,
        Destinations: [OWNER_INBOX],
        RawMessage: { Data: rewriteMessage(raw, FORWARDER_ADDRESS) }
      })
    );
    console.log(`Forwarded ${id}`);
  }
};
