module.exports = {
    plugins: [
        require('react-strict-dom/postcss-plugin')({
            include: [
                'src/**/*.{js,jsx,mjs,ts,tsx}',
                'node_modules/lockwright-lib-ui-react-native-components/*.js'
            ]
        }),
        require('autoprefixer')
    ]
};
