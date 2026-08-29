import config from "../config/env.js";

/**
 * Low-level helper to dispatch transactional emails via Brevo API v3
 */
export const sendBrevoEmail = async ({ toEmail, toName, subject, htmlContent }) => {
    const apiKey = config.brevoApiKey;
    if (!apiKey) {
        console.warn("[BREVO EMAIL] Skipping email send: BREVO_API_KEY is not configured in .env");
        return { success: false, reason: "BREVO_API_KEY missing" };
    }

    try {
        const response = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
                "accept": "application/json",
                "api-key": apiKey,
                "content-type": "application/json",
            },
            body: JSON.stringify({
                sender: {
                    name: config.brevoSenderName || "YouTube Clone Security",
                    email: config.brevoSenderEmail || "trackit769@gmail.com",
                },
                to: [
                    {
                        email: toEmail,
                        name: toName || toEmail.split("@")[0] || "User",
                    },
                ],
                subject,
                htmlContent,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.warn(`[BREVO EMAIL] Failed to send email to ${toEmail}. Status: ${response.status}`, errorText);
            return { success: false, status: response.status, error: errorText };
        }

        const data = await response.json().catch(() => ({}));
        console.log(`[BREVO EMAIL] Email sent successfully to ${toEmail} (MessageId: ${data?.messageId || "ok"})`);
        return { success: true, messageId: data?.messageId };
    } catch (error) {
        console.warn(`[BREVO EMAIL] Exception sending email to ${toEmail}:`, error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Send Security Verification OTP Email for unfamiliar device/location logins
 */
export const sendSecurityOtpEmail = async ({ toEmail, userName, otpCode, reason, deviceInfo = {} }) => {
    const subject = `Security Verification Code: ${otpCode} - YouTube Clone`;
    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 12px; background-color: #ffffff;">
            <div style="background-color: #0f172a; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Security Verification Code</h1>
            </div>
            <div style="padding: 24px; color: #334155;">
                <p>Hello <strong>${userName || "User"}</strong>,</p>
                <p>An unfamiliar login attempt was detected on your YouTube Clone account. To complete device verification, please use the 6-digit security code below:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #4f46e5; background-color: #f1f5f9; padding: 12px 24px; border-radius: 8px; border: 1px dashed #6366f1; display: inline-block;">
                        ${otpCode}
                    </span>
                </div>

                <p style="font-size: 13px; color: #64748b;">This verification code is valid for <strong>10 minutes</strong>. Do not share this code with anyone.</p>
                
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                
                <div style="background-color: #f8fafc; padding: 16px; border-radius: 6px; font-size: 12px; color: #475569;">
                    <p style="margin: 0 0 8px 0; font-weight: bold; color: #1e293b;">Login Attempt Details:</p>
                    <ul style="margin: 0; padding-left: 18px; line-height: 1.6;">
                        <li><strong>Trigger Reason:</strong> ${reason || "Unrecognized login environment"}</li>
                        <li><strong>Browser & OS:</strong> ${deviceInfo.browser || "Unknown Browser"} on ${deviceInfo.os || "Unknown OS"}</li>
                        <li><strong>IP Address:</strong> ${deviceInfo.ip || "Unknown IP"}</li>
                        <li><strong>Location:</strong> ${deviceInfo.location || "Unknown Location"}</li>
                    </ul>
                </div>
            </div>
            <div style="text-align: center; padding: 16px; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9;">
                <p style="margin: 0;">YouTube Clone Security Notification System</p>
            </div>
        </div>
    `;

    return sendBrevoEmail({
        toEmail,
        toName: userName,
        subject,
        htmlContent,
    });
};

/**
 * Send Subscription Purchase Invoice Email after successful transaction
 */
export const sendSubscriptionInvoiceEmail = async ({
    toEmail,
    customerName,
    invoiceNumber,
    plan,
    billingcycle,
    amount,
    currency = "INR",
    paymentId,
    date,
}) => {
    const formattedAmount = `₹${amount.toLocaleString()}`;
    const formattedDate = date ? new Date(date).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" }) : new Date().toLocaleDateString();

    const subject = `Subscription Purchase Invoice ${invoiceNumber} - ${plan} Plan`;
    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <div style="background: linear-gradient(135deg, #312e81 0%, #4338ca 100%); padding: 24px; text-align: center; border-radius: 8px 8px 0 0; color: #ffffff;">
                <h1 style="margin: 0; font-size: 24px;">Subscription Active!</h1>
                <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">Thank you for your purchase</p>
            </div>
            <div style="padding: 24px; color: #334155;">
                <p>Hi <strong>${customerName || "Subscriber"}</strong>,</p>
                <p>Your payment for the <strong>${plan} Plan</strong> (${billingcycle}) has been processed successfully. Below is your official tax invoice receipt:</p>

                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                        <tr>
                            <td style="padding: 6px 0; color: #64748b;">Invoice Number:</td>
                            <td style="padding: 6px 0; text-align: right; font-weight: bold; font-family: monospace;">${invoiceNumber}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; color: #64748b;">Payment ID:</td>
                            <td style="padding: 6px 0; text-align: right; font-weight: bold; font-family: monospace;">${paymentId || "N/A"}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; color: #64748b;">Date:</td>
                            <td style="padding: 6px 0; text-align: right;">${formattedDate}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; color: #64748b;">Plan Upgraded:</td>
                            <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #4338ca;">${plan} Plan</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; color: #64748b;">Billing Cycle:</td>
                            <td style="padding: 6px 0; text-align: right; text-transform: capitalize;">${billingcycle}</td>
                        </tr>
                        <tr style="border-top: 1px solid #cbd5e1;">
                            <td style="padding: 12px 0 6px 0; font-weight: bold; font-size: 15px;">Total Amount Paid:</td>
                            <td style="padding: 12px 0 6px 0; text-align: right; font-weight: bold; font-size: 16px; color: #059669;">${formattedAmount} ${currency}</td>
                        </tr>
                    </table>
                </div>

                <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; padding: 14px; font-size: 13px; color: #065f46;">
                    <strong>Status: PAID & VERIFIED</strong><br />
                    Your account now has full access to ${plan} Plan perks including higher download limits, ad-free streaming, and HD quality playback.
                </div>
            </div>
            <div style="text-align: center; padding: 16px; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9;">
                <p style="margin: 0;">YouTube Clone Billing Department • Automatic Receipt</p>
            </div>
        </div>
    `;

    return sendBrevoEmail({
        toEmail,
        toName: customerName,
        subject,
        htmlContent,
    });
};
