const axios = require("axios")

const cloudflareApiBaseUrl = "https://api.cloudflare.com/client/v4"

const cloudflareEndPoints = {
    CREATE_DNS_RECORD: (zoneId) => ({
        path: `/zones/${zoneId}/dns_records`,
        method: "post",
    }),
    GET_SRV_RECORD_LIST: (zoneId) => ({
        path: `/zones/${zoneId}/dns_records?type=SRV`,
        method: "get",
    }),
    DELETE_SRV_RECORD: (zoneId, recordId) => ({
        path: `/zones/${zoneId}/dns_records/${recordId}`,
        method: "delete",
    }),
    GET_ZONE_LIST: (domainName) => ({
        path: `/zones?name=${domainName}`,
        method: "get",
    }),
}

// Custom error classes for better error handling
class CloudflareError extends Error {
    constructor(message, code, originalError) {
        super(message)
        this.name = this.constructor.name
        this.code = code
        this.originalError = originalError
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor)
        }
    }
}

class RecordConflictError extends CloudflareError {
    constructor(message = "Subdomain in use", originalError) {
        super(message, "RECORD_CONFLICT", originalError)
    }
}

class DomainNotFoundError extends CloudflareError {
    constructor(message = "Domain not found", originalError) {
        super(message, "DOMAIN_NOT_FOUND", originalError)
    }
}

class InvalidTokenError extends CloudflareError {
    constructor(message = "Invalid token", originalError) {
        super(message, "INVALID_TOKEN", originalError)
    }
}

/**
 * Base Cloudflare API helper function
 * @param {string} path - API endpoint path
 * @param {string} method - HTTP method
 * @param {string} cloudfToken - Cloudflare API token
 * @param {object} [data] - Request payload
 * @returns {Promise<object>} - API response
 * @throws {CloudflareError} - Custom error for API failures
 */
async function cloudflareApiHelper(path, method, cloudfToken, data = {}) {
    try {
        const config = {
            method,
            maxBodyLength: Infinity,
            url: cloudflareApiBaseUrl + path,
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${cloudfToken}`,
                "Content-Type": "application/json",
            },
            data: JSON.stringify(data),
        }

        const response = await axios.request(config)
        return response.data
    } catch (error) {
        // Handle axios errors
        if (error.response) {
            // Cloudflare API error response
            const { status, data } = error.response
            const firstError = data.errors?.[0]

            if (status === 401) {
                throw new InvalidTokenError(undefined, error)
            } else if (firstError?.code === 81058) {
                throw new RecordConflictError(undefined, error)
            } else if (status === 404) {
                throw new DomainNotFoundError(undefined, error)
            }

            throw new CloudflareError(
                firstError?.message || "Cloudflare API error",
                firstError?.code || "UNKNOWN_ERROR",
                error
            )
        } else if (error.request) {
            // No response received
            throw new CloudflareError("No response received from Cloudflare API", "NO_RESPONSE", error)
        } else {
            // Request setup error
            throw new CloudflareError("Error setting up Cloudflare API request", "REQUEST_ERROR", error)
        }
    }
}

/**
 * Checks if a SRV record with the given name already exists
 * @param {string} name - Record name to check
 * @param {Array} srvRecords - Existing SRV records
 * @returns {boolean} - True if record is available
 */
function isSrvRecordAvailable(name, srvRecords) {
    return !srvRecords.some((record) => {
        const parts = record.name.split(".")
        const recordName = parts.slice(2, parts.length - 2).join(".")
        return recordName === name
    })
}

/**
 * Creates a SRV record for TeamSpeak
 * @param {string} name - Subdomain name
 * @param {number} serverport - Server port
 * @param {object} company - Company details with domain info
 * @returns {Promise<string>} -  record ID
 * @throws {RecordConflictError} - If record already exists
 * @throws {CloudflareError} - For other API errors
 */
exports.addSrvRecordForTs = async (name, serverport, company) => {
    const srvRecords = await exports.getSrvRecordList(company.domain_zone_id, company.cloudf_token)

    if (!isSrvRecordAvailable(name, srvRecords)) {
        throw new RecordConflictError()
    }

    const payload = {
        type: "SRV",
        name: `_ts3._udp.${name}`,
        data: {
            priority: 1,
            weight: 5,
            port: serverport,
            target: `ts.${company.domain_name}`,
        },
    }

    const endpoint = cloudflareEndPoints.CREATE_DNS_RECORD(company.domain_zone_id)
    const response = await cloudflareApiHelper(endpoint.path, endpoint.method, company.cloudf_token, payload)

    return response.result.id
}

/**
 * Checks if a SRV record with the given name already exists
 * @param {string} name - Record name to check
 * @param {Array} srvRecords - Existing SRV records from Cloudflare
 * @returns {boolean} - True if record name is available, false if it already exists
 */
function isSrvRecordAvailable(name, srvRecords) {
    return !srvRecords.some((record) => {
        const parts = record.name.split(".")
        // Extract the custom part of the record name between _ts3._udp. and the domain parts
        // Example: For "_ts3._udp.myrecord.example.com", we want "myrecord"
        const recordName = parts.slice(2, parts.length - 2).join(".")
        return recordName === name
    })
}

/**
 * Deletes a SRV record
 * @param {string} zoneId - Cloudflare zone ID
 * @param {string} recordId - Record ID to delete
 * @param {string} cloudfToken - Cloudflare API token
 * @returns {Promise<object>} - API response
 * @throws {CloudflareError} - For API errors
 */
exports.deleteSrvRecord = async (zoneId, recordId, cloudfToken) => {
    const endpoint = cloudflareEndPoints.DELETE_SRV_RECORD(zoneId, recordId)
    return await cloudflareApiHelper(endpoint.path, endpoint.method, cloudfToken)
}

/**
 * Gets list of SRV records for a zone
 * @param {string} zoneId - Cloudflare zone ID
 * @param {string} cloudfToken - Cloudflare API token
 * @returns {Promise<Array>} - Array of SRV records
 * @throws {CloudflareError} - For API errors
 */
exports.getSrvRecordList = async (zoneId, cloudfToken) => {
    const endpoint = cloudflareEndPoints.GET_SRV_RECORD_LIST(zoneId)
    const response = await cloudflareApiHelper(endpoint.path, endpoint.method, cloudfToken)
    return response.result
}

/**
 * Verifies a domain and gets its zone ID
 * @param {string} domainName - Domain name to verify
 * @param {string} cloudfToken - Cloudflare API token
 * @returns {Promise<string>} - zone ID
 * @throws {DomainNotFoundError} - If domain not found or inactive
 * @throws {InvalidTokenError} - If token is invalid
 * @throws {CloudflareError} - For other API errors
 */
exports.verifyDomain = async (domainName, cloudfToken) => {
    const endpoint = cloudflareEndPoints.GET_ZONE_LIST(domainName)
    const response = await cloudflareApiHelper(endpoint.path, endpoint.method, cloudfToken)

    const domain = response.result[0]
    if (!domain || domain.name !== domainName || domain.status !== "active") {
        throw new DomainNotFoundError()
    }

    return domain.id
}
