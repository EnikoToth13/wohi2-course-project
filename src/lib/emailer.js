async function sendConfirmationEmail(userEmail, token) {
    const confirmationLink = `${process.env.APP_URL}/api/auth/confirm?token=${token}`;

    const payload = {
        from: "Quiz Game <onboarding@resend.dev>",
        to: [userEmail],
        subject: "Confirm your Quiz Game Account!",
        html: `<h1>Welcome to the Quiz Game!</h1>
               <p>Please click the link below to verify your email address:</p>
               <a href="${confirmationLink}">Confirm Email Account</a>`
    };

    try {
        const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.RESEND_API_KEY}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Failed to send email via Resend");
        }

        console.log("Resend Email API call successful:", data);
        return data;
    } catch (error) {
        console.error("RESEND API ERROR:", error.message);
        throw error;
    }
}

module.exports = { sendConfirmationEmail };