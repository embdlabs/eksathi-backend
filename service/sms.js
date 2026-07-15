const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client =
  accountSid && authToken ? require("twilio")(accountSid, authToken) : null;

const sendTextMessage = (body) => {
  // client.messages
  //     .create({
  //         body: body,
  //         from: process.env.TWILIO_PHONE_NUMBER,
  //         to: process.env.TWILIO_TO_PHONE
  //     })
  //     .then(message => console.log(message.sid))
  //     .done();

  try {
    if (!client) {
      console.warn("Twilio credentials missing; SMS skipped");
      return;
    }
    client.sendMessage({
      body: body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: process.env.TWILIO_TO_PHONE,
    });
  } catch (err) {
    console.error(err);
  }
};

module.exports = {
  sendTextMessage,
  client,
};
