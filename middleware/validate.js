const validate = (schema, property = "body") => {
    return (req, res, next) => {
        const { error } = schema.validate(req[property], {
            abortEarly: false, // Return all errors, not just the first
            allowUnknown: false, // Disallow unknown keys
            stripUnknown: true, // Remove unknown keys
        })

        if (error) {
            const errors = error.details.map((detail) => {
                console.log(detail)
                return { field: detail.path.join("."), message: detail.message.replace(/"/g, "") }
            })

            return res.status(422).json({ errors })
        }

        next()
    }
}

module.exports = validate
