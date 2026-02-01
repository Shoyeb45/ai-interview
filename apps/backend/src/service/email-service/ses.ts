// import { SESClient, SendEmailCommand, SendEmailCommandInput } from "@aws-sdk/client-ses";

// import crypto from "crypto";

// class SESMailClient {
//     private static instance: SESMailClient;
//     private sesClient: SESClient | undefined;

//     private constructor() {
//         this.initialiseSes()
//     }

//     private initialiseSes() {
//         try {
//             this.sesClient = new SESClient({
//                 region: config.awsRegion,
//                 credentials: {
//                     accessKeyId: config.awsAccessKeyId!,
//                     secretAccessKey: config.awsSecretAccessKey!
//                 }
//             });
//         } catch (error) {
//             const message = error instanceof Error ? error.message : "Some unknown error.";
//             logger.error("Failed to intialise SES Mail Client, ", { error: message });
//         }
//     }

//     public static getInstance() {
//         if (!this.instance) {
//             this.instance = new SESMailClient();
//         }
//         return this.instance;
//     }

//     async sendEmail(params: SendEmailCommandInput, email: string) {
//         if (!this.sesClient) {
//             logger.error("SES is not initialised, retrying..");
//             this.initialiseSes();

//             if (!this.sesClient) {
//                 logger.error("SNS initialisation failed, check for the errors.");
//                 return;
//             }
//         }

//         try {
//             const command = new SendEmailCommand(params);
//             await this.sesClient.send(command);
//             console.log(`Verification email sent to ${email}`);
//         } catch (error) {
//             console.error('Error sending email:', error);
//             throw new Error('Failed to send verification email');
//         }
//     }

//     generateVerificationToken(): string {
//         return crypto.randomBytes(32).toString('hex');
//     }
// }


// export const mailClient = SESMailClient.getInstance();