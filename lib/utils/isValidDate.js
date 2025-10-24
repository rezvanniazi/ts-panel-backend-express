function isValidDate(dateString) {
    // Parse the input date string into a Date object
    let dateObj = new Date(dateString)

    // Check if the parsed date object is a valid date
    return !isNaN(dateObj.getTime())
}

module.exports = { isValidDate }
