module.exports = {
    "extends": "standard",
    "parser": "babel-eslint",
    "parserOptions": {
        "ecmaVersion": 6,
        "sourceType": "module" //es6 import
    },
    "globals": {
        "fetch": false,
        "define": false,
        "XMLHttpRequest": false
    },
    "rules": {
        "no-unreachable": 2,
        "no-console": 0,
        "no-mixed-operators": 0,
        "indent": ["error", 4]
    }
};