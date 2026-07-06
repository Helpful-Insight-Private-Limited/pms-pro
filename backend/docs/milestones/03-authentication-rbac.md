# Milestone 3: Authentication and RBAC

## Status

Implemented.

## Backend Deliverables

- Auth routes.
- User routes.
- Role routes.
- Permission routes.
- Auth middleware.
- Permission middleware.
- Auth, user, role, and permission controllers.
- Password hashing utilities.
- JWT utilities.
- Refresh token utilities.
- Request validators.
- Repositories and services.

## Implemented Files

- `backend/src/routes/authRoutes.ts`
- `backend/src/routes/userRoutes.ts`
- `backend/src/routes/roleRoutes.ts`
- `backend/src/routes/permissionRoutes.ts`
- `backend/src/controllers/authController.ts`
- `backend/src/controllers/userController.ts`
- `backend/src/controllers/roleController.ts`
- `backend/src/controllers/permissionController.ts`
- `backend/src/middlewares/authRequired.ts`
- `backend/src/middlewares/permissionRequired.ts`
- `backend/src/services/authService.ts`
- `backend/src/services/userService.ts`
- `backend/src/services/roleService.ts`
- `backend/src/services/permissionService.ts`
- `backend/src/repositories/authRepository.ts`
- `backend/src/repositories/userRepository.ts`
- `backend/src/repositories/roleRepository.ts`
- `backend/src/repositories/permissionRepository.ts`
- `backend/src/validators/authValidators.ts`
- `backend/src/validators/userValidators.ts`
- `backend/src/validators/roleValidators.ts`
- `backend/src/validators/validate.ts`
- `backend/src/utils/jwt.ts`
- `backend/src/utils/password.ts`
- `backend/src/utils/refreshToken.ts`
- `backend/src/utils/cookies.ts`
- `backend/src/utils/apiError.ts`
- `backend/src/utils/asyncHandler.ts`

## Completion Criteria

- Login works with seeded admin.
- Refresh token rotation works.
- Logout revokes refresh token.
- `/auth/me` returns user, roles, and permissions.
- RBAC middleware protects user, role, and permission APIs.

## Verification

- `npm.cmd run prisma:generate`
- `npm.cmd --workspace backend run typecheck`
- `npm.cmd --workspace backend run build`
