# REST API Architecture

## Route Catalog

All application routes are mounted under `/api`. Public health/docs routes are `/health`, `/api-docs`, and `/openapi.json`.

Primary modules:

- Auth: `/api/auth/*`
- Dashboards: `/api/dashboard/*`
- Users and RBAC: `/api/users`, `/api/roles`, `/api/permissions`
- Masters: `/api/masters/currencies`, `/api/masters/technology-stacks`
- Clients: `/api/clients`
- Projects: `/api/projects`
- Milestones, sprints, tasks and costing: nested under `/api/projects/{projectId}`
- Notifications and jobs: `/api/notifications`, `/api/jobs`
- Reports and audit: `/api/reports`, `/api/activity-logs`
- Calendar and availability: `/api/calendar/*`

The executable API catalog is maintained in `src/docs/openapi.ts` and served by Swagger.

## Request DTO Standard

- JSON request bodies use camelCase.
- Dates use ISO strings. Date-only fields are `YYYY-MM-DD`; timestamp fields are ISO date-time strings.
- Create DTOs require the minimum fields needed to create a valid record.
- Update DTOs are partial create DTOs with `isActive` only where soft activation is user-manageable.
- Route ids are strings and are passed as path params.
- Query filters use flat keys such as `fromDate`, `toDate`, `projectId`, `developerId`, `status`, `page`, and `pageSize`.

## Response DTO Standard

Every successful response uses:

```json
{
  "success": true,
  "data": {}
}
```

List endpoints return arrays unless pagination is explicitly enabled for that module.

## Pagination, Filtering, Sorting

- Pagination defaults: `page=1`, `pageSize=20`.
- Maximum page size should stay bounded at service level when pagination is added.
- Filters must be explicit query parameters; avoid overloaded search payloads.
- Sorting should use `sortBy` and `sortOrder=asc|desc` when exposed.
- Date-range filters use inclusive `fromDate` and `toDate`.

## Error Response Standard

Every error response uses:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

Common status codes:

- `400`: invalid route/query/business request.
- `401`: authentication required or token invalid.
- `403`: authenticated but missing permission.
- `404`: record not found or soft deleted.
- `409`: uniqueness or state conflict.
- `422`: DTO validation failure.

## API Versioning Strategy

The current API is unversioned under `/api` while the product is pre-release. The first public stable contract should be mounted under `/api/v1`, keeping `/api` as an internal compatibility alias during transition.

Breaking changes require:

- OpenAPI update.
- Frontend API client update.
- Migration or compatibility note.
- Deprecation window when a route is already used by the frontend.
