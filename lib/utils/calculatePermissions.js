const calculatePermissions = (permissions, selectedPerms) => {
    let amount = permissions.find((p) => p.name == "createBot").price
    for (let permName of Object.keys(selectedPerms)) {
        const { checked, multi } = selectedPerms[permName]
        if (checked) {
            const permission = permissions.find((p) => p.name == permName)
            if (multi) {
                for (let i = 0; i < multi; i++) {
                    amount += permission.price
                }
            } else {
                amount += permission.price
            }
        }
    }
    return amount
}

module.exports = calculatePermissions
