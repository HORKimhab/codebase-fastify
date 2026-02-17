export interface MailOptions {
    to: string
    subject: string
    text?: string
    html?: string
  }
  
  export interface MailStrategy {
    send(options: MailOptions): Promise<any>
  }
  