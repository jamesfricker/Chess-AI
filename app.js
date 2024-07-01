const express = require('express');
const serveStatic = require('serve-static');
const path = require('path');
const helmet = require('helmet');

const app = express();
const port = process.env.PORT || 3000;

// Use Helmet to set various HTTP headers for security
app.use(helmet());

// Serve static files from the "public" directory
app.use(serveStatic(path.join(__dirname, 'public')));

// Serve index.html for the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const server = app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Trying another port...`);
        setTimeout(() => {
            server.close();
            app.listen(0, () => {
                const newPort = server.address().port;
                console.log(`Server is running on http://localhost:${newPort}`);
            });
        }, 1000);
    } else {
        console.error(err);
    }
});
