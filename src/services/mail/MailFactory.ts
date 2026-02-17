import { MailStrategy } from './MailStrategy'
import { GoogleMailStrategy } from './GoogleMailStrategy'
import { SesMailStrategy } from './SesMailStrategy'

export class MailFactory {

  static create(): MailStrategy {

    const transport = process.env.MAIL_TRANSPORT

    switch (transport) {

      case 'google':
        return new GoogleMailStrategy()

      case 'ses':
        return new SesMailStrategy()

      default:
        throw new Error(`Unsupported MAIL_TRANSPORT: ${transport}`)
    }
  }
}
