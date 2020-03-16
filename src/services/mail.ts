import { EmailConfig } from "./key";

export default async function resetPassword(email: string, password: string) {
  const nodemailer = require("nodemailer");

  let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: EmailConfig.user,
      pass: EmailConfig.pass
    }
  });

  let info = await transporter.sendMail({
    from: 'Coex forgot password',
    to: email,
    subject: "A new password for your account",
    text: "Your new password: " + password,
    html: "<p>Your new password: <b>" + password + "<b></p>"
  });

}
