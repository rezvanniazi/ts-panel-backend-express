require("dotenv").config()

module.exports = {
    jwt: process.env.JWT_SECRET,
    jwtRefresh: process.env.JWT_REFRESH,
    apiToken: process.env.API_TOKEN,
}
