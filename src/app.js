const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error-handler');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.use('/api', routes);

const frontendDist = path.join(__dirname, '..', 'dist', 'frontend');
const frontendIndex = path.join(frontendDist, 'index.html');

if (fs.existsSync(frontendIndex)) {
  app.use(express.static(frontendDist));
  app.get('*', (_req, res) => {
    res.sendFile(frontendIndex);
  });
}

app.use(notFound);
app.use(errorHandler);

module.exports = app;
