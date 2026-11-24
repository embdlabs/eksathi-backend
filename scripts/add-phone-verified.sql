-- Mobile verification flag (email OTP uses users.status = active)
ALTER TABLE users
  ADD COLUMN phone_verified TINYINT(1) NOT NULL DEFAULT 0
  AFTER is_verified;

-- Existing accounts: phone on file is NOT verified
UPDATE users SET phone_verified = 0;

SELECT COUNT(*) AS users_total,
       SUM(phone_verified = 1) AS phone_verified_yes,
       SUM(status = 'active') AS email_otp_active
FROM users;
