# Supabase Email Templates (English Only)

Copy these templates into your Supabase Dashboard:
**Settings → Auth → Email Templates**

---

## 1. Confirm Sign Up

**Subject:**
```
Confirm your email
```

**Body:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 30px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Cork City Partnership</h1>
      <p style="color: #bbf7d0; margin: 5px 0 0 0; font-size: 14px;">Community Learning</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <h2 style="color: #111827; margin: 0 0 15px 0; font-size: 20px;">Welcome!</h2>
      <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0;">
        Thank you for registering. Please confirm your email address by clicking the button below:
      </p>
      <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #16a34a; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Confirm Email
      </a>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        © 2026 Cork City Partnership. All rights reserved.<br>
        If you didn't create an account, please ignore this email.
      </p>
    </div>
  </div>
</body>
</html>
```

---

## 2. Invite User

**Subject:**
```
You've been invited
```

**Body:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 30px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Cork City Partnership</h1>
      <p style="color: #bbf7d0; margin: 5px 0 0 0; font-size: 14px;">Community Learning</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <h2 style="color: #111827; margin: 0 0 15px 0; font-size: 20px;">You've Been Invited!</h2>
      <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0;">
        You have been invited to join Cork City Partnership Community Learning. Click the button below to accept the invitation and create your account:
      </p>
      <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #16a34a; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Accept Invitation
      </a>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        © 2026 Cork City Partnership. All rights reserved.<br>
        If you weren't expecting this invitation, please ignore this email.
      </p>
    </div>
  </div>
</body>
</html>
```

---

## 3. Magic Link

**Subject:**
```
Your login link
```

**Body:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 30px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Cork City Partnership</h1>
      <p style="color: #bbf7d0; margin: 5px 0 0 0; font-size: 14px;">Community Learning</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <h2 style="color: #111827; margin: 0 0 15px 0; font-size: 20px;">Sign In to Your Account</h2>
      <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0;">
        Click the button below to sign in to your account. This link will expire in 24 hours.
      </p>
      <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #16a34a; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Sign In
      </a>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        © 2026 Cork City Partnership. All rights reserved.<br>
        If you didn't request this link, please ignore this email.
      </p>
    </div>
  </div>
</body>
</html>
```

---

## 4. Change Email Address

**Subject:**
```
Confirm your new email
```

**Body:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 30px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Cork City Partnership</h1>
      <p style="color: #bbf7d0; margin: 5px 0 0 0; font-size: 14px;">Community Learning</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <h2 style="color: #111827; margin: 0 0 15px 0; font-size: 20px;">Confirm Your New Email</h2>
      <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0;">
        You requested to change your email address. Click the button below to confirm your new email:
      </p>
      <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #16a34a; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Confirm New Email
      </a>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        © 2026 Cork City Partnership. All rights reserved.<br>
        If you didn't request this change, please contact support immediately.
      </p>
    </div>
  </div>
</body>
</html>
```

---

## 5. Reset Password

**Subject:**
```
Reset your password
```

**Body:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 30px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Cork City Partnership</h1>
      <p style="color: #bbf7d0; margin: 5px 0 0 0; font-size: 14px;">Community Learning</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <h2 style="color: #111827; margin: 0 0 15px 0; font-size: 20px;">Reset Your Password</h2>
      <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0;">
        You requested to reset your password. Click the button below to create a new password:
      </p>
      <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #16a34a; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Reset Password
      </a>
      <p style="color: #9ca3af; font-size: 13px; margin: 20px 0 0 0;">
        This link will expire in 24 hours.
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        © 2026 Cork City Partnership. All rights reserved.<br>
        If you didn't request a password reset, please ignore this email.
      </p>
    </div>
  </div>
</body>
</html>
```

---

## 6. Reauthentication

**Subject:**
```
Confirm your identity
```

**Body:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 30px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Cork City Partnership</h1>
      <p style="color: #bbf7d0; margin: 5px 0 0 0; font-size: 14px;">Community Learning</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <h2 style="color: #111827; margin: 0 0 15px 0; font-size: 20px;">Confirm Your Identity</h2>
      <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0;">
        For security purposes, please confirm your identity by clicking the button below:
      </p>
      <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #16a34a; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Confirm Identity
      </a>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        © 2026 Cork City Partnership. All rights reserved.<br>
        If you didn't request this, please contact support immediately.
      </p>
    </div>
  </div>
</body>
</html>
```

---

## How to Apply These Templates

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Email Templates**
3. For each template type:
   - Click on the template name (e.g., "Confirm signup")
   - Replace the **Subject** with the provided subject
   - Replace the **Body** with the provided HTML
   - Click **Save**

## Notes

- All templates are in English only
- The green color scheme matches your app's branding (#16a34a)
- Templates are mobile-responsive
- Links use `{{ .ConfirmationURL }}` which Supabase replaces with the actual URL
