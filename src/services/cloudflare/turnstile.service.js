const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

async function verify({ token, remoteIp }) {
  if (!token) {
    return {
      success: false,
      errorCodes: ["missing-token"],
    };
  }

  const secret = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;

  if (!secret) {
    throw new Error("CLOUDFLARE_TURNSTILE_SECRET_KEY is not configured");
  }

  const body = new URLSearchParams({
    secret,
    response: token,
  });

  if (remoteIp) {
    body.append("remoteip", remoteIp);
  }

  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    throw new Error(
      `Turnstile verification request failed: ${response.status}`,
    );
  }

  const result = await response.json();

  return {
    success: result.success === true,
    errorCodes: result["error-codes"] ?? [],
  };
}

module.exports = {
  verify,
};
