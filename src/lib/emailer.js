const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        password: process.env.SMTP_PASS,
    },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
});

async function sendConfirmationEmail(userEmail, token) {
    const confirmationLink = `${process.env.APP_URL}/api/auth/confirm?token=${token}`;

    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: userEmail,
        subject: "Confirm your Quiz Game Account",
        html: `
        <h1>Welcome to the Quiz Game!</h1>
        <p>Please click the link below to confirm your email address and activate your account:</p>
        <a href="${confirmationLink}" style="padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Confirm Email</a>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p>${confirmationLink}</p>
        `,
    };

    await transporter.sendMail(mailOptions);
}

module.exports = { sendConfirmationEmail };