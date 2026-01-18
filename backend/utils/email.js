const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // 1) Create a transporter
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER || 'app.foodswipehelp@gmail.com',
            pass: process.env.EMAIL_PASS, // Use App Password for Gmail
        },
    });

    // 2) Define the email options
    const mailOptions = {
        from: `FoodSwipe Admin <${process.env.EMAIL_USER || 'app.foodswipehelp@gmail.com'}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html,
    };

    // 3) Actually send the email
    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
