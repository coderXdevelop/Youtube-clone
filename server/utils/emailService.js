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
            console.warn(`[BREVO EMAIL] Failed to send email to ${toEmail}. Status: ${response.status}. Body: ${errorText}`);
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
    const subject = `Security Verification Code: ${otpCode} — YouTube Clone`;
    const htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <div style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); padding: 24px; text-align: center; border-radius: 12px 12px 0 0; color: #ffffff;">
                <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.1); padding: 4px 12px; border-radius: 9999px; margin-bottom: 8px;">
                    <span style="color: #ef4444; font-size: 14px; font-weight: 900; margin-right: 4px;">▶</span>
                    <span style="color: #ffffff; font-size: 12px; font-weight: 700; letter-spacing: 0.5px;">YOUTUBE CLONE SECURITY</span>
                </div>
                <h1 style="color: #ffffff; margin: 4px 0 0 0; font-size: 20px; font-weight: 800;">Device Verification Code</h1>
            </div>
            <div style="padding: 24px; color: #334155;">
                <p style="margin: 0 0 12px 0; font-size: 15px;">Hello <strong style="color: #0f172a;">${userName || "User"}</strong>,</p>
                <p style="margin: 0 0 20px 0; font-size: 14px; color: #64748b; line-height: 1.5;">An unfamiliar login attempt was detected on your account. Please use the 6-digit verification code below to authorize this device:</p>
                
                <div style="text-align: center; margin: 28px 0;">
                    <span style="font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #4338ca; background-color: #f1f5f9; padding: 14px 28px; border-radius: 12px; border: 2px dashed #818cf8; display: inline-block; font-family: monospace;">
                        ${otpCode}
                    </span>
                </div>

                <p style="font-size: 12px; color: #64748b; text-align: center; margin-bottom: 24px;">This security code is valid for <strong>10 minutes</strong>. Never share this code with anyone.</p>
                
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px 20px; border-radius: 12px; font-size: 12px; color: #475569;">
                    <p style="margin: 0 0 10px 0; font-weight: 800; color: #1e293b; font-size: 13px;">Login Attempt Details:</p>
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 12px; line-height: 1.8;">
                        <tr>
                            <td style="color: #64748b; width: 120px;">Trigger Reason:</td>
                            <td style="font-weight: 600; color: #0f172a;">${reason || "Unrecognized login environment"}</td>
                        </tr>
                        <tr>
                            <td style="color: #64748b;">Device / OS:</td>
                            <td style="font-weight: 600; color: #0f172a;">${deviceInfo.browser || "Browser"} on ${deviceInfo.os || "Device"}</td>
                        </tr>
                        <tr>
                            <td style="color: #64748b;">IP Address:</td>
                            <td style="font-family: monospace; color: #0f172a;">${deviceInfo.ip || "Unknown IP"}</td>
                        </tr>
                        <tr>
                            <td style="color: #64748b;">Location:</td>
                            <td style="color: #0f172a;">${deviceInfo.location || "Unknown Location"}</td>
                        </tr>
                    </table>
                </div>
            </div>
            <div style="text-align: center; padding: 16px; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9;">
                <p style="margin: 0;">YouTube Clone Security Notification System • Automated Alert</p>
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
    plan = "Gold",
    billingcycle = "monthly",
    amount,
    currency = "INR",
    paymentId,
    date,
    validUntil,
}) => {
    const amountNum = Number(amount) || 0;
    const formattedAmount = `${amountNum.toLocaleString("en-IN")}`;
    const formattedDate = date
        ? new Date(date).toLocaleDateString("en-IN", {
              year: "numeric",
              month: "long",
              day: "numeric",
          })
        : new Date().toLocaleDateString("en-IN", {
              year: "numeric",
              month: "long",
              day: "numeric",
          });
    const formattedValidUntil = validUntil
        ? new Date(validUntil).toLocaleDateString("en-IN", {
              year: "numeric",
              month: "long",
              day: "numeric",
          })
        : "";

    // Subtotal & GST breakdown (18% GST standard)
    const baseSubtotal = Math.round(amountNum / 1.18);
    const gstAmount = amountNum - baseSubtotal;
    const formattedSubtotal = baseSubtotal.toLocaleString("en-IN");
    const formattedGst = gstAmount.toLocaleString("en-IN");

    // Plan-specific color themes
    const planUpper = String(plan).toUpperCase();
    let planGradient = "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)";
    let planBadgeBg = "#e0e7ff";
    let planBadgeColor = "#3730a3";
    let planAccent = "#4f46e5";

    if (planUpper.includes("GOLD")) {
        planGradient = "linear-gradient(135deg, #451a03 0%, #78350f 50%, #b45309 100%)";
        planBadgeBg = "#fef3c7";
        planBadgeColor = "#92400e";
        planAccent = "#d97706";
    } else if (planUpper.includes("SILVER")) {
        planGradient = "linear-gradient(135deg, #0f172a 0%, #334155 50%, #475569 100%)";
        planBadgeBg = "#f1f5f9";
        planBadgeColor = "#1e293b";
        planAccent = "#64748b";
    } else if (planUpper.includes("BRONZE")) {
        planGradient = "linear-gradient(135deg, #2e1065 0%, #581c87 50%, #7e22ce 100%)";
        planBadgeBg = "#fae8ff";
        planBadgeColor = "#6b21a8";
        planAccent = "#9333ea";
    }

    const appUrl = config.frontendUrl || "http://localhost:3000";
    const subject = `Tax Invoice #${invoiceNumber} — YouTube Clone ${plan} Membership`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Subscription Tax Invoice</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 10px;">
        <tr>
            <td align="center">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 620px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04); border: 1px solid #e2e8f0;">
                    
                    <!-- Header with YouTube Clone Brand -->
                    <tr>
                        <td style="background: ${planGradient}; padding: 32px 30px; text-align: center; color: #ffffff;">
                            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" style="padding-bottom: 12px;">
                                        <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.15); backdrop-filter: blur(8px); padding: 8px 18px; border-radius: 9999px; border: 1px solid rgba(255, 255, 255, 0.25);">
                                            <span style="color: #ef4444; font-size: 16px; font-weight: 900; margin-right: 4px;">▶</span>
                                            <span style="color: #ffffff; font-size: 13px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;">YouTube Clone Premium</span>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center">
                                        <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">Payment Confirmed</h1>
                                        <p style="margin: 6px 0 0 0; font-size: 14px; color: rgba(255, 255, 255, 0.85);">Official Tax Invoice &amp; Subscription Receipt</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Main Content Body -->
                    <tr>
                        <td style="padding: 30px;">

                            <!-- Customer Greeting -->
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                                <tr>
                                    <td>
                                        <p style="margin: 0; font-size: 15px; color: #475569;">Hello <strong style="color: #0f172a;">${customerName || "Valued Subscriber"}</strong>,</p>
                                        <p style="margin: 6px 0 0 0; font-size: 14px; line-height: 1.5; color: #64748b;">
                                            Thank you for subscribing! Your transaction has been verified and your <strong>${plan} Plan</strong> is now active.
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Plan Highlight & Status Box -->
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; margin-bottom: 24px; overflow: hidden;">
                                <tr>
                                    <td style="padding: 20px 24px;">
                                        <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td valign="middle">
                                                    <span style="background-color: ${planBadgeBg}; color: ${planBadgeColor}; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 4px 10px; border-radius: 6px; display: inline-block;">
                                                        ${planUpper} PLAN
                                                    </span>
                                                    <h3 style="margin: 8px 0 0 0; font-size: 18px; font-weight: 800; color: #0f172a;">
                                                        ${plan} Membership
                                                    </h3>
                                                    <span style="font-size: 12px; color: #64748b; text-transform: capitalize;">
                                                        Billing Cycle: <strong>${billingcycle}</strong>
                                                    </span>
                                                </td>
                                                <td align="right" valign="middle">
                                                    <span style="font-size: 11px; color: #64748b; display: block; margin-bottom: 2px;">Amount Paid</span>
                                                    <span style="font-size: 24px; font-weight: 900; color: #059669; letter-spacing: -0.5px;">
                                                        ₹${formattedAmount}
                                                    </span>
                                                    <span style="font-size: 10px; font-weight: 700; color: #059669; background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 2px 8px; border-radius: 9999px; display: inline-block; margin-top: 4px;">
                                                        ✓ PAID &amp; VERIFIED
                                                    </span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Invoice Metadata 2-Column Grid -->
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 24px; background-color: #ffffff;">
                                <tr>
                                    <td width="50%" valign="top" style="padding-right: 12px; border-right: 1px solid #f1f5f9;">
                                        <p style="margin: 0 0 4px 0; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8;">Billed To</p>
                                        <p style="margin: 0; font-size: 13px; font-weight: 700; color: #0f172a;">${customerName || "Subscriber"}</p>
                                        <p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">${toEmail}</p>
                                        <p style="margin: 2px 0 0 0; font-size: 11px; color: #94a3b8;">India</p>
                                    </td>
                                    <td width="50%" valign="top" style="padding-left: 16px;">
                                        <p style="margin: 0 0 4px 0; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8;">Invoice Info</p>
                                        <p style="margin: 0; font-size: 12px; color: #475569;">Invoice #: <strong style="font-family: monospace; color: #0f172a;">${invoiceNumber}</strong></p>
                                        <p style="margin: 2px 0 0 0; font-size: 12px; color: #475569;">Date: <strong>${formattedDate}</strong></p>
                                        ${
                                            formattedValidUntil
                                                ? `<p style="margin: 2px 0 0 0; font-size: 12px; color: #059669;">Valid Until: <strong>${formattedValidUntil}</strong></p>`
                                                : ""
                                        }
                                        <p style="margin: 2px 0 0 0; font-size: 11px; color: #94a3b8;">Payment ID: <span style="font-family: monospace;">${paymentId || "N/A"}</span></p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Itemized Tax Breakdown Table -->
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                                <tr style="background-color: #f8fafc;">
                                    <th align="left" style="padding: 10px 14px; font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0;">Description</th>
                                    <th align="center" style="padding: 10px 14px; font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0;">Validity</th>
                                    <th align="right" style="padding: 10px 14px; font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0;">Amount</th>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 14px; font-size: 13px; color: #1e293b; border-bottom: 1px solid #f1f5f9;">
                                        <strong>${plan} Plan Membership</strong><br />
                                        <span style="font-size: 11px; color: #64748b;">Ad-free streaming, priority downloads &amp; HD playback</span>
                                    </td>
                                    <td align="center" style="padding: 12px 14px; font-size: 12px; color: #475569; text-transform: capitalize; border-bottom: 1px solid #f1f5f9;">
                                        ${billingcycle}
                                    </td>
                                    <td align="right" style="padding: 12px 14px; font-size: 13px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #f1f5f9;">
                                        ₹${formattedSubtotal}
                                    </td>
                                </tr>
                                <tr>
                                    <td colspan="2" style="padding: 8px 14px; font-size: 12px; color: #64748b; text-align: right;">Base Subtotal:</td>
                                    <td align="right" style="padding: 8px 14px; font-size: 12px; color: #334155; font-weight: 600;">₹${formattedSubtotal}</td>
                                </tr>
                                <tr>
                                    <td colspan="2" style="padding: 6px 14px; font-size: 12px; color: #64748b; text-align: right;">Integrated GST (18%):</td>
                                    <td align="right" style="padding: 6px 14px; font-size: 12px; color: #334155; font-weight: 600;">₹${formattedGst}</td>
                                </tr>
                                <tr style="background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
                                    <td colspan="2" style="padding: 12px 14px; font-size: 14px; font-weight: 800; color: #0f172a; text-align: right;">Total Amount Paid:</td>
                                    <td align="right" style="padding: 12px 14px; font-size: 16px; font-weight: 900; color: #059669;">₹${formattedAmount} ${currency}</td>
                                </tr>
                            </table>

                            <!-- Premium Benefits Unlocked Card -->
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
                                <tr>
                                    <td>
                                        <h4 style="margin: 0 0 10px 0; font-size: 13px; font-weight: 800; color: #166534; text-transform: uppercase; letter-spacing: 0.5px;">
                                            ⚡ Your Premium Perks Are Now Active
                                        </h4>
                                        <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td width="50%" style="font-size: 12px; color: #15803d; padding: 3px 0;">✓ <strong>Ad-Free</strong> video streaming</td>
                                                <td width="50%" style="font-size: 12px; color: #15803d; padding: 3px 0;">✓ <strong>Unlimited</strong> offline downloads</td>
                                            </tr>
                                            <tr>
                                                <td width="50%" style="font-size: 12px; color: #15803d; padding: 3px 0;">✓ <strong>4K UHD</strong> high quality playback</td>
                                                <td width="50%" style="font-size: 12px; color: #15803d; padding: 3px 0;">✓ <strong>Priority</strong> content &amp; courses</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- CTA Button to Dashboard -->
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0 16px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="${appUrl}" target="_blank" style="background: ${planGradient}; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-size: 14px; font-weight: 800; display: inline-block; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);">
                                            🚀 Open YouTube Clone &amp; Start Watching
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Support Note -->
                            <p style="margin: 24px 0 0 0; font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.5;">
                                Need help or have questions regarding this invoice? Contact support anytime.<br />
                                This is an official computer-generated receipt for your electronic records.
                            </p>

                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 30px; text-align: center;">
                            <p style="margin: 0; font-size: 11px; font-weight: 600; color: #64748b;">
                                YouTube Clone Inc. • Digital Entertainment &amp; Video Platform
                            </p>
                            <p style="margin: 4px 0 0 0; font-size: 10px; color: #94a3b8;">
                                Secured by Razorpay Payment Gateway • Automated Billing System
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;

    return sendBrevoEmail({
        toEmail,
        toName: customerName,
        subject,
        htmlContent,
    });
};
