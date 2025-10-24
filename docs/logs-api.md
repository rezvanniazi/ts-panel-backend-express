# Logs API Documentation

The Logs API provides endpoints to manage and view application logs. All endpoints require authentication and appropriate permissions.

## Base URL

```
/api/logs
```

## Authentication

All endpoints require a valid authentication token in the request headers.

## Endpoints

### 1. Get Log Types

Get a list of available log types.

**Endpoint:** `GET /api/logs/types`

**Response:**

```json
{
    "code": "LOGS_FETCHED",
    "success": true,
    "en": "Logs fetched successfully",
    "fa": "لاگ ها با موفقیت دریافت شدند",
    "data": {
        "logTypes": [
            {
                "key": "api",
                "name": "api"
            },
            {
                "key": "audioBot",
                "name": "audiobot"
            },
            {
                "key": "managerBot",
                "name": "managerbot"
            }
        ]
    }
}
```

### 2. Get Log Files

Get a list of log files for a specific log type.

**Endpoint:** `GET /api/logs/:logType/files`

**Parameters:**

-   `logType` (path): The log type (e.g., "api", "audioBot", "managerBot")

**Response:**

```json
{
    "code": "LOGS_FETCHED",
    "success": true,
    "en": "Logs fetched successfully",
    "fa": "لاگ ها با موفقیت دریافت شدند",
    "data": {
        "logType": "api",
        "files": [
            {
                "name": "allLog.log",
                "type": "log"
            },
            {
                "name": "147.log",
                "type": "log"
            }
        ]
    }
}
```

### 3. Read Log File

Read the content of a specific log file with optional filtering and pagination.

**Endpoint:** `GET /api/logs/:logType/files/:fileName`

**Parameters:**

-   `logType` (path): The log type
-   `fileName` (path): The log file name
-   `search` (query, optional): Search term to filter logs
-   `level` (query, optional): Log level filter (info, error, warn, debug)
-   `startDate` (query, optional): Start date filter (ISO format)
-   `endDate` (query, optional): End date filter (ISO format)
-   `page` (query, optional): Page number (default: 1)
-   `limit` (query, optional): Number of entries per page (default: 100)

**Example:**

```
GET /api/logs/api/files/allLog.log?search=error&level=error&page=1&limit=50
```

**Response:**

```json
{
    "code": "LOGS_FETCHED",
    "success": true,
    "en": "Logs fetched successfully",
    "fa": "لاگ ها با موفقیت دریافت شدند",
    "data": {
        "content": "2024/01/15 10:30:45 [api:147] error: Database connection failed\n2024/01/15 10:31:02 [api:147] error: Retry attempt 1",
        "totalLines": 2,
        "page": 1,
        "limit": 50,
        "totalPages": 1,
        "hasNextPage": false,
        "hasPrevPage": false
    }
}
```

### 4. Get Log Statistics

Get statistics for a specific log file.

**Endpoint:** `GET /api/logs/:logType/files/:fileName/stats`

**Parameters:**

-   `logType` (path): The log type
-   `fileName` (path): The log file name

**Response:**

```json
{
    "code": "LOGS_FETCHED",
    "success": true,
    "en": "Logs fetched successfully",
    "fa": "لاگ ها با موفقیت دریافت شدند",
    "data": {
        "fileName": "allLog.log",
        "fileSize": 1024000,
        "totalLines": 5000,
        "levelCounts": {
            "info": 3000,
            "error": 100,
            "warn": 200,
            "debug": 1700
        },
        "firstDate": "2024-01-01T00:00:00.000Z",
        "lastDate": "2024-01-15T23:59:59.000Z",
        "lastModified": "2024-01-15T23:59:59.000Z"
    }
}
```

### 5. Clear Log File

Clear the content of a log file (Admin only).

**Endpoint:** `DELETE /api/logs/:logType/files/:fileName`

**Parameters:**

-   `logType` (path): The log type
-   `fileName` (path): The log file name

**Response:**

```json
{
    "code": "LOG_CLEARED",
    "success": true,
    "en": "Log file cleared successfully",
    "fa": "فایل لاگ با موفقیت پاک شد"
}
```

### 6. Search Logs

Search across multiple log files.

**Endpoint:** `POST /api/logs/search`

**Request Body:**

```json
{
    "logTypes": ["api", "audioBot"],
    "search": "error",
    "level": "error",
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2024-01-15T23:59:59.000Z"
}
```

**Response:**

```json
{
    "code": "LOGS_FETCHED",
    "success": true,
    "en": "Logs fetched successfully",
    "fa": "لاگ ها با موفقیت دریافت شدند",
    "data": {
        "searchTerm": "error",
        "totalResults": 2,
        "results": [
            {
                "logType": "api",
                "fileName": "allLog.log",
                "matches": 5,
                "preview": "2024/01/15 10:30:45 [api:147] error: Database connection failed\n2024/01/15 10:31:02 [api:147] error: Retry attempt 1"
            },
            {
                "logType": "audioBot",
                "fileName": "service.log",
                "matches": 3,
                "preview": "2024/01/15 11:00:00 [audioBot:service] error: Bot connection failed"
            }
        ]
    }
}
```

## Error Responses

### Invalid Log Type

```json
{
    "code": "INVALID_LOG_TYPE",
    "success": false,
    "en": "Invalid log type",
    "fa": "نوع لاگ معتبر نمیباشد"
}
```

### Access Denied

```json
{
    "code": "ACCESS_DENIED",
    "success": false,
    "en": "Access denied to this log type",
    "fa": "دسترسی به این نوع لاگ مجاز نمیباشد"
}
```

### File Not Found

```json
{
    "code": "NOT_FOUND",
    "success": false,
    "en": "Log file not found",
    "fa": "فایل لاگ یافت نشد"
}
```

## Permissions

-   **Admin users**: Can access all log types and clear log files
-   **Regular users**: Can only access public log types (api, user)

## Available Log Types

-   `api` - API request logs
-   `audioBot` - Audio bot service logs
-   `managerBot` - Manager bot service logs
-   `teamspeak` - TeamSpeak server logs
-   `user` - User activity logs
-   `socket` - Socket connection logs
-   `expirationJobs` - Expiration job logs
-   `teamspeakJobs` - TeamSpeak job logs
-   `panelSyncJobs` - Panel sync job logs
-   `managerPanel` - Manager panel logs
-   `musicPanel` - Music panel logs
-   `permission` - Permission system logs
-   `radio` - Radio service logs
-   `ranksystem` - Rank system logs
-   `serverPackage` - Server package logs
-   `audioBotPackage` - Audio bot package logs
-   `cronjob` - Cron job logs

