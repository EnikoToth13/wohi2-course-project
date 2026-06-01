export async function sendConfirmationEmail(userEmail, token) {
    const confirmationLink = `${process.env.APP_URL}/api/auth/confirm?token=${token}`;

    const payload = {
        api_key: process.env.SMTP_PASS, // Put your new SMTP2GO API Key here
        to: [userEmail],
        sender: "test@smtp2go.com",     // Using the fallback sender domain
        subject: "Confirm your Quiz Game Account!",
        html_body: `<h1>Welcome to the Quiz Game!</h1>
                    <p>Please click the link below to verify your email address:</p>
                    <a href="${confirmationLink}">Confirm Email Account</a>`
    };

    try {
        const response = await fetch("https://api.smtp2go.com/v3/email/send", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.data?.error || "Failed to send email via API");
        }

        console.log("Email API call successful:", data);
        return data;
    } catch (error) {
        console.error("SMTP2GO API ERROR:", error.message);
        throw error;
    }
}