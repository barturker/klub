# Test Cases: Authentication System (Story 002)

## TC-002-01: User Signup Flow

**Priority:** P0-Critical
**Type:** Functional Test

### Preconditions

- Auth page implemented
- Supabase configured
- Email service ready

### Test Steps

1. Navigate to `/auth`
2. Click "Sign Up" tab
3. Enter email: `test@example.com`
4. Enter password: `Test123!@#`
5. Click "Sign Up" button
6. Check email for verification (if enabled)
7. Verify redirect to dashboard

### Expected Results

- ✅ User account created in Supabase
- ✅ Profile automatically generated
- ✅ Session cookie set
- ✅ Redirected to `/dashboard`
- ✅ User ID available in session

### Actual Results

_To be filled during execution_

### Status: `Not Executed`

---

## TC-002-02: User Login Flow

**Priority:** P0-Critical
**Type:** Functional Test

### Preconditions

- User account exists
- Auth page accessible

### Test Steps

1. Navigate to `/auth`
2. Enter email: `test@example.com`
3. Enter password: `Test123!@#`
4. Click "Sign In" button
5. Verify redirect

### Expected Results

- ✅ Authentication successful
- ✅ Session established
- ✅ Redirected to dashboard or return URL
- ✅ User menu shows logged-in state
- ✅ No error messages

### Actual Results

_To be filled during execution_

### Status: `Not Executed`

---

## TC-002-03: Protected Route Access

**Priority:** P0-Critical
**Type:** Security Test

### Preconditions

- Protected routes configured
- Middleware active

### Test Steps

1. Log out if logged in
2. Try to access `/dashboard` directly
3. Verify redirect to `/auth`
4. Log in successfully
5. Verify automatic redirect back to `/dashboard`

### Expected Results

- ✅ Unauthenticated users redirected to auth
- ✅ Return URL preserved in redirect
- ✅ After login, returned to original destination
- ✅ No access to protected content when logged out

### Actual Results

_To be filled during execution_

### Status: `Not Executed`

---

## TC-002-04: Session Persistence

**Priority:** P1-High
**Type:** Functional Test

### Preconditions

- User logged in
- Session active

### Test Steps

1. Log in successfully
2. Note session cookie
3. Close browser tab (not logout)
4. Reopen application URL
5. Check authentication state

### Expected Results

- ✅ Session maintained after tab close
- ✅ No re-authentication required
- ✅ User data still accessible
- ✅ Session expires after configured time

### Actual Results

_To be filled during execution_

### Status: `Not Executed`

---

## TC-002-05: Logout Functionality

**Priority:** P1-High
**Type:** Functional Test

### Preconditions

- User logged in
- User menu accessible

### Test Steps

1. Click user avatar/menu
2. Click "Logout" option
3. Confirm logout (if confirmation exists)
4. Verify redirect
5. Try to access protected route

### Expected Results

- ✅ Session cleared
- ✅ Cookies removed
- ✅ Redirected to home page
- ✅ Cannot access protected routes
- ✅ User menu shows logged-out state

### Actual Results

_To be filled during execution_

### Status: `Not Executed`

---

## TC-002-06: Password Reset Flow

**Priority:** P2-Medium
**Type:** Functional Test

### Preconditions

- User account exists
- Email service configured

### Test Steps

1. Navigate to `/auth`
2. Click "Forgot Password"
3. Enter registered email
4. Click "Send Reset Link"
5. Check email for magic link
6. Click link and set new password

### Expected Results

- ✅ Reset email sent
- ✅ Magic link valid
- ✅ Password updated successfully
- ✅ Can login with new password
- ✅ Old password no longer works

### Actual Results

_To be filled during execution_

### Status: `Not Executed`

---

## TC-002-07: OAuth Login (Google)

**Priority:** P3-Low
**Type:** Integration Test

### Preconditions

- Google OAuth configured
- OAuth consent screen setup

### Test Steps

1. Navigate to `/auth`
2. Click "Continue with Google"
3. Select Google account
4. Authorize application
5. Verify redirect and profile creation

### Expected Results

- ✅ Google auth popup appears
- ✅ Authorization successful
- ✅ Profile created with Google data
- ✅ Session established
- ✅ Redirected to dashboard

### Actual Results

_To be filled during execution_

### Status: `Not Executed`

---

## TC-002-08: Auth Error Handling

**Priority:** P1-High
**Type:** Error Test

### Preconditions

- Auth system active

### Test Steps

1. Try login with wrong password
2. Try signup with existing email
3. Try login with non-existent email
4. Try signup with invalid email format
5. Try weak password

### Expected Results

- ✅ Clear error messages displayed
- ✅ No sensitive info in errors
- ✅ Form remains filled (except password)
- ✅ No console errors
- ✅ Can retry after error

### Actual Results

_To be filled during execution_

### Status: `Not Executed`
