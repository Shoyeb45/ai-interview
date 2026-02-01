# Hiring Manager Profile API - Implementation Summary

## Overview
This implementation provides a complete API for managing hiring manager profiles, including backend routes, database operations, and frontend integration.

## Backend Implementation

### 1. Database Repository
**File:** `apps/backend/src/database/repositories/hiring-manager.repo.ts`

Functions:
- `getProfileByUserId(userId)` - Get profile by user ID
- `createProfile(data)` - Create a new profile
- `updateProfile(userId, data)` - Update existing profile
- `profileExists(userId)` - Check if profile exists
- `getOrCreateProfile(userId)` - Get or create with defaults

### 2. API Routes
**Base Path:** `/hiring-manager`
**Authentication:** Required (HIRING_MANAGER role)

#### Endpoints:

##### GET `/hiring-manager/profile`
Get the authenticated user's profile.

**Response:**
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "id": 1,
    "hiringManagerId": 2,
    "companyName": "TechCorp",
    "companySize": "MEDIUM",
    "industry": "FinTech",
    "department": "Engineering",
    "teamName": "Platform",
    "linkedinUrl": "https://linkedin.com/in/john",
    "website": "https://techcorp.com",
    "maxActiveInterviews": 10,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-15T10:00:00Z"
  }
}
```

##### POST `/hiring-manager/profile`
Create a new hiring manager profile.

**Request Body:**
```json
{
  "companyName": "TechCorp",
  "companySize": "MEDIUM",
  "industry": "FinTech",
  "department": "Engineering",
  "teamName": "Platform",
  "linkedinUrl": "https://linkedin.com/in/john",
  "website": "https://techcorp.com",
  "maxActiveInterviews": 10
}
```

**Validation:**
- `companyName`: required, 1-255 chars
- `companySize`: required, enum (STARTUP, SMALL, MEDIUM, LARGE, ENTERPRISE)
- `industry`: required, 1-255 chars
- `department`: required, 1-255 chars
- `teamName`: optional, max 255 chars, nullable
- `linkedinUrl`: optional, valid URL, nullable
- `website`: optional, valid URL, nullable
- `maxActiveInterviews`: optional, integer 1-1000, default 10

##### PATCH `/hiring-manager/profile`
Update the authenticated user's profile.

**Request Body:** (all fields optional)
```json
{
  "companyName": "NewCorp",
  "companySize": "LARGE",
  "industry": "Healthcare",
  "maxActiveInterviews": 15
}
```

### 3. Validation Schema
**File:** `apps/backend/src/routes/hiring-manager/schema.ts`

Uses Zod for runtime validation with proper type inference.

## Frontend Implementation

### 1. API Client
**File:** `apps/web/lib/hiringManagerApi.ts`

Functions:
- `getHiringManagerProfile()` - Fetch profile
- `createHiringManagerProfile(data)` - Create profile
- `updateHiringManagerProfile(data)` - Update profile

All functions use the `apiClient` which handles:
- Authentication (Bearer token)
- Token refresh on 401
- Error handling
- Type safety

### 2. Profile Page
**File:** `apps/web/app/dashboard/hiring-manager/profile/page.tsx`

Features:
- View mode with formatted display
- Edit mode with form validation
- Real-time error handling
- Toast notifications for success/error
- Loading states
- Graceful handling of missing profiles

### Usage Example:

```typescript
import { getHiringManagerProfile, updateHiringManagerProfile } from '@/lib/hiringManagerApi';

// Get profile
const profile = await getHiringManagerProfile();

// Update profile
const updated = await updateHiringManagerProfile({
  companyName: 'NewCorp',
  industry: 'Healthcare',
  maxActiveInterviews: 15
});
```

## Database Schema
The profile is stored in the `HiringManagerInformation` table with a one-to-one relationship to the `User` table.

## Error Handling

### Backend Errors:
- `404 Not Found` - Profile doesn't exist
- `400 Bad Request` - Validation errors or profile already exists (on create)
- `401 Unauthorized` - Not authenticated or not a hiring manager

### Frontend Handling:
- Displays user-friendly error messages
- Logs detailed errors to console
- Graceful fallbacks for missing data

## Security
- All routes protected by authentication middleware
- Role-based access (HIRING_MANAGER only)
- User can only access/modify their own profile
- URL validation for linkedinUrl and website fields
- Input sanitization via Zod schemas

## Testing Recommendations

1. **Backend Tests:**
   - Test profile creation
   - Test profile updates
   - Test duplicate profile creation (should fail)
   - Test unauthorized access
   - Test validation errors

2. **Frontend Tests:**
   - Test profile loading
   - Test form submission
   - Test error states
   - Test edit/cancel flow

## Migration Notes

If deploying to a new database, ensure:
1. The `HiringManagerInformation` table exists
2. The `CompanySize` enum is defined
3. User has the `HIRING_MANAGER` role

## Next Steps (Optional Enhancements)

1. Add profile photo upload
2. Add social media links (Twitter, GitHub)
3. Add timezone and location fields
4. Add profile completion percentage
5. Add profile visibility settings
6. Add bulk operations for admin users
