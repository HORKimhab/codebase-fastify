import { MailFactory } from './MailFactory'
import { MailOptions } from './MailStrategy'

class MailService {

  private static instance: MailService
  private strategy = MailFactory.create()

  private constructor() {}

  static getInstance(): MailService {
    if (!MailService.instance) {
      MailService.instance = new MailService()
    }
    return MailService.instance
  }

  async send(options: MailOptions) {
    return this.strategy.send(options)
  }
}

export const mailService = MailService.getInstance()
