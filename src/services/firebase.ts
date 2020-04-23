import * as admin from "firebase-admin";

export class FireBase {
  static sendMulti(tokens: string[], notification: { title: string, body: string }) {
    if (tokens == undefined || tokens.length == 0) return;

    const message = {
      notification: notification,
      tokens: tokens,
    }

    admin.messaging().sendMulticast(message)
      .then((response) => {
        // console.log(response);
      });
  }

  static sendAll(messages: any[]) {
    messages.forEach(element => {
      if (element.tokens == undefined) return;
    });
    admin.messaging().sendAll(messages)
      .then((response) => {
        // console.log(response);
      });
  }
}
