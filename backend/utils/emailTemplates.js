const escapeHtml = (value = "") =>
  String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });

const layout = ({ title, preheader, content }) => {
  const bannerUrl = process.env.EMAIL_BANNER_URL || "";

  const banner = bannerUrl
    ? `
      <tr>
        <td
          align="center"
          style="padding:0;background:#ffffff;font-size:0;line-height:0;"
        >
          <img
            src="${escapeHtml(bannerUrl)}"
            alt="Kaduna Explorer, Croc City"
            width="600"
            style="display:block;width:100%;max-width:600px;height:auto;margin:0 auto;border:0;"
          >
        </td>
      </tr>
    `
    : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
</head>

<body style="margin:0;padding:0;background:#f0f4f0;font-family:Arial,Helvetica,sans-serif;color:#26352c;">

  <div style="display:none;font-size:1px;color:#f0f4f0;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    ${escapeHtml(preheader)}
  </div>

  <table
    role="presentation"
    width="100%"
    cellspacing="0"
    cellpadding="0"
    border="0"
    style="background:#f0f4f0;padding:20px 10px;"
  >
    <tr>
      <td align="center">

        <table
          role="presentation"
          width="600"
          cellspacing="0"
          cellpadding="0"
          border="0"
          style="width:100%;max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;"
        >

          ${banner}

          <tr>
            <td style="padding:24px 22px;">

              ${content}

            </td>
          </tr>

          <tr>
            <td
              align="center"
              style="padding:20px 16px;background:#f5f8f5;border-top:1px solid #e4ebe5;"
            >
              <p style="margin:0 0 7px;font-size:12px;font-weight:bold;color:#17643f;">
                KADUNA EXPLORER
                <span style="color:#ED8B2C;"> | CROC CITY</span>
              </p>

              <p style="margin:0;font-size:11px;line-height:1.8;color:#68756b;">
                Discover · Explore · Experience
                <br>
                You're receiving this email because of activity on your Kaduna Explorer account.
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
};

const button = (url, label) => `
  <table
    role="presentation"
    cellspacing="0"
    cellpadding="0"
    border="0"
    align="center"
    style="margin:22px auto 18px;"
  >
    <tr>
      <td align="center" bgcolor="#ED8B2C" style="border-radius:8px;">
        <a
          href="${escapeHtml(url)}"
          style="display:inline-block;padding:13px 24px;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px;"
        >
          ${escapeHtml(label)} &rarr;
        </a>
      </td>
    </tr>
  </table>
`;

const welcomeEmail = (name, exploreUrl) => ({
  subject: "🎉 Congratulations! Welcome to Kaduna Explorer",
  html: layout({
    title: "Welcome to Kaduna Explorer",
    preheader: "Congratulations! Your next adventure starts here.",
    content: `
      <div style="text-align:center;">

        <h1 style="margin:0 0 16px;font-size:19px;line-height:1.4;color:#174A35;font-weight:700;">
          Congratulations!
          <span style="font-size:14px;vertical-align:middle;white-space:nowrap;">
            🎉 🎈 🎊
          </span>
        </h1>

        <h2 style="margin:0 0 18px;font-size:17px;line-height:1.5;color:#17643f;">
          Welcome to Kaduna Explorer,
          <span style="color:#ED8B2C;">${escapeHtml(name)}!</span>
        </h2>

        <p style="margin:0;font-size:14px;line-height:1.8;color:#526056;">
          We're excited to have you on board! Get ready to discover beautiful
          destinations, hidden gems, great places to eat, and memorable
          experiences across Kaduna State.
        </p>

        <div style="margin:20px 0;padding:15px 12px;background:#f1f7f2;border-radius:10px;">
          <p style="margin:0;font-size:13px;line-height:2;color:#174a35;">
            📍 Discover beautiful destinations<br>
            🍽️ Find great places to eat<br>
            🧭 Plan memorable experiences
          </p>
        </div>

        ${button(exploreUrl, "Start Exploring")}

        <p style="margin:0;font-size:13px;line-height:1.8;color:#68756b;">
          Thank you for joining us. We look forward to helping you discover
          the beauty and experiences Kaduna has to offer.
        </p>

      </div>
    `,
  }),
});

const passwordResetEmail = (name, resetUrl) => ({
  subject: "🔐 Reset Your Kaduna Explorer Password",
  html: layout({
    title: "Reset Your Password",
    preheader: "Use the secure link to reset your password.",
    content: `
      <div style="text-align:center;">

        <p style="margin:0 0 9px;font-size:25px;line-height:1.4;">
          🔐
        </p>

        <h1 style="margin:0 0 15px;font-size:23px;line-height:1.4;color:#174A35;">
          Reset Your Password
        </h1>

        <p style="margin:0;font-size:14px;line-height:1.8;color:#526056;">
          Hello ${escapeHtml(name)}, we received a request to reset your
          Kaduna Explorer account password.
        </p>

        ${button(resetUrl, "Reset My Password")}

        <div style="margin:18px 0;padding:14px;background:#fff5e8;border-radius:8px;">
          <p style="margin:0;font-size:12px;line-height:1.8;color:#80521b;">
            ⏳ Your reset link expires in 10 minutes.
          </p>
        </div>

        <p style="margin:0;font-size:12px;line-height:1.8;color:#68756b;">
          If you didn't request this, you can safely ignore this email.
          Your password won't change.
        </p>

      </div>
    `,
  }),
});

const passwordChangedEmail = (name, exploreUrl) => ({
  subject: "✅ Your Kaduna Explorer Password Has Been Updated",
  html: layout({
    title: "Password Updated",
    preheader: "Your account password has been changed successfully.",
    content: `
      <div style="text-align:center;">

        <p style="margin:0 0 9px;font-size:25px;line-height:1.4;">
          ✅
        </p>

        <h1 style="margin:0 0 15px;font-size:23px;line-height:1.4;color:#174A35;">
          Password Updated!
        </h1>

        <p style="margin:0;font-size:14px;line-height:1.8;color:#526056;">
          Hello ${escapeHtml(name)}, your Kaduna Explorer account password
          has been changed successfully.
        </p>

        <div style="margin:20px 0;padding:15px;background:#f1f7f2;border-radius:10px;">
          <p style="margin:0;font-size:13px;line-height:1.8;color:#174a35;">
            🛡️ Your account security matters to us.
          </p>
        </div>

        ${button(exploreUrl, "Return to Kaduna Explorer")}

        <p style="margin:0;font-size:12px;line-height:1.8;color:#68756b;">
          If you didn't make this change, contact support immediately.
        </p>

      </div>
    `,
  }),
});

module.exports = {
  welcomeEmail,
  passwordResetEmail,
  passwordChangedEmail,
};
