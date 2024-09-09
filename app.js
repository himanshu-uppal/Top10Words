import express from 'express';
const app = express();
const PORT = 3000;
import Routes from './Routes/index.js';

try {
    app.listen(PORT, () => {
        console.log(`app online @${PORT}`)
    })
    app.use('/api/firefly', Routes);
} catch (e) {
    console.log(`App failed to start ${e} ${JSON.stringify(e)}`);
    throw e;
};