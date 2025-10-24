const path = require("path")
const YAML = require("yamljs")
const swaggerUi = require("swagger-ui-express")

// Load OpenAPI spec from YAML file for documentation only
const yamlPath = path.join(__dirname, "swagger.yaml")
const specs = YAML.load(yamlPath)

module.exports = { swaggerUi, specs }
