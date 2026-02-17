import nodemailer, { Transporter } from 'nodemailer'
import { MailStrategy, MailOptions } from './MailStrategy'

export class GoogleMailStrategy implements MailStrategy {

  private transporter: Transporter

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT),
      secure: Number(process.env.MAIL_PORT) === 465,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100
    })

    // Verify once at boot
    this.transporter.verify().catch(err => {
      console.error('SMTP verify failed:', err)
    })
  }

  async send(options: MailOptions) {
    return this.transporter.sendMail({
      from: process.env.MAIL_FROM,
      ...options
    })
  }
}
