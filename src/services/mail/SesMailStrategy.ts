import nodemailer from 'nodemailer'
import { SESClient, SESClientConfig, SendRawEmailCommand } from '@aws-sdk/client-ses'
import { MailStrategy, MailOptions } from './MailStrategy'

export class SesMailStrategy implements MailStrategy {

  private transporter

  constructor() {

    const config: SESClientConfig = {}

    if (process.env.AWS_REGION) {
      config.region = process.env.AWS_REGION
    }

    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      config.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    }

    const sesClient = new SESClient(config)

    this.transporter = nodemailer.createTransport({
      SES: { sesClient, SendRawEmailCommand }
    } as any)
  }

  async send(options: MailOptions) {
    return this.transporter.sendMail({
      from: process.env.MAIL_FROM,
      ...options
    })
  }
}
