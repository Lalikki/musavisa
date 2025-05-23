import { createTheme } from '@mui/material/styles';

// You can import specific colors or use hex codes directly
// import { red, pink, purple, deepPurple, indigo, blue, lightBlue, cyan, teal, green, lightGreen, lime, yellow, amber, orange, deepOrange, brown, grey, blueGrey } from '@mui/material/colors';

// Define your theme
const theme = createTheme({
    palette: {
        mode: 'dark', // Start with a dark mode
        primary: {
            main: '#ff6600', // Example: Orange
            // contrastText: '#ffffff', // MUI will calculate this, but you can override
        },
        secondary: {
            main: '#cc0000', // Example: Red
            // contrastText: '#ffffff',
        },
        background: {
            default: '#1a1a1a', // Main background for pages
            paper: '#2a2a2a',   // Background for Paper components (cards, dialogs, etc.)
        },
        text: {
            primary: '#f0f0f0',   // Main text color
            secondary: '#b0b0b0', // Secondary text color (less important text)
        },
        // You can also define error, warning, info, success colors
        // error: {
        //   main: red.A400,
        // },
    },
    typography: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif', // Default MUI font
        h1: {
            fontSize: '2.5rem',
            fontWeight: 500,
        },
        // You can customize other variants like h2, h3, body1, button, etc.
    },
    // You can also define spacing, breakpoints, shape (border-radius), and component overrides here
    // spacing: 8, // Default is 8
    // shape: {
    //   borderRadius: 4, // Default is 4
    // },
    components: {
        MuiTableCell: {
            styleOverrides: {
                head: { // Targets TableCell components within TableHead
                    color: '#ff6600', // Your primary orange color
                    fontWeight: 'bold', // Making headers bold is common
                },
            },
        },
        // You can add other component overrides here
        MuiTypography: {
            styleOverrides: {
                h6: { // Targets Typography components with variant="h6"
                    color: '#ff6600', // Your primary orange color
                    // You could add other h6 specific styles here, like fontWeight if needed
                },
            },
        },
    }
});

export default theme;